import Phaser from 'phaser';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { PIXEL_FONT } from '../ui/PixelText.js';
import equationsData from '../data/equations.json';

/**
 * ResultScene — RPG-styled post-level results with sequenced animations.
 * All text uses pixel font, all shapes use hard pixel edges.
 */
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
    const cx = width / 2;

    // Background
    this.add.rectangle(cx, height / 2, width, height, 0x0d0d1a);

    // Ambient particles
    this._startAmbientParticles(width, height);

    // ── 1. TITLE ────────────────────────────────
    const titleY = 48;
    const title = this.add.text(cx, titleY - 60, 'Level Complete!', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#00ff88'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      y: titleY, alpha: 1,
      duration: 500, ease: 'Back.easeOut'
    });

    // ── 2. EQUATION BADGE ───────────────────────
    const badgeY = 80;
    const badgeW = 320, badgeH = 28;
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x222244, 0.8);
    badgeBg.fillRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
    badgeBg.fillStyle(0x4444aa, 0.3);
    badgeBg.fillRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, 2);
    badgeBg.setAlpha(0);

    const eqText = this.add.text(cx, badgeY, this.equation.display, {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#bbbbee'
    }).setOrigin(0.5).setAlpha(0);

    const lvlBadge = this.add.text(cx - badgeW / 2 + 10, badgeY, `Lv.${this.equation.level}`, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#6677bb'
    }).setOrigin(0, 0.5).setAlpha(0);

    this.tweens.add({
      targets: [badgeBg, eqText, lvlBadge],
      alpha: 1, duration: 400, delay: 200, ease: 'Sine.easeOut'
    });

    // ── 3. STARS ────────────────────────────────
    const starY = 125;
    const starSpacing = 52;
    const starObjs = [];

    for (let i = 0; i < 3; i++) {
      const sx = cx - starSpacing + i * starSpacing;
      const filled = i < this.stars;

      const star = this.add.image(sx, starY, filled ? 'star_filled' : 'star_empty')
        .setScale(0).setOrigin(0.5).setAngle(-180);

      starObjs.push(star);
      const baseDelay = 600 + i * 250;

      this.tweens.add({
        targets: star,
        scaleX: 2.5, scaleY: 2.5,
        angle: 0,
        duration: 400,
        delay: baseDelay,
        ease: 'Back.easeOut',
        onStart: () => {
          if (filled) soundManager.starReveal();
        },
        onComplete: () => {
          this.tweens.add({
            targets: star,
            scaleX: 2, scaleY: 2,
            duration: 200,
            ease: 'Sine.easeInOut'
          });
        }
      });

      if (filled && this.textures.exists('particle_gold')) {
        this.time.delayedCall(baseDelay + 100, () => {
          const emitter = this.add.particles(sx, starY, 'particle_gold', {
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            lifespan: 600,
            quantity: 8,
            emitting: false
          });
          emitter.explode(8);
          this.time.delayedCall(800, () => emitter.destroy());
        });
      }
    }

    // Pulse on filled stars
    this.time.delayedCall(1400, () => {
      starObjs.forEach((s, i) => {
        if (i < this.stars) {
          this.tweens.add({
            targets: s,
            scaleX: 2.15, scaleY: 2.15,
            duration: 800 + i * 100,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    });

    // ── 4. STATS CARD ───────────────────────────
    const cardY = 175;
    const cardW = 320, cardH = 115;
    const cardX = cx - cardW / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x0d0d1a, 0.95);
    cardBg.fillRect(cardX, cardY, cardW, cardH);
    // Border
    cardBg.fillStyle(0x333366, 0.6);
    cardBg.fillRect(cardX, cardY, cardW, 2);
    cardBg.fillRect(cardX, cardY + cardH - 2, cardW, 2);
    cardBg.fillRect(cardX, cardY, 2, cardH);
    cardBg.fillRect(cardX + cardW - 2, cardY, 2, cardH);
    // Corner accents
    cardBg.fillStyle(0x5555aa, 0.5);
    cardBg.fillRect(cardX, cardY, 4, 4);
    cardBg.fillRect(cardX + cardW - 4, cardY, 4, 4);
    cardBg.fillRect(cardX, cardY + cardH - 4, 4, 4);
    cardBg.fillRect(cardX + cardW - 4, cardY + cardH - 4, 4, 4);

    cardBg.setAlpha(0).setY(20);

    this.tweens.add({
      targets: cardBg,
      alpha: 1, y: 0,
      duration: 400, delay: 1400, ease: 'Back.easeOut'
    });

    const stats = [
      { label: 'Time', value: `${Math.floor(this.timeSeconds)}s`, numVal: Math.floor(this.timeSeconds), suffix: 's' },
      { label: 'Score', value: this.score.toString(), numVal: this.score, suffix: '' },
      { label: 'Hints', value: this.hintsUsed.toString(), numVal: this.hintsUsed, suffix: '' },
      { label: 'Lowest Terms', value: this.isLowest ? 'Yes' : 'No', numVal: null, suffix: '' }
    ];

    const rowH = 24;
    const rowStartY = cardY + 10;

    stats.forEach((stat, i) => {
      const ry = rowStartY + i * rowH;
      const staggerDelay = 1500 + i * 120;

      // Alternating stripe
      if (i % 2 === 0) {
        const stripe = this.add.graphics();
        stripe.fillStyle(0xffffff, 0.03);
        stripe.fillRect(cardX + 4, ry, cardW - 8, rowH);
        stripe.setAlpha(0);
        this.tweens.add({ targets: stripe, alpha: 1, duration: 200, delay: staggerDelay });
      }

      // Dots separator
      const dots = this.add.text(cx - 10, ry + rowH / 2, '..........', {
        fontFamily: PIXEL_FONT, fontSize: '8px', color: '#333355'
      }).setOrigin(0.5).setAlpha(0);

      // Label
      const label = this.add.text(cardX + 16, ry + rowH / 2, stat.label, {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: '#7788bb'
      }).setOrigin(0, 0.5).setAlpha(0).setX(cardX - 20);

      // Value
      const isSpecial = stat.label === 'Lowest Terms';
      const valColor = isSpecial ? (this.isLowest ? '#00ff88' : '#ff6644') : '#ffffff';
      const val = this.add.text(cardX + cardW - 16, ry + rowH / 2, stat.numVal !== null ? '0' : stat.value, {
        fontFamily: PIXEL_FONT, fontSize: '14px', color: valColor
      }).setOrigin(1, 0.5).setAlpha(0);

      this.tweens.add({
        targets: label,
        x: cardX + 16, alpha: 1,
        duration: 300, delay: staggerDelay, ease: 'Cubic.easeOut'
      });
      this.tweens.add({
        targets: [val, dots],
        alpha: 1,
        duration: 200, delay: staggerDelay + 100
      });

      if (stat.numVal !== null && stat.numVal > 0) {
        this.tweens.addCounter({
          from: 0, to: stat.numVal,
          duration: 500,
          delay: staggerDelay + 150,
          onUpdate: (tween) => {
            val.setText(Math.floor(tween.getValue()) + stat.suffix);
          }
        });
      }
    });

    // ── 5. XP AMOUNT ────────────────────────────
    const xpY = cardY + cardH + 24;

    const xpLabel = this.add.text(cx, xpY - 6, 'EXPERIENCE GAINED', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#555577'
    }).setOrigin(0.5).setAlpha(0);

    const xpText = this.add.text(cx, xpY + 16, '+0 XP', {
      fontFamily: PIXEL_FONT, fontSize: '24px', color: '#ffdd44'
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: xpLabel, alpha: 0.8,
      duration: 300, delay: 2200
    });

    this.tweens.add({
      targets: xpText,
      scaleX: 1, scaleY: 1,
      duration: 400, delay: 2300, ease: 'Back.easeOut',
      onStart: () => soundManager.xpGain()
    });

    this.tweens.addCounter({
      from: 0, to: this.xp,
      duration: 600, delay: 2350,
      onUpdate: (tween) => {
        xpText.setText(`+${Math.floor(tween.getValue())} XP`);
      }
    });

    // ── 6. STREAK BANNER ────────────────────────
    let streakBannerH = 0;
    if (this.streak >= 3) {
      streakBannerH = 28;
      const streakY = xpY + 36;
      const streakLabel = ScoringSystem.getStreakLabel(this.streak);
      const streakColor = this.streak >= 10 ? '#ff4444' : this.streak >= 5 ? '#ff8844' : '#ffdd44';

      const bannerW = 200;
      const streakBg = this.add.graphics();
      streakBg.fillStyle(Phaser.Display.Color.HexStringToColor(streakColor).color, 0.1);
      streakBg.fillRect(cx - bannerW / 2, streakY - 10, bannerW, 20);
      streakBg.fillStyle(Phaser.Display.Color.HexStringToColor(streakColor).color, 0.3);
      streakBg.fillRect(cx - bannerW / 2, streakY - 10, bannerW, 1);
      streakBg.setAlpha(0).setX(-50);

      const streakText = this.add.text(cx, streakY, `${streakLabel}  ${this.streak}x streak`, {
        fontFamily: PIXEL_FONT, fontSize: '12px', color: streakColor
      }).setOrigin(0.5).setAlpha(0).setX(cx - 50);

      this.tweens.add({
        targets: streakBg,
        x: 0, alpha: 1,
        duration: 400, delay: 3000, ease: 'Back.easeOut'
      });
      this.tweens.add({
        targets: streakText,
        x: cx, alpha: 1,
        duration: 400, delay: 3050, ease: 'Back.easeOut'
      });
    }

    // ── 7. XP BAR + RANK ────────────────────────
    const barSectionY = xpY + 46 + streakBannerH;
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xpTotal = this.progression.getXP();

    const rankText = this.add.text(cx, barSectionY, rank.title, {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#aabb99'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: rankText, alpha: 1,
      duration: 300, delay: 2800
    });

    if (nextRank) {
      const barW = 260, barH = 10;
      const barX = cx - barW / 2;
      const barTopY = barSectionY + 14;
      const pct = Math.min(1, (xpTotal - rank.xp) / (nextRank.xp - rank.xp));
      const prevPct = Math.max(0, Math.min(1, (xpTotal - this.xp - rank.xp) / (nextRank.xp - rank.xp)));

      // Bar track
      const trackBg = this.add.graphics();
      trackBg.fillStyle(0x111122, 1);
      trackBg.fillRect(barX, barTopY, barW, barH);
      trackBg.fillStyle(0x333355, 0.5);
      trackBg.fillRect(barX, barTopY, barW, 1);
      trackBg.setAlpha(0);

      this.tweens.add({
        targets: trackBg, alpha: 1,
        duration: 200, delay: 2850
      });

      // Bar fill
      const fillBar = this.add.graphics().setAlpha(0);
      this.tweens.add({
        targets: fillBar, alpha: 1,
        duration: 100, delay: 2900
      });

      this._drawXpBar(fillBar, barX, barTopY, barW, barH, prevPct);

      this.tweens.addCounter({
        from: prevPct, to: pct,
        duration: 800, delay: 2950,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          this._drawXpBar(fillBar, barX, barTopY, barW, barH, tween.getValue());
        }
      });

      // XP counter text
      const xpCounter = this.add.text(cx, barTopY + barH + 12, `${xpTotal - this.xp} / ${nextRank.xp} XP`, {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: '#7788aa'
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: xpCounter, alpha: 1,
        duration: 200, delay: 2900
      });

      this.tweens.addCounter({
        from: xpTotal - this.xp, to: xpTotal,
        duration: 800, delay: 2950,
        onUpdate: (tween) => {
          xpCounter.setText(`${Math.floor(tween.getValue())} / ${nextRank.xp} XP`);
        }
      });
    }

    // ── 8. BUTTONS ──────────────────────────────
    const btnY = height - 45;
    const btnW = 150, btnH = 36;

    // Next Level
    this._buildButton(
      cx + 85, btnY, btnW, btnH,
      'Next Level >', 0x006633, 0x00884a, 0x44dd88,
      3400,
      () => { soundManager.buttonPress(); this._nextLevel(); }
    );

    // Level Select
    this._buildButton(
      cx - 85, btnY, btnW, btnH,
      '< Levels', 0x222244, 0x333355, 0x6666aa,
      3500,
      () => {
        soundManager.buttonPress();
        this.scene.start('MenuScene', { progression: this.progression });
      }
    );

    // ── 9. CELEBRATORY PARTICLES ────────────────
    if (this.textures.exists('particle_gold') && this.stars >= 2) {
      this.time.delayedCall(600, () => {
        const emitter = this.add.particles(cx, -10, 'particle_gold', {
          speed: { min: 20, max: 60 },
          angle: { min: 80, max: 100 },
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.8, end: 0 },
          lifespan: 3500,
          frequency: this.stars === 3 ? 60 : 120,
          quantity: 1,
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(-width / 2, 0, width, 1)
          }
        });
        this.time.delayedCall(5000, () => emitter.stop());
      });
    }

    if (this.stars === 3 && this.textures.exists('particle_green')) {
      for (let b = 0; b < 3; b++) {
        this.time.delayedCall(1300 + b * 400, () => {
          const bx = cx - 120 + Math.random() * 240;
          const by = 80 + Math.random() * 200;
          const emitter = this.add.particles(bx, by, 'particle_green', {
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 6,
            emitting: false
          });
          emitter.explode(6);
          this.time.delayedCall(700, () => emitter.destroy());
        });
      }
    }
  }

  // ── Helpers ─────────────────────────────────

  _drawXpBar(graphics, x, y, w, h, pct) {
    graphics.clear();
    if (pct <= 0) return;
    const fillW = Math.max(2, w * pct);

    graphics.fillStyle(0x00cc66, 1);
    graphics.fillRect(x + 1, y + 1, fillW - 2, h - 2);
    graphics.fillStyle(0x00ff88, 0.3);
    graphics.fillRect(x + 1, y + 1, fillW - 2, 3);
  }

  _buildButton(cx, cy, w, h, label, darkCol, baseCol, accentCol, delay, onClick) {
    const container = this.add.container(cx, cy + 60).setAlpha(0);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);
    container.add(shadow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(darkCol, 1);
    body.fillRect(-w / 2, -h / 2, w, h);
    body.fillStyle(baseCol, 1);
    body.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    // Top bevel
    body.fillStyle(accentCol, 0.2);
    body.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 3);
    // Border
    body.fillStyle(accentCol, 0.4);
    body.fillRect(-w / 2, -h / 2, w, 1);
    body.fillRect(-w / 2, h / 2 - 1, w, 1);
    body.fillRect(-w / 2, -h / 2, 1, h);
    body.fillRect(w / 2 - 1, -h / 2, 1, h);
    container.add(body);

    const text = this.add.text(0, 0, label, {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
    container.add(text);

    // Hit zone
    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(zone);

    zone.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100
      });
    });
    zone.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1, scaleY: 1,
        duration: 100
      });
    });
    zone.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95, scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: onClick
      });
    });

    // Slide up animation
    this.tweens.add({
      targets: container,
      y: cy, alpha: 1,
      duration: 400, delay, ease: 'Back.easeOut'
    });
  }

  _startAmbientParticles(width, height) {
    if (this.textures.exists('particle_twinkle')) {
      this.add.particles(width / 2, height / 2, 'particle_twinkle', {
        speed: { min: 5, max: 15 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.3, end: 0.6 },
        alpha: { start: 0, end: 0.25 },
        lifespan: 3000,
        frequency: 400,
        quantity: 1,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
        }
      });
    }
  }

  _nextLevel() {
    const nextLevelNum = this.equation.level + 1;
    const nextEq = equationsData.find(eq => eq.level === nextLevelNum);

    if (nextEq && this.progression.isLevelUnlocked(nextLevelNum)) {
      const sceneKey = nextEq.boss ? 'BossScene' : 'GameScene';
      this.scene.start(sceneKey, { equation: nextEq, progression: this.progression });
    } else {
      this.scene.start('MenuScene', { progression: this.progression });
    }
  }
}
