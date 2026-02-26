import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import elementsData from '../data/elements.json';
import equationsData from '../data/equations.json';

/**
 * BossScene — Intense timed boss fight with red theme, heartbeat,
 * prominent atom table, and dramatic visual effects.
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

    // ── Red-themed background ──
    this._buildBackground(width, height);

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
  _buildBackground(width, height) {
    // Deep dark red base
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a0808);

    // Subtle red gradient from edges
    const grad = this.add.graphics();
    // Top dark strip
    grad.fillStyle(0x0a0000, 0.6);
    grad.fillRect(0, 0, width, 60);
    // Bottom dark strip
    grad.fillStyle(0x0a0000, 0.5);
    grad.fillRect(0, height - 60, width, 60);

    // Red vignette — pulsing edge glow
    this._edgeGlow = this.add.graphics();
    this._drawEdgeGlow(width, height, 0.2);

    // Floating red ember particles
    if (this.textures.exists('particle_red')) {
      this.add.particles(width / 2, height + 20, 'particle_red', {
        speed: { min: 15, max: 45 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 4000,
        frequency: 200,
        quantity: 1,
        tint: [0xff2222, 0xff4444, 0xff6622],
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-width / 2, 0, width, 1)
        }
      });
    }
  }

  _drawEdgeGlow(width, height, alpha) {
    const g = this._edgeGlow;
    g.clear();
    // Left edge
    g.fillStyle(0xff0000, alpha);
    g.fillRect(0, 0, 3, height);
    g.fillStyle(0xff0000, alpha * 0.5);
    g.fillRect(3, 0, 5, height);
    g.fillStyle(0xff0000, alpha * 0.2);
    g.fillRect(8, 0, 8, height);
    // Right edge
    g.fillStyle(0xff0000, alpha);
    g.fillRect(width - 3, 0, 3, height);
    g.fillStyle(0xff0000, alpha * 0.5);
    g.fillRect(width - 8, 0, 5, height);
    g.fillStyle(0xff0000, alpha * 0.2);
    g.fillRect(width - 16, 0, 8, height);
    // Top edge
    g.fillStyle(0xff0000, alpha * 0.7);
    g.fillRect(0, 0, width, 2);
    g.fillStyle(0xff0000, alpha * 0.3);
    g.fillRect(0, 2, width, 4);
    // Bottom edge
    g.fillStyle(0xff0000, alpha * 0.7);
    g.fillRect(0, height - 2, width, 2);
    g.fillStyle(0xff0000, alpha * 0.3);
    g.fillRect(0, height - 6, width, 4);
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

    // Red danger stripes at top and bottom
    const stripes = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      stripes.fillStyle(0xff0000, 0.15 - i * 0.015);
      stripes.fillRect(-width / 2, -height / 2 + i * 4, width, 4);
      stripes.fillRect(-width / 2, height / 2 - (i + 1) * 4, width, 4);
    }
    container.add(stripes);

    // "BOSS FIGHT" — large, red, with glow
    const fightGlow = this.add.text(0, -60, 'BOSS FIGHT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff0000'
    }).setOrigin(0.5).setAlpha(0.3).setScale(1.1);
    container.add(fightGlow);

    const fightText = this.add.text(0, -60, 'BOSS FIGHT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(fightText);

    // Boss name — slams in
    const nameText = this.add.text(0, -15, boss.name, {
      fontFamily: 'monospace', fontSize: '32px', color: boss.color, fontStyle: 'bold'
    }).setOrigin(0.5).setScale(0).setAlpha(0);
    container.add(nameText);

    this.tweens.add({
      targets: nameText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 500, delay: 300, ease: 'Back.easeOut'
    });

    // Name glow
    const nameGlow = this.add.text(0, -15, boss.name, {
      fontFamily: 'monospace', fontSize: '32px', color: boss.color
    }).setOrigin(0.5).setAlpha(0).setScale(1.05);
    container.add(nameGlow);
    this.tweens.add({
      targets: nameGlow,
      alpha: { from: 0.3, to: 0.05 },
      scaleX: { from: 1.05, to: 1.15 },
      scaleY: { from: 1.05, to: 1.15 },
      duration: 1000, yoyo: true, repeat: -1, delay: 800
    });

    // Description
    const descText = this.add.text(0, 35, boss.desc, {
      fontFamily: 'monospace', fontSize: '12px', color: '#cc8888',
      wordWrap: { width: 400 }, align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    container.add(descText);
    this.tweens.add({ targets: descText, alpha: 1, duration: 400, delay: 600 });

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(1, 0xff2222, 0.4);
    divider.lineBetween(-120, 60, 120, 60);
    container.add(divider);

    // Health segments preview
    const segText = this.add.text(0, 78, `\u2764 \u2764 \u2764  ×${this.bossMaxHealth} equations`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ff6666'
    }).setOrigin(0.5).setAlpha(0);
    container.add(segText);
    this.tweens.add({ targets: segText, alpha: 1, duration: 300, delay: 800 });

    // Start prompt
    const startText = this.add.text(0, 115, '[ CLICK TO FIGHT ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    container.add(startText);
    this.tweens.add({ targets: startText, alpha: 1, duration: 300, delay: 1000 });
    this.tweens.add({
      targets: startText, alpha: 0.3,
      duration: 600, yoyo: true, repeat: -1, delay: 1300
    });

    // Red particles behind boss name
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

    // Single heartbeat on intro
    this.time.delayedCall(500, () => soundManager.heartbeat(0.6));
    this.time.delayedCall(1500, () => soundManager.heartbeat(0.7));

    // Screen shake on name reveal
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
  // HEARTBEAT — speeds up as time decreases
  // ─────────────────────────────────────────────
  _startHeartbeat() {
    this._doHeartbeat();
  }

  _doHeartbeat() {
    if (this.levelComplete) return;

    // Intensity and speed based on time remaining
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

    // Visual heartbeat pulse — flash red edges
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

    // Pulse the timer on heartbeat
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
    const { width } = this.cameras.main;

    if (this.equationContainer) this.equationContainer.destroy();

    const eq = this.equationsToSolve[this.currentEquationIdx];
    if (!eq) return;

    this.currentEquation = eq;
    this.coeffManager = new CoefficientManager(this, eq);
    this.hintSystem = new HintSystem(eq.hints);
    this._prevBalancedSet = new Set();
    this.focusedSlotIdx = -1;

    this.equationContainer = this.add.container(0, 0);

    // Equation number indicator
    const eqNum = this.add.text(width / 2, 88, `Equation ${this.currentEquationIdx + 1} / ${this.bossMaxHealth}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#cc6666'
    }).setOrigin(0.5);
    this.equationContainer.add(eqNum);

    // Equation display text
    const eqText = this.add.text(width / 2, 108, eq.display, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffcccc'
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
      const y = 160;

      const slotBg = this.add.image(x, y, 'coeff_slot').setScale(0.9);
      const slotText = this.add.text(x, y, '1', {
        fontFamily: 'monospace', fontSize: '20px', color: '#cc7777'
      }).setOrigin(0.5);
      const cursor = this.add.rectangle(x, y + 14, 16, 2, 0xff4444).setAlpha(0);

      const slotIndex = this.bossSlots.length;
      slotBg.setInteractive({ useHandCursor: true });
      slotBg.on('pointerdown', () => {
        if (this.levelComplete) return;
        if (this.focusedSlotIdx === slotIndex) {
          // Tap-to-cycle
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

      const formulaText = this.add.text(x, y + 32, mol.formula, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ddaaaa'
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

    // ── PROMINENT ATOM COUNT TABLE ──
    this._buildBossAtomTable(eq);

    // ── CHECK BUTTON ──
    const checkY = 365;
    const checkBg = this.add.graphics();
    checkBg.fillStyle(0x661111, 1);
    checkBg.fillRoundedRect(width / 2 - 65, checkY - 18, 130, 36, 8);
    checkBg.fillStyle(0x882222, 1);
    checkBg.fillRoundedRect(width / 2 - 63, checkY - 16, 126, 32, 7);
    checkBg.fillStyle(0xffffff, 0.06);
    checkBg.fillRoundedRect(width / 2 - 58, checkY - 15, 116, 12, 5);
    checkBg.lineStyle(1.5, 0xff4444, 0.5);
    checkBg.strokeRoundedRect(width / 2 - 65, checkY - 18, 130, 36, 8);
    this.equationContainer.add(checkBg);

    const checkText = this.add.text(width / 2, checkY, 'CHECK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.equationContainer.add(checkText);

    const checkZone = this.add.zone(width / 2, checkY, 130, 36)
      .setInteractive({ useHandCursor: true });
    checkZone.on('pointerdown', () => {
      soundManager.buttonPress();
      this._bossCheck();
    });
    checkZone.on('pointerover', () => checkBg.setAlpha(1.2));
    checkZone.on('pointerout', () => checkBg.setAlpha(1));
    this.equationContainer.add(checkZone);

    // ── NUMBER TRAY ──
    const trayY = 410;
    this.add.text(width / 2, trayY - 16, 'Click slot then type 1-9  |  Tap to cycle', {
      fontFamily: 'monospace', fontSize: '8px', color: '#664444'
    }).setOrigin(0.5);

    for (let n = 1; n <= 9; n++) {
      const x = width / 2 - 200 + (n - 1) * 48;
      const btn = this.add.image(x, trayY + 4, `token_${n}`).setScale(0.7);
      const numText = this.add.text(x, trayY + 4, n.toString(), {
        fontFamily: 'monospace', fontSize: '16px', color: '#cc8888'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true, draggable: true });

      btn.on('dragstart', () => { btn.setScale(0.85); btn.setAlpha(0.7); });
      btn.on('drag', (pointer) => {
        if (!this._dragSprite) {
          this._dragSprite = this.add.text(pointer.x, pointer.y, n.toString(), {
            fontFamily: 'monospace', fontSize: '22px', color: '#ff4444',
            backgroundColor: '#2a1515', padding: { x: 8, y: 4 }
          }).setOrigin(0.5);
        }
        this._dragSprite.setPosition(pointer.x, pointer.y);
      });
      btn.on('dragend', (pointer) => {
        btn.setScale(0.7); btn.setAlpha(1);
        if (this._dragSprite) { this._dragSprite.destroy(); this._dragSprite = null; }
        this.bossSlots.forEach(slot => {
          const bounds = slot.bg.getBounds();
          if (bounds.contains(pointer.x, pointer.y)) {
            if (slot.side === 'reactant') this.coeffManager.setReactantCoeff(slot.index, n);
            else this.coeffManager.setProductCoeff(slot.index, n);
            soundManager.coeffChange();
          }
        });
      });

      this.equationContainer.add(btn);
      this.equationContainer.add(numText);
    }

    // Wire coefficient change
    this.coeffManager.onChange = () => {
      this._updateBossSlots();
      this._updateBossAtomTable();
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
  // PROMINENT ATOM COUNT TABLE (red-themed)
  // ─────────────────────────────────────────────
  _buildBossAtomTable(eq) {
    const { width } = this.cameras.main;
    const elements = EquationEngine.getElements(eq);
    const rowH = 28;
    const headerH = 30;
    const panelW = Math.min(440, width - 50);
    const panelX = width / 2 - panelW / 2;
    const tableY = 210;
    const totalH = headerH + elements.length * rowH + 10;

    // Panel background — dark with red border
    const tableBg = this.add.graphics();
    tableBg.fillStyle(0x1a0808, 0.95);
    tableBg.fillRoundedRect(panelX, tableY, panelW, totalH, 10);
    tableBg.lineStyle(2, 0x882222, 0.6);
    tableBg.strokeRoundedRect(panelX, tableY, panelW, totalH, 10);
    this.equationContainer.add(tableBg);

    // Column positions
    const colOrb = panelX + 22;
    const colSym = panelX + 50;
    const colLeft = panelX + panelW * 0.40;
    const colVs = panelX + panelW * 0.52;
    const colRight = panelX + panelW * 0.64;
    const colStatus = panelX + panelW - 30;

    // Title bar
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x220808, 1);
    titleBg.fillRoundedRect(panelX + 2, tableY + 2, panelW - 4, headerH - 2, { tl: 8, tr: 8, bl: 0, br: 0 });
    this.equationContainer.add(titleBg);

    const titleText = this.add.text(panelX + 14, tableY + headerH / 2, 'ATOM COUNT', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cc4444', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.equationContainer.add(titleText);

    // Column headers
    const hdrLeft = this.add.text(colLeft, tableY + headerH / 2, 'Reactants', {
      fontFamily: 'monospace', fontSize: '9px', color: '#aa6666'
    }).setOrigin(0.5);
    const hdrRight = this.add.text(colRight, tableY + headerH / 2, 'Products', {
      fontFamily: 'monospace', fontSize: '9px', color: '#aa6666'
    }).setOrigin(0.5);
    this.equationContainer.add(hdrLeft);
    this.equationContainer.add(hdrRight);

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x882222, 0.3);
    sep.lineBetween(panelX + 8, tableY + headerH, panelX + panelW - 8, tableY + headerH);
    this.equationContainer.add(sep);

    // Data rows
    this.bossHudElements = [];
    elements.forEach((el, i) => {
      const rowY = tableY + headerH + 5 + i * rowH + rowH / 2;

      // Alternating stripe
      if (i % 2 === 0) {
        const stripe = this.add.graphics();
        stripe.fillStyle(0xff0000, 0.03);
        stripe.fillRect(panelX + 4, rowY - rowH / 2 + 1, panelW - 8, rowH - 2);
        this.equationContainer.add(stripe);
      }

      const elData = elementsData[el] || {};

      // Orb
      const texKey = `orb_${el}`;
      if (this.textures.exists(texKey)) {
        const orb = this.add.image(colOrb, rowY, texKey).setScale(0.65);
        this.equationContainer.add(orb);
      }

      // Symbol
      const symText = this.add.text(colSym, rowY, el, {
        fontFamily: 'monospace', fontSize: '14px', color: elData.color || '#ffcccc',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.equationContainer.add(symText);

      // Left count
      const leftText = this.add.text(colLeft, rowY, '0', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.equationContainer.add(leftText);

      // Separator
      const vsText = this.add.text(colVs, rowY, ':', {
        fontFamily: 'monospace', fontSize: '13px', color: '#443333'
      }).setOrigin(0.5);
      this.equationContainer.add(vsText);

      // Right count
      const rightText = this.add.text(colRight, rowY, '0', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.equationContainer.add(rightText);

      // Status
      const statusText = this.add.text(colStatus, rowY, '', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.equationContainer.add(statusText);

      // Row flash bar
      const rowBar = this.add.rectangle(
        panelX + panelW / 2, rowY, panelW - 8, rowH - 2, 0x00ff88, 0
      );
      this.equationContainer.add(rowBar);

      this.bossHudElements.push({ element: el, leftText, rightText, statusText, vsText, rowBar });
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

  _updateBossAtomTable() {
    if (!this.currentEquation || !this.bossHudElements) return;
    const result = EquationEngine.validate(
      this.currentEquation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    this.bossHudElements.forEach(hud => {
      const el = result.elements[hud.element];
      if (!el) return;
      hud.leftText.setText(el.left.toString());
      hud.rightText.setText(el.right.toString());

      if (el.balanced) {
        hud.statusText.setText('\u2713');
        hud.leftText.setColor('#00ff88');
        hud.rightText.setColor('#00ff88');
        hud.statusText.setColor('#00ff88');
        hud.vsText.setColor('#00ff88');

        if (!this._prevBalancedSet.has(hud.element)) {
          this._prevBalancedSet.add(hud.element);
          soundManager.elementBalanced();
          hud.rowBar.setAlpha(0.15);
          this.tweens.add({ targets: hud.rowBar, alpha: 0, duration: 500 });
        }
      } else {
        hud.statusText.setText('\u2717');
        hud.leftText.setColor('#ff6644');
        hud.rightText.setColor('#ff6644');
        hud.statusText.setColor('#ff6644');
        hud.vsText.setColor('#443333');
        this._prevBalancedSet.delete(hud.element);
      }
    });
  }

  // ─────────────────────────────────────────────
  // BOSS HUD — Timer, health bar, retreat button
  // ─────────────────────────────────────────────
  _buildBossHUD() {
    const { width } = this.cameras.main;

    // ── Timer ──
    this.bossTimerText = this.add.text(width / 2, 22, `${this.timeRemaining}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.bossTimerLabel = this.add.text(width / 2, 44, 'SECONDS REMAINING', {
      fontFamily: 'monospace', fontSize: '8px', color: '#993333'
    }).setOrigin(0.5);

    // Timer glow
    this.bossTimerGlow = this.add.text(width / 2, 22, `${this.timeRemaining}`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ff0000'
    }).setOrigin(0.5).setAlpha(0).setScale(1.1);

    // ── Health bar — segmented style ──
    const barW = 240, barH = 16;
    const barX = width / 2 - barW / 2;
    const barY = 55;

    // Bar track
    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x1a0808, 0.9);
    trackBg.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);
    trackBg.lineStyle(1.5, 0x882222, 0.5);
    trackBg.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 6);

    this.healthBarFill = this.add.graphics();
    this._drawHealthBar();

    // Segment dividers
    const segDiv = this.add.graphics();
    segDiv.lineStyle(2, 0x1a0808, 0.8);
    for (let s = 1; s < this.bossMaxHealth; s++) {
      const sx = barX + (barW / this.bossMaxHealth) * s;
      segDiv.lineBetween(sx, barY, sx, barY + barH);
    }

    // Health label
    this.healthText = this.add.text(width / 2, barY + barH + 8, `${this.bossHealth} / ${this.bossMaxHealth} remaining`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#cc6666'
    }).setOrigin(0.5);

    // ── Back button ──
    const backBtn = this.add.text(15, 12, '\u25C0 Retreat', {
      fontFamily: 'monospace', fontSize: '11px', color: '#886666'
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
    const barW = 240, barH = 16;
    const barX = width / 2 - barW / 2;
    const barY = 55;
    const pct = this.bossHealth / this.bossMaxHealth;

    this.healthBarFill.clear();

    // Fill color transitions as health drops
    let fillColor;
    if (pct > 0.66) fillColor = 0xff2222;
    else if (pct > 0.33) fillColor = 0xff6622;
    else fillColor = 0x00ff88;

    // Main fill
    this.healthBarFill.fillStyle(fillColor, 1);
    this.healthBarFill.fillRoundedRect(barX, barY, barW * pct, barH, 4);

    // Top highlight
    this.healthBarFill.fillStyle(0xffffff, 0.15);
    this.healthBarFill.fillRoundedRect(barX + 2, barY + 1, barW * pct - 4, barH / 2 - 1, { tl: 3, tr: 3, bl: 0, br: 0 });
  }

  _updateBossHUD() {
    if (this.bossTimerText) {
      this.bossTimerText.setText(`${this.timeRemaining}`);

      // Color and size ramp as time decreases
      if (this.timeRemaining <= 10) {
        this.bossTimerText.setColor('#ff0000').setFontSize('30px');
        // Warning alarm every tick
        soundManager.bossWarning();
        // Red flash
        this.cameras.main.flash(100, 60, 0, 0);
      } else if (this.timeRemaining <= 20) {
        this.bossTimerText.setColor('#ff2222').setFontSize('28px');
      } else {
        this.bossTimerText.setColor('#ff4444').setFontSize('26px');
      }

      // Glow pulse on each tick
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

    // Green flash + shake
    this.cameras.main.flash(200, 0, 200, 50);
    this.cameras.main.shake(150, 0.006);

    // Green particle burst
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

    // Intense red shake
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(150, 80, 0, 0);

    // Pulse red edges hard
    if (this._edgeGlow) {
      this._edgeGlow.setAlpha(0.5);
      this.tweens.add({
        targets: this._edgeGlow,
        alpha: 0.15, duration: 400
      });
    }

    // Shake unbalanced elements in table
    if (this.bossHudElements) {
      const result = EquationEngine.validate(
        this.currentEquation,
        this.coeffManager.reactantCoeffs,
        this.coeffManager.productCoeffs
      );
      this.bossHudElements.forEach(hud => {
        const el = result.elements[hud.element];
        if (el && !el.balanced) {
          this.tweens.add({
            targets: [hud.leftText, hud.rightText],
            scaleX: 1.3, scaleY: 1.3,
            duration: 80, yoyo: true, repeat: 2
          });
        }
      });
    }

    // Red particles
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
      fontFamily: 'monospace', fontSize: '34px', color: '#00ff88', fontStyle: 'bold'
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: defeatText,
      scaleX: 1, scaleY: 1,
      duration: 500, delay: 500, ease: 'Back.easeOut'
    });

    // Glow behind
    const defeatGlow = this.add.text(width / 2, height / 2 - 60, 'BOSS DEFEATED!', {
      fontFamily: 'monospace', fontSize: '34px', color: '#00ff88'
    }).setOrigin(0.5).setAlpha(0).setScale(1.1);
    this.tweens.add({
      targets: defeatGlow,
      alpha: { from: 0.3, to: 0 }, scaleX: 1.3, scaleY: 1.3,
      duration: 800, delay: 600
    });

    // XP display
    const xpText = this.add.text(width / 2, height / 2, `+${xp} XP`, {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffdd44', fontStyle: 'bold'
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

    // Massive particle explosion
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

    // Green particles too
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

    // Screen flash
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

    // Dark overlay with red tint
    const overlay = this.add.graphics();
    overlay.fillStyle(0x220000, 0.85);
    overlay.fillRect(0, 0, width, height);

    // Heavy camera shake
    this.cameras.main.shake(400, 0.008);

    // "TIME'S UP!" — slams in
    const timeUpText = this.add.text(width / 2, height / 2 - 40, "TIME'S UP!", {
      fontFamily: 'monospace', fontSize: '32px', color: '#ff2222', fontStyle: 'bold'
    }).setOrigin(0.5).setScale(2).setAlpha(0);
    this.tweens.add({
      targets: timeUpText,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 400, ease: 'Cubic.easeOut'
    });

    const subText = this.add.text(width / 2, height / 2 + 5, 'The boss got away...', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aa6666'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: subText, alpha: 1, duration: 300, delay: 500 });

    // Red particles
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
    const retryBtnBg = this.add.graphics();
    retryBtnBg.fillStyle(0x881111, 1);
    retryBtnBg.fillRoundedRect(width / 2 - 70, height / 2 + 40, 140, 36, 8);
    retryBtnBg.lineStyle(1, 0xff4444, 0.4);
    retryBtnBg.strokeRoundedRect(width / 2 - 70, height / 2 + 40, 140, 36, 8);
    retryBtnBg.setAlpha(0);
    this.tweens.add({ targets: retryBtnBg, alpha: 1, duration: 300, delay: 800 });

    const retryText = this.add.text(width / 2, height / 2 + 58, 'RETRY', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retryText, alpha: 1, duration: 300, delay: 800 });

    retryText.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.restart({ equation: this.equation, progression: this.progression });
    });

    // Menu button
    const menuText = this.add.text(width / 2, height / 2 + 95, '\u25C0 Level Select', {
      fontFamily: 'monospace', fontSize: '11px', color: '#886666'
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: menuText, alpha: 1, duration: 300, delay: 1000 });

    menuText.on('pointerdown', () => {
      soundManager.buttonPress();
      this.scene.start('MenuScene', { progression: this.progression });
    });
  }

  // ─────────────────────────────────────────────
  // KEYBOARD (text input + navigation)
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
