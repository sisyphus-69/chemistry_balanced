import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { PIXEL_FONT } from '../ui/PixelText.js';
import { HPBar } from '../ui/HPBar.js';
import { ProfessorAurum } from '../ui/ProfessorAurum.js';
import { BattleUI } from '../ui/BattleUI.js';
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
    this.focusedSlotIdx = -1;
    this._prevBalancedSet = new Set();
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();

    // Systems
    this.coeffManager = new CoefficientManager(this, this.equation);
    this.hintSystem = new HintSystem(this.equation.hints);
    this.professor = new ProfessorAurum(this);

    // Layout constants (relative to viewport)
    this.EQUATION_Y = height * 0.45;
    this.SCALE_Y = height * 0.18;
    
    // Bottom control panel area (y: 440 to 600)
    this.HP_BAR_Y = 470;
    this.GRID_CENTER_Y = 520;
    this.CHECK_CENTER_Y = 520;

    // Background
    this._buildLabEnvironment(width, height);

    // ── Header bar ──
    this._buildHeader(width, height);

    // ── Build UI sections ──
    this._buildControlPanel(width, height);
    this._buildEquationDisplay();
    this._buildScale();
    this._buildHPBars();
    this._buildGrid(width, height);
    this._buildCheckButton(width, height);
    this._buildHintButton(width);

    // Timer display
    this.timerText = this.add.text(width - 15, 10, '0:00', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#aaaacc'
    }).setOrigin(1, 0);

    this.hintOverlay = null;

    // Wire up coefficient change callback
    this.coeffManager.onChange = () => {
      this._updateEquationDisplay();
      this._updateHPBars();
      this._updateScale();
      this._updateMoleculeVisuals();
      this.hintSystem.resetIdle();
    };

    // Initial update
    this.coeffManager._emitChange();

    // Keyboard support
    this._setupKeyboard();

    // Click background to defocus slot
    this.input.on('pointerdown', (pointer) => {
      if (this.focusedSlotIdx >= 0) {
        let hitSlot = false;
        this.equationSlots.forEach(s => {
          const b = s.bg.getBounds();
          if (b.contains(pointer.x, pointer.y)) hitSlot = true;
        });
        if (!hitSlot) this._defocusSlot();
      }
    });
  }

  update(time, delta) {
    if (this.levelComplete) return;

    // Timer
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

    // Hints
    this.hintSystem.updateIdle(delta);
    const autoHint = this.hintSystem.checkAutoHint();
    if (autoHint) this._showHint(autoHint);

    // Animate
    this._animateScale(delta);
    this._animateMolecules(time);
    this._animateFocusCursor(time);
  }

  // ─────────────────────────────────────────────
  // BOTTOM CONTROL PANEL
  // ─────────────────────────────────────────────
  _buildControlPanel(width, height) {
    const panelY = height - 160;
    this.add.image(0, panelY, 'control_panel').setOrigin(0, 0);
  }

  // ─────────────────────────────────────────────
  // LAB ENVIRONMENT
  // ─────────────────────────────────────────────
  _buildLabEnvironment(width, height) {
    // Deep dark base
    this.add.rectangle(width / 2, height / 2, width, height, 0x080c12);

    const graphics = this.add.graphics();
    const horizonY = height * 0.35;

    // --- Wall / Cyber details ---
    graphics.fillStyle(0x0f1520, 1);
    graphics.fillRect(0, 0, width, horizonY);
    
    // Some glowing wall panels
    graphics.fillStyle(0x112233, 0.8);
    graphics.fillRect(width * 0.1, horizonY - 80, width * 0.2, 40);
    graphics.fillRect(width * 0.7, horizonY - 80, width * 0.2, 40);
    
    graphics.fillStyle(0x00ff88, 0.2);
    graphics.fillRect(width * 0.1, horizonY - 40, width * 0.2, 2);
    graphics.fillRect(width * 0.7, horizonY - 40, width * 0.2, 2);

    // --- Floor Perspective Grid ---
    graphics.lineStyle(1, 0x00ff88, 0.15);
    
    // Horizontal lines (getting thicker/spaced out towards bottom)
    let y = horizonY;
    let step = 5;
    while (y < height - 160) {
      graphics.lineBetween(0, y, width, y);
      y += step;
      step *= 1.25;
    }

    // Perspective lines radiating from center
    const vpX = width / 2;
    const vpY = horizonY - 50; // slightly above horizon
    for (let x = -width; x < width * 2; x += 100) {
      graphics.lineBetween(vpX, vpY, x, height);
    }
  }

  // ─────────────────────────────────────────────
  // HEADER BAR
  // ─────────────────────────────────────────────
  _buildHeader(width, height) {
    // Header background
    const hdr = this.add.graphics();
    hdr.fillStyle(0x0d0d1e, 0.9);
    hdr.fillRect(0, 0, width, 32);
    hdr.fillStyle(0x333366, 0.4);
    hdr.fillRect(0, 31, width, 1);

    // Back button
    const backBtn = this.add.text(10, 10, '< Back', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#8888aa'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.start('MenuScene', { progression: this.progression });
    });

    // Level title
    this.add.text(width / 2, 8, `Level ${this.equation.level}`, {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5, 0);

    // Type subtitle
    this.add.text(width / 2, 22, this.equation.type.replace('_', ' ').toUpperCase(), {
      fontFamily: PIXEL_FONT, fontSize: '8px', color: '#6666aa'
    }).setOrigin(0.5, 0);
  }

  // ─────────────────────────────────────────────
  // EQUATION DISPLAY (with focusable text-input)
  // ─────────────────────────────────────────────
  _buildEquationDisplay() {
    const { width } = this.cameras.main;
    this.equationSlots = [];
    this.equationTexts = [];
    this.moleculeContainers = [];

    const allMolecules = [
      ...this.equation.reactants.map((m, i) => ({ ...m, side: 'reactant', index: i })),
      ...this.equation.products.map((m, i) => ({ ...m, side: 'product', index: i }))
    ];

    const arrowSlots = 1;
    const plusCount = this.equation.reactants.length - 1 + this.equation.products.length - 1;
    const totalSlots = allMolecules.length + arrowSlots + plusCount;
    const spacing = Math.min(90, (width - 80) / totalSlots);
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    let slotIdx = 0;

    allMolecules.forEach((mol) => {
      const x = startX + slotIdx * spacing;
      const y = this.EQUATION_Y;

      // Coefficient slot
      const slotBg = this.add.image(x - 26, y, 'coeff_slot').setScale(1.0);
      const slotText = this.add.text(x - 26, y, '1', {
        fontFamily: PIXEL_FONT, fontSize: '16px', color: '#7777cc'
      }).setOrigin(0.5);

      // Focus cursor (hidden by default)
      const cursor = this.add.rectangle(x - 22, y + 12, 16, 2, 0x00ccff).setAlpha(0);

      // Click to focus this slot for text input
      slotBg.setInteractive({ useHandCursor: true });
      const slotIndex = this.equationSlots.length;
      const sideRef = mol.side;
      const idxRef = mol.index;

      slotBg.on('pointerdown', (pointer) => {
        if (this.levelComplete) return;
        pointer.event.stopPropagation();

        if (this.focusedSlotIdx === slotIndex) {
          // Already focused — tap-to-cycle as fallback
          const current = sideRef === 'reactant'
            ? this.coeffManager.getReactantCoeff(idxRef)
            : this.coeffManager.getProductCoeff(idxRef);
          const next = current >= 9 ? 1 : current + 1;
          if (sideRef === 'reactant') {
            this.coeffManager.setReactantCoeff(idxRef, next);
          } else {
            this.coeffManager.setProductCoeff(idxRef, next);
          }
          soundManager.coeffChange();
        } else {
          this._focusSlot(slotIndex);
        }
      });

      this.equationSlots.push({
        bg: slotBg, text: slotText, cursor,
        side: mol.side, index: mol.index
      });

      // Formula text
      const formulaText = this.add.text(x + 12, y, mol.formula, {
        fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
      }).setOrigin(0.5);
      this.equationTexts.push(formulaText);

      // Mini molecule orbs
      const orbContainer = this.add.container(x + 10, y + 28);
      let orbIdx = 0;
      for (const [element, count] of Object.entries(mol.elements)) {
        for (let c = 0; c < Math.min(count, 4); c++) {
          const totalOrbs = Object.values(mol.elements).reduce((a, b) => a + Math.min(b, 4), 0);
          const orbX = (orbIdx - totalOrbs / 2) * 14;
          const texKey = `orb_${element}`;
          if (this.textures.exists(texKey)) {
            orbContainer.add(this.add.image(orbX, 0, texKey).setScale(0.45));
          }
          orbIdx++;
        }
      }
      this.moleculeContainers.push({ container: orbContainer, mol });

      slotIdx++;

      // Plus / arrow separators
      const isLastReactant = mol.side === 'reactant' && mol.index === this.equation.reactants.length - 1;
      const isLastProduct = mol.side === 'product' && mol.index === this.equation.products.length - 1;

      if (isLastReactant) {
        this.add.text(startX + slotIdx * spacing, y, '\u2192', {
          fontFamily: PIXEL_FONT, fontSize: '18px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      } else if (!isLastProduct) {
        this.add.text(startX + slotIdx * spacing, y, '+', {
          fontFamily: PIXEL_FONT, fontSize: '16px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      }
    });

    // Set data for drag-drop
    this.equationSlots.forEach(slot => {
      slot.bg.setData('slotSide', slot.side);
      slot.bg.setData('slotIndex', slot.index);
    });

    // Auto-focus first slot
    this._focusSlot(0);
  }

  // ── Slot focus management ──

  _focusSlot(idx) {
    if (idx < 0 || idx >= this.equationSlots.length) return;
    if (this.focusedSlotIdx >= 0 && this.focusedSlotIdx !== idx) {
      const prev = this.equationSlots[this.focusedSlotIdx];
      if (prev) {
        prev.bg.clearTint();
        prev.cursor.setAlpha(0);
      }
    }
    this.focusedSlotIdx = idx;
    const slot = this.equationSlots[idx];
    slot.bg.setTint(0x00ccff);
    slot.cursor.setAlpha(1);
    soundManager.slotSelect();
  }

  _defocusSlot() {
    if (this.focusedSlotIdx >= 0) {
      const slot = this.equationSlots[this.focusedSlotIdx];
      if (slot) {
        slot.bg.clearTint();
        slot.cursor.setAlpha(0);
      }
    }
    this.focusedSlotIdx = -1;
  }

  _animateFocusCursor(time) {
    if (this.focusedSlotIdx < 0) return;
    const slot = this.equationSlots[this.focusedSlotIdx];
    if (slot) {
      slot.cursor.setAlpha(Math.sin(time * 0.006) > 0 ? 0.9 : 0);
    }
  }

  _updateEquationDisplay() {
    this.equationSlots.forEach((slot, i) => {
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

      if (i === this.focusedSlotIdx) {
        slot.bg.setTint(0x00ccff);
      }
    });
  }

  // ─────────────────────────────────────────────
  // BALANCE SCALE
  // ─────────────────────────────────────────────
  _buildScale() {
    const { width } = this.cameras.main;
    const cx = width / 2;
    const cy = this.SCALE_Y;

    // We no longer draw the medieval scale base/beam in the new design
    // Instead we place two separate pseudo-3D cylindrical platforms
    
    // Left platform (Reactants)
    this.leftPan = this.add.image(cx - 150, cy + 40, 'scale_pan').setScale(1.2);
    
    // Right platform (Products)
    this.rightPan = this.add.image(cx + 150, cy + 40, 'scale_pan').setScale(1.2);

    // Balance text indicator (now floating between platforms)
    this.balanceText = this.add.text(cx, cy + 10, '', {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#ffdd44'
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

    let leftTotal = 0, rightTotal = 0;
    for (const el of Object.values(result.elements)) {
      leftTotal += el.left;
      rightTotal += el.right;
    }

    const diff = leftTotal - rightTotal;
    const maxTilt = 15;
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
    // Medieval scale animation removed.
    // Instead we can just do a gentle float on the platforms.
    const time = Date.now();
    const floatOffsetL = Math.sin(time * 0.002) * 3;
    const floatOffsetR = Math.sin(time * 0.002 + Math.PI) * 3;
    
    if (this.leftPan) this.leftPan.y = this.SCALE_Y + 40 + floatOffsetL;
    if (this.rightPan) this.rightPan.y = this.SCALE_Y + 40 + floatOffsetR;
  }

  _animateMolecules(time) {
    this.moleculeContainers.forEach((mc, i) => {
      // Molecules float above the platform instead of below text
      const offset = Math.sin(time * 0.002 + i * 0.5) * 4;
      const isReactant = mc.mol.side === 'reactant';
      // Anchor them to their respective platforms
      const platformY = isReactant ? this.leftPan.y : this.rightPan.y;
      
      // Override the container's Y to sit on platform (roughly -30px above center)
      mc.container.y = platformY - 30 + offset;
    });
  }

  // ─────────────────────────────────────────────
  // DIVIDER LINE
  // ─────────────────────────────────────────────
  _buildDivider(width) {
    BattleUI.drawDivider(this, this.DIVIDER_Y, width, 0x333366);
  }

  // ─────────────────────────────────────────────
  // HP BARS (replaces atom count table)
  // ─────────────────────────────────────────────
  _buildHPBars() {
    const { width } = this.cameras.main;
    const allElements = EquationEngine.getElements(this.equation);
    const barWidth = 140; // Fixed width for panel
    const rowH = 24;
    const startY = this.HP_BAR_Y;
    const barX = 40; // Left side of panel

    // Title
    this.add.text(barX + barWidth / 2 + 20, startY - 10, 'ATOM COUNT', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#6677bb'
    }).setOrigin(0.5);

    this.hpBars = [];
    allElements.forEach((el, i) => {
      const y = startY + i * rowH + rowH / 2;
      const elData = elementsData[el] || {};
      const bar = new HPBar(this, barX, y, barWidth, el, elData.color || '#ffffff');
      this.hpBars.push({ element: el, bar });
    });
  }

  _updateHPBars() {
    const result = EquationEngine.validate(
      this.equation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    this.hpBars.forEach(({ element, bar }) => {
      const elInfo = result.elements[element] || { left: 0, right: 0, balanced: false };
      bar.update(elInfo.left, elInfo.right, elInfo.balanced);

      if (elInfo.balanced) {
        if (!this._prevBalancedSet.has(element)) {
          this._prevBalancedSet.add(element);
          soundManager.elementBalanced();
          bar.flash();
        }
      } else {
        this._prevBalancedSet.delete(element);
      }
    });
  }

  // ─────────────────────────────────────────────
  // 3×3 COEFFICIENT GRID
  // ─────────────────────────────────────────────
  _buildGrid(width, height) {
    const gridX = width - 150; // Right side of panel
    const gridY = this.GRID_CENTER_Y;

    // Instruction text
    this.add.text(gridX, gridY - 55, 'COEFFICIENT', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5);

    BattleUI.buildGrid(this, {
      gridCenterX: gridX,
      gridCenterY: gridY + 10,
      numColor: '#aaccff',
      onTap: (n) => {
        // Apply to focused slot
        if (this.focusedSlotIdx >= 0 && !this.levelComplete) {
          const slot = this.equationSlots[this.focusedSlotIdx];
          if (slot.side === 'reactant') {
            this.coeffManager.setReactantCoeff(slot.index, n);
          } else {
            this.coeffManager.setProductCoeff(slot.index, n);
          }
          soundManager.coeffChange();
          // Auto-advance
          const next = this.focusedSlotIdx + 1;
          if (next < this.equationSlots.length) {
            this._focusSlot(next);
          }
        }
      },
      onDragEnd: (n, pointer) => {
        this.equationSlots.forEach(slot => {
          const bounds = slot.bg.getBounds();
          if (bounds.contains(pointer.x, pointer.y)) {
            if (slot.side === 'reactant') {
              this.coeffManager.setReactantCoeff(slot.index, n);
            } else {
              this.coeffManager.setProductCoeff(slot.index, n);
            }
            soundManager.coeffChange();
          }
        });
      }
    });
  }

  // ─────────────────────────────────────────────
  // CHECK / HINT BUTTONS
  // ─────────────────────────────────────────────
  _buildCheckButton(width, height) {
    const checkX = width / 2; // Center of panel
    const checkY = this.CHECK_CENTER_Y;

    const checkBtn = this.add.image(checkX, checkY, 'btn_check').setScale(1.2);
    this.add.text(checkX, checkY, 'CHECK', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    checkBtn.setInteractive({ useHandCursor: true });
    checkBtn.on('pointerover', () => checkBtn.setTint(0x66ff99));
    checkBtn.on('pointerout', () => checkBtn.clearTint());
    checkBtn.on('pointerdown', () => {
      soundManager.buttonPress();
      this._checkAnswer();
    });
  }

  _buildHintButton(width) {
    const hintBtn = this.add.image(width - 30, 50, 'btn_hint').setScale(1.0);
    this.add.text(width - 30, 50, '?', {
      fontFamily: PIXEL_FONT, fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);

    hintBtn.setInteractive({ useHandCursor: true });
    hintBtn.on('pointerdown', () => {
      if (this.levelComplete) return;
      soundManager.hint();
      const hint = this.hintSystem.getNextHint();
      if (hint) this._showHint(hint);
    });
  }

  // ─────────────────────────────────────────────
  // HINT — via Professor Aurum
  // ─────────────────────────────────────────────
  _showHint(text) {
    const tier = this.hintSystem.getTier();
    this.professor.show(text, tier, this.SCALE_Y + 80);
  }

  // ─────────────────────────────────────────────
  // ANSWER CHECK
  // ─────────────────────────────────────────────
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
    soundManager.success();

    const timeSeconds = (Date.now() - this.startTime) / 1000;
    const hintsUsed = this.hintSystem.getHintsUsed();
    const isLowest = EquationEngine.isLowestTerms(this.coeffManager.getAllCoeffs());

    const score = ScoringSystem.calculateScore(
      timeSeconds, this.equation.par_time, hintsUsed, this.failedAttempts
    );
    let stars = ScoringSystem.calculateStars(hintsUsed);
    if (!isLowest && stars === 3) stars = 2;

    const streak = this.progression.incrementStreak();
    const multiplier = ScoringSystem.getStreakMultiplier(streak);
    const xp = ScoringSystem.calculateXP(score, multiplier);

    this.progression.addXP(xp);
    this.progression.completeLevel(this.equation.id, stars, timeSeconds, score);
    this._checkAchievements(timeSeconds, hintsUsed, streak);
    this._playVictoryAnimation();
    this.balanceText.setText('PERFECTLY BALANCED!').setColor('#00ff88');

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', {
        equation: this.equation, progression: this.progression,
        stars, score, xp, timeSeconds, hintsUsed, streak, isLowest
      });
    });
  }

  _onFail() {
    this.failedAttempts++;
    this.hintSystem.onFail();
    soundManager.fail();

    this.cameras.main.shake(100, 0.005);

    // Shake unbalanced HP bars
    const result = EquationEngine.validate(
      this.equation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );
    this.hpBars.forEach(({ element, bar }) => {
      const elInfo = result.elements[element];
      if (elInfo && !elInfo.balanced) {
        bar.shake();
      }
    });

    const { width } = this.cameras.main;
    if (this.textures.exists('particle_red')) {
      const emitter = this.add.particles(width / 2, this.SCALE_Y, 'particle_red', {
        speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 }, lifespan: 600, quantity: 10, emitting: false
      });
      emitter.explode(10);
      this.time.delayedCall(1000, () => emitter.destroy());
    }
  }

  _playVictoryAnimation() {
    const { width } = this.cameras.main;

    if (this.textures.exists('particle_gold')) {
      const emitter = this.add.particles(width / 2, this.SCALE_Y, 'particle_gold', {
        speed: { min: 80, max: 200 }, angle: { min: 220, max: 320 },
        scale: { start: 1.5, end: 0 }, lifespan: 1500, quantity: 30, emitting: false
      });
      emitter.explode(30);
      this.time.delayedCall(2000, () => emitter.destroy());
    }

    this.equationSlots.forEach(slot => {
      this.tweens.add({
        targets: slot.text, scaleX: 1.3, scaleY: 1.3, duration: 300, yoyo: true
      });
    });

    this.cameras.main.flash(300, 0, 255, 100);
  }

  _updateMoleculeVisuals() {
    this.moleculeContainers.forEach((mc) => {
      this.tweens.add({
        targets: mc.container, scaleX: 1.1, scaleY: 1.1, duration: 100, yoyo: true
      });
    });
  }

  _checkAchievements(timeSeconds, hintsUsed, streak) {
    this.progression.unlockAchievement('first_balance');
    if (timeSeconds < 5) this.progression.unlockAchievement('speed_demon');
    const completedCount = this.progression.getCompletedCount();
    if (hintsUsed === 0) {
      if (completedCount >= 10) this.progression.unlockAchievement('no_hints_10');
      if (completedCount >= 5) this.progression.unlockAchievement('no_hints_5');
    }
    if (streak >= 10) this.progression.unlockAchievement('streak_10');
    if (streak >= 5) this.progression.unlockAchievement('streak_5');
    if (completedCount >= 20) this.progression.unlockAchievement('level_20');
  }

  // ─────────────────────────────────────────────
  // KEYBOARD (text input + slot navigation)
  // ─────────────────────────────────────────────
  _setupKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (this.levelComplete) return;
      const key = event.key;

      // Number keys 1-9
      const num = parseInt(key);
      if (num >= 1 && num <= 9) {
        if (this.focusedSlotIdx >= 0) {
          const slot = this.equationSlots[this.focusedSlotIdx];
          if (slot.side === 'reactant') {
            this.coeffManager.setReactantCoeff(slot.index, num);
          } else {
            this.coeffManager.setProductCoeff(slot.index, num);
          }
          soundManager.coeffType();

          const next = this.focusedSlotIdx + 1;
          if (next < this.equationSlots.length) {
            this._focusSlot(next);
          }
        }
        return;
      }

      // Delete / Backspace
      if (key === 'Delete' || key === 'Backspace') {
        if (this.focusedSlotIdx >= 0) {
          const slot = this.equationSlots[this.focusedSlotIdx];
          if (slot.side === 'reactant') {
            this.coeffManager.setReactantCoeff(slot.index, 1);
          } else {
            this.coeffManager.setProductCoeff(slot.index, 1);
          }
          soundManager.coeffType();
        }
        return;
      }

      // Tab / ArrowRight
      if (key === 'Tab' || key === 'ArrowRight') {
        event.preventDefault();
        const next = (this.focusedSlotIdx + 1) % this.equationSlots.length;
        this._focusSlot(next);
        return;
      }

      // ArrowLeft
      if (key === 'ArrowLeft') {
        const prev = (this.focusedSlotIdx - 1 + this.equationSlots.length) % this.equationSlots.length;
        this._focusSlot(prev);
        return;
      }

      // Enter
      if (key === 'Enter') {
        soundManager.buttonPress();
        this._checkAnswer();
        return;
      }

      // Escape
      if (key === 'Escape') {
        this._defocusSlot();
        return;
      }

      // H → hint
      if (key === 'h' || key === 'H') {
        soundManager.hint();
        const hint = this.hintSystem.getNextHint();
        if (hint) this._showHint(hint);
      }
    });
  }
}
