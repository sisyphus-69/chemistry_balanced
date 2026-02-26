import Phaser from 'phaser';
import { EquationEngine } from '../systems/EquationEngine.js';
import { CoefficientManager } from '../systems/CoefficientManager.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { HintSystem } from '../systems/HintSystem.js';
import elementsData from '../data/elements.json';
import equationsData from '../data/equations.json';

/**
 * BossScene — Special boss fight variants every 10 levels.
 *
 * Boss types based on level:
 *  10: Dr. Entropy — Timed, 3 equations, correct adds time
 *  20: The Combustion Engine — Conveyor belt style
 *  30: Professor Redox — Must solve faster each round
 *  40: The Acid King — Fogged coefficients, tap to reveal
 *  50: Chaos Reactor — Endless survival, increasing speed
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
    this.bossHealth = 3; // equations to solve
    this.bossMaxHealth = 3;
    this.timeRemaining = 60; // seconds
    this.currentEquationIdx = 0;
    this.equationsToSolve = [];
  }

  create() {
    const { width, height } = this.cameras.main;
    this.startTime = Date.now();

    // Background — darker, more menacing
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a);

    // Pick boss equations (use nearby-difficulty equations)
    this._setupBossEquations();

    // Boss intro splash
    this._showBossIntro(() => {
      this._startBossFight();
    });
  }

  _setupBossEquations() {
    // Get 3 equations around the boss level difficulty
    const nearby = equationsData.filter(eq =>
      eq.level >= this.bossLevel - 5 &&
      eq.level <= this.bossLevel &&
      !eq.boss
    );

    // Shuffle and pick 3
    const shuffled = Phaser.Utils.Array.Shuffle([...nearby]);
    this.equationsToSolve = shuffled.slice(0, 3);

    // If we don't have 3, pad with the boss equation itself
    while (this.equationsToSolve.length < 3) {
      this.equationsToSolve.push(this.equation);
    }

    this.bossMaxHealth = this.equationsToSolve.length;
    this.bossHealth = this.bossMaxHealth;
  }

  _showBossIntro(onComplete) {
    const { width, height } = this.cameras.main;

    const bossNames = {
      10: { name: 'Dr. Entropy', desc: 'Balance 3 equations before time runs out!', color: '#ff4444' },
      20: { name: 'The Combustion Engine', desc: 'Speed round! Each equation must be solved quickly.', color: '#ff8844' },
      30: { name: 'Professor Redox', desc: 'Triple challenge! Solve 3 equations in sequence.', color: '#8844ff' },
      40: { name: 'The Acid King', desc: 'Prove your mastery with tough equations!', color: '#44ff44' },
      50: { name: 'Chaos Reactor', desc: 'The ultimate challenge! Balance them all.', color: '#ff44ff' }
    };

    const boss = bossNames[this.bossLevel] || { name: 'Boss', desc: 'Defeat the boss!', color: '#ff4444' };

    const container = this.add.container(width / 2, height / 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(-width / 2, -height / 2, width, height);
    container.add(bg);

    const titleText = this.add.text(0, -40, 'BOSS FIGHT', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff4444'
    }).setOrigin(0.5);
    container.add(titleText);

    const nameText = this.add.text(0, -10, boss.name, {
      fontFamily: 'monospace', fontSize: '28px', color: boss.color, fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(nameText);

    const descText = this.add.text(0, 30, boss.desc, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaacc',
      wordWrap: { width: 400 }, align: 'center'
    }).setOrigin(0.5);
    container.add(descText);

    const startText = this.add.text(0, 80, '[ CLICK TO START ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add(startText);

    // Pulse the start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Click to start
    this.input.once('pointerdown', () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          container.destroy();
          onComplete();
        }
      });
    });
  }

  _startBossFight() {
    this.currentEquationIdx = 0;
    this._loadCurrentEquation();
    this._buildBossHUD();

    // Start timer
    this.timeRemaining = 60 + this.bossLevel; // More time for harder bosses
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

  _loadCurrentEquation() {
    const { width, height } = this.cameras.main;

    // Clean up previous equation display
    if (this.equationContainer) {
      this.equationContainer.destroy();
    }

    const eq = this.equationsToSolve[this.currentEquationIdx];
    if (!eq) return;

    this.currentEquation = eq;
    this.coeffManager = new CoefficientManager(this, eq);
    this.hintSystem = new HintSystem(eq.hints);

    // Build equation display in a container
    this.equationContainer = this.add.container(0, 0);

    // Equation text
    const eqText = this.add.text(width / 2, 120, eq.display, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);
    this.equationContainer.add(eqText);

    // Build coefficient slots
    this.bossSlots = [];
    const allMols = [...eq.reactants, ...eq.products];
    const totalSlots = allMols.length;
    const spacing = Math.min(100, (width - 100) / (totalSlots + 1));
    const startX = width / 2 - (totalSlots * spacing) / 2 + spacing / 2;

    allMols.forEach((mol, i) => {
      const isReactant = i < eq.reactants.length;
      const molIdx = isReactant ? i : i - eq.reactants.length;
      const x = startX + i * spacing;
      const y = 180;

      const slotBg = this.add.image(x, y, 'coeff_slot').setScale(0.9);
      const slotText = this.add.text(x, y, '1', {
        fontFamily: 'monospace', fontSize: '20px', color: '#7777cc'
      }).setOrigin(0.5);

      const formulaText = this.add.text(x, y + 30, mol.formula, {
        fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
      }).setOrigin(0.5);

      slotBg.setInteractive({ useHandCursor: true });
      slotBg.on('pointerdown', () => {
        if (this.levelComplete) return;
        const current = isReactant
          ? this.coeffManager.getReactantCoeff(molIdx)
          : this.coeffManager.getProductCoeff(molIdx);
        const next = current >= 9 ? 1 : current + 1;
        if (isReactant) {
          this.coeffManager.setReactantCoeff(molIdx, next);
        } else {
          this.coeffManager.setProductCoeff(molIdx, next);
        }
        // Update text
        this._updateBossSlots();
      });

      this.equationContainer.add(slotBg);
      this.equationContainer.add(slotText);
      this.equationContainer.add(formulaText);

      this.bossSlots.push({
        bg: slotBg, text: slotText,
        side: isReactant ? 'reactant' : 'product',
        index: molIdx
      });
    });

    // Element counter (simplified)
    const elements = EquationEngine.getElements(eq);
    this.bossHudElements = [];
    const hudStartX = width / 2 - (elements.length * 70) / 2;

    elements.forEach((el, i) => {
      const x = hudStartX + i * 70;
      const y = 260;

      const symText = this.add.text(x + 10, y, el, {
        fontFamily: 'monospace', fontSize: '12px', color: elementsData[el]?.color || '#ffffff'
      }).setOrigin(0.5);

      const countText = this.add.text(x + 10, y + 18, '0 | 0', {
        fontFamily: 'monospace', fontSize: '11px', color: '#aaaacc'
      }).setOrigin(0.5);

      this.equationContainer.add(symText);
      this.equationContainer.add(countText);
      this.bossHudElements.push({ element: el, countText });
    });

    // Check button for this equation
    const checkBg = this.add.graphics();
    checkBg.fillStyle(0x00aa55, 1);
    checkBg.fillRoundedRect(width / 2 - 60, 310, 120, 36, 8);
    this.equationContainer.add(checkBg);

    const checkText = this.add.text(width / 2, 328, 'CHECK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.equationContainer.add(checkText);

    const checkZone = this.add.zone(width / 2, 328, 120, 36)
      .setInteractive({ useHandCursor: true });
    checkZone.on('pointerdown', () => this._bossCheck());
    this.equationContainer.add(checkZone);

    // Wire coefficient change to update display
    this.coeffManager.onChange = () => {
      this._updateBossSlots();
      this._updateBossElementCounts();
    };
    this.coeffManager._emitChange();

    // Number tray
    const trayY = 380;
    for (let n = 1; n <= 9; n++) {
      const x = width / 2 - 200 + (n - 1) * 48;
      const btn = this.add.image(x, trayY, `token_${n}`).setScale(0.7);
      const numText = this.add.text(x, trayY, n.toString(), {
        fontFamily: 'monospace', fontSize: '16px', color: '#aaccff'
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        // Apply to first non-matching slot or cycle through
        if (this.bossSlots.length > 0) {
          // Just set selected (last clicked) slot
        }
      });

      this.equationContainer.add(btn);
      this.equationContainer.add(numText);
    }
  }

  _updateBossSlots() {
    this.bossSlots.forEach(slot => {
      const coeff = slot.side === 'reactant'
        ? this.coeffManager.getReactantCoeff(slot.index)
        : this.coeffManager.getProductCoeff(slot.index);

      slot.text.setText(coeff.toString());
      slot.text.setColor(coeff > 1 ? '#00ff88' : '#7777cc');
      slot.bg.setTexture(coeff > 1 ? 'coeff_slot_active' : 'coeff_slot');
    });
  }

  _updateBossElementCounts() {
    if (!this.currentEquation || !this.bossHudElements) return;

    const result = EquationEngine.validate(
      this.currentEquation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    this.bossHudElements.forEach(hud => {
      const el = result.elements[hud.element];
      if (el) {
        hud.countText.setText(`${el.left} | ${el.right}`);
        hud.countText.setColor(el.balanced ? '#00ff88' : '#ff6644');
      }
    });
  }

  _buildBossHUD() {
    const { width } = this.cameras.main;

    // Timer
    this.bossTimerText = this.add.text(width / 2, 30, `Time: ${this.timeRemaining}s`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff4444'
    }).setOrigin(0.5);

    // Health bar (equations remaining)
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x333355, 1);
    this.healthBarBg.fillRect(width / 2 - 100, 55, 200, 12);

    this.healthBarFill = this.add.graphics();
    this._drawHealthBar();

    this.healthText = this.add.text(width / 2, 61, `${this.bossHealth} / ${this.bossMaxHealth}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(15, 15, '< Retreat', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8888aa'
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      if (this.timerEvent) this.timerEvent.remove();
      this.scene.start('MenuScene', { progression: this.progression });
    });
  }

  _drawHealthBar() {
    const { width } = this.cameras.main;
    const pct = this.bossHealth / this.bossMaxHealth;
    this.healthBarFill.clear();
    this.healthBarFill.fillStyle(pct > 0.5 ? 0xff4444 : pct > 0.25 ? 0xff8844 : 0x00ff88, 1);
    this.healthBarFill.fillRect(width / 2 - 100, 55, 200 * pct, 12);
  }

  _updateBossHUD() {
    if (this.bossTimerText) {
      this.bossTimerText.setText(`Time: ${this.timeRemaining}s`);
      this.bossTimerText.setColor(this.timeRemaining <= 10 ? '#ff0000' : '#ff4444');

      if (this.timeRemaining <= 10) {
        this.bossTimerText.setScale(1.1);
        this.tweens.add({
          targets: this.bossTimerText,
          scaleX: 1, scaleY: 1,
          duration: 200
        });
      }
    }
  }

  _bossCheck() {
    if (this.levelComplete) return;

    const result = EquationEngine.validate(
      this.currentEquation,
      this.coeffManager.reactantCoeffs,
      this.coeffManager.productCoeffs
    );

    if (result.balanced) {
      this._onBossCorrect();
    } else {
      this._onBossFail();
    }
  }

  _onBossCorrect() {
    this.bossHealth--;
    this.timeRemaining += 10; // Bonus time
    this._drawHealthBar();
    if (this.healthText) {
      this.healthText.setText(`${this.bossHealth} / ${this.bossMaxHealth}`);
    }

    // Flash green
    this.cameras.main.flash(200, 0, 200, 50);

    if (this.bossHealth <= 0) {
      // Boss defeated!
      this._onBossDefeated();
    } else {
      // Next equation
      this.currentEquationIdx++;
      this.time.delayedCall(500, () => {
        this._loadCurrentEquation();
      });
    }
  }

  _onBossFail() {
    this.failedAttempts++;
    this.timeRemaining -= 3; // Penalty
    this.cameras.main.shake(150, 0.008);
  }

  _onBossDefeated() {
    this.levelComplete = true;
    if (this.timerEvent) this.timerEvent.remove();

    const { width, height } = this.cameras.main;

    const timeSeconds = (Date.now() - this.startTime) / 1000;
    const hintsUsed = 0;
    const stars = this.failedAttempts === 0 ? 3 : this.failedAttempts <= 2 ? 2 : 1;
    const score = ScoringSystem.calculateScore(timeSeconds, 120, hintsUsed, this.failedAttempts);
    const streak = this.progression.incrementStreak();
    const multiplier = ScoringSystem.getStreakMultiplier(streak);
    const xp = ScoringSystem.calculateXP(score * 2, multiplier); // 2x XP for boss

    this.progression.addXP(xp);
    this.progression.completeLevel(this.equation.id, stars, timeSeconds, score);
    this.progression.unlockAchievement('boss_slayer');

    // Victory overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    this.add.text(width / 2, height / 2 - 40, 'BOSS DEFEATED!', {
      fontFamily: 'monospace', fontSize: '32px', color: '#00ff88', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, `+${xp} XP`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffdd44'
    }).setOrigin(0.5);

    // Gold particles
    if (this.textures.exists('particle_gold')) {
      const emitter = this.add.particles(width / 2, height / 2, 'particle_gold', {
        speed: { min: 100, max: 250 },
        angle: { min: 0, max: 360 },
        scale: { start: 2, end: 0 },
        lifespan: 2000,
        quantity: 50,
        emitting: false
      });
      emitter.explode(50);
    }

    this.time.delayedCall(3000, () => {
      this.scene.start('ResultScene', {
        equation: this.equation,
        progression: this.progression,
        stars,
        score: score * 2,
        xp,
        timeSeconds,
        hintsUsed: 0,
        streak,
        isLowest: true
      });
    });
  }

  _onBossTimeOut() {
    this.levelComplete = true;
    if (this.timerEvent) this.timerEvent.remove();

    const { width, height } = this.cameras.main;

    this.progression.resetStreak();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);

    this.add.text(width / 2, height / 2 - 20, 'TIME\'S UP!', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'The boss got away...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
    }).setOrigin(0.5);

    const retryText = this.add.text(width / 2, height / 2 + 60, '[ CLICK TO RETRY ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryText.on('pointerdown', () => {
      this.scene.restart({
        equation: this.equation,
        progression: this.progression
      });
    });

    const menuText = this.add.text(width / 2, height / 2 + 90, '[ LEVEL SELECT ]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8888aa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuText.on('pointerdown', () => {
      this.scene.start('MenuScene', { progression: this.progression });
    });
  }

  update(time, delta) {
    // No per-frame updates needed beyond the timer event
  }
}
