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
import equationsData from '../data/equations.json';

/**
 * BossScene — Intense timed boss fight with red RPG theme, heartbeat,
 * HP bars, 3×3 grid, and dramatic visual effects.
 */
export class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
  }

  init(data) {
    this.equation = data.equation;
    this.progression = data.progression;
    this.bossLevel = data.equation.level;
    this.failedAttempts = 0;
    this.startTime = 0;
    this.levelComplete = false;
    this.bossHealth = 3;
    this.bossMaxHealth = 3;
    this.timeRemaining = 60;
    this.currentEquationIdx = 0;
    this.equationsToSolve = [];
    this._heartbeatTimer = null;
    this._heartbeatInterval = 1100;
    this._prevBalancedSet = new Set();
    this.focusedSlotIdx = -1;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();

    // Layout constants
    this.EQUATION_Y = height * 0.45;
    this.HP_BAR_Y = 470;
    this.GRID_CENTER_Y = 520;
    this.CHECK_CENTER_Y = 520;

    // Build the fixed boss environment (red-themed control panel)
    this._buildBossEnvironment(width, height);

    this._setupBossEquations();

    this._showBossIntro(() => {
      this._startBossFight();
    });
  }

  update(time, delta) {
    if (this.levelComplete) return;
    // Pulse the vignette edges
    if (this._edgeGlow) {
      const pulse = 0.15 + Math.sin(time * 0.003) * 0.08;
      this._edgeGlow.setAlpha(pulse);
    }
    // Animate focused slot cursor
    if (this.focusedSlotIdx >= 0 && this.bossSlots && this.bossSlots[this.focusedSlotIdx]) {
      const slot = this.bossSlots[this.focusedSlotIdx];
      if (slot.cursor) {
        slot.cursor.setAlpha(Math.sin(time * 0.006) > 0 ? 0.9 : 0);
      }
    }
  }

  // ─────────────────────────────────────────────
  // BACKGROUND — Dark red with vignette + embers
  // ─────────────────────────────────────────────
  _buildBossEnvironment(width, height) {
    // Red-tinted background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0a0a);

    // Control panel at the bottom (tinted red)
    const panelY = height - 160;
    const panel = this.add.image(0, panelY, 'control_panel').setOrigin(0, 0);
    panel.setTint(0xffcccc);

    this._buildBossHUD();
  }

  // ─────────────────────────────────────────────
  // BOSS EQUATIONS SETUP
  // ─────────────────────────────────────────────
  _setupBossEquations() {
    const nearby = equationsData.filter(eq =>
      eq.level >= this.bossLevel - 5 &&
      eq.level <= this.bossLevel &&
      !eq.boss
    );
    const shuffled = Phaser.Utils.Array.Shuffle([...nearby]);
    this.equationsToSolve = shuffled.slice(0, 3);
    while (this.equationsToSolve.length < 3) {
      this.equationsToSolve.push(this.equation);
    }
    this.bossMaxHealth = this.equationsToSolve.length;
    this.bossHealth = this.bossMaxHealth;
  }

  // ─────────────────────────────────────────────
  // BOSS INTRO — Dramatic red splash
  // ─────────────────────────────────────────────
  _showBossIntro(onComplete) {
    const { width, height } = this.cameras.main;

    const bossNames = {
      10: { name: 'Dr. Entropy', desc: 'Balance 3 equations before time runs out!', color: '#ff4444' },
      20: { name: 'The Combustion Engine', desc: 'Speed round! Each equation must be solved quickly.', color: '#ff8844' },
      30: { name: 'Professor Redox', desc: 'Triple challenge! Solve 3 equations in sequence.', color: '#cc44ff' },
      40: { name: 'The Acid King', desc: 'Prove your mastery with tough equations!', color: '#44ff44' },
      50: { name: 'Chaos Reactor', desc: 'The ultimate challenge! Balance them all.', color: '#ff44ff' }
    };
    const boss = bossNames[this.bossLevel] || { name: 'Boss', desc: 'Defeat the boss!', color: '#ff4444' };

    const container = this.add.container(width / 2, height / 2);

    // Dark overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(-width / 2, -height / 2, width, height);
    container.add(bg);

    // Red danger stripes
    const stripes = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      stripes.fillStyle(0xff0000, 0.15 - i * 0.015);
      stripes.fillRect(-width / 2, -height / 2 + i * 4, width, 4);
      stripes.fillRect(-width / 2, height / 2 - (i + 1) * 4, width, 4);
    }
    container.add(stripes);

    // "BOSS FIGHT"
    const fightText = this.add.text(0, -60, 'BOSS FIGHT', {
      fontFamily: PIXEL_FONT, fontSize: '16px', color: '#ff4444'
    }).setOrigin(0.5);
    container.add(fightText);

    // Boss name
    const nameText = this.add.text(0, -15, boss.name, {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: boss.color
    }).setOrigin(0.5).setScale(0).setAlpha(0);
    container.add(nameText);

    this.tweens.add({
      targets: nameText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 500, delay: 300, ease: 'Back.easeOut'
    });

    // Description
    const descText = this.add.text(0, 30, boss.desc, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#cc8888',
      wordWrap: { width: 400 }, align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    container.add(descText);
    this.tweens.add({ targets: descText, alpha: 1, duration: 400, delay: 600 });

    // Health segments preview
    const segText = this.add.text(0, 70, `\u2764 \u2764 \u2764  x${this.bossMaxHealth} equations`, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ff6666'
    }).setOrigin(0.5).setAlpha(0);
    container.add(segText);
    this.tweens.add({ targets: segText, alpha: 1, duration: 300, delay: 800 });

    // Start prompt
    const startText = this.add.text(0, 105, '[ CLICK TO FIGHT ]', {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);
    container.add(startText);
    this.tweens.add({ targets: startText, alpha: 1, duration: 300, delay: 1000 });
    this.tweens.add({
      targets: startText, alpha: 0.3,
      duration: 600, yoyo: true, repeat: -1, delay: 1300
    });

    // Red particles
    if (this.textures.exists('particle_red')) {
      this.time.delayedCall(400, () => {
        const emitter = this.add.particles(width / 2, height / 2 - 15, 'particle_red', {
          speed: { min: 30, max: 80 },
          angle: { min: 0, max: 360 },
          scale: { start: 1, end: 0 },
          lifespan: 1000,
          frequency: 150,
          quantity: 2,
          tint: [0xff2222, 0xff4444, 0xff0000]
        });
        this.time.delayedCall(3000, () => emitter.stop());
      });
    }

    // Heartbeats
    this.time.delayedCall(500, () => soundManager.heartbeat(0.6));
    this.time.delayedCall(1500, () => soundManager.heartbeat(0.7));

    this.time.delayedCall(400, () => this.cameras.main.shake(200, 0.003));

    // Click to start
    this.input.once('pointerdown', () => {
      soundManager.bossRumble();
      this.cameras.main.flash(200, 80, 0, 0);
      this.tweens.add({
        targets: container, alpha: 0, duration: 400,
        onComplete: () => { container.destroy(); onComplete(); }
      });
    });
  }

  // ─────────────────────────────────────────────
  // START BOSS FIGHT
  // ─────────────────────────────────────────────
  _startBossFight() {
    this.currentEquationIdx = 0;
    this._loadCurrentEquation();
    this._buildBossHUD();
    this._startHeartbeat();
    this._setupKeyboard();

    this.timeRemaining = 60 + this.bossLevel;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this._updateBossHUD();
        if (this.timeRemaining <= 0) {
          this._onBossTimeOut();
        }
      },
      loop: true
    });
  }

  // ─────────────────────────────────────────────
  // HEARTBEAT
  // ─────────────────────────────────────────────
  _startHeartbeat() {
    this._doHeartbeat();
  }

  _doHeartbeat() {
    if (this.levelComplete) return;

    let intensity, interval;
    if (this.timeRemaining <= 10) {
      intensity = 1.0;
      interval = 500;
    } else if (this.timeRemaining <= 20) {
      intensity = 0.8;
      interval = 700;
    } else if (this.timeRemaining <= 35) {
      intensity = 0.6;
      interval = 900;
    } else {
      intensity = 0.4;
      interval = 1100;
    }

    soundManager.heartbeat(intensity);

    if (this._edgeGlow) {
      const flashAlpha = 0.1 + intensity * 0.25;
      this._edgeGlow.setAlpha(flashAlpha);
      this.tweens.add({
        targets: this._edgeGlow,
        alpha: 0.08,
        duration: interval * 0.6,
        ease: 'Sine.easeOut'
      });
    }

    if (this.bossTimerText && this.timeRemaining <= 20) {
      this.tweens.add({
        targets: this.bossTimerText,
        scaleX: 1.08, scaleY: 1.08,
        duration: 80, yoyo: true
      });
    }

    this._heartbeatTimer = this.time.delayedCall(interval, () => this._doHeartbeat());
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      this._heartbeatTimer.remove();
      this._heartbeatTimer = null;
    }
  }

  // ─────────────────────────────────────────────
  // LOAD CURRENT EQUATION
  // ─────────────────────────────────────────────
  _loadCurrentEquation() {
    const { width, height } = this.cameras.main;

    if (this.equationContainer) this.equationContainer.destroy();

    const eq = this.equationsToSolve[this.currentEquationIdx];
    if (!eq) return;

    this.currentEquation = eq;
    this.coeffManager = new CoefficientManager(this, eq);
    this.hintSystem = new HintSystem(eq.hints);
    this.professor = new ProfessorAurum(this);
    this._prevBalancedSet = new Set();
    this.focusedSlotIdx = -1;

    this.equationContainer = this.add.container(0, 0);

    // Equation number indicator
    const eqNum = this.add.text(width / 2, this.EQUATION_Y - 24, `Equation ${this.currentEquationIdx + 1} / ${this.bossMaxHealth}`, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#cc6666'
    }).setOrigin(0.5);
    this.equationContainer.add(eqNum);

    // Equation display
    const eqText = this.add.text(width / 2, this.EQUATION_Y, eq.display, {
      fontFamily: PIXEL_FONT, fontSize: '16px', color: '#ffcccc'
    }).setOrigin(0.5);
    this.equationContainer.add(eqText);

    // ── Coefficient slots ──
    this.bossSlots = [];
    const allMols = [...eq.reactants, ...eq.products];
    const totalSlots = allMols.length;
    const spacing = Math.min(100, (width - 100) / (totalSlots + 1));
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    allMols.forEach((mol, i) => {
      const isReactant = i < eq.reactants.length;
      const molIdx = isReactant ? i : i - eq.reactants.length;
      const x = startX + i * spacing;
      const y = this.EQUATION_Y + 40;

      const slotBg = this.add.image(x, y, 'coeff_slot').setScale(0.9);
      const slotText = this.add.text(x, y, '1', {
        fontFamily: PIXEL_FONT, fontSize: '16px', color: '#cc7777'
      }).setOrigin(0.5);
      const cursor = this.add.rectangle(x, y + 14, 16, 2, 0xff4444).setAlpha(0);

      const slotIndex = this.bossSlots.length;
      slotBg.setInteractive({ useHandCursor: true });
      slotBg.on('pointerdown', () => {
        if (this.levelComplete) return;
        if (this.focusedSlotIdx === slotIndex) {
          const current = isReactant
            ? this.coeffManager.getReactantCoeff(molIdx)
            : this.coeffManager.getProductCoeff(molIdx);
          const next = current >= 9 ? 1 : current + 1;
          if (isReactant) this.coeffManager.setReactantCoeff(molIdx, next);
          else this.coeffManager.setProductCoeff(molIdx, next);
          soundManager.coeffChange();
        } else {
          this._focusBossSlot(slotIndex);
        }
      });

      const formulaText = this.add.text(x, y + 28, mol.formula, {
        fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ddaaaa'
      }).setOrigin(0.5);

      this.equationContainer.add(slotBg);
      this.equationContainer.add(slotText);
      this.equationContainer.add(cursor);
      this.equationContainer.add(formulaText);

      this.bossSlots.push({
        bg: slotBg, text: slotText, cursor,
        side: isReactant ? 'reactant' : 'product',
        index: molIdx
      });
    });

    // ── Divider ──
    const divider = BattleUI.drawDivider(this, this.DIVIDER_Y, width, 0x882222);
    this.equationContainer.add(divider);

    // ── HP BARS ──
    this._buildBossHPBars(eq);

    // ── CHECK BUTTON ──
    const checkX = width / 2; // Center of panel
    const checkY = this.CHECK_CENTER_Y;

    const checkBg = this.add.graphics();
    checkBg.fillStyle(0x661111, 1);
    checkBg.fillRect(checkX - 65, checkY - 18, 130, 36);
    checkBg.fillStyle(0x882222, 1);
    checkBg.fillRect(checkX - 63, checkY - 16, 126, 32);
    checkBg.fillStyle(0xffffff, 0.06);
    checkBg.fillRect(checkX - 58, checkY - 15, 116, 10);
    // Border
    checkBg.fillStyle(0xff4444, 0.5);
    checkBg.fillRect(checkX - 65, checkY - 18, 130, 2);
    checkBg.fillRect(checkX - 65, checkY + 16, 130, 2);
    checkBg.fillRect(checkX - 65, checkY - 18, 2, 36);
    checkBg.fillRect(checkX + 63, checkY - 18, 2, 36);
    this.equationContainer.add(checkBg);

    const checkText = this.add.text(checkX, checkY, 'CHECK', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    this.equationContainer.add(checkText);

    const checkZone = this.add.zone(checkX, checkY, 130, 36)
      .setInteractive({ useHandCursor: true });
    checkZone.on('pointerdown', () => {
      soundManager.buttonPress();
      this._bossCheck();
    });
    this.equationContainer.add(checkZone);

    // ── 3×3 GRID ──
    const gridX = width - 150; // Right side of panel
    const gridY = this.GRID_CENTER_Y;

    const inst = this.add.text(gridX, gridY - 55, 'COEFFICIENT', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ddaaaa'
    }).setOrigin(0.5);
    this.equationContainer.add(inst);

    const tokens = BattleUI.buildGrid(this, {
      gridCenterX: gridX,
      gridCenterY: gridY + 10,
      numColor: '#cc8888',
      onTap: (n) => {
        if (this.focusedSlotIdx >= 0 && !this.levelComplete && this.bossSlots) {
          const slot = this.bossSlots[this.focusedSlotIdx];
          if (slot.side === 'reactant') this.coeffManager.setReactantCoeff(slot.index, n);
          else this.coeffManager.setProductCoeff(slot.index, n);
          soundManager.coeffChange();
          const next = this.focusedSlotIdx + 1;
          if (this.bossSlots && next < this.bossSlots.length) {
            this._focusBossSlot(next);
          }
        }
      },
      onDragEnd: (n, pointer) => {
        if (!this.bossSlots) return;
        this.bossSlots.forEach(slot => {
          const bounds = slot.bg.getBounds();
          if (bounds.contains(pointer.x, pointer.y)) {
            if (slot.side === 'reactant') this.coeffManager.setReactantCoeff(slot.index, n);
            else this.coeffManager.setProductCoeff(slot.index, n);
            soundManager.coeffChange();
          }
        });
      }
    });

    tokens.forEach(t => {
      this.equationContainer.add(t.btn);
      this.equationContainer.add(t.numText);
    });

    // Wire coefficient change
    this.coeffManager.onChange = () => {
      this._updateBossSlots();
      this._updateBossHPBars();
    };
    this.coeffManager._emitChange();

    // Auto-focus first slot
    this._focusBossSlot(0);

    // Slide-in animation
    this.equationContainer.setAlpha(0).setY(15);
    this.tweens.add({
      targets: this.equationContainer,
      alpha: 1, y: 0, duration: 300, ease: 'Cubic.easeOut'
    });
  }

  // ── Slot focus for boss ──
  _focusBossSlot(idx) {
    if (!this.bossSlots || idx < 0 || idx >= this.bossSlots.length) return;
    if (this.focusedSlotIdx >= 0 && this.bossSlots[this.focusedSlotIdx]) {
      const prev = this.bossSlots[this.focusedSlotIdx];
      prev.bg.clearTint();
      if (prev.cursor) prev.cursor.setAlpha(0);
    }
    this.focusedSlotIdx = idx;
    const slot = this.bossSlots[idx];
    slot.bg.setTint(0xff4444);
    if (slot.cursor) slot.cursor.setAlpha(1);
    soundManager.slotSelect();
  }

  _defocusBossSlot() {
    if (this.focusedSlotIdx >= 0 && this.bossSlots && this.bossSlots[this.focusedSlotIdx]) {
      const slot = this.bossSlots[this.focusedSlotIdx];
      slot.bg.clearTint();
      if (slot.cursor) slot.cursor.setAlpha(0);
    }
    this.focusedSlotIdx = -1;
  }

  // ─────────────────────────────────────────────
  // HP BARS (red-themed, replaces atom table)
  // ─────────────────────────────────────────────
  _buildBossHPBars(eq) {
    const { width } = this.cameras.main;
    const elements = EquationEngine.getElements(eq);
    const barWidth = 140; // Fixed width for panel
    const rowH = 24;
    const startY = this.HP_BAR_Y;
    const barX = 40; // Left side of panel

    // Title
    const title = this.add.text(barX + barWidth / 2 + 20, startY - 10, 'ATOM COUNT', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#cc4444'
    }).setOrigin(0.5);
    this.equationContainer.add(title);

    this.bossHPBars = [];
    elements.forEach((el, i) => {
      const y = startY + i * rowH + rowH / 2;
      const elData = elementsData[el] || {};
      const bar = new HPBar(this, barX, y, barWidth, el, elData.color || '#ffcccc');
      bar.addToContainer(this.equationContainer);
      this.bossHPBars.push({ element: el, bar });
    });
  }

  _updateBossSlots() {
    if (!this.bossSlots) return;
    this.bossSlots.forEach((slot, i) => {
      const coeff = slot.side === 'reactant'
        ? this.coeffManager.getReactantCoeff(slot.index)
        : this.coeffManager.getProductCoeff(slot.index);
      slot.text.setText(coeff.toString());
      slot.text.setColor(coeff > 1 ? '#ff4444' : '#cc7777');
      slot.bg.setTexture(coeff > 1 ? 'coeff_slot_active' : 'coeff_slot');
      if (i === this.focusedSlotIdx) slot.bg.setTint(0xff4444);
    });
  }

  _updateBossHPBars() {
    if (!this.currentEquation || !this.bossHPBars) return;
    const result = EquationEngine.validate(
      this.currentEquation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    this.bossHPBars.forEach(({ element, bar }) => {
      const el = result.elements[element];
      if (!el) return;
      bar.update(el.left, el.right, el.balanced);

      if (el.balanced) {
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
  // BOSS HUD — Timer, health bar, retreat button
  // ─────────────────────────────────────────────
  _buildBossHUD() {
    const { width } = this.cameras.main;

    // Timer
    this.bossTimerText = this.add.text(width / 2, 24, `${this.timeRemaining}`, {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ff4444'
    }).setOrigin(0.5);

    this.bossTimerLabel = this.add.text(width / 2, 48, 'SECONDS REMAINING', {
      fontFamily: PIXEL_FONT, fontSize: '8px', color: '#993333'
    }).setOrigin(0.5);

    this.bossTimerGlow = this.add.text(width / 2, 24, `${this.timeRemaining}`, {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ff0000'
    }).setOrigin(0.5).setAlpha(0).setScale(1.1);

    // Health bar
    const barW = 240, barH = 14;
    const barX = width / 2 - barW / 2;
    const barY = 50;

    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x1a0808, 0.9);
    trackBg.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    trackBg.fillStyle(0x882222, 0.5);
    trackBg.fillRect(barX - 2, barY - 2, barW + 4, 1);
    trackBg.fillRect(barX - 2, barY + barH + 1, barW + 4, 1);

    this.healthBarFill = this.add.graphics();
    this._drawHealthBar();

    // Segment dividers
    const segDiv = this.add.graphics();
    segDiv.fillStyle(0x1a0808, 1);
    for (let s = 1; s < this.bossMaxHealth; s++) {
      const sx = barX + (barW / this.bossMaxHealth) * s;
      segDiv.fillRect(sx - 1, barY, 2, barH);
    }

    this.healthText = this.add.text(width / 2, barY + barH + 12, `${this.bossHealth} / ${this.bossMaxHealth} remaining`, {
      fontFamily: PIXEL_FONT, fontSize: '8px', color: '#cc6666'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(10, 10, '< Retreat', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#886666'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      soundManager.buttonPress();
      this._stopHeartbeat();
      if (this.timerEvent) this.timerEvent.remove();
      this.scene.start('MenuScene', { progression: this.progression });
    });
  }

  _drawHealthBar() {
    const { width } = this.cameras.main;
    const barW = 240, barH = 14;
    const barX = width / 2 - barW / 2;
    const barY = 50;
    const pct = this.bossHealth / this.bossMaxHealth;

    this.healthBarFill.clear();

    let fillColor;
    if (pct > 0.66) fillColor = 0xff2222;
    else if (pct > 0.33) fillColor = 0xff6622;
    else fillColor = 0x00ff88;

    this.healthBarFill.fillStyle(fillColor, 1);
    this.healthBarFill.fillRect(barX, barY, barW * pct, barH);
    this.healthBarFill.fillStyle(0xffffff, 0.15);
    this.healthBarFill.fillRect(barX, barY, barW * pct, 4);
  }

  _updateBossHUD() {
    if (this.bossTimerText) {
      this.bossTimerText.setText(`${this.timeRemaining}`);

      if (this.timeRemaining <= 10) {
        this.bossTimerText.setColor('#ff0000').setFontSize('20px');
        soundManager.bossWarning();
        this.cameras.main.flash(100, 60, 0, 0);
      } else if (this.timeRemaining <= 20) {
        this.bossTimerText.setColor('#ff2222').setFontSize('18px');
      } else {
        this.bossTimerText.setColor('#ff4444').setFontSize('16px');
      }

      if (this.bossTimerGlow) {
        this.bossTimerGlow.setText(`${this.timeRemaining}`);
        this.bossTimerGlow.setAlpha(0.3).setScale(1.1);
        this.tweens.add({
          targets: this.bossTimerGlow,
          alpha: 0, scaleX: 1.3, scaleY: 1.3,
          duration: 400
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // CHECK / CORRECT / FAIL
  // ─────────────────────────────────────────────
  _bossCheck() {
    if (this.levelComplete) return;
    const result = EquationEngine.validate(
      this.currentEquation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );
    if (result.balanced) this._onBossCorrect();
    else this._onBossFail();
  }

  _onBossCorrect() {
    this.bossHealth--;
    this.timeRemaining += 10;

    soundManager.bossImpact();
    this.time.delayedCall(200, () => soundManager.success());

    this._drawHealthBar();
    if (this.healthText) {
      this.healthText.setText(`${this.bossHealth} / ${this.bossMaxHealth} remaining`);
    }

    this.cameras.main.flash(200, 0, 200, 50);
    this.cameras.main.shake(150, 0.006);

    const { width } = this.cameras.main;
    if (this.textures.exists('particle_green')) {
      const emitter = this.add.particles(width / 2, 200, 'particle_green', {
        speed: { min: 60, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 800,
        quantity: 15,
        emitting: false
      });
      emitter.explode(15);
      this.time.delayedCall(1000, () => emitter.destroy());
    }

    if (this.bossHealth <= 0) {
      this._onBossDefeated();
    } else {
      this.currentEquationIdx++;
      this.time.delayedCall(600, () => this._loadCurrentEquation());
    }
  }

  _onBossFail() {
    this.failedAttempts++;
    this.timeRemaining -= 3;
    soundManager.fail();

    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(150, 80, 0, 0);

    if (this._edgeGlow) {
      this._edgeGlow.setAlpha(0.5);
      this.tweens.add({
        targets: this._edgeGlow,
        alpha: 0.15, duration: 400
      });
    }

    // Shake unbalanced HP bars
    if (this.bossHPBars) {
      const result = EquationEngine.validate(
        this.currentEquation,
        this.coeffManager.reactantCoeffs,
        this.coeffManager.productCoeffs
      );
      this.bossHPBars.forEach(({ element, bar }) => {
        const el = result.elements[element];
        if (el && !el.balanced) {
          bar.shake();
        }
      });
    }

    const { width } = this.cameras.main;
    if (this.textures.exists('particle_red')) {
      const emitter = this.add.particles(width / 2, 200, 'particle_red', {
        speed: { min: 60, max: 160 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        lifespan: 600,
        quantity: 12,
        emitting: false,
        tint: [0xff0000, 0xff2222, 0xff4444]
      });
      emitter.explode(12);
      this.time.delayedCall(800, () => emitter.destroy());
    }
  }

  // ─────────────────────────────────────────────
  // BOSS DEFEATED
  // ─────────────────────────────────────────────
  _onBossDefeated() {
    this.levelComplete = true;
    this._stopHeartbeat();
    if (this.timerEvent) this.timerEvent.remove();

    const { width, height } = this.cameras.main;

    const timeSeconds = (Date.now() - this.startTime) / 1000;
    const stars = this.failedAttempts === 0 ? 3 : this.failedAttempts <= 2 ? 2 : 1;
    const score = ScoringSystem.calculateScore(timeSeconds, 120, 0, this.failedAttempts);
    const streak = this.progression.incrementStreak();
    const multiplier = ScoringSystem.getStreakMultiplier(streak);
    const xp = ScoringSystem.calculateXP(score * 2, multiplier);

    this.progression.addXP(xp);
    this.progression.completeLevel(this.equation.id, stars, timeSeconds, score);
    this.progression.unlockAchievement('boss_slayer');
    soundManager.bossDefeat();

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0).setAlpha(0);
    overlay.fillRect(0, 0, width, height);
    this.tweens.add({
      targets: overlay,
      alpha: 0.8, duration: 500,
      onUpdate: () => {
        overlay.clear();
        overlay.fillStyle(0x000000, overlay.alpha);
        overlay.fillRect(0, 0, width, height);
      }
    });

    // "BOSS DEFEATED!" title
    const defeatText = this.add.text(width / 2, height / 2 - 60, 'BOSS DEFEATED!', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#00ff88'
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: defeatText,
      scaleX: 1, scaleY: 1,
      duration: 500, delay: 500, ease: 'Back.easeOut'
    });

    // XP display
    const xpText = this.add.text(width / 2, height / 2, `+${xp} XP`, {
      fontFamily: PIXEL_FONT, fontSize: '20px', color: '#ffdd44'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: xpText, alpha: 1, duration: 400, delay: 800 });

    // Stars
    for (let i = 0; i < 3; i++) {
      const sx = width / 2 - 40 + i * 40;
      const star = this.add.image(sx, height / 2 + 45,
        i < stars ? 'star_filled' : 'star_empty'
      ).setScale(0).setOrigin(0.5).setAngle(-180);
      this.tweens.add({
        targets: star,
        scaleX: 2, scaleY: 2, angle: 0,
        duration: 300, delay: 1000 + i * 200, ease: 'Back.easeOut',
        onStart: () => { if (i < stars) soundManager.starReveal(); }
      });
    }

    // Particles
    if (this.textures.exists('particle_gold')) {
      this.time.delayedCall(500, () => {
        const emitter = this.add.particles(width / 2, height / 2, 'particle_gold', {
          speed: { min: 100, max: 300 },
          angle: { min: 0, max: 360 },
          scale: { start: 2, end: 0 },
          lifespan: 2500,
          quantity: 60,
          emitting: false
        });
        emitter.explode(60);
        this.time.delayedCall(3000, () => emitter.destroy());
      });
    }

    if (this.textures.exists('particle_green')) {
      this.time.delayedCall(700, () => {
        const emitter = this.add.particles(width / 2, height / 2, 'particle_green', {
          speed: { min: 80, max: 200 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.5, end: 0 },
          lifespan: 2000,
          quantity: 30,
          emitting: false
        });
        emitter.explode(30);
        this.time.delayedCall(2500, () => emitter.destroy());
      });
    }

    this.time.delayedCall(500, () => this.cameras.main.flash(400, 0, 255, 100));

    this.time.delayedCall(3500, () => {
      this.scene.start('ResultScene', {
        equation: this.equation, progression: this.progression,
        stars, score: score * 2, xp, timeSeconds,
        hintsUsed: 0, streak, isLowest: true
      });
    });
  }

  // ─────────────────────────────────────────────
  // BOSS TIME OUT
  // ─────────────────────────────────────────────
  _onBossTimeOut() {
    this.levelComplete = true;
    this._stopHeartbeat();
    if (this.timerEvent) this.timerEvent.remove();
    soundManager.bossTimeout();

    const { width, height } = this.cameras.main;
    this.progression.resetStreak();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x220000, 0.85);
    overlay.fillRect(0, 0, width, height);

    this.cameras.main.shake(400, 0.008);

    const timeUpText = this.add.text(width / 2, height / 2 - 40, "TIME'S UP!", {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ff2222'
    }).setOrigin(0.5).setScale(2).setAlpha(0);
    this.tweens.add({
      targets: timeUpText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 400, ease: 'Cubic.easeOut'
    });

    const subText = this.add.text(width / 2, height / 2 + 10, 'The boss got away...', {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#aa6666'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: subText, alpha: 1, duration: 300, delay: 500 });

    if (this.textures.exists('particle_red')) {
      const emitter = this.add.particles(width / 2, height / 2, 'particle_red', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        lifespan: 1500,
        quantity: 30,
        emitting: false,
        tint: [0xff0000, 0xff2222]
      });
      emitter.explode(30);
    }

    // Retry button
    const retryBg = this.add.graphics();
    retryBg.fillStyle(0x881111, 1);
    retryBg.fillRect(width / 2 - 70, height / 2 + 40, 140, 36);
    retryBg.fillStyle(0xff4444, 0.4);
    retryBg.fillRect(width / 2 - 70, height / 2 + 40, 140, 2);
    retryBg.setAlpha(0);
    this.tweens.add({ targets: retryBg, alpha: 1, duration: 300, delay: 800 });

    const retryText = this.add.text(width / 2, height / 2 + 58, 'RETRY', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retryText, alpha: 1, duration: 300, delay: 800 });

    retryText.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.restart({ equation: this.equation, progression: this.progression });
    });

    // Menu button
    const menuText = this.add.text(width / 2, height / 2 + 95, '< Level Select', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#886666'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: menuText, alpha: 1, duration: 300, delay: 1000 });

    menuText.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.start('MenuScene', { progression: this.progression });
    });
  }

  // ─────────────────────────────────────────────
  // KEYBOARD
  // ─────────────────────────────────────────────
  _setupKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (this.levelComplete) return;
      const key = event.key;

      const num = parseInt(key);
      if (num >= 1 && num <= 9 && this.focusedSlotIdx >= 0 && this.bossSlots) {
        const slot = this.bossSlots[this.focusedSlotIdx];
        if (slot) {
          if (slot.side === 'reactant') this.coeffManager.setReactantCoeff(slot.index, num);
          else this.coeffManager.setProductCoeff(slot.index, num);
          soundManager.coeffType();
          const next = this.focusedSlotIdx + 1;
          if (next < this.bossSlots.length) this._focusBossSlot(next);
        }
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        if (this.focusedSlotIdx >= 0 && this.bossSlots) {
          const slot = this.bossSlots[this.focusedSlotIdx];
          if (slot) {
            if (slot.side === 'reactant') this.coeffManager.setReactantCoeff(slot.index, 1);
            else this.coeffManager.setProductCoeff(slot.index, 1);
            soundManager.coeffType();
          }
        }
        return;
      }

      if (key === 'Tab' || key === 'ArrowRight') {
        event.preventDefault();
        if (this.bossSlots) {
          const next = (this.focusedSlotIdx + 1) % this.bossSlots.length;
          this._focusBossSlot(next);
        }
        return;
      }
      if (key === 'ArrowLeft') {
        if (this.bossSlots) {
          const prev = (this.focusedSlotIdx - 1 + this.bossSlots.length) % this.bossSlots.length;
          this._focusBossSlot(prev);
        }
        return;
      }

      if (key === 'Enter') {
        soundManager.buttonPress();
        this._bossCheck();
        return;
      }
      if (key === 'Escape') {
        this._defocusBossSlot();
      }
    });
  }
}
