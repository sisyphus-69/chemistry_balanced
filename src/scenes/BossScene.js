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
import equationsData from '../data/equations.json';

const BOSS_CONFIG = {
  10:  { equations: 2, time: 90,  failPenalty: 3,  timeBonus: 15, name: 'Dr. Entropy',             desc: 'Balance equations before time runs out!',    color: '#ff4444' },
  20:  { equations: 3, time: 80,  failPenalty: 3,  timeBonus: 12, name: 'The Combustion Engine',    desc: 'Speed round! Solve quickly!',                  color: '#ff8844' },
  30:  { equations: 3, time: 75,  failPenalty: 5,  timeBonus: 12, name: 'Professor Redox',          desc: 'Triple challenge! 3 equations in sequence.',   color: '#cc44ff' },
  40:  { equations: 3, time: 70,  failPenalty: 5,  timeBonus: 10, name: 'The Acid King',            desc: 'Prove your mastery with tough equations!',     color: '#44ff44' },
  50:  { equations: 4, time: 65,  failPenalty: 5,  timeBonus: 10, name: 'Chaos Reactor',            desc: 'The gauntlet intensifies!',                     color: '#ff44ff' },
  60:  { equations: 4, time: 60,  failPenalty: 7,  timeBonus: 8,  name: 'Crystal Warden',           desc: 'Guard of the crystal lab. 4 equations!',       color: '#00ffcc' },
  70:  { equations: 4, time: 55,  failPenalty: 7,  timeBonus: 8,  name: 'Solar Inferno',            desc: 'The forge burns bright. Stay sharp!',          color: '#ffaa00' },
  80:  { equations: 5, time: 50,  failPenalty: 7,  timeBonus: 7,  name: 'Leviathan',                desc: 'From the deep! 5 equations await.',            color: '#0066ff' },
  90:  { equations: 5, time: 45,  failPenalty: 10, timeBonus: 6,  name: 'Plasma Overlord',          desc: 'Extreme heat! Penalties are severe.',           color: '#ff00aa' },
  100: { equations: 6, time: 40,  failPenalty: 10, timeBonus: 5,  name: 'The Quantum Singularity',  desc: 'The ultimate test. 6 equations. No mercy.',    color: '#ffffff' }
};

/**
 * BossScene — Intense timed boss fight with region-themed RPG visuals,
 * heartbeat, HP bars, 3x3 grid, and dramatic visual effects.
 * Scaled for 1200x900 resolution.
 */
export class BossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossScene' });
  }

  init(data) {
    this.equation = data.equation;
    this.progression = data.progression;
    this.bossLevel = data.equation.level;
    this.region = getRegionForLevel(data.equation.level);
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

    // Grid layout system
    this.grid = new LayoutGrid(width, height);

    // Layout constants (scaled for 1200x900)
    this.EQUATION_Y = this.grid.rowY(0.42);
    this.HP_BAR_Y = this.grid.rowY(0.78);
    this.GRID_CENTER_Y = this.grid.rowY(0.80);
    this.CHECK_CENTER_Y = this.grid.rowY(0.80);

    // Build the fixed boss environment (region-themed control panel)
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
  // BACKGROUND — Region-themed with vignette + embers
  // ─────────────────────────────────────────────
  _buildBossEnvironment(width, height) {
    // Region-tinted background
    this.add.rectangle(width / 2, height / 2, width, height, this.region?.palette?.bg || 0x1a0a0a);

    // Edge glow (fixes bug: was referenced but never created)
    this._edgeGlow = this.add.graphics();
    this._edgeGlow.fillStyle(this.region?.palette?.accent || 0xff0000, 0.15);
    this._edgeGlow.fillRect(0, 0, width, 8);
    this._edgeGlow.fillRect(0, height - 8, width, 8);
    this._edgeGlow.fillRect(0, 0, 8, height);
    this._edgeGlow.fillRect(width - 8, 0, 8, height);
    this._edgeGlow.setAlpha(0.1);

    // Control panel at the bottom (tinted with region border color), scaled Y
    const panelY = height - 240;
    const panel = this.add.image(0, panelY, 'control_panel').setOrigin(0, 0);
    panel.setTint(this.region?.palette?.border || 0xffcccc);

    // CRT scanline overlay
    const crt = this.add.graphics();
    PanelRenderer.drawCRTOverlay(crt, width, height);

    this._buildBossHUD();
  }

  // ─────────────────────────────────────────────
  // BOSS EQUATIONS SETUP
  // ─────────────────────────────────────────────
  _setupBossEquations() {
    const config = BOSS_CONFIG[this.bossLevel] || BOSS_CONFIG[10];
    const nearby = equationsData.filter(eq =>
      eq.level >= this.bossLevel - 5 &&
      eq.level <= this.bossLevel &&
      !eq.boss
    );
    const shuffled = Phaser.Utils.Array.Shuffle([...nearby]);
    this.equationsToSolve = shuffled.slice(0, config.equations);
    while (this.equationsToSolve.length < config.equations) {
      this.equationsToSolve.push(this.equation);
    }
    this.bossMaxHealth = this.equationsToSolve.length;
    this.bossHealth = this.bossMaxHealth;
  }

  // ─────────────────────────────────────────────
  // BOSS INTRO — Dramatic region-themed splash
  // ─────────────────────────────────────────────
  _showBossIntro(onComplete) {
    const { width, height } = this.cameras.main;

    const boss = BOSS_CONFIG[this.bossLevel] || BOSS_CONFIG[10];

    const container = this.add.container(width / 2, height / 2);

    // Dark overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(-width / 2, -height / 2, width, height);
    container.add(bg);

    // Danger stripes with region accent
    const stripes = this.add.graphics();
    const stripeColor = this.region?.palette?.accent || 0xff0000;
    for (let i = 0; i < 8; i++) {
      stripes.fillStyle(stripeColor, 0.15 - i * 0.015);
      stripes.fillRect(-width / 2, -height / 2 + i * 4, width, 4);
      stripes.fillRect(-width / 2, height / 2 - (i + 1) * 4, width, 4);
    }
    container.add(stripes);

    // "BOSS FIGHT" — scaled 1.5x: 16px -> 24px
    const fightText = this.add.text(0, -60, 'BOSS FIGHT', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ff4444'
    }).setOrigin(0.5);
    container.add(fightText);

    // Boss name — scaled 1.5x: 24px -> 36px
    const nameText = this.add.text(0, -15, boss.name, {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: boss.color
    }).setOrigin(0.5).setScale(0).setAlpha(0);
    container.add(nameText);

    this.tweens.add({
      targets: nameText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 500, delay: 300, ease: 'Back.easeOut'
    });

    // Description — scaled 1.5x: 10px -> 15px
    const descText = this.add.text(0, 30, boss.desc, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#cc8888',
      wordWrap: { width: 400 }, align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    container.add(descText);
    this.tweens.add({ targets: descText, alpha: 1, duration: 400, delay: 600 });

    // Health segments preview — scaled 1.5x: 10px -> 15px
    const segText = this.add.text(0, 70, `\u2764 \u2764 \u2764  x${this.bossMaxHealth} equations`, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#ff6666'
    }).setOrigin(0.5).setAlpha(0);
    container.add(segText);
    this.tweens.add({ targets: segText, alpha: 1, duration: 300, delay: 800 });

    // Start prompt — scaled 1.5x: 12px -> 18px
    const startText = this.add.text(0, 105, '[ CLICK TO FIGHT ]', {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: '#ffffff'
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
    const config = BOSS_CONFIG[this.bossLevel] || BOSS_CONFIG[10];

    this.currentEquationIdx = 0;
    this._loadCurrentEquation();
    this._buildBossHUD();
    this._startHeartbeat();
    this._setupKeyboard();

    this.timeRemaining = config.time;
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

    // Equation number indicator — scaled 1.5x: 10px -> 15px
    const eqNum = this.add.text(width / 2, this.EQUATION_Y - 24, `Equation ${this.currentEquationIdx + 1} / ${this.bossMaxHealth}`, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#cc6666'
    }).setOrigin(0.5);
    this.equationContainer.add(eqNum);

    // Equation display — scaled 1.5x: 16px -> 24px
    const eqText = this.add.text(width / 2, this.EQUATION_Y, eq.display, {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ffcccc'
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

      // Slot scale: 0.9 -> 1.35
      const slotBg = this.add.image(x, y, 'coeff_slot').setScale(1.35);
      // Coefficient text: 16px -> 24px
      const slotText = this.add.text(x, y, '1', {
        fontFamily: PIXEL_FONT, fontSize: '24px', color: '#cc7777'
      }).setOrigin(0.5);
      // Cursor: 16x2 -> 24x3
      const cursor = this.add.rectangle(x, y + 14, 24, 3, 0xff4444).setAlpha(0);

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

      // Formula text: 14px -> 21px
      const formulaText = this.add.text(x, y + 28, mol.formula, {
        fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ddaaaa'
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

    // ── CHECK BUTTON — scaled 1.5x ──
    const checkX = width / 2;
    const checkY = this.CHECK_CENTER_Y;

    const checkBg = this.add.graphics();
    // Outer: 130x36 -> 195x54
    checkBg.fillStyle(0x661111, 1);
    checkBg.fillRect(checkX - 97, checkY - 27, 195, 54);
    // Inner: 126x32 -> 189x48
    checkBg.fillStyle(0x882222, 1);
    checkBg.fillRect(checkX - 94, checkY - 24, 189, 48);
    // Highlight: 116x10 -> 174x15
    checkBg.fillStyle(0xffffff, 0.06);
    checkBg.fillRect(checkX - 87, checkY - 22, 174, 15);
    // Border — scaled 1.5x
    checkBg.fillStyle(0xff4444, 0.5);
    checkBg.fillRect(checkX - 97, checkY - 27, 195, 3);
    checkBg.fillRect(checkX - 97, checkY + 24, 195, 3);
    checkBg.fillRect(checkX - 97, checkY - 27, 3, 54);
    checkBg.fillRect(checkX + 94, checkY - 27, 3, 54);
    this.equationContainer.add(checkBg);

    // CHECK text: 14px -> 21px
    const checkText = this.add.text(checkX, checkY, 'CHECK', {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ffffff'
    }).setOrigin(0.5);
    this.equationContainer.add(checkText);

    const checkZone = this.add.zone(checkX, checkY, 195, 54)
      .setInteractive({ useHandCursor: true });
    checkZone.on('pointerdown', () => {
      soundManager.buttonPress();
      this._bossCheck();
    });
    this.equationContainer.add(checkZone);

    // ── 3x3 GRID — scaled position: width - 150 -> width - 225 ──
    const gridX = width - 225;
    const gridY = this.GRID_CENTER_Y;

    // Grid instruction: 10px -> 15px
    const inst = this.add.text(gridX, gridY - 55, 'COEFFICIENT', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#ddaaaa'
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
    slot.bg.setTint(this.region?.palette?.accent || 0xff4444);
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
  // HP BARS (region-themed, replaces atom table)
  // ─────────────────────────────────────────────
  _buildBossHPBars(eq) {
    const { width } = this.cameras.main;
    const elements = EquationEngine.getElements(eq);
    // Scaled 1.5x: 140 -> 210
    const barWidth = 210;
    // Scaled 1.5x: 24 -> 36
    const rowH = 36;
    const startY = this.HP_BAR_Y;
    // Scaled 1.5x: 40 -> 60
    const barX = 60;

    // Title — scaled 1.5x: 10px -> 15px
    const title = this.add.text(barX + barWidth / 2 + 20, startY - 10, 'ATOM COUNT', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#cc4444'
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
    const accentHex = this.region?.palette?.accentHex || '#ff4444';
    this.bossSlots.forEach((slot, i) => {
      const coeff = slot.side === 'reactant'
        ? this.coeffManager.getReactantCoeff(slot.index)
        : this.coeffManager.getProductCoeff(slot.index);
      slot.text.setText(coeff.toString());
      slot.text.setColor(coeff > 1 ? accentHex : '#cc7777');
      slot.bg.setTexture(coeff > 1 ? 'coeff_slot_active' : 'coeff_slot');
      if (i === this.focusedSlotIdx) slot.bg.setTint(this.region?.palette?.accent || 0xff4444);
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

    // Timer — scaled 1.5x: 24px -> 36px
    this.bossTimerText = this.add.text(width / 2, 24, `${this.timeRemaining}`, {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#ff4444'
    }).setOrigin(0.5);

    // Timer label — scaled 1.5x: 8px -> 12px
    this.bossTimerLabel = this.add.text(width / 2, 48, 'SECONDS REMAINING', {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#993333'
    }).setOrigin(0.5);

    this.bossTimerGlow = this.add.text(width / 2, 24, `${this.timeRemaining}`, {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#ff0000'
    }).setOrigin(0.5).setAlpha(0).setScale(1.1);

    // Health bar — scaled 1.5x: 240x14 -> 360x21
    const barW = 360, barH = 21;
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

    // Health text — scaled 1.5x: 8px -> 12px
    this.healthText = this.add.text(width / 2, barY + barH + 12, `${this.bossHealth} / ${this.bossMaxHealth} remaining`, {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#cc6666'
    }).setOrigin(0.5);

    // Back button — scaled 1.5x: 10px -> 15px
    const backBtn = this.add.text(10, 10, '< Retreat', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#886666'
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
    // Scaled 1.5x: 240x14 -> 360x21
    const barW = 360, barH = 21;
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

      // Scaled 1.5x: 20px/18px/16px -> 30px/27px/24px
      if (this.timeRemaining <= 10) {
        this.bossTimerText.setColor('#ff0000').setFontSize('30px');
        soundManager.bossWarning();
        this.cameras.main.flash(100, 60, 0, 0);
      } else if (this.timeRemaining <= 20) {
        this.bossTimerText.setColor('#ff2222').setFontSize('27px');
      } else {
        this.bossTimerText.setColor('#ff4444').setFontSize('24px');
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
    const config = BOSS_CONFIG[this.bossLevel] || BOSS_CONFIG[10];

    this.bossHealth--;
    this.timeRemaining += config.timeBonus;

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
    const config = BOSS_CONFIG[this.bossLevel] || BOSS_CONFIG[10];

    this.failedAttempts++;
    this.timeRemaining -= config.failPenalty;
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

    // "BOSS DEFEATED!" title — scaled 1.5x: 24px -> 36px
    const defeatText = this.add.text(width / 2, height / 2 - 90, 'BOSS DEFEATED!', {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#00ff88'
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: defeatText,
      scaleX: 1, scaleY: 1,
      duration: 500, delay: 500, ease: 'Back.easeOut'
    });

    // XP display — scaled 1.5x: 20px -> 30px
    const xpText = this.add.text(width / 2, height / 2, `+${xp} XP`, {
      fontFamily: PIXEL_FONT, fontSize: '30px', color: '#ffdd44'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: xpText, alpha: 1, duration: 400, delay: 800 });

    // Stars — scaled 1.5x: spacing 40 -> 60
    for (let i = 0; i < 3; i++) {
      const sx = width / 2 - 60 + i * 60;
      const star = this.add.image(sx, height / 2 + 67,
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

    // "TIME'S UP!" — scaled 1.5x: 24px -> 36px
    const timeUpText = this.add.text(width / 2, height / 2 - 60, "TIME'S UP!", {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#ff2222'
    }).setOrigin(0.5).setScale(2).setAlpha(0);
    this.tweens.add({
      targets: timeUpText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 400, ease: 'Cubic.easeOut'
    });

    // Sub text — scaled 1.5x: 12px -> 18px
    const subText = this.add.text(width / 2, height / 2 + 15, 'The boss got away...', {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: '#aa6666'
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

    // Retry button — scaled 1.5x: 140x36 -> 210x54
    const retryBg = this.add.graphics();
    retryBg.fillStyle(0x881111, 1);
    retryBg.fillRect(width / 2 - 105, height / 2 + 60, 210, 54);
    retryBg.fillStyle(0xff4444, 0.4);
    retryBg.fillRect(width / 2 - 105, height / 2 + 60, 210, 3);
    retryBg.setAlpha(0);
    this.tweens.add({ targets: retryBg, alpha: 1, duration: 300, delay: 800 });

    // Retry text — scaled 1.5x: 14px -> 21px
    const retryText = this.add.text(width / 2, height / 2 + 87, 'RETRY', {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retryText, alpha: 1, duration: 300, delay: 800 });

    retryText.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.restart({ equation: this.equation, progression: this.progression });
    });

    // Menu button — scaled 1.5x: 10px -> 15px
    const menuText = this.add.text(width / 2, height / 2 + 142, '< Level Select', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#886666'
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
