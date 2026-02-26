import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import elementsData from '../data/elements.json';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.equation = data.equation;
    this.progression = data.progression;
    this.failedAttempts = 0;
    this.startTime = 0;
    this.levelComplete = false;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();

    // Systems
    this.coeffManager = new CoefficientManager(this, this.equation);
    this.hintSystem = new HintSystem(this.equation.hints);

    // Layout constants
    this.EQUATION_Y = 80;
    this.SCALE_Y = 260;
    this.HUD_Y = 400;
    this.TOKEN_TRAY_Y = 540;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Level header
    this.add.text(width / 2, 18, `Level ${this.equation.level}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#8888aa'
    }).setOrigin(0.5);

    this.add.text(width / 2, 36, this.equation.type.replace('_', ' ').toUpperCase(), {
      fontFamily: 'monospace', fontSize: '10px', color: '#6666aa'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '< Back', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8888aa'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { progression: this.progression });
    });

    // Build equation display with coefficient slots
    this._buildEquationDisplay();

    // Build balance scale
    this._buildScale();

    // Build element counter HUD
    this._buildHUD();

    // Build token tray
    this._buildTokenTray();

    // Build check button
    this._buildCheckButton();

    // Build hint button
    this._buildHintButton();

    // Timer display
    this.timerText = this.add.text(width - 15, 15, '0:00', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
    }).setOrigin(1, 0);

    // Hint overlay
    this.hintOverlay = null;

    // Wire up coefficient change callback
    this.coeffManager.onChange = () => {
      this._updateEquationDisplay();
      this._updateHUD();
      this._updateScale();
      this._updateMoleculeVisuals();
      this.hintSystem.resetIdle();
    };

    // Initial update
    this.coeffManager._emitChange();

    // Keyboard support
    this._setupKeyboard();
  }

  update(time, delta) {
    if (this.levelComplete) return;

    // Update timer
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

    // Update hint idle timer
    this.hintSystem.updateIdle(delta);

    // Check for auto-hints
    const autoHint = this.hintSystem.checkAutoHint();
    if (autoHint) {
      this._showHint(autoHint);
    }

    // Animate scale beam
    this._animateScale(delta);

    // Bob molecules gently
    this._animateMolecules(time);
  }

  _buildEquationDisplay() {
    const { width } = this.cameras.main;
    this.equationSlots = [];
    this.equationTexts = [];
    this.moleculeContainers = [];

    const allMolecules = [
      ...this.equation.reactants.map((m, i) => ({ ...m, side: 'reactant', index: i })),
      ...this.equation.products.map((m, i) => ({ ...m, side: 'product', index: i }))
    ];

    const totalItems = allMolecules.length;
    // Extra space for the arrow
    const hasArrow = true;
    const arrowSlots = hasArrow ? 1 : 0;
    const plusCount = this.equation.reactants.length - 1 + this.equation.products.length - 1;
    const totalSlots = totalItems + arrowSlots + plusCount;
    const spacing = Math.min(90, (width - 80) / totalSlots);
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    let slotIdx = 0;
    let reactantIdx = 0;
    let productIdx = 0;

    allMolecules.forEach((mol, i) => {
      const x = startX + slotIdx * spacing;
      const y = this.EQUATION_Y;

      // Coefficient slot (interactive)
      const slotBg = this.add.image(x - 22, y, 'coeff_slot').setScale(0.8);
      const slotText = this.add.text(x - 22, y, '1', {
        fontFamily: 'monospace', fontSize: '18px', color: '#7777cc'
      }).setOrigin(0.5);

      // Make slot interactive for tap-to-cycle (mobile friendly)
      slotBg.setInteractive({ useHandCursor: true });
      const sideRef = mol.side;
      const idxRef = mol.index;
      slotBg.on('pointerdown', () => {
        if (this.levelComplete) return;
        const current = sideRef === 'reactant'
          ? this.coeffManager.getReactantCoeff(idxRef)
          : this.coeffManager.getProductCoeff(idxRef);
        const next = current >= 9 ? 1 : current + 1;
        if (sideRef === 'reactant') {
          this.coeffManager.setReactantCoeff(idxRef, next);
        } else {
          this.coeffManager.setProductCoeff(idxRef, next);
        }
      });

      this.equationSlots.push({ bg: slotBg, text: slotText, side: mol.side, index: mol.index });

      // Molecule formula text
      const formulaText = this.add.text(x + 10, y, mol.formula, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
      }).setOrigin(0.5);
      this.equationTexts.push(formulaText);

      // Create mini molecule visual (element orbs below formula)
      const orbContainer = this.add.container(x + 10, y + 30);
      let orbIdx = 0;
      for (const [element, count] of Object.entries(mol.elements)) {
        for (let c = 0; c < Math.min(count, 4); c++) {
          const orbX = (orbIdx - Object.values(mol.elements).reduce((a, b) => a + Math.min(b, 4), 0) / 2) * 14;
          const texKey = `orb_${element}`;
          if (this.textures.exists(texKey)) {
            const orb = this.add.image(orbX, 0, texKey).setScale(0.5);
            orbContainer.add(orb);
          }
          orbIdx++;
        }
      }
      this.moleculeContainers.push({ container: orbContainer, mol });

      slotIdx++;

      // Add '+' or '→'
      const isLastReactant = mol.side === 'reactant' && mol.index === this.equation.reactants.length - 1;
      const isLastProduct = mol.side === 'product' && mol.index === this.equation.products.length - 1;

      if (isLastReactant) {
        const arrowX = startX + slotIdx * spacing;
        this.add.text(arrowX, y, '→', {
          fontFamily: 'monospace', fontSize: '22px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      } else if (!isLastProduct) {
        const plusX = startX + slotIdx * spacing;
        this.add.text(plusX, y, '+', {
          fontFamily: 'monospace', fontSize: '20px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      }
    });

    // Setup drop zones on slots
    this.equationSlots.forEach(slot => {
      slot.bg.setData('slotSide', slot.side);
      slot.bg.setData('slotIndex', slot.index);
    });
  }

  _updateEquationDisplay() {
    this.equationSlots.forEach(slot => {
      const coeff = slot.side === 'reactant'
        ? this.coeffManager.getReactantCoeff(slot.index)
        : this.coeffManager.getProductCoeff(slot.index);

      slot.text.setText(coeff.toString());

      if (coeff > 1) {
        slot.text.setColor('#00ff88');
        slot.bg.setTexture('coeff_slot_active');
      } else {
        slot.text.setColor('#7777cc');
        slot.bg.setTexture('coeff_slot');
      }
    });
  }

  _buildScale() {
    const { width } = this.cameras.main;
    const cx = width / 2;
    const cy = this.SCALE_Y;

    // Scale base
    this.add.image(cx, cy + 40, 'scale_base').setScale(1.2);

    // Scale beam (will rotate)
    this.scaleBeam = this.add.image(cx, cy - 5, 'scale_beam').setScale(0.9);

    // Left pan (reactants)
    this.leftPan = this.add.image(cx - 115, cy + 5, 'scale_pan');
    this.leftPanLabel = this.add.text(cx - 115, cy + 18, 'Reactants', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8888aa'
    }).setOrigin(0.5);

    // Right pan (products)
    this.rightPan = this.add.image(cx + 115, cy + 5, 'scale_pan');
    this.rightPanLabel = this.add.text(cx + 115, cy + 18, 'Products', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8888aa'
    }).setOrigin(0.5);

    // Balance indicator
    this.balanceText = this.add.text(cx, cy - 30, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffdd44'
    }).setOrigin(0.5);

    this.targetAngle = 0;
    this.currentAngle = 0;
  }

  _updateScale() {
    const result = EquationEngine.validate(
      this.equation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    // Calculate total atom difference for tilt
    let leftTotal = 0, rightTotal = 0;
    for (const el of Object.values(result.elements)) {
      leftTotal += el.left;
      rightTotal += el.right;
    }

    const diff = leftTotal - rightTotal;
    const maxTilt = 15; // degrees
    this.targetAngle = Math.max(-maxTilt, Math.min(maxTilt, diff * 2));

    if (result.balanced) {
      this.targetAngle = 0;
      this.balanceText.setText('BALANCED!').setColor('#00ff88');
    } else if (leftTotal > rightTotal) {
      this.balanceText.setText('Reactants heavier').setColor('#ffdd44');
    } else {
      this.balanceText.setText('Products heavier').setColor('#ffdd44');
    }
  }

  _animateScale(delta) {
    const speed = 0.005 * delta;
    this.currentAngle += (this.targetAngle - this.currentAngle) * Math.min(speed, 1);
    this.scaleBeam.setAngle(this.currentAngle);

    // Move pans based on angle
    const radians = Phaser.Math.DegToRad(this.currentAngle);
    const panOffset = Math.sin(radians) * 20;
    this.leftPan.y = this.SCALE_Y + 5 + panOffset;
    this.rightPan.y = this.SCALE_Y + 5 - panOffset;
    this.leftPanLabel.y = this.leftPan.y + 13;
    this.rightPanLabel.y = this.rightPan.y + 13;
  }

  _animateMolecules(time) {
    this.moleculeContainers.forEach((mc, i) => {
      const offset = Math.sin(time * 0.002 + i * 0.5) * 2;
      mc.container.y = this.EQUATION_Y + 30 + offset;
    });
  }

  _buildHUD() {
    const { width } = this.cameras.main;
    const y = this.HUD_Y;

    // Element counter panel
    const panelW = 380;
    const panelX = width / 2 - panelW / 2;

    this.hudBg = this.add.graphics();
    this.hudBg.fillStyle(0x1a1a30, 0.8);
    this.hudBg.fillRoundedRect(panelX, y - 10, panelW, 0, 6);

    this.add.text(width / 2, y - 5, 'ATOM COUNT', {
      fontFamily: 'monospace', fontSize: '10px', color: '#6666aa'
    }).setOrigin(0.5);

    // Header
    this.add.text(panelX + 60, y + 10, 'Element', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8888aa'
    });
    this.add.text(panelX + 160, y + 10, 'Left', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8888aa'
    });
    this.add.text(panelX + 250, y + 10, 'Right', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8888aa'
    });
    this.add.text(panelX + 330, y + 10, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8888aa'
    });

    this.hudElements = [];
    const allElements = EquationEngine.getElements(this.equation);

    allElements.forEach((el, i) => {
      const rowY = y + 28 + i * 22;
      const elData = elementsData[el] || {};

      // Element orb
      const texKey = `orb_${el}`;
      if (this.textures.exists(texKey)) {
        this.add.image(panelX + 25, rowY, texKey).setScale(0.6);
      }

      // Element symbol
      const symText = this.add.text(panelX + 60, rowY, el, {
        fontFamily: 'monospace', fontSize: '13px', color: elData.color || '#ffffff'
      }).setOrigin(0, 0.5);

      // Left count
      const leftText = this.add.text(panelX + 170, rowY, '0', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0.5);

      // Right count
      const rightText = this.add.text(panelX + 260, rowY, '0', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0.5);

      // Status indicator
      const statusText = this.add.text(panelX + 340, rowY, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0.5);

      this.hudElements.push({ element: el, symText, leftText, rightText, statusText });
    });

    // Resize background
    const totalHeight = 35 + allElements.length * 22;
    this.hudBg.clear();
    this.hudBg.fillStyle(0x1a1a30, 0.8);
    this.hudBg.fillRoundedRect(panelX, y - 10, panelW, totalHeight, 6);
    this.hudBg.lineStyle(1, 0x3333555, 0.5);
    this.hudBg.strokeRoundedRect(panelX, y - 10, panelW, totalHeight, 6);
  }

  _updateHUD() {
    const result = EquationEngine.validate(
      this.equation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    this.hudElements.forEach(hud => {
      const elInfo = result.elements[hud.element] || { left: 0, right: 0, balanced: false };
      hud.leftText.setText(elInfo.left.toString());
      hud.rightText.setText(elInfo.right.toString());

      if (elInfo.balanced) {
        hud.statusText.setText('=');
        hud.leftText.setColor('#00ff88');
        hud.rightText.setColor('#00ff88');
        hud.statusText.setColor('#00ff88');
      } else {
        hud.statusText.setText(elInfo.left > elInfo.right ? '>' : '<');
        hud.leftText.setColor('#ff6644');
        hud.rightText.setColor('#ff6644');
        hud.statusText.setColor('#ff6644');
      }
    });
  }

  _buildTokenTray() {
    const { width } = this.cameras.main;
    const y = this.TOKEN_TRAY_Y;

    this.add.text(width / 2, y - 22, 'Tap a coefficient slot to cycle (1-9)', {
      fontFamily: 'monospace', fontSize: '10px', color: '#6666aa'
    }).setOrigin(0.5);

    // Number buttons 1-9 as quick-set buttons
    const trayW = 9 * 48;
    const startX = width / 2 - trayW / 2 + 24;

    for (let n = 1; n <= 9; n++) {
      const x = startX + (n - 1) * 48;
      const btn = this.add.image(x, y + 5, `token_${n}`).setScale(0.9);
      const numText = this.add.text(x, y + 5, n.toString(), {
        fontFamily: 'monospace', fontSize: '18px', color: '#aaccff'
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true, draggable: true });

      // Drag behavior
      btn.on('dragstart', () => {
        btn.setScale(1.1);
        btn.setAlpha(0.7);
      });

      btn.on('drag', (pointer) => {
        // Create a temporary visual at pointer
        if (!this._dragSprite) {
          this._dragSprite = this.add.text(pointer.x, pointer.y, n.toString(), {
            fontFamily: 'monospace', fontSize: '22px', color: '#00ff88',
            backgroundColor: '#2a2a4a', padding: { x: 8, y: 4 }
          }).setOrigin(0.5);
        }
        this._dragSprite.setPosition(pointer.x, pointer.y);
      });

      btn.on('dragend', (pointer) => {
        btn.setScale(0.9);
        btn.setAlpha(1);

        if (this._dragSprite) {
          this._dragSprite.destroy();
          this._dragSprite = null;
        }

        // Check if dropped on a slot
        this.equationSlots.forEach(slot => {
          const bounds = slot.bg.getBounds();
          if (bounds.contains(pointer.x, pointer.y)) {
            if (slot.side === 'reactant') {
              this.coeffManager.setReactantCoeff(slot.index, n);
            } else {
              this.coeffManager.setProductCoeff(slot.index, n);
            }
          }
        });
      });
    }
  }

  _buildCheckButton() {
    const { width } = this.cameras.main;
    const y = this.TOKEN_TRAY_Y + 50;

    const checkBtn = this.add.image(width / 2, y, 'btn_check');
    const checkLabel = this.add.text(width / 2, y, 'CHECK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    checkBtn.setInteractive({ useHandCursor: true });
    checkBtn.on('pointerover', () => checkBtn.setTint(0x66ff99));
    checkBtn.on('pointerout', () => checkBtn.clearTint());
    checkBtn.on('pointerdown', () => this._checkAnswer());
  }

  _buildHintButton() {
    const { width } = this.cameras.main;

    const hintBtn = this.add.image(width - 35, 55, 'btn_hint');
    this.add.text(width - 35, 55, '?', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    hintBtn.setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => {
      if (this.levelComplete) return;
      const hint = this.hintSystem.getNextHint();
      if (hint) this._showHint(hint);
    });
  }

  _showHint(text) {
    if (this.hintOverlay) {
      this.hintOverlay.destroy();
    }

    const { width } = this.cameras.main;
    const tier = this.hintSystem.getTier();

    const colors = ['#ffdd44', '#ff8844', '#ff4444'];
    const color = colors[Math.min(tier - 1, 2)] || colors[0];

    this.hintOverlay = this.add.container(width / 2, this.SCALE_Y - 70);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a30, 0.95);
    bg.fillRoundedRect(-180, -20, 360, 40, 8);
    bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(color).color, 0.8);
    bg.strokeRoundedRect(-180, -20, 360, 40, 8);
    this.hintOverlay.add(bg);

    const hintText = this.add.text(0, 0, text, {
      fontFamily: 'monospace', fontSize: '11px', color: color,
      wordWrap: { width: 340 }, align: 'center'
    }).setOrigin(0.5);
    this.hintOverlay.add(hintText);

    // Auto-dismiss after 5 seconds
    this.time.delayedCall(5000, () => {
      if (this.hintOverlay) {
        this.tweens.add({
          targets: this.hintOverlay,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            if (this.hintOverlay) {
              this.hintOverlay.destroy();
              this.hintOverlay = null;
            }
          }
        });
      }
    });
  }

  _checkAnswer() {
    if (this.levelComplete) return;

    const result = EquationEngine.validate(
      this.equation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    if (result.balanced) {
      this._onWin();
    } else {
      this._onFail();
    }
  }

  _onWin() {
    this.levelComplete = true;

    const timeSeconds = (Date.now() - this.startTime) / 1000;
    const hintsUsed = this.hintSystem.getHintsUsed();
    const isLowest = EquationEngine.isLowestTerms(this.coeffManager.getAllCoeffs());

    const score = ScoringSystem.calculateScore(
      timeSeconds, this.equation.par_time, hintsUsed, this.failedAttempts
    );
    let stars = ScoringSystem.calculateStars(hintsUsed);
    if (!isLowest && stars === 3) stars = 2; // Need lowest terms for 3 stars

    const streak = this.progression.incrementStreak();
    const multiplier = ScoringSystem.getStreakMultiplier(streak);
    const xp = ScoringSystem.calculateXP(score, multiplier);

    // Save progress
    this.progression.addXP(xp);
    this.progression.completeLevel(this.equation.id, stars, timeSeconds, score);

    // Check achievements
    this._checkAchievements(timeSeconds, hintsUsed, streak);

    // Victory animation
    this._playVictoryAnimation();

    // Balance text update
    this.balanceText.setText('PERFECTLY BALANCED!').setColor('#00ff88');

    // Go to results after delay
    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', {
        equation: this.equation,
        progression: this.progression,
        stars,
        score,
        xp,
        timeSeconds,
        hintsUsed,
        streak,
        isLowest
      });
    });
  }

  _onFail() {
    this.failedAttempts++;
    this.hintSystem.onFail();

    // Screen shake
    this.cameras.main.shake(100, 0.005);

    // Flash red on unbalanced elements
    this.hudElements.forEach(hud => {
      const result = EquationEngine.validate(
        this.equation,
        this.coeffManager.reactantCoeffs,
        this.coeffManager.productCoeffs
      );
      const elInfo = result.elements[hud.element];
      if (elInfo && !elInfo.balanced) {
        this.tweens.add({
          targets: [hud.leftText, hud.rightText],
          scaleX: 1.3, scaleY: 1.3,
          duration: 100,
          yoyo: true,
          repeat: 2
        });
      }
    });

    // Red particles
    const { width } = this.cameras.main;
    if (this.textures.exists('particle_red')) {
      const emitter = this.add.particles(width / 2, this.SCALE_Y, 'particle_red', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 600,
        quantity: 10,
        emitting: false
      });
      emitter.explode(10);
      this.time.delayedCall(1000, () => emitter.destroy());
    }
  }

  _playVictoryAnimation() {
    const { width } = this.cameras.main;

    // Gold particles
    if (this.textures.exists('particle_gold')) {
      const emitter = this.add.particles(width / 2, this.SCALE_Y, 'particle_gold', {
        speed: { min: 80, max: 200 },
        angle: { min: 220, max: 320 },
        scale: { start: 1.5, end: 0 },
        lifespan: 1500,
        quantity: 30,
        emitting: false
      });
      emitter.explode(30);
      this.time.delayedCall(2000, () => emitter.destroy());
    }

    // Flash the equation green
    this.equationSlots.forEach(slot => {
      this.tweens.add({
        targets: slot.text,
        scaleX: 1.3, scaleY: 1.3,
        duration: 300,
        yoyo: true
      });
    });

    // Camera flash
    this.cameras.main.flash(300, 0, 255, 100);
  }

  _updateMoleculeVisuals() {
    // Pulse molecules when their coefficient changes
    this.moleculeContainers.forEach((mc) => {
      this.tweens.add({
        targets: mc.container,
        scaleX: 1.1, scaleY: 1.1,
        duration: 100,
        yoyo: true
      });
    });
  }

  _checkAchievements(timeSeconds, hintsUsed, streak) {
    // First balance
    this.progression.unlockAchievement('first_balance');

    // Speed demon
    if (timeSeconds < 5) {
      this.progression.unlockAchievement('speed_demon');
    }

    // Solo scientist / independent
    const completedCount = this.progression.getCompletedCount();
    if (hintsUsed === 0) {
      if (completedCount >= 10) this.progression.unlockAchievement('no_hints_10');
      if (completedCount >= 5) this.progression.unlockAchievement('no_hints_5');
    }

    // Streak achievements
    if (streak >= 10) this.progression.unlockAchievement('streak_10');
    if (streak >= 5) this.progression.unlockAchievement('streak_5');

    // Halfway there
    if (completedCount >= 20) this.progression.unlockAchievement('level_20');
  }

  _setupKeyboard() {
    // Number keys 1-9 to set selected slot
    this.selectedSlotIdx = 0;

    this.input.keyboard.on('keydown', (event) => {
      if (this.levelComplete) return;

      const key = event.key;

      // Arrow keys to select slot
      if (key === 'ArrowLeft') {
        this.selectedSlotIdx = Math.max(0, this.selectedSlotIdx - 1);
        this._highlightSelectedSlot();
      } else if (key === 'ArrowRight') {
        this.selectedSlotIdx = Math.min(this.equationSlots.length - 1, this.selectedSlotIdx + 1);
        this._highlightSelectedSlot();
      }

      // Number keys
      const num = parseInt(key);
      if (num >= 1 && num <= 9 && this.equationSlots[this.selectedSlotIdx]) {
        const slot = this.equationSlots[this.selectedSlotIdx];
        if (slot.side === 'reactant') {
          this.coeffManager.setReactantCoeff(slot.index, num);
        } else {
          this.coeffManager.setProductCoeff(slot.index, num);
        }
      }

      // Enter to check
      if (key === 'Enter') {
        this._checkAnswer();
      }

      // H for hint
      if (key === 'h' || key === 'H') {
        const hint = this.hintSystem.getNextHint();
        if (hint) this._showHint(hint);
      }
    });
  }

  _highlightSelectedSlot() {
    this.equationSlots.forEach((slot, i) => {
      if (i === this.selectedSlotIdx) {
        slot.bg.setTint(0x7777cc);
      } else {
        slot.bg.clearTint();
      }
    });
  }
}
