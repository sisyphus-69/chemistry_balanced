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
import { LayoutGrid } from '../ui/LayoutGrid.js';
import { PanelRenderer } from '../ui/PanelRenderer.js';
import { getRegionForLevel } from '../data/regions.js';
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
    this.region = getRegionForLevel(this.equation.level);
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();
    this.grid = new LayoutGrid(width, height);

    // Systems
    this.coeffManager = new CoefficientManager(this, this.equation);
    this.hintSystem = new HintSystem(this.equation.hints);
    this.professor = new ProfessorAurum(this);

    // Layout constants (relative to viewport via grid)
    this.EQUATION_Y = this.grid.rowY(0.42);
    this.SCALE_Y = this.grid.rowY(0.14);

    // Bottom control panel area
    this.HP_BAR_Y = this.grid.rowY(0.78);
    this.GRID_CENTER_Y = this.grid.rowY(0.80);
    this.CHECK_CENTER_Y = this.grid.rowY(0.80);

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
    this.timerText = this.add.text(width - 22, 15, '0:00', {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#aaaacc'
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
    const panelY = height - 240;
    const img = this.add.image(0, panelY, 'control_panel').setOrigin(0, 0);
    if (this.region?.palette?.border) {
      img.setTint(this.region.palette.border);
    }
  }

  // ─────────────────────────────────────────────
  // LAB ENVIRONMENT
  // ─────────────────────────────────────────────
  _buildLabEnvironment(width, height) {
    // Fallback palette if region is null
    const palette = this.region?.palette || {
      bg: 0x080c12,
      bgLight: 0x0f1520,
      accent: 0x00ff88
    };

    // Deep dark base
    this.add.rectangle(width / 2, height / 2, width, height, palette.bg);

    const graphics = this.add.graphics();
    const horizonY = height * 0.35;

    // --- Wall / Cyber details ---
    graphics.fillStyle(palette.bgLight, 1);
    graphics.fillRect(0, 0, width, horizonY);

    // Some glowing wall panels
    graphics.fillStyle(0x112233, 0.8);
    graphics.fillRect(width * 0.1, horizonY - 120, width * 0.2, 60);
    graphics.fillRect(width * 0.7, horizonY - 120, width * 0.2, 60);

    graphics.fillStyle(palette.accent, 0.2);
    graphics.fillRect(width * 0.1, horizonY - 60, width * 0.2, 3);
    graphics.fillRect(width * 0.7, horizonY - 60, width * 0.2, 3);

    // --- Floor Perspective Grid ---
    graphics.lineStyle(1, palette.accent, 0.15);

    // Horizontal lines (getting thicker/spaced out towards bottom)
    let y = horizonY;
    let step = 5;
    while (y < height - 240) {
      graphics.lineBetween(0, y, width, y);
      y += step;
      step *= 1.25;
    }

    // Perspective lines radiating from center
    const vpX = width / 2;
    const vpY = horizonY - 75; // slightly above horizon
    for (let x = -width; x < width * 2; x += 150) {
      graphics.lineBetween(vpX, vpY, x, height);
    }

    // CRT scanline overlay
    const crtGraphics = this.add.graphics();
    PanelRenderer.drawCRTOverlay(crtGraphics, width, height);
  }

  // ─────────────────────────────────────────────
  // HEADER BAR
  // ─────────────────────────────────────────────
  _buildHeader(width, height) {
    const palette = this.region?.palette || { accent: 0x00ff88 };
    const headerH = this.grid.HEADER_H;

    // Header background
    const hdr = this.add.graphics();
    hdr.fillStyle(0x0d0d1e, 0.9);
    hdr.fillRect(0, 0, width, headerH);
    hdr.fillStyle(palette.accent, 0.4);
    hdr.fillRect(0, headerH - 1, width, 1);

    // Back button (cols 0-2)
    const backX = this.grid.colCenterX(0, 3);
    const backBtn = this.add.text(backX, this.grid.headerCenterY(), '< Back', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#8888aa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.start('MenuScene', { progression: this.progression });
    });

    // Level title (cols 3-8)
    const titleX = this.grid.colCenterX(3, 6);
    this.add.text(titleX, this.grid.headerCenterY() - 7, `Level ${this.equation.level}`, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#ffffff'
    }).setOrigin(0.5, 0);

    // Type subtitle
    this.add.text(titleX, this.grid.headerCenterY() + 8, this.equation.type.replace('_', ' ').toUpperCase(), {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#6666aa'
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
    const spacing = Math.min(135, (width - 120) / totalSlots);
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    let slotIdx = 0;

    allMolecules.forEach((mol) => {
      const x = startX + slotIdx * spacing;
      const y = this.EQUATION_Y;

      // Coefficient slot
      const slotBg = this.add.image(x - 39, y, 'coeff_slot').setScale(1.5);
      const slotText = this.add.text(x - 39, y, '1', {
        fontFamily: PIXEL_FONT, fontSize: '24px', color: '#7777cc'
      }).setOrigin(0.5);

      // Focus cursor (hidden by default)
      const cursor = this.add.rectangle(x - 33, y + 18, 24, 3, 0x00ccff).setAlpha(0);

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
      const formulaText = this.add.text(x + 18, y, mol.formula, {
        fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ffffff'
      }).setOrigin(0.5);
      this.equationTexts.push(formulaText);

      // Mini molecule orbs
      const orbContainer = this.add.container(x + 15, y + 42);
      let orbIdx = 0;
      for (const [element, count] of Object.entries(mol.elements)) {
        for (let c = 0; c < Math.min(count, 4); c++) {
          const totalOrbs = Object.values(mol.elements).reduce((a, b) => a + Math.min(b, 4), 0);
          const orbX = (orbIdx - totalOrbs / 2) * 21;
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
          fontFamily: PIXEL_FONT, fontSize: '27px', color: '#aaaacc'
        }).setOrigin(0.5);
        slotIdx++;
      } else if (!isLastProduct) {
        this.add.text(startX + slotIdx * spacing, y, '+', {
          fontFamily: PIXEL_FONT, fontSize: '24px', color: '#aaaacc'
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
    const focusTint = this.region?.palette?.accent || 0x00ccff;
    slot.bg.setTint(focusTint);
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
    const accentHex = this.region?.palette?.accentHex || '#00ff88';
    this.equationSlots.forEach((slot, i) => {
      const coeff = slot.side === 'reactant'
        ? this.coeffManager.getReactantCoeff(slot.index)
        : this.coeffManager.getProductCoeff(slot.index);

      slot.text.setText(coeff.toString());

      if (coeff > 1) {
        slot.text.setColor(accentHex);
        slot.bg.setTexture('coeff_slot_active');
      } else {
        slot.text.setColor('#7777cc');
        slot.bg.setTexture('coeff_slot');
      }

      if (i === this.focusedSlotIdx) {
        const focusTint = this.region?.palette?.accent || 0x00ccff;
        slot.bg.setTint(focusTint);
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

    // Left platform (Reactants)
    this.leftPan = this.add.image(cx - 225, cy + 60, 'scale_pan').setScale(1.8);

    // Right platform (Products)
    this.rightPan = this.add.image(cx + 225, cy + 60, 'scale_pan').setScale(1.8);

    // Balance text indicator (now floating between platforms)
    this.balanceText = this.add.text(cx, cy + 15, '', {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: '#ffdd44'
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

    const accentHex = this.region?.palette?.accentHex || '#00ff88';

    if (result.balanced) {
      this.targetAngle = 0;
      this.balanceText.setText('BALANCED!').setColor(accentHex);
    } else if (leftTotal > rightTotal) {
      this.balanceText.setText('Reactants heavier').setColor('#ffdd44');
    } else {
      this.balanceText.setText('Products heavier').setColor('#ffdd44');
    }
  }

  _animateScale(delta) {
    const time = Date.now();
    const floatOffsetL = Math.sin(time * 0.002) * 3;
    const floatOffsetR = Math.sin(time * 0.002 + Math.PI) * 3;

    if (this.leftPan) this.leftPan.y = this.SCALE_Y + 60 + floatOffsetL;
    if (this.rightPan) this.rightPan.y = this.SCALE_Y + 60 + floatOffsetR;
  }

  _animateMolecules(time) {
    this.moleculeContainers.forEach((mc, i) => {
      const offset = Math.sin(time * 0.002 + i * 0.5) * 4;
      const isReactant = mc.mol.side === 'reactant';
      const platformY = isReactant ? this.leftPan.y : this.rightPan.y;

      // Override the container's Y to sit on platform (roughly -45px above center)
      mc.container.y = platformY - 45 + offset;
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
    const barWidth = 210;
    const rowH = 36;
    const startY = this.HP_BAR_Y;
    const barX = 60;

    // Title
    this.add.text(barX + barWidth / 2 + 30, startY - 15, 'ATOM COUNT', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#6677bb'
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
    const gridX = width - 225;
    const gridY = this.grid.rowY(0.80);

    // Instruction text
    this.add.text(gridX, gridY - 82, 'COEFFICIENT', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#ffffff'
    }).setOrigin(0.5);

    BattleUI.buildGrid(this, {
      gridCenterX: gridX,
      gridCenterY: gridY + 15,
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
    const checkX = this.grid.centerX();
    const checkY = this.grid.rowY(0.80);

    const checkBtn = this.add.image(checkX, checkY, 'btn_check').setScale(1.8);
    this.add.text(checkX, checkY, 'CHECK', {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ffffff'
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
    const hintBtn = this.add.image(width - 45, 75, 'btn_hint').setScale(1.0);
    this.add.text(width - 45, 75, '?', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ffffff'
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
    this.professor.show(text, tier, this.SCALE_Y + 120);
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

    const accentHex = this.region?.palette?.accentHex || '#00ff88';
    this.balanceText.setText('PERFECTLY BALANCED!').setColor(accentHex);

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
