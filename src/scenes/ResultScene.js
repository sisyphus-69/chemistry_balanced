import Phaser from 'phaser';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { PIXEL_FONT } from '../ui/PixelText.js';
import { LayoutGrid } from '../ui/LayoutGrid.js';
import { PanelRenderer } from '../ui/PanelRenderer.js';
import { getRegionForLevel } from '../data/regions.js';
import equationsData from '../data/equations.json';

/**
 * ResultScene — RPG-styled post-level results with sequenced animations.
 * Uses LayoutGrid for positioning, PanelRenderer for cyberpunk panels,
 * rank badge display, and region-themed tinting.
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
    this.region = data.region || getRegionForLevel(this.equation.level);
  }

  create() {
    const { width, height } = this.cameras.main;
    const grid = new LayoutGrid(width, height);
    const cx = grid.centerX();
    const palette = this.region?.palette;
    const accentColor = palette?.accent || 0x333366;
    const accentHex = palette?.accentHex || '#6666aa';

    // Background
    const bgColor = palette?.bg || 0x0d0d1a;
    this.add.rectangle(cx, height / 2, width, height, bgColor);

    // CRT scanline overlay
    const crt = this.add.graphics();
    PanelRenderer.drawCRTOverlay(crt, width, height);

    // Ambient particles
    this._startAmbientParticles(width, height);

    // ── 1. HEADER BAR ──────────────────────────────
    const headerG = this.add.graphics();
    PanelRenderer.drawPanel(headerG, 0, 0, width, grid.HEADER_H, {
      fillColor: 0x0a0a18,
      fillAlpha: 0.98,
      borderColor: accentColor,
      cornerBrackets: false
    });

    // ── 2. TITLE ────────────────────────────────
    const titleY = grid.rowY(0.04);
    const title = this.add.text(cx, titleY - 60, 'Level Complete!', {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#00ff88'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      y: titleY, alpha: 1,
      duration: 500, ease: 'Back.easeOut'
    });

    // ── 3. EQUATION BADGE ───────────────────────
    const badgeY = grid.rowY(0.10);
    const badgeW = 480, badgeH = 42;
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x222244, 0.8);
    badgeBg.fillRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
    badgeBg.fillStyle(accentColor, 0.3);
    badgeBg.fillRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, 2);
    badgeBg.setAlpha(0);

    const eqText = this.add.text(cx, badgeY, this.equation.display, {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#bbbbee'
    }).setOrigin(0.5).setAlpha(0);

    const lvlBadge = this.add.text(cx - badgeW / 2 + 15, badgeY, `Lv.${this.equation.level}`, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: accentHex
    }).setOrigin(0, 0.5).setAlpha(0);

    this.tweens.add({
      targets: [badgeBg, eqText, lvlBadge],
      alpha: 1, duration: 400, delay: 200, ease: 'Sine.easeOut'
    });

    // ── 4. STARS ────────────────────────────────
    const starY = grid.rowY(0.20);
    const starSpacing = 78;
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
        scaleX: 3.0, scaleY: 3.0,
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
            scaleX: 2.5, scaleY: 2.5,
            duration: 200,
            ease: 'Sine.easeInOut'
          });
        }
      });

      if (filled && this.textures.exists('particle_gold')) {
        this.time.delayedCall(baseDelay + 100, () => {
          const emitter = this.add.particles(sx, starY, 'particle_gold', {
            speed: { min: 60, max: 180 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            lifespan: 600,
            quantity: 10,
            emitting: false
          });
          emitter.explode(10);
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
            scaleX: 2.7, scaleY: 2.7,
            duration: 800 + i * 100,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    });

    // ── 5. STATS CARD ───────────────────────────
    const cardY = grid.rowY(0.30);
    const cardW = 480, cardH = 172;
    const cardX = cx - cardW / 2;

    const cardBg = this.add.graphics();
    PanelRenderer.drawPanel(cardBg, cardX, cardY, cardW, cardH, {
      borderColor: accentColor,
      cornerBrackets: true,
      bracketSize: 12,
      scanlines: true
    });

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

    const rowH = 36;
    const rowStartY = cardY + 15;

    stats.forEach((stat, i) => {
      const ry = rowStartY + i * rowH;
      const staggerDelay = 1500 + i * 120;

      // Alternating stripe
      if (i % 2 === 0) {
        const stripe = this.add.graphics();
        stripe.fillStyle(0xffffff, 0.03);
        stripe.fillRect(cardX + 6, ry, cardW - 12, rowH);
        stripe.setAlpha(0);
        this.tweens.add({ targets: stripe, alpha: 1, duration: 200, delay: staggerDelay });
      }

      // Dots separator
      const dots = this.add.text(cx - 15, ry + rowH / 2, '..........', {
        fontFamily: PIXEL_FONT, fontSize: '12px', color: '#333355'
      }).setOrigin(0.5).setAlpha(0);

      // Label
      const label = this.add.text(cardX + 24, ry + rowH / 2, stat.label, {
        fontFamily: PIXEL_FONT, fontSize: '15px', color: '#7788bb'
      }).setOrigin(0, 0.5).setAlpha(0).setX(cardX - 30);

      // Value
      const isSpecial = stat.label === 'Lowest Terms';
      const valColor = isSpecial ? (this.isLowest ? '#00ff88' : '#ff6644') : '#ffffff';
      const val = this.add.text(cardX + cardW - 24, ry + rowH / 2, stat.numVal !== null ? '0' : stat.value, {
        fontFamily: PIXEL_FONT, fontSize: '21px', color: valColor
      }).setOrigin(1, 0.5).setAlpha(0);

      this.tweens.add({
        targets: label,
        x: cardX + 24, alpha: 1,
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

    // ── 6. XP AMOUNT ────────────────────────────
    const xpY = cardY + cardH + 36;

    const xpLabel = this.add.text(cx, xpY - 9, 'EXPERIENCE GAINED', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#555577'
    }).setOrigin(0.5).setAlpha(0);

    const xpText = this.add.text(cx, xpY + 24, '+0 XP', {
      fontFamily: PIXEL_FONT, fontSize: '36px', color: '#ffdd44'
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

    // ── 7. STREAK BANNER ────────────────────────
    let streakBannerH = 0;
    if (this.streak >= 3) {
      streakBannerH = 42;
      const streakY = xpY + 54;
      const streakLabel = ScoringSystem.getStreakLabel(this.streak);
      const streakColor = this.streak >= 10 ? '#ff4444' : this.streak >= 5 ? '#ff8844' : '#ffdd44';

      const bannerW = 300;
      const streakBg = this.add.graphics();
      streakBg.fillStyle(Phaser.Display.Color.HexStringToColor(streakColor).color, 0.1);
      streakBg.fillRect(cx - bannerW / 2, streakY - 15, bannerW, 30);
      streakBg.fillStyle(Phaser.Display.Color.HexStringToColor(streakColor).color, 0.3);
      streakBg.fillRect(cx - bannerW / 2, streakY - 15, bannerW, 1);
      streakBg.setAlpha(0).setX(-75);

      const streakText = this.add.text(cx, streakY, `${streakLabel}  ${this.streak}x streak`, {
        fontFamily: PIXEL_FONT, fontSize: '18px', color: streakColor
      }).setOrigin(0.5).setAlpha(0).setX(cx - 75);

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

    // ── 8. XP BAR + RANK BADGE ──────────────────
    const barSectionY = xpY + 69 + streakBannerH;
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xpTotal = this.progression.getXP();

    // Rank badge image
    if (rank.badge && this.textures.exists(rank.badge)) {
      const badge = this.add.image(cx - 120, barSectionY, rank.badge)
        .setScale(1.2).setOrigin(0.5).setAlpha(0);
      this.tweens.add({
        targets: badge, alpha: 1,
        duration: 300, delay: 2800
      });
    }

    const rankText = this.add.text(cx, barSectionY, rank.title, {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: '#aabb99'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: rankText, alpha: 1,
      duration: 300, delay: 2800
    });

    if (nextRank) {
      const barW = 390, barH = 15;
      const barX = cx - barW / 2;
      const barTopY = barSectionY + 21;
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
      const xpCounter = this.add.text(cx, barTopY + barH + 18, `${xpTotal - this.xp} / ${nextRank.xp} XP`, {
        fontFamily: PIXEL_FONT, fontSize: '15px', color: '#7788aa'
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

    // ── 9. BUTTONS ──────────────────────────────
    const btnY = height - 68;
    const btnW = 225, btnH = 54;

    // Next Level
    this._buildButton(
      cx + 128, btnY, btnW, btnH,
      'Next Level >', 0x006633, 0x00884a, 0x44dd88,
      3400,
      () => { soundManager.buttonPress(); this._nextLevel(); }
    );

    // Level Select
    this._buildButton(
      cx - 128, btnY, btnW, btnH,
      '< Levels', 0x222244, 0x333355, 0x6666aa,
      3500,
      () => {
        soundManager.buttonPress();
        this.scene.start('MenuScene', { progression: this.progression });
      }
    );

    // ── 10. CELEBRATORY PARTICLES ────────────────
    if (this.textures.exists('particle_gold') && this.stars >= 2) {
      this.time.delayedCall(600, () => {
        const emitter = this.add.particles(cx, -10, 'particle_gold', {
          speed: { min: 30, max: 90 },
          angle: { min: 80, max: 100 },
          scale: { start: 0.9, end: 0 },
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
          const bx = cx - 180 + Math.random() * 360;
          const by = 120 + Math.random() * 300;
          const emitter = this.add.particles(bx, by, 'particle_green', {
            speed: { min: 45, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            lifespan: 500,
            quantity: 8,
            emitting: false
          });
          emitter.explode(8);
          this.time.delayedCall(700, () => emitter.destroy());
        });
      }
    }
  }

  // ── Helpers ─────────────────────────────────

  _drawXpBar(graphics, x, y, w, h, pct) {
    graphics.clear();
    if (pct <= 0) return;
    const fillW = Math.max(3, w * pct);

    // Glow behind bar
    graphics.fillStyle(0x00cc66, 0.15);
    graphics.fillRect(x - 2, y - 2, fillW + 4, h + 4);

    graphics.fillStyle(0x00cc66, 1);
    graphics.fillRect(x + 1, y + 1, fillW - 2, h - 2);
    graphics.fillStyle(0x00ff88, 0.3);
    graphics.fillRect(x + 1, y + 1, fillW - 2, 4);
  }

  _buildButton(cx, cy, w, h, label, darkCol, baseCol, accentCol, delay, onClick) {
    const container = this.add.container(cx, cy + 90).setAlpha(0);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
    container.add(shadow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(darkCol, 1);
    body.fillRect(-w / 2, -h / 2, w, h);
    body.fillStyle(baseCol, 1);
    body.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    // Top bevel
    body.fillStyle(accentCol, 0.2);
    body.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 4);
    // Border
    body.fillStyle(accentCol, 0.4);
    body.fillRect(-w / 2, -h / 2, w, 2);
    body.fillRect(-w / 2, h / 2 - 2, w, 2);
    body.fillRect(-w / 2, -h / 2, 2, h);
    body.fillRect(w / 2 - 2, -h / 2, 2, h);
    container.add(body);

    const text = this.add.text(0, 0, label, {
      fontFamily: PIXEL_FONT, fontSize: '21px', color: '#ffffff'
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
        scale: { start: 0.4, end: 0.8 },
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
      const nextRegion = getRegionForLevel(nextLevelNum);
      const sceneKey = nextEq.boss ? 'BossScene' : 'GameScene';
      this.scene.start(sceneKey, {
        equation: nextEq,
        progression: this.progression,
        region: nextRegion
      });
    } else {
      this.scene.start('MenuScene', { progression: this.progression });
    }
  }
}
