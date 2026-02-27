import Phaser from 'phaser';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { PIXEL_FONT } from '../ui/PixelText.js';
import { REGIONS, getRegionForLevel, getRegionIndex } from '../data/regions.js';
import equationsData from '../data/equations.json';

/**
 * MenuScene — RPG-style region map.
 * Shows ONE region at a time (10 nodes). Players switch between unlocked regions.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.progression = data.progression || new ProgressionSystem();
    this.playerMoving = false;
    this.currentNodeIdx = data.startNode ?? this._findStartNode();
    this.currentRegionIdx = getRegionIndex(equationsData[this.currentNodeIdx]?.level || 1);
    if (this.currentRegionIdx < 0) this.currentRegionIdx = 0;
  }

  _findStartNode() {
    const maxUnlocked = this.progression.getMaxUnlockedLevel();
    let best = 0;
    for (let i = 0; i < equationsData.length; i++) {
      const eq = equationsData[i];
      if (eq.level > maxUnlocked) break;
      const done = this.progression.getLevelData(eq.id);
      if (!done) return i;
      best = i;
    }
    return best;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.UI_PAD = 16;
    this.FOOTER_GAP = 34;
    this._buildRegionMap(width, height);
    this._buildHUD(width, height);
    this._buildInfoPanel(width, height);
    this._updateInfoPanel();

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.lastMoveTime = 0;
  }

  update(time) {
    if (this.playerMoving) return;

    if (this.settingsPanel) {
      if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this._toggleSettings();
      }
      return;
    }

    const debounce = 180;

    if (time - this.lastMoveTime > debounce) {
      if (this.cursors.right.isDown || this.cursors.down.isDown) {
        this._movePlayerToNode(this.currentNodeIdx + 1);
        this.lastMoveTime = time;
      } else if (this.cursors.left.isDown || this.cursors.up.isDown) {
        this._movePlayerToNode(this.currentNodeIdx - 1);
        this.lastMoveTime = time;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._enterCurrentLevel();
    }
  }

  // ─────────────────────────────────────────────
  // REGION MAP — shows 10 nodes for the current region
  // ─────────────────────────────────────────────
  _buildRegionMap(width, height) {
    const region = REGIONS[this.currentRegionIdx];
    if (!region) return;

    const maxUnlocked = this.progression.getMaxUnlockedLevel();

    // Region-themed background
    this.add.rectangle(width / 2, height / 2, width, height, region.palette.bg);

    // Background decorations
    this._drawDecorations(width, height, region);

    // Draw path lines between nodes
    const pathGfx = this.add.graphics();
    const regionEqs = equationsData.filter(eq => eq.level >= region.levels[0] && eq.level <= region.levels[1]);

    for (let i = 0; i < region.nodes.length - 1; i++) {
      const a = region.nodes[i];
      const b = region.nodes[i + 1];
      const ax = a.x * width, ay = a.y * height;
      const bx = b.x * width, by = b.y * height;

      const dist = Phaser.Math.Distance.Between(ax, ay, bx, by);
      const dots = Math.floor(dist / 12);
      const nextEq = regionEqs[i + 1];
      const unlocked = nextEq && nextEq.level <= maxUnlocked;

      for (let d = 0; d < dots; d++) {
        const t = d / dots;
        const dx = Phaser.Math.Linear(ax, bx, t);
        const dy = Phaser.Math.Linear(ay, by, t);
        pathGfx.fillStyle(unlocked ? region.palette.pathDot : region.palette.path, unlocked ? 0.7 : 0.25);
        pathGfx.fillRect(Math.round(dx) - 1, Math.round(dy) - 1, 3, 3);
      }
    }

    // Draw level nodes
    this.nodeSprites = [];
    this.nodeLabels = [];
    this.regionEqs = regionEqs;

    regionEqs.forEach((eq, i) => {
      if (i >= region.nodes.length) return;
      const nodePos = region.nodes[i];
      const x = nodePos.x * width;
      const y = nodePos.y * height;
      const unlocked = eq.level <= maxUnlocked;
      const completed = this.progression.getLevelData(eq.id);
      const globalIdx = equationsData.findIndex(e => e.id === eq.id);
      const isCurrent = globalIdx === this.currentNodeIdx;

      // Choose texture
      let texKey = 'node_locked';
      if (!unlocked) {
        texKey = 'node_locked';
      } else if (isCurrent) {
        texKey = 'node_current';
      } else if (completed) {
        texKey = 'node_complete';
      } else if (eq.boss) {
        texKey = 'node_boss';
      } else {
        texKey = 'node_normal';
      }

      const sprite = this.add.image(x, y, texKey).setOrigin(0.5);
      if (eq.boss && unlocked) sprite.setScale(1.15);

      // Level number
      const label = this.add.text(x, y, `${eq.level}`, {
        fontFamily: PIXEL_FONT,
        fontSize: eq.boss ? '12px' : '10px',
        color: unlocked ? '#ffffff' : '#333355'
      }).setOrigin(0.5);

      // Stars below node
      if (completed) {
        for (let s = 0; s < 3; s++) {
          this.add.image(
            x - 10 + s * 10, y + 22,
            s < completed.stars ? 'star_filled' : 'star_empty'
          ).setScale(0.4);
        }
      }

      // Boss label
      if (eq.boss && unlocked) {
        this.add.text(x, y - 22, 'BOSS', {
          fontFamily: PIXEL_FONT, fontSize: '8px', color: '#ff4444'
        }).setOrigin(0.5);
      }

      // Click to move
      if (unlocked) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => {
          this._movePlayerToNode(globalIdx);
        });
      }

      this.nodeSprites.push(sprite);
      this.nodeLabels.push(label);
    });

    // Player sprite
    const currentEq = equationsData[this.currentNodeIdx];
    const regionLocalIdx = regionEqs.findIndex(eq => eq.id === currentEq?.id);
    const startNodePos = region.nodes[regionLocalIdx >= 0 ? regionLocalIdx : 0];
    const px = startNodePos.x * width;
    const py = startNodePos.y * height;

    this.player = this.add.image(px, py - 18, 'player_flask').setOrigin(0.5, 1);

    this.tweens.add({
      targets: this.player,
      y: py - 22,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

  }

  _drawDecorations(width, height, region) {
    const gfx = this.add.graphics();

    if (region.decorations === 'lab') {
      // Split biome: left green lab, right dark corrupted
      const midX = width / 2 + 50;

      // Left side - Lab
      gfx.fillStyle(0x0f1a15, 1);
      gfx.fillRect(0, 0, midX, height);
      
      // Right side - Corrupted
      gfx.fillStyle(0x150a1a, 1);
      gfx.fillRect(midX, 0, width - midX, height);

      // Center divider
      gfx.lineStyle(4, 0x333344, 1);
      gfx.lineBetween(midX, 0, midX, height);

      // Green hexagon pattern (Left)
      gfx.lineStyle(1, 0x00ff88, 0.15);
      for (let x = 40; x < midX; x += 80) {
        for (let y = 40; y < height; y += 70) {
          const ox = (Math.floor(y / 70) % 2) * 40;
          if (x + ox < midX) this._drawHexagon(gfx, x + ox, y, 20);
        }
      }

      // Purple rocky pattern (Right)
      gfx.fillStyle(0xff44aa, 0.05);
      for (let i = 0; i < 20; i++) {
        const px = Phaser.Math.Between(midX + 20, width - 20);
        const py = Phaser.Math.Between(20, height - 20);
        gfx.fillTriangle(px, py, px + 15, py + 20, px - 10, py + 15);
      }
    } else if (region.decorations === 'volcanic') {
      // Lava cracks
      gfx.lineStyle(1, region.palette.accent, 0.1);
      for (let i = 0; i < 8; i++) {
        const sx = Phaser.Math.Between(50, width - 50);
        const sy = Phaser.Math.Between(100, height - 100);
        gfx.lineBetween(sx, sy, sx + Phaser.Math.Between(-30, 30), sy + Phaser.Math.Between(-20, 20));
      }
      // Flame spots
      gfx.fillStyle(region.palette.accent, 0.05);
      for (let i = 0; i < 5; i++) {
        gfx.fillRect(Phaser.Math.Between(30, width - 30), Phaser.Math.Between(80, height - 80), 4, 8);
      }
    } else if (region.decorations === 'ice') {
      // Crystal accents
      gfx.fillStyle(region.palette.accent, 0.05);
      for (let i = 0; i < 6; i++) {
        const cx = Phaser.Math.Between(40, width - 40);
        const cy = Phaser.Math.Between(80, height - 80);
        gfx.fillRect(cx - 1, cy - 8, 3, 16);
        gfx.fillRect(cx - 4, cy - 2, 9, 4);
      }
      // Snowflakes
      gfx.fillStyle(0xffffff, 0.04);
      for (let i = 0; i < 12; i++) {
        gfx.fillRect(Phaser.Math.Between(20, width - 20), Phaser.Math.Between(60, height - 60), 2, 2);
      }
    } else if (region.decorations === 'circuit') {
      // Circuit grid lines
      gfx.lineStyle(1, region.palette.path, 0.12);
      for (let x = 60; x < width; x += 100) {
        gfx.lineBetween(x, 80, x, height - 80);
      }
      for (let y = 100; y < height; y += 80) {
        gfx.lineBetween(60, y, width - 60, y);
      }
      // Spark dots
      gfx.fillStyle(region.palette.accent, 0.08);
      for (let i = 0; i < 8; i++) {
        gfx.fillRect(Phaser.Math.Between(50, width - 50), Phaser.Math.Between(90, height - 90), 3, 3);
      }
    } else if (region.decorations === 'dark') {
      // Purple wisps
      gfx.fillStyle(region.palette.accent, 0.04);
      for (let i = 0; i < 10; i++) {
        const wx = Phaser.Math.Between(30, width - 30);
        const wy = Phaser.Math.Between(80, height - 80);
        gfx.fillRect(wx, wy, 2, 6);
        gfx.fillRect(wx - 2, wy + 2, 6, 2);
      }
      // Skull-like dots
      gfx.fillStyle(0xffffff, 0.03);
      for (let i = 0; i < 5; i++) {
        const sx = Phaser.Math.Between(40, width - 40);
        const sy = Phaser.Math.Between(90, height - 90);
        gfx.fillRect(sx - 2, sy, 2, 2);
        gfx.fillRect(sx + 1, sy, 2, 2);
        gfx.fillRect(sx - 1, sy + 3, 3, 1);
      }
    }
  }

  _drawHexagon(gfx, cx, cy, r) {
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) gfx.moveTo(x, y);
      else gfx.lineTo(x, y);
    }
    gfx.closePath();
    gfx.strokePath();
  }

  // ─────────────────────────────────────────────
  // PLAYER MOVEMENT
  // ─────────────────────────────────────────────
  _movePlayerToNode(targetIdx) {
    if (this.playerMoving) return;
    if (targetIdx < 0 || targetIdx >= equationsData.length) return;

    const targetEq = equationsData[targetIdx];
    if (targetEq.level > this.progression.getMaxUnlockedLevel()) return;

    // Check if target is in a different region
    const targetRegionIdx = getRegionIndex(targetEq.level);
    if (targetRegionIdx !== this.currentRegionIdx) {
      // Switch region and rebuild
      this.currentNodeIdx = targetIdx;
      this.currentRegionIdx = targetRegionIdx;
      this.scene.restart({ progression: this.progression, startNode: targetIdx });
      return;
    }

    const diff = Math.abs(targetIdx - this.currentNodeIdx);
    if (diff === 0) return;

    if (diff > 1) {
      this._walkPath(targetIdx);
      return;
    }

    this.playerMoving = true;
    this.currentNodeIdx = targetIdx;

    const region = REGIONS[this.currentRegionIdx];
    const { width, height } = this.cameras.main;
    const regionEqs = this.regionEqs;
    const localIdx = regionEqs.findIndex(eq => eq.id === targetEq.id);
    if (localIdx < 0 || localIdx >= region.nodes.length) {
      this.playerMoving = false;
      return;
    }
    const target = region.nodes[localIdx];

    this.tweens.killTweensOf(this.player);

    this.tweens.add({
      targets: this.player,
      x: target.x * width,
      y: target.y * height - 18,
      duration: 200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.playerMoving = false;
        this.tweens.add({
          targets: this.player,
          y: target.y * height - 22,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this._highlightCurrentNode();
        this._updateInfoPanel();
      }
    });
  }

  _walkPath(targetIdx) {
    if (this.playerMoving) return;

    const maxUnlocked = this.progression.getMaxUnlockedLevel();
    let clampedTarget = targetIdx;
    if (equationsData[clampedTarget].level > maxUnlocked) {
      for (let i = targetIdx; i >= 0; i--) {
        if (equationsData[i].level <= maxUnlocked) {
          clampedTarget = i;
          break;
        }
      }
    }
    if (clampedTarget === this.currentNodeIdx) return;

    // Check if target is in different region
    const targetRegionIdx = getRegionIndex(equationsData[clampedTarget].level);
    if (targetRegionIdx !== this.currentRegionIdx) {
      this.currentNodeIdx = clampedTarget;
      this.currentRegionIdx = targetRegionIdx;
      this.scene.restart({ progression: this.progression, startNode: clampedTarget });
      return;
    }

    this.playerMoving = true;
    const direction = clampedTarget > this.currentNodeIdx ? 1 : -1;
    const steps = [];
    let idx = this.currentNodeIdx;
    while (idx !== clampedTarget) {
      idx += direction;
      steps.push(idx);
    }

    this.tweens.killTweensOf(this.player);

    const { width, height } = this.cameras.main;
    const region = REGIONS[this.currentRegionIdx];

    const walkStep = (stepIdx) => {
      if (stepIdx >= steps.length) {
        this.playerMoving = false;
        const finalLocalIdx = this.regionEqs.findIndex(eq => eq.id === equationsData[this.currentNodeIdx]?.id);
        if (finalLocalIdx >= 0 && finalLocalIdx < region.nodes.length) {
          const fn = region.nodes[finalLocalIdx];
          this.tweens.add({
            targets: this.player,
            y: fn.y * height - 22,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
        this._highlightCurrentNode();
        this._updateInfoPanel();
        return;
      }

      const nextIdx = steps[stepIdx];
      this.currentNodeIdx = nextIdx;
      const eq = equationsData[nextIdx];
      const localIdx = this.regionEqs.findIndex(e => e.id === eq.id);
      if (localIdx < 0 || localIdx >= region.nodes.length) {
        // Crossed region boundary
        this.playerMoving = false;
        return;
      }
      const node = region.nodes[localIdx];

      this.tweens.add({
        targets: this.player,
        x: node.x * width,
        y: node.y * height - 18,
        duration: 120,
        ease: 'Linear',
        onComplete: () => walkStep(stepIdx + 1)
      });
    };

    walkStep(0);
  }

  _highlightCurrentNode() {
    const maxUnlocked = this.progression.getMaxUnlockedLevel();
    const regionEqs = this.regionEqs;

    this.nodeSprites.forEach((sprite, i) => {
      if (i >= regionEqs.length) return;
      const eq = regionEqs[i];
      const unlocked = eq.level <= maxUnlocked;
      const completed = this.progression.getLevelData(eq.id);
      const globalIdx = equationsData.findIndex(e => e.id === eq.id);

      if (globalIdx === this.currentNodeIdx) {
        sprite.setTexture('node_current');
        if (eq.boss) sprite.setScale(1.15);
        else sprite.setScale(1);
      } else if (!unlocked) {
        sprite.setTexture('node_locked');
        sprite.setScale(1);
      } else if (completed) {
        sprite.setTexture('node_complete');
        sprite.setScale(1);
      } else if (eq.boss) {
        sprite.setTexture('node_boss');
        sprite.setScale(1.15);
      } else {
        sprite.setTexture('node_normal');
        sprite.setScale(1);
      }
    });
  }

  _enterCurrentLevel() {
    const eq = equationsData[this.currentNodeIdx];
    if (!eq) return;
    if (eq.level > this.progression.getMaxUnlockedLevel()) return;

    const sprite = this.nodeSprites[this.regionEqs.findIndex(e => e.id === eq.id)];
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        scaleX: 1.4, scaleY: 1.4,
        duration: 150,
        yoyo: true,
        onComplete: () => {
          const sceneKey = eq.boss ? 'BossScene' : 'GameScene';
          this.scene.start(sceneKey, {
            equation: eq,
            progression: this.progression
          });
        }
      });
    } else {
      const sceneKey = eq.boss ? 'BossScene' : 'GameScene';
      this.scene.start(sceneKey, {
        equation: eq,
        progression: this.progression
      });
    }
  }

  // ─────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────
  _buildHUD(width, height) {
    const pad = this.UI_PAD || 16;
    const footerY = height - pad;

    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xp = this.progression.getXP();

    // Title bar
    const titleBar = this.add.graphics();
    titleBar.fillStyle(0x0d0d1e, 0.9);
    titleBar.fillRect(0, 0, width, 40);
    titleBar.fillStyle(0x333366, 0.3);
    titleBar.fillRect(0, 39, width, 1);

    // Title
    this.add.text(pad, 10, 'ChemQuest', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#00ff88'
    });

    // Rank
    this.add.text(pad, 28, rank.title, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ffdd44'
    });

    // XP bar
    if (nextRank) {
      const barW = 120, barH = 6;
      const barX = width - barW - pad;
      const barY = 10;
      const pct = Math.min(1, (xp - rank.xp) / (nextRank.xp - rank.xp));

      const xpBg = this.add.graphics();
      xpBg.fillStyle(0x333355, 1);
      xpBg.fillRect(barX, barY, barW, barH);

      const xpFill = this.add.graphics();
      xpFill.fillStyle(0x00ff88, 1);
      xpFill.fillRect(barX, barY, barW * pct, barH);

      this.add.text(width - pad, barY + 12, `${xp} XP`, {
        fontFamily: PIXEL_FONT, fontSize: '8px', color: '#aaaacc'
      }).setOrigin(1, 0);
    }

    // Streak
    const streak = this.progression.getStreak();
    if (streak > 0) {
      this.add.text(width - pad, 28, `Streak: ${streak}`, {
        fontFamily: PIXEL_FONT, fontSize: '8px',
        color: streak >= 5 ? '#ff6644' : '#ffdd44'
      }).setOrigin(1, 0);
    }

    // Region navigation arrows
    // Left arrow (previous region)
    if (this.currentRegionIdx > 0) {
      const prevBtn = this.add.text(pad, footerY, '< Prev Region', {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: '#8888aa'
      }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => {
        const prevRegion = REGIONS[this.currentRegionIdx - 1];
        const firstEq = equationsData.find(eq => eq.level === prevRegion.levels[0]);
        if (firstEq) {
          const idx = equationsData.findIndex(e => e.id === firstEq.id);
          this.currentNodeIdx = idx;
          this.currentRegionIdx = this.currentRegionIdx - 1;
          this.scene.restart({ progression: this.progression, startNode: idx });
        }
      });
    }

    // Right arrow (next region)
    if (this.currentRegionIdx < REGIONS.length - 1) {
      const nextRegion = REGIONS[this.currentRegionIdx + 1];
      const nextBtn = this.add.text(width - pad, footerY, 'Next Region >', {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: '#8888aa'
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => {
        const firstEq = equationsData.find(eq => eq.level === nextRegion.levels[0]);
        if (firstEq) {
          const idx = equationsData.findIndex(e => e.id === firstEq.id);
          this.currentNodeIdx = idx;
          this.currentRegionIdx = this.currentRegionIdx + 1;
          this.scene.restart({ progression: this.progression, startNode: idx });
        }
      });
    }

    // Settings button (bottom-left)
    const settingsBtn = this.add.text(pad, footerY, '⚙', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#6666aa'
    }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#aaaacc'));
    settingsBtn.on('pointerout', () => settingsBtn.setColor('#6666aa'));
    settingsBtn.on('pointerdown', () => this._toggleSettings());
  }

  _buildInfoPanel(width, height) {
    const pad = this.UI_PAD || 16;
    const panelH = 44;
    const panelW = Math.min(340, width - pad * 2);
    const panelX = width / 2 - panelW / 2;
    const panelY = height - panelH - (this.FOOTER_GAP || 34);

    this.infoBg = this.add.graphics();
    this.infoBg.fillStyle(0x0d0d1e, 0.95);
    this.infoBg.fillRect(panelX, panelY, panelW, panelH);
    this.infoBg.fillStyle(0x333366, 0.3);
    this.infoBg.fillRect(panelX, panelY, panelW, 1);

    this.infoTitle = this.add.text(panelX + 12, panelY + 12, '', {
      fontFamily: PIXEL_FONT, fontSize: '12px', color: '#ffffff'
    }).setOrigin(0, 0.5);

    this.infoSub = this.add.text(panelX + 12, panelY + 30, '', {
      fontFamily: PIXEL_FONT, fontSize: '8px', color: '#8888aa'
    }).setOrigin(0, 0.5);

    this.infoStars = [];
    for (let s = 0; s < 3; s++) {
      const star = this.add.image(panelX + panelW - 36 + s * 14, panelY + panelH / 2, 'star_empty')
        .setScale(0.5);
      this.infoStars.push(star);
    }
  }

  _updateInfoPanel() {
    const eq = equationsData[this.currentNodeIdx];
    if (!eq) return;

    const unlocked = eq.level <= this.progression.getMaxUnlockedLevel();
    const completed = this.progression.getLevelData(eq.id);

    const typeLabel = eq.type.replace(/_/g, ' ');
    const bossTag = eq.boss ? ' [BOSS]' : '';
    const diffLabel = eq.difficulty ? eq.difficulty.charAt(0).toUpperCase() + eq.difficulty.slice(1) : '';

    this.infoTitle.setText(
      unlocked ? `Level ${eq.level}${bossTag}` : `Level ${eq.level}: LOCKED`
    );
    this.infoTitle.setColor(unlocked ? (eq.boss ? '#ff6644' : '#ffffff') : '#444466');

    this.infoSub.setText(
      unlocked
        ? `${typeLabel}  ·  ${diffLabel}`
        : 'Locked'
    );

    this.infoStars.forEach((star, s) => {
      star.setTexture(completed && s < completed.stars ? 'star_filled' : 'star_empty');
    });
  }

  _toggleSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.forEach(el => el.destroy());
      this.settingsPanel = null;
      return;
    }

    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;
    const settings = this.progression.getSettings();
    const D = 200;

    this.settingsPanel = [];

    const _add = (obj) => {
      obj.setScrollFactor(0).setDepth(D);
      this.settingsPanel.push(obj);
      return obj;
    };

    const destroyPanel = () => {
      if (this.settingsPanel) {
        this.settingsPanel.forEach(el => el.destroy());
        this.settingsPanel = null;
      }
    };

    // Full-screen blocker
    const blocker = _add(
      this.add.zone(cx, cy, width, height).setInteractive()
    );
    blocker.on('pointerdown', destroyPanel);

    // Panel background
    const bg = _add(this.add.graphics());
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x0d0d1a, 0.98);
    bg.fillRect(cx - 160, cy - 100, 320, 200);
    // Border
    bg.fillStyle(0x333366, 1);
    bg.fillRect(cx - 160, cy - 100, 320, 2);
    bg.fillRect(cx - 160, cy + 98, 320, 2);
    bg.fillRect(cx - 160, cy - 100, 2, 200);
    bg.fillRect(cx + 158, cy - 100, 2, 200);

    // Title
    _add(this.add.text(cx, cy - 80, 'Settings', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5));

    // Separator
    const sep = _add(this.add.graphics());
    sep.fillStyle(0x333366, 0.3);
    sep.fillRect(cx - 140, cy - 60, 280, 1);

    // Colorblind toggle
    const cbText = _add(this.add.text(cx - 130, cy - 35, `Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`, {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#aaaacc'
    }).setInteractive({ useHandCursor: true }));
    cbText.on('pointerdown', () => {
      settings.colorblindMode = !settings.colorblindMode;
      this.progression.updateSettings(settings);
      cbText.setText(`Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`);
    });
    cbText.on('pointerover', () => cbText.setColor('#ffffff'));
    cbText.on('pointerout', () => cbText.setColor('#aaaacc'));

    // Reset progress
    const resetBtn = _add(this.add.text(cx, cy + 30, '[ Reset All Progress ]', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    resetBtn.on('pointerdown', () => {
      this.progression.resetAll();
      destroyPanel();
      this.scene.restart({ progression: this.progression });
    });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ff6666'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#ff4444'));

    // Close button
    const closeBtn = _add(this.add.text(cx + 140, cy - 88, 'X', {
      fontFamily: PIXEL_FONT, fontSize: '14px', color: '#ff6666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    closeBtn.on('pointerdown', destroyPanel);
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff9999'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ff6666'));
  }
}
