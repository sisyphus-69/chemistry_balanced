import Phaser from 'phaser';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import equationsData from '../data/equations.json';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data) {
    this.equation = data.equation;
    this.progression = data.progression;
    this.stars = data.stars;
    this.score = data.score;
    this.xp = data.xp;
    this.timeSeconds = data.timeSeconds;
    this.hintsUsed = data.hintsUsed;
    this.streak = data.streak;
    this.isLowest = data.isLowest;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Level complete title
    this.add.text(width / 2, 50, 'Level Complete!', {
      fontFamily: 'monospace', fontSize: '28px', color: '#00ff88', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    // Animate title in
    this.tweens.add({
      targets: this.children.list[1],
      alpha: 1, y: 50,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Equation display
    this.add.text(width / 2, 90, this.equation.display, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
    }).setOrigin(0.5);

    // Stars
    const starY = 140;
    for (let i = 0; i < 3; i++) {
      const star = this.add.image(width / 2 - 30 + i * 30, starY,
        i < this.stars ? 'star_filled' : 'star_empty'
      ).setScale(0).setOrigin(0.5);

      this.tweens.add({
        targets: star,
        scaleX: 2, scaleY: 2,
        duration: 300,
        delay: 500 + i * 200,
        ease: 'Back.easeOut'
      });
    }

    // Stats panel
    const panelY = 190;
    const panelX = width / 2 - 120;
    const stats = [
      { label: 'Time', value: `${Math.floor(this.timeSeconds)}s` },
      { label: 'Score', value: this.score.toString() },
      { label: 'Hints Used', value: this.hintsUsed.toString() },
      { label: 'Lowest Terms', value: this.isLowest ? 'Yes' : 'No' }
    ];

    stats.forEach((stat, i) => {
      const y = panelY + i * 25;
      this.add.text(panelX, y, stat.label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#8888aa'
      });
      this.add.text(panelX + 200, y, stat.value, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff'
      });
    });

    // XP gain
    const xpY = panelY + stats.length * 25 + 20;
    const xpText = this.add.text(width / 2, xpY, `+${this.xp} XP`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffdd44', fontStyle: 'bold'
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: xpText,
      scaleX: 1, scaleY: 1,
      duration: 400,
      delay: 1200,
      ease: 'Back.easeOut'
    });

    // Streak display
    if (this.streak >= 3) {
      const streakLabel = ScoringSystem.getStreakLabel(this.streak);
      const streakText = this.add.text(width / 2, xpY + 30, `${streakLabel} (${this.streak}x streak)`, {
        fontFamily: 'monospace', fontSize: '14px',
        color: this.streak >= 10 ? '#ff4444' : this.streak >= 5 ? '#ff8844' : '#ffdd44'
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: streakText,
        alpha: 1,
        duration: 300,
        delay: 1500
      });
    }

    // XP bar
    const barY = xpY + 60;
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xpTotal = this.progression.getXP();

    this.add.text(width / 2, barY - 15, rank.title, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffdd44'
    }).setOrigin(0.5);

    if (nextRank) {
      const barW = 250, barH = 10;
      const barX = width / 2 - barW / 2;
      const pct = Math.min(1, (xpTotal - rank.xp) / (nextRank.xp - rank.xp));

      this.add.graphics()
        .fillStyle(0x333355, 1)
        .fillRect(barX, barY, barW, barH);

      const fillBar = this.add.graphics()
        .fillStyle(0x00ff88, 1);

      // Animate XP bar fill
      this.tweens.addCounter({
        from: 0, to: pct,
        duration: 800,
        delay: 1500,
        onUpdate: (tween) => {
          fillBar.clear();
          fillBar.fillStyle(0x00ff88, 1);
          fillBar.fillRect(barX, barY, barW * tween.getValue(), barH);
        }
      });

      this.add.text(width / 2, barY + 16, `${xpTotal} / ${nextRank.xp} XP`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#aaaacc'
      }).setOrigin(0.5);
    }

    // Buttons
    const btnY = height - 70;

    // Next Level button
    const nextBtn = this.add.graphics();
    nextBtn.fillStyle(0x00aa55, 1);
    nextBtn.fillRoundedRect(width / 2 + 10, btnY - 18, 140, 36, 8);
    this.add.text(width / 2 + 80, btnY, 'Next Level', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    const nextZone = this.add.zone(width / 2 + 80, btnY, 140, 36)
      .setInteractive({ useHandCursor: true });
    nextZone.on('pointerdown', () => this._nextLevel());

    // Menu button
    const menuBtn = this.add.graphics();
    menuBtn.fillStyle(0x555577, 1);
    menuBtn.fillRoundedRect(width / 2 - 150, btnY - 18, 140, 36, 8);
    this.add.text(width / 2 - 80, btnY, 'Level Select', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);

    const menuZone = this.add.zone(width / 2 - 80, btnY, 140, 36)
      .setInteractive({ useHandCursor: true });
    menuZone.on('pointerdown', () => {
      this.scene.start('MenuScene', { progression: this.progression });
    });

    // Gold particles celebration
    if (this.textures.exists('particle_gold')) {
      const emitter = this.add.particles(width / 2, 0, 'particle_gold', {
        speed: { min: 30, max: 80 },
        angle: { min: 80, max: 100 },
        scale: { start: 0.8, end: 0 },
        lifespan: 3000,
        frequency: 100,
        quantity: 2,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-width / 2, 0, width, 1)
        }
      });

      this.time.delayedCall(4000, () => emitter.stop());
    }
  }

  _nextLevel() {
    // Find next level in the equations data
    const equations = this.cache?.json?.get('equations') || [];
    // Since we import data directly, we need to find next from the equation level
    const nextLevelNum = this.equation.level + 1;

    const nextEq = equationsData.find(eq => eq.level === nextLevelNum);

    if (nextEq && this.progression.isLevelUnlocked(nextLevelNum)) {
      const sceneKey = nextEq.boss ? 'BossScene' : 'GameScene';
      this.scene.start(sceneKey, {
        equation: nextEq,
        progression: this.progression
      });
    } else {
      this.scene.start('MenuScene', { progression: this.progression });
    }
  }
}
