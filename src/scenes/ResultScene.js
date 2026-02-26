import Phaser from 'phaser';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import equationsData from '../data/equations.json';

/**
 * ResultScene — Polished post-level results with sequenced animations.
 *
 * Timeline (ms):
 *   0      Background fade-in, ambient particles begin
 *   0-400  Title drops in with elastic bounce
 *   200    Equation badge fades in
 *   600+   Stars reveal one-by-one (rotate + scale + burst)
 *   1400   Stats card slides up, rows stagger in with count-up
 *   2200   XP amount pops in (count-up from 0)
 *   2500   XP bar fills with glow sweep
 *   2800   Rank badge fades in
 *   3000   Streak banner flies in (if applicable)
 *   3400   Buttons slide up from below
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

    // ── Background ──────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x1a1a2e);

    // Subtle radial vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.25);
    vignette.fillRect(0, 0, width, height);
    vignette.fillStyle(0x1a1a2e, 1);
    vignette.fillCircle(cx, height * 0.35, 380);

    // ── Ambient floating particles ──────────────
    this._startAmbientParticles(width, height);

    // ── 1. TITLE ────────────────────────────────
    const titleY = 48;
    const title = this.add.text(cx, titleY - 60, 'Level Complete!', {
      fontFamily: 'monospace', fontSize: '30px', color: '#00ff88', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    // Title glow (duplicate behind, blurred via scale + alpha)
    const titleGlow = this.add.text(cx, titleY - 60, 'Level Complete!', {
      fontFamily: 'monospace', fontSize: '30px', color: '#00ff88'
    }).setOrigin(0.5).setAlpha(0).setScale(1.05);

    this.tweens.add({
      targets: [title, titleGlow],
      y: titleY, alpha: { value: 1, duration: 300 },
      duration: 500, ease: 'Back.easeOut'
    });
    // Glow pulse loop
    this.tweens.add({
      targets: titleGlow,
      alpha: { from: 0.3, to: 0.08 },
      scaleX: { from: 1.05, to: 1.12 },
      scaleY: { from: 1.05, to: 1.12 },
      duration: 1200, yoyo: true, repeat: -1, delay: 500
    });

    // ── 2. EQUATION BADGE ───────────────────────
    const badgeY = 88;
    const badgeBg = this.add.graphics();
    const badgeW = 300, badgeH = 30;
    badgeBg.fillStyle(0x222244, 0.8);
    badgeBg.fillRoundedRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
    badgeBg.lineStyle(1, 0x4444aa, 0.4);
    badgeBg.strokeRoundedRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
    badgeBg.setAlpha(0);

    const eqText = this.add.text(cx, badgeY, this.equation.display, {
      fontFamily: 'monospace', fontSize: '15px', color: '#bbbbee'
    }).setOrigin(0.5).setAlpha(0);

    const lvlBadge = this.add.text(cx - badgeW / 2 + 12, badgeY, `Lv.${this.equation.level}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#6677bb'
    }).setOrigin(0, 0.5).setAlpha(0);

    this.tweens.add({
      targets: [badgeBg, eqText, lvlBadge],
      alpha: 1, duration: 400, delay: 200, ease: 'Sine.easeOut'
    });

    // ── 3. STARS ────────────────────────────────
    const starY = 140;
    const starSpacing = 52;
    const starObjs = [];

    for (let i = 0; i < 3; i++) {
      const sx = cx - starSpacing + i * starSpacing;
      const filled = i < this.stars;

      const star = this.add.image(sx, starY, filled ? 'star_filled' : 'star_empty')
        .setScale(0).setOrigin(0.5).setAngle(-180);

      starObjs.push(star);

      const baseDelay = 600 + i * 250;

      // Spin + pop in
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
          // Settle to final size with gentle bounce
          this.tweens.add({
            targets: star,
            scaleX: 2, scaleY: 2,
            duration: 200,
            ease: 'Sine.easeInOut'
          });
        }
      });

      // Burst particles for filled stars
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

    // Continuous subtle pulse on filled stars
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
    const cardY = 185;
    const cardW = 320, cardH = 130;
    const cardX = cx - cardW / 2;

    // Card background
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x12122a, 0.92);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
    cardBg.lineStyle(1.5, 0x3344aa, 0.35);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
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

    const rowH = 26;
    const rowStartY = cardY + 14;

    stats.forEach((stat, i) => {
      const ry = rowStartY + i * rowH;
      const staggerDelay = 1500 + i * 120;

      // Alternating row stripe
      if (i % 2 === 0) {
        const stripe = this.add.graphics();
        stripe.fillStyle(0xffffff, 0.03);
        stripe.fillRect(cardX + 4, ry, cardW - 8, rowH);
        stripe.setAlpha(0);
        this.tweens.add({ targets: stripe, alpha: 1, duration: 200, delay: staggerDelay });
      }

      // Separator dots
      const dots = this.add.text(cx - 10, ry + rowH / 2, '··········', {
        fontFamily: 'monospace', fontSize: '10px', color: '#333355'
      }).setOrigin(0.5).setAlpha(0);

      // Label (left)
      const label = this.add.text(cardX + 20, ry + rowH / 2, stat.label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#7788bb'
      }).setOrigin(0, 0.5).setAlpha(0).setX(cardX - 20);

      // Value (right)
      const isSpecial = stat.label === 'Lowest Terms';
      const valColor = isSpecial ? (this.isLowest ? '#00ff88' : '#ff6644') : '#ffffff';
      const val = this.add.text(cardX + cardW - 20, ry + rowH / 2, stat.numVal !== null ? '0' : stat.value, {
        fontFamily: 'monospace', fontSize: '14px', color: valColor, fontStyle: 'bold'
      }).setOrigin(1, 0.5).setAlpha(0);

      // Slide label in from left
      this.tweens.add({
        targets: label,
        x: cardX + 20, alpha: 1,
        duration: 300, delay: staggerDelay, ease: 'Cubic.easeOut'
      });
      this.tweens.add({
        targets: [val, dots],
        alpha: 1,
        duration: 200, delay: staggerDelay + 100
      });

      // Count-up animation for numeric values
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

    // Card bottom accent line
    const accent = this.add.graphics();
    accent.fillStyle(0x00ff88, 0.3);
    accent.fillRect(cardX + 10, cardY + cardH - 3, 0, 2);
    this.tweens.add({
      targets: accent,
      scaleX: 1, duration: 600, delay: 1600,
      onUpdate: (tween) => {
        accent.clear();
        accent.fillStyle(0x00ff88, 0.3);
        accent.fillRect(cardX + 10, cardY + cardH - 3, (cardW - 20) * tween.getValue(), 2);
      }
    });

    // ── 5. XP AMOUNT ────────────────────────────
    const xpY = cardY + cardH + 28;

    const xpLabel = this.add.text(cx, xpY - 8, 'EXPERIENCE GAINED', {
      fontFamily: 'monospace', fontSize: '9px', color: '#555577'
    }).setOrigin(0.5).setAlpha(0);

    const xpText = this.add.text(cx, xpY + 14, '+0 XP', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffdd44', fontStyle: 'bold'
    }).setOrigin(0.5).setScale(0);

    // XP glow behind number
    const xpGlow = this.add.text(cx, xpY + 14, `+${this.xp} XP`, {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffdd44'
    }).setOrigin(0.5).setAlpha(0).setScale(1.1);

    // Label fade in
    this.tweens.add({
      targets: xpLabel, alpha: 0.8,
      duration: 300, delay: 2200
    });

    // XP pop-in
    this.tweens.add({
      targets: xpText,
      scaleX: 1, scaleY: 1,
      duration: 400, delay: 2300, ease: 'Back.easeOut',
      onStart: () => soundManager.xpGain()
    });

    // Count up XP
    this.tweens.addCounter({
      from: 0, to: this.xp,
      duration: 600, delay: 2350,
      onUpdate: (tween) => {
        xpText.setText(`+${Math.floor(tween.getValue())} XP`);
      },
      onComplete: () => {
        // Flash the glow
        xpGlow.setAlpha(0.4).setScale(1.1);
        this.tweens.add({
          targets: xpGlow,
          alpha: 0, scaleX: 1.3, scaleY: 1.3,
          duration: 500
        });
      }
    });

    // ── 6. STREAK BANNER ────────────────────────
    let streakBannerH = 0;
    if (this.streak >= 3) {
      streakBannerH = 30;
      const streakY = xpY + 42;
      const streakLabel = ScoringSystem.getStreakLabel(this.streak);
      const streakColor = this.streak >= 10 ? '#ff4444' : this.streak >= 5 ? '#ff8844' : '#ffdd44';

      // Banner bg
      const bannerW = 220;
      const streakBg = this.add.graphics();
      streakBg.fillStyle(Phaser.Display.Color.HexStringToColor(streakColor).color, 0.1);
      streakBg.fillRoundedRect(cx - bannerW / 2, streakY - 12, bannerW, 24, 12);
      streakBg.lineStyle(1, Phaser.Display.Color.HexStringToColor(streakColor).color, 0.4);
      streakBg.strokeRoundedRect(cx - bannerW / 2, streakY - 12, bannerW, 24, 12);
      streakBg.setAlpha(0).setX(-50);

      const streakText = this.add.text(cx, streakY, `${streakLabel}  ${this.streak}x streak`, {
        fontFamily: 'monospace', fontSize: '12px', color: streakColor, fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0).setX(cx - 50);

      // Slide in from left
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
    const barSectionY = xpY + 52 + streakBannerH;
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xpTotal = this.progression.getXP();

    // Rank title
    const rankText = this.add.text(cx, barSectionY, rank.title, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aabb99', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: rankText, alpha: 1,
      duration: 300, delay: 2800
    });

    if (nextRank) {
      const barW = 280, barH = 12;
      const barX = cx - barW / 2;
      const barTopY = barSectionY + 16;
      const pct = Math.min(1, (xpTotal - rank.xp) / (nextRank.xp - rank.xp));
      const prevPct = Math.max(0, Math.min(1, (xpTotal - this.xp - rank.xp) / (nextRank.xp - rank.xp)));

      // Bar track
      const trackBg = this.add.graphics();
      trackBg.fillStyle(0x222244, 1);
      trackBg.fillRoundedRect(barX, barTopY, barW, barH, 6);
      trackBg.lineStyle(1, 0x3344aa, 0.3);
      trackBg.strokeRoundedRect(barX, barTopY, barW, barH, 6);
      trackBg.setAlpha(0);

      this.tweens.add({
        targets: trackBg, alpha: 1,
        duration: 200, delay: 2850
      });

      // Bar fill (animated from previous to current)
      const fillBar = this.add.graphics().setAlpha(0);
      this.tweens.add({
        targets: fillBar, alpha: 1,
        duration: 100, delay: 2900
      });

      // Draw the initial state
      this._drawXpBar(fillBar, barX, barTopY, barW, barH, prevPct);

      // Animate the fill
      this.tweens.addCounter({
        from: prevPct, to: pct,
        duration: 800, delay: 2950,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          this._drawXpBar(fillBar, barX, barTopY, barW, barH, tween.getValue());
        }
      });

      // Bar glow sweep (sheen effect over the bar)
      const sheen = this.add.graphics().setAlpha(0);
      this.tweens.add({
        targets: sheen, alpha: 1,
        duration: 100, delay: 3000
      });
      this.tweens.addCounter({
        from: 0, to: 1,
        duration: 600, delay: 3200,
        ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          sheen.clear();
          const sweepX = barX + barW * tween.getValue();
          const sw = 40;
          sheen.fillStyle(0xffffff, 0.15);
          sheen.fillRect(
            Math.max(barX, sweepX - sw / 2), barTopY + 1,
            Math.min(sw, barW * pct - (sweepX - sw / 2 - barX)), barH - 2
          );
        },
        onComplete: () => {
          sheen.clear();
        }
      });

      // XP counter text
      const xpCounter = this.add.text(cx, barTopY + barH + 12, `${xpTotal - this.xp} / ${nextRank.xp} XP`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#7788aa'
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: xpCounter, alpha: 1,
        duration: 200, delay: 2900
      });

      // Count up the XP counter text
      this.tweens.addCounter({
        from: xpTotal - this.xp, to: xpTotal,
        duration: 800, delay: 2950,
        onUpdate: (tween) => {
          xpCounter.setText(`${Math.floor(tween.getValue())} / ${nextRank.xp} XP`);
        }
      });
    }

    // ── 8. BUTTONS ──────────────────────────────
    const btnY = height - 55;
    const btnW = 150, btnH = 40;

    // Next Level button
    this._buildButton(
      cx + 85, btnY, btnW, btnH,
      'Next Level \u25B6', 0x00884a, 0x00aa55, 0x44dd88,
      3400,
      () => { soundManager.buttonPress(); this._nextLevel(); }
    );

    // Level Select button
    this._buildButton(
      cx - 85, btnY, btnW, btnH,
      '\u25C0 Levels', 0x333355, 0x444466, 0x6666aa,
      3500,
      () => {
        soundManager.buttonPress();
        this.scene.start('MenuScene', { progression: this.progression });
      }
    );

    // ── 9. CELEBRATORY PARTICLE RAIN ────────────
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

    // Green sparkle bursts for 3-star
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
    const fillW = Math.max(4, w * pct);

    // Main fill
    graphics.fillStyle(0x00cc66, 1);
    graphics.fillRoundedRect(x + 2, y + 2, fillW - 4, h - 4, 4);

    // Lighter top highlight
    graphics.fillStyle(0x00ff88, 0.4);
    graphics.fillRoundedRect(x + 3, y + 2, fillW - 6, (h - 4) / 2, { tl: 4, tr: 4, bl: 0, br: 0 });
  }

  _buildButton(cx, cy, w, h, label, darkCol, baseCol, accentCol, delay, onClick) {
    const container = this.add.container(cx, cy + 60).setAlpha(0);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 10);
    container.add(shadow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(darkCol, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    body.fillStyle(baseCol, 1);
    body.fillRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 9);
    // Top shine
    body.fillStyle(0xffffff, 0.07);
    body.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, h / 3, 6);
    // Border
    body.lineStyle(1, accentCol, 0.4);
    body.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(body);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);

    // Hit zone
    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(zone);

    // Hover effects
    zone.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05, scaleY: 1.05,
        duration: 100
      });
      text.setColor('#ffffff');
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
    // Soft floating particles in background
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
