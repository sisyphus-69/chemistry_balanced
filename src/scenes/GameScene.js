import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import { soundManager } from '../systems/SoundManager.js';
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
    this.focusedSlotIdx = -1;          // which slot is accepting text input
    this._prevBalancedSet = new Set();  // track per-element ding
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();

    // Systems
    this.coeffManager = new CoefficientManager(this, this.equation);
    this.hintSystem = new HintSystem(this.equation.hints);

    // Layout constants
    this.EQUATION_Y = 75;
    this.SCALE_Y = 180;
    this.HUD_Y = 275;
    this.TOKEN_TRAY_Y = height - 48;

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
      soundManager.buttonPress();
      this.scene.start('MenuScene', { progression: this.progression });
    });

    // Build UI sections
    this._buildEquationDisplay();
    this._buildScale();
    this._buildHUD();
    this._buildTokenTray();
    this._buildCheckButton();
    this._buildHintButton();

    // Timer display
    this.timerText = this.add.text(width - 15, 15, '0:00', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
    }).setOrigin(1, 0);

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

    // Click background to defocus slot
    this.input.on('pointerdown', (pointer) => {
      // Only defocus if clicking empty space (no slot or button)
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
  // EQUATION DISPLAY  (with focusable text-input)
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
      const slotBg = this.add.image(x - 22, y, 'coeff_slot').setScale(0.8);
      const slotText = this.add.text(x - 22, y, '1', {
        fontFamily: 'monospace', fontSize: '18px', color: '#7777cc'
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
          // Focus this slot
          this._focusSlot(slotIndex);
        }
      });

      this.equationSlots.push({
        bg: slotBg, text: slotText, cursor,
        side: mol.side, index: mol.index
      });

      // Formula text
      const formulaText = this.add.text(x + 10, y, mol.formula, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
      }).setOrigin(0.5);
      this.equationTexts.push(formulaText);

      // Mini molecule orbs
      const orbContainer = this.add.container(x + 10, y + 30);
      let orbIdx = 0;
      for (const [element, count] of Object.entries(mol.elements)) {
        for (let c = 0; c < Math.min(count, 4); c++) {
          const totalOrbs = Object.values(mol.elements).reduce((a, b) => a + Math.min(b, 4), 0);
          const orbX = (orbIdx - totalOrbs / 2) * 14;
          const texKey = `orb_${element}`;
          if (this.textures.exists(texKey)) {
            orbContainer.add(this.add.image(orbX, 0, texKey).setScale(0.5));
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
          fontFamily: 'monospace', fontSize: '22px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      } else if (!isLastProduct) {
        this.add.text(startX + slotIdx * spacing, y, '+', {
          fontFamily: 'monospace', fontSize: '20px', color: '#aaaacc'
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
    // Defocus previous
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

      // Re-apply focus tint if this is the focused slot
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

    this.add.image(cx, cy + 40, 'scale_base').setScale(1.2);
    this.scaleBeam = this.add.image(cx, cy - 5, 'scale_beam').setScale(0.9);

    this.leftPan = this.add.image(cx - 115, cy + 5, 'scale_pan');
    this.leftPanLabel = this.add.text(cx - 115, cy + 18, 'Reactants', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8888aa'
    }).setOrigin(0.5);

    this.rightPan = this.add.image(cx + 115, cy + 5, 'scale_pan');
    this.rightPanLabel = this.add.text(cx + 115, cy + 18, 'Products', {
      fontFamily: 'monospace', fontSize: '9px', color: '#8888aa'
    }).setOrigin(0.5);

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
    const speed = 0.005 * delta;
    this.currentAngle += (this.targetAngle - this.currentAngle) * Math.min(speed, 1);
    this.scaleBeam.setAngle(this.currentAngle);

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

  // ─────────────────────────────────────────────
  // ATOM COUNT TABLE  (prominent, styled)
  // ─────────────────────────────────────────────
  _buildHUD() {
    const { width } = this.cameras.main;
    const y = this.HUD_Y;

    const allElements = EquationEngine.getElements(this.equation);
    const rowH = 30;
    const headerH = 32;
    const panelW = Math.min(460, width - 40);
    const panelX = width / 2 - panelW / 2;
    const totalH = headerH + allElements.length * rowH + 12;

    // ── Panel background ──
    this.hudBg = this.add.graphics();
    this.hudBg.fillStyle(0x12122a, 0.95);
    this.hudBg.fillRoundedRect(panelX, y, panelW, totalH, 10);
    this.hudBg.lineStyle(2, 0x3333aa, 0.5);
    this.hudBg.strokeRoundedRect(panelX, y, panelW, totalH, 10);

    // ── Column positions ──
    const colOrb = panelX + 24;
    const colSym = panelX + 55;
    const colLeft = panelX + panelW * 0.42;
    const colVs = panelX + panelW * 0.54;
    const colRight = panelX + panelW * 0.66;
    const colStatus = panelX + panelW - 32;

    // ── Title bar ──
    this.hudBg.fillStyle(0x1a1a3a, 1);
    this.hudBg.fillRoundedRect(panelX + 2, y + 2, panelW - 4, headerH - 2, { tl: 8, tr: 8, bl: 0, br: 0 });

    this.add.text(panelX + 14, y + headerH / 2, 'ATOM COUNT', {
      fontFamily: 'monospace', fontSize: '12px', color: '#6677bb', fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Column headers
    this.add.text(colLeft, y + headerH / 2, 'Reactants', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7788bb'
    }).setOrigin(0.5);
    this.add.text(colRight, y + headerH / 2, 'Products', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7788bb'
    }).setOrigin(0.5);

    // ── Separator line ──
    this.hudBg.lineStyle(1, 0x3344aa, 0.3);
    this.hudBg.lineBetween(panelX + 8, y + headerH, panelX + panelW - 8, y + headerH);

    // ── Data rows ──
    this.hudElements = [];

    allElements.forEach((el, i) => {
      const rowY = y + headerH + 6 + i * rowH + rowH / 2;

      // Alternating row stripe
      if (i % 2 === 0) {
        this.hudBg.fillStyle(0xffffff, 0.03);
        this.hudBg.fillRect(panelX + 4, rowY - rowH / 2 + 1, panelW - 8, rowH - 2);
      }

      const elData = elementsData[el] || {};

      // Element orb (larger)
      const texKey = `orb_${el}`;
      if (this.textures.exists(texKey)) {
        this.add.image(colOrb, rowY, texKey).setScale(0.7);
      }

      // Element symbol
      this.add.text(colSym, rowY, el, {
        fontFamily: 'monospace', fontSize: '15px', color: elData.color || '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      // Left count (reactants)
      const leftText = this.add.text(colLeft, rowY, '0', {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);

      // VS separator
      const vsText = this.add.text(colVs, rowY, ':', {
        fontFamily: 'monospace', fontSize: '14px', color: '#444466'
      }).setOrigin(0.5);

      // Right count (products)
      const rightText = this.add.text(colRight, rowY, '0', {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);

      // Status indicator (checkmark or X)
      const statusText = this.add.text(colStatus, rowY, '', {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);

      // Row highlight bar (hidden, flashes on change)
      const rowBar = this.add.rectangle(
        panelX + panelW / 2, rowY, panelW - 8, rowH - 2, 0x00ff88, 0
      );

      this.hudElements.push({
        element: el, leftText, rightText, statusText, vsText, rowBar
      });
    });
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
        hud.statusText.setText('\u2713'); // checkmark
        hud.leftText.setColor('#00ff88');
        hud.rightText.setColor('#00ff88');
        hud.statusText.setColor('#00ff88');
        hud.vsText.setColor('#00ff88');

        // Sound: ding when element first becomes balanced
        if (!this._prevBalancedSet.has(hud.element)) {
          this._prevBalancedSet.add(hud.element);
          soundManager.elementBalanced();

          // Flash the row green
          hud.rowBar.setAlpha(0.15);
          this.tweens.add({
            targets: hud.rowBar,
            alpha: 0,
            duration: 500
          });
        }
      } else {
        hud.statusText.setText('\u2717'); // X mark
        hud.leftText.setColor('#ff6644');
        hud.rightText.setColor('#ff6644');
        hud.statusText.setColor('#ff6644');
        hud.vsText.setColor('#444466');

        // Remove from balanced set so it can ding again
        this._prevBalancedSet.delete(hud.element);
      }
    });
  }

  // ─────────────────────────────────────────────
  // TOKEN TRAY
  // ─────────────────────────────────────────────
  _buildTokenTray() {
    const { width } = this.cameras.main;
    const y = this.TOKEN_TRAY_Y;

    this.add.text(width / 2, y - 20, 'Click a slot then type 1-9  |  Tap slot to cycle', {
      fontFamily: 'monospace', fontSize: '9px', color: '#555577'
    }).setOrigin(0.5);

    const trayW = 9 * 48;
    const startX = width / 2 - trayW / 2 + 24;

    for (let n = 1; n <= 9; n++) {
      const x = startX + (n - 1) * 48;
      const btn = this.add.image(x, y + 5, `token_${n}`).setScale(0.9);
      const numText = this.add.text(x, y + 5, n.toString(), {
        fontFamily: 'monospace', fontSize: '18px', color: '#aaccff'
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true, draggable: true });

      btn.on('dragstart', () => { btn.setScale(1.1); btn.setAlpha(0.7); });

      btn.on('drag', (pointer) => {
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
        if (this._dragSprite) { this._dragSprite.destroy(); this._dragSprite = null; }

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
      });
    }
  }

  // ─────────────────────────────────────────────
  // CHECK / HINT BUTTONS
  // ─────────────────────────────────────────────
  _buildCheckButton() {
    const { width } = this.cameras.main;
    const y = this.TOKEN_TRAY_Y - 50;

    const checkBtn = this.add.image(width / 2, y, 'btn_check');
    this.add.text(width / 2, y, 'CHECK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    checkBtn.setInteractive({ useHandCursor: true });
    checkBtn.on('pointerover', () => checkBtn.setTint(0x66ff99));
    checkBtn.on('pointerout', () => checkBtn.clearTint());
    checkBtn.on('pointerdown', () => {
      soundManager.buttonPress();
      this._checkAnswer();
    });
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
      soundManager.hint();
      const hint = this.hintSystem.getNextHint();
      if (hint) this._showHint(hint);
    });
  }

  // ─────────────────────────────────────────────
  // HINT OVERLAY
  // ─────────────────────────────────────────────
  _showHint(text) {
    if (this.hintOverlay) this.hintOverlay.destroy();

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

    this.time.delayedCall(5000, () => {
      if (this.hintOverlay) {
        this.tweens.add({
          targets: this.hintOverlay, alpha: 0, duration: 500,
          onComplete: () => {
            if (this.hintOverlay) { this.hintOverlay.destroy(); this.hintOverlay = null; }
          }
        });
      }
    });
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
          duration: 100, yoyo: true, repeat: 2
        });
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
  // KEYBOARD  (text input + slot navigation)
  // ─────────────────────────────────────────────
  _setupKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (this.levelComplete) return;
      const key = event.key;

      // Number keys 1-9 → set focused slot value directly
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

          // Auto-advance to next slot
          const next = this.focusedSlotIdx + 1;
          if (next < this.equationSlots.length) {
            this._focusSlot(next);
          }
        }
        return;
      }

      // Delete / Backspace → reset focused slot to 1
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

      // Tab / ArrowRight → next slot
      if (key === 'Tab' || key === 'ArrowRight') {
        event.preventDefault();
        const next = (this.focusedSlotIdx + 1) % this.equationSlots.length;
        this._focusSlot(next);
        return;
      }

      // Shift+Tab / ArrowLeft → previous slot
      if (key === 'ArrowLeft') {
        const prev = (this.focusedSlotIdx - 1 + this.equationSlots.length) % this.equationSlots.length;
        this._focusSlot(prev);
        return;
      }

      // Enter → check
      if (key === 'Enter') {
        soundManager.buttonPress();
        this._checkAnswer();
        return;
      }

      // Escape → defocus
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
