import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { PIXEL_FONT } from '../ui/PixelText.js';
import { ProfessorAurum } from '../ui/ProfessorAurum.js';
import { BattleUI } from '../ui/BattleUI.js';

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
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();
    this.UI_PAD = 16;

    // New layout: slim bottom strip instead of 160px panel
    this.STRIP_H = 54;
    this.STRIP_Y = height - this.STRIP_H;
    this.PANEL_Y = this.STRIP_Y; // keep for divider compat

    // Systems
    this.coeffManager = new CoefficientManager(this, this.equation);
    this.hintSystem = new HintSystem(this.equation.hints);
    this.professor = new ProfessorAurum(this);

    // Layout constants (relative to viewport)
    this.EQUATION_Y = height * 0.35;
    this.TALLY_Y = this.EQUATION_Y + 80;

    // Background
    this._buildLabEnvironment(width, height);

    // ── Header bar ──
    this._buildHeader(width, height);

    // ── Bottom strip background ──
    this._buildBottomStrip(width, height);

    // ── Build UI sections ──
    this._buildEquationDisplay();
    this._buildSteppers();
    this._buildAtomTally();
    this._buildNumberStrip(width, height);
    this._buildCheckButton(width, height);
    this._buildHintButton(width);

    // Timer display
    this.timerText = this.add.text(width - this.UI_PAD, 10, '0:00', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#aaaacc'
    }).setOrigin(1, 0);

    this.hintOverlay = null;

    // Wire up coefficient change callback
    this.coeffManager.onChange = () => {
      this._updateEquationDisplay();
      this._updateAtomTally();
      this._updateMoleculeVisuals();
      this.hintSystem.resetIdle();
    };

    // Initial update
    this.coeffManager._emitChange();

    // Keyboard support
    this._setupKeyboard();

    // Ensure handlers are cleaned on scene shutdown/restart.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanupInputHandlers, this);

    // Click background to defocus slot
    this._onScenePointerDown = (pointer) => {
      if (this.focusedSlotIdx >= 0) {
        let hitSlot = false;
        this.equationSlots.forEach(s => {
          const b = s.bg.getBounds();
          if (b.contains(pointer.x, pointer.y)) hitSlot = true;
        });
        if (!hitSlot) this._defocusSlot();
      }
    };
    this.input.on('pointerdown', this._onScenePointerDown);
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
    this._animateFocusCursor(time);
  }

  // ─────────────────────────────────────────────
  // BOTTOM STRIP (slim replacement for control panel)
  // ─────────────────────────────────────────────
  _buildBottomStrip(width, height) {
    const g = this.add.graphics();
    g.fillStyle(0x0d0d1e, 0.95);
    g.fillRect(0, this.STRIP_Y, width, this.STRIP_H);
    g.fillStyle(0x333366, 0.4);
    g.fillRect(0, this.STRIP_Y, width, 1);
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
    

    // --- Floor Perspective Grid ---
    graphics.lineStyle(1, 0x00ff88, 0.15);
    
    // Horizontal lines (getting thicker/spaced out towards bottom)
    let y = horizonY;
    let step = 5;
    while (y < (this.STRIP_Y ?? (height - 54))) {
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
    const pad = this.UI_PAD || 16;
    // Header background
    const hdr = this.add.graphics();
    hdr.fillStyle(0x0d0d1e, 0.9);
    hdr.fillRect(0, 0, width, 34);
    hdr.fillStyle(0x333366, 0.4);
    hdr.fillRect(0, 33, width, 1);

    // Back button
    const backBtn = this.add.text(pad, 10, '< Back', {
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
    const usableWidth = width - (this.UI_PAD || 16) * 2 - 40;
    const spacing = Math.min(90, usableWidth / totalSlots);
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    let slotIdx = 0;

    allMolecules.forEach((mol) => {
      const x = startX + slotIdx * spacing;
      const y = this.EQUATION_Y;

      // Coefficient slot — centered at slotX, formula left-aligned at formulaX
      const slotX = x - 16;
      const formulaX = x + 8;
      const slotBg = this.add.image(slotX, y, 'coeff_slot').setScale(1.0);
      const slotText = this.add.text(slotX, y, '1', {
        fontFamily: PIXEL_FONT, fontSize: '16px', color: '#7777cc'
      }).setOrigin(0.5);

      // Focus cursor (hidden by default)
      const cursor = this.add.rectangle(slotX, y + 12, 16, 2, 0x00ccff).setAlpha(0);

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

      // Formula text — left-aligned so it never overlaps the coefficient slot
      const formulaText = this.add.text(formulaX, y, mol.formula, {
        fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.equationTexts.push(formulaText);

      // Mini molecule orbs — float above the equation row
      const orbContainer = this.add.container(x, y - 42);
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
  // INLINE STEPPERS (▲/▼ on each coefficient slot)
  // ─────────────────────────────────────────────
  _buildSteppers() {
    this.steppers = BattleUI.buildSteppers(this, this.equationSlots, this.coeffManager, {
      arrowTint: 0x8899cc,
      soundCoeffChange: () => soundManager.coeffChange()
    });
  }

  // ─────────────────────────────────────────────
  // ATOM TALLY BARS (visual balance feedback)
  // ─────────────────────────────────────────────
  _buildAtomTally() {
    const { width } = this.cameras.main;
    const pad = this.UI_PAD || 16;
    const tallyMaxW = Math.min(width - pad * 2, 460);
    const tallyX = (width - tallyMaxW) / 2;

    this.atomTally = BattleUI.buildAtomTally(this, this.equation, {
      x: tallyX,
      y: this.TALLY_Y,
      width: tallyMaxW
    });
  }

  _updateAtomTally() {
    if (!this.atomTally) return;
    this.atomTally.update(
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs,
      () => soundManager.elementBalanced()
    );
  }

  // ─────────────────────────────────────────────
  // NUMBER STRIP (compact 1-row 1–9 picker)
  // ─────────────────────────────────────────────
  _buildNumberStrip(width, height) {
    BattleUI.buildNumberStrip(this, {
      centerX: width / 2,
      centerY: this.STRIP_Y + this.STRIP_H / 2,
      numColor: '#aaccff',
      onTap: (n) => {
        if (this.focusedSlotIdx >= 0 && !this.levelComplete) {
          const slot = this.equationSlots[this.focusedSlotIdx];
          if (slot.side === 'reactant') {
            this.coeffManager.setReactantCoeff(slot.index, n);
          } else {
            this.coeffManager.setProductCoeff(slot.index, n);
          }
          soundManager.coeffChange();
          const next = this.focusedSlotIdx + 1;
          if (next < this.equationSlots.length) {
            this._focusSlot(next);
          }
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // CHECK / HINT BUTTONS
  // ─────────────────────────────────────────────
  _buildCheckButton(width, height) {
    const cx = width / 2;
    const cy = this.STRIP_Y - 28;
    const btnW = 120, btnH = 34;

    const bg = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(hover ? 0x004422 : 0x002a14, 1);
      bg.fillRect(cx - btnW / 2, cy - btnH / 2, btnW, btnH);
      bg.fillStyle(hover ? 0x007744 : 0x004433, 1);
      bg.fillRect(cx - btnW / 2 + 2, cy - btnH / 2 + 2, btnW - 4, btnH - 4);
      bg.fillStyle(hover ? 0x66ffaa : 0x33ff88, 0.12);
      bg.fillRect(cx - btnW / 2 + 2, cy - btnH / 2 + 2, btnW - 4, 4);
      bg.fillStyle(hover ? 0x66ffaa : 0x33ff88, 0.45);
      bg.fillRect(cx - btnW / 2, cy - btnH / 2, btnW, 1);
      bg.fillRect(cx - btnW / 2, cy + btnH / 2 - 1, btnW, 1);
      bg.fillRect(cx - btnW / 2, cy - btnH / 2, 1, btnH);
      bg.fillRect(cx + btnW / 2 - 1, cy - btnH / 2, 1, btnH);
    };
    draw(false);

    const label = this.add.text(cx, cy, 'CHECK', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#00ff88'
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { draw(true); label.setColor('#66ffbb'); });
    zone.on('pointerout', () => { draw(false); label.setColor('#00ff88'); });
    zone.on('pointerdown', () => {
      soundManager.buttonPress();
      this.tweens.add({
        targets: label, scaleX: 0.9, scaleY: 0.9, duration: 60,
        yoyo: true, ease: 'Quad.easeInOut',
        onComplete: () => this._checkAnswer()
      });
    });
  }

  _buildHintButton(width) {
    const x = width - (this.UI_PAD || 16) - 14;
    const hintBtn = this.add.image(x, 58, 'btn_hint').setScale(1.0);
    this.add.text(x, 58, '?', {
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
    const hintY = this.STRIP_Y - 80;
    this.professor.show(text, tier, hintY);
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

    const { width } = this.cameras.main;
    if (this.textures.exists('particle_red')) {
      const emitter = this.add.particles(width / 2, this.EQUATION_Y, 'particle_red', {
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
      const emitter = this.add.particles(width / 2, this.EQUATION_Y, 'particle_gold', {
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

  _cleanupInputHandlers() {
    if (this._onScenePointerDown) {
      this.input.off('pointerdown', this._onScenePointerDown);
      this._onScenePointerDown = null;
    }
    if (this._onKeyDown && this.input?.keyboard) {
      this.input.keyboard.off('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  // ─────────────────────────────────────────────
  // KEYBOARD (text input + slot navigation)
  // ─────────────────────────────────────────────
  _setupKeyboard() {
    if (this._onKeyDown) {
      this.input.keyboard.off('keydown', this._onKeyDown);
    }

    this._onKeyDown = (event) => {
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
    };

    this.input.keyboard.on('keydown', this._onKeyDown);
  }
}
