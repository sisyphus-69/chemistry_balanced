import Phaser from 'phaser';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import equationsData from '../data/equations.json';

/**
 * MenuScene — Super Mario World-style overworld map.
 * The player controls a flask character that walks along a winding path
 * between level nodes. Press Enter or click a node to start that level.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.progression = data.progression || new ProgressionSystem();
    this.playerMoving = false;
    this.currentNodeIdx = data.startNode ?? this._findStartNode();
  }

  /**
   * Find the best starting node — highest unlocked incomplete, or last completed.
   */
  _findStartNode() {
    const maxUnlocked = this.progression.getMaxUnlockedLevel();
    let best = 0;
    for (let i = 0; i < equationsData.length; i++) {
      const eq = equationsData[i];
      if (eq.level > maxUnlocked) break;
      const done = this.progression.getLevelData(eq.id);
      if (!done) return i; // first uncompleted unlocked
      best = i;
    }
    return best;
  }

  create() {
    const { width, height } = this.cameras.main;
    const maxUnlocked = this.progression.getMaxUnlockedLevel();

    // ---- Build winding path positions ----
    this.nodes = this._buildMapPath(width, height);

    // World container that we'll scroll with the camera
    this.mapContainer = this.add.container(0, 0);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f1e).setScrollFactor(0);

    // Draw decorative background elements (subtle grid lines)
    const bgGfx = this.add.graphics().setScrollFactor(0);
    bgGfx.lineStyle(1, 0x1a1a30, 0.3);
    for (let gx = 0; gx < width; gx += 60) {
      bgGfx.lineBetween(gx, 0, gx, height);
    }
    for (let gy = 0; gy < height; gy += 60) {
      bgGfx.lineBetween(0, gy, width, gy);
    }

    // ---- Draw path lines between nodes ----
    const pathGfx = this.add.graphics();
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      // Draw dotted path
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      const dots = Math.floor(dist / 10);
      for (let d = 0; d < dots; d++) {
        const t = d / dots;
        const dx = Phaser.Math.Linear(a.x, b.x, t);
        const dy = Phaser.Math.Linear(a.y, b.y, t);
        const unlocked = equationsData[i + 1].level <= maxUnlocked;
        pathGfx.fillStyle(unlocked ? 0x555577 : 0x2a2a3a, unlocked ? 0.8 : 0.3);
        pathGfx.fillCircle(dx, dy, 2);
      }
    }

    // ---- Draw region banners ----
    const regions = [
      { level: 1,  label: 'Synthesis',          color: '#00ff88' },
      { level: 11, label: 'Decomposition',      color: '#ff8844' },
      { level: 16, label: 'Single Replacement',  color: '#44aaff' },
      { level: 21, label: 'Double Replacement',  color: '#ff44aa' },
      { level: 27, label: 'Combustion & Mixed',  color: '#ffdd44' }
    ];

    regions.forEach(region => {
      const nodeIdx = equationsData.findIndex(eq => eq.level === region.level);
      if (nodeIdx < 0) return;
      const node = this.nodes[nodeIdx];
      this.add.image(node.x, node.y - 36, 'region_banner').setOrigin(0.5);
      this.add.text(node.x, node.y - 36, region.label, {
        fontFamily: 'monospace', fontSize: '10px', color: region.color
      }).setOrigin(0.5);
    });

    // ---- Draw level nodes ----
    this.nodeSprites = [];
    this.nodeLabels = [];

    equationsData.forEach((eq, i) => {
      const node = this.nodes[i];
      const unlocked = eq.level <= maxUnlocked;
      const completed = this.progression.getLevelData(eq.id);
      const isCurrent = i === this.currentNodeIdx;

      // Choose node texture
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

      const sprite = this.add.image(node.x, node.y, texKey).setOrigin(0.5);
      if (eq.boss && unlocked) sprite.setScale(1.15);

      // Level number on node
      const label = this.add.text(node.x, node.y, `${eq.level}`, {
        fontFamily: 'monospace',
        fontSize: eq.boss ? '13px' : '12px',
        color: unlocked ? '#ffffff' : '#333355',
        fontStyle: eq.boss ? 'bold' : 'normal'
      }).setOrigin(0.5);

      // Stars below node
      if (completed) {
        for (let s = 0; s < 3; s++) {
          this.add.image(
            node.x - 10 + s * 10,
            node.y + 20,
            s < completed.stars ? 'star_filled' : 'star_empty'
          ).setScale(0.45);
        }
      }

      // Boss label
      if (eq.boss && unlocked) {
        this.add.text(node.x, node.y - 22, 'BOSS', {
          fontFamily: 'monospace', fontSize: '7px', color: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5);
      }

      // Click to move player to this node
      if (unlocked) {
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => {
          this._movePlayerToNode(i);
        });
      }

      this.nodeSprites.push(sprite);
      this.nodeLabels.push(label);
    });

    // ---- Player sprite ----
    const startNode = this.nodes[this.currentNodeIdx];
    this.player = this.add.image(startNode.x, startNode.y - 18, 'player_flask')
      .setOrigin(0.5, 1);

    // Gentle bob animation
    this.tweens.add({
      targets: this.player,
      y: startNode.y - 22,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ---- HUD (fixed to camera) ----
    this._buildHUD(width, height);

    // ---- Level info panel at bottom ----
    this._buildInfoPanel(width, height);
    this._updateInfoPanel();

    // ---- Keyboard controls ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Camera follows player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(100, 50);

    // Set camera bounds to cover the full map
    const bounds = this._getMapBounds();
    this.cameras.main.setBounds(
      bounds.minX - 80, bounds.minY - 80,
      bounds.maxX - bounds.minX + 160,
      bounds.maxY - bounds.minY + 160
    );

    // Track input for left/right navigation
    this.lastMoveTime = 0;

    // Highlight current node
    this._highlightCurrentNode();
  }

  update(time) {
    if (this.playerMoving) return;
    if (this.settingsPanel) return;

    const debounce = 180; // ms between moves

    // Arrow keys: move to adjacent node
    if (time - this.lastMoveTime > debounce) {
      if (this.cursors.right.isDown || this.cursors.down.isDown) {
        this._movePlayerToNode(this.currentNodeIdx + 1);
        this.lastMoveTime = time;
      } else if (this.cursors.left.isDown || this.cursors.up.isDown) {
        this._movePlayerToNode(this.currentNodeIdx - 1);
        this.lastMoveTime = time;
      }
    }

    // Enter / Space: start the level at current node
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._enterCurrentLevel();
    }
  }

  /**
   * Build a winding snaking path for the map nodes.
   * Snakes left-to-right, then right-to-left, in rows.
   */
  _buildMapPath(viewW, viewH) {
    const nodes = [];
    const nodesPerRow = 5;
    const hSpacing = 120;
    const vSpacing = 90;
    const startX = 116;
    const startY = 150;

    const totalRows = Math.ceil(equationsData.length / nodesPerRow);

    equationsData.forEach((eq, i) => {
      const row = Math.floor(i / nodesPerRow);
      const col = i % nodesPerRow;
      const goingRight = row % 2 === 0;

      const actualCol = goingRight ? col : (nodesPerRow - 1 - col);
      const x = startX + actualCol * hSpacing;
      const y = startY + row * vSpacing;

      nodes.push({ x, y, eq, index: i });
    });

    return nodes;
  }

  _getMapBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    });
    return { minX, minY, maxX, maxY };
  }

  _movePlayerToNode(targetIdx) {
    if (this.playerMoving) return;
    if (targetIdx < 0 || targetIdx >= this.nodes.length) return;

    // Can only move to unlocked nodes
    const targetEq = equationsData[targetIdx];
    if (targetEq.level > this.progression.getMaxUnlockedLevel()) return;

    // Can only move to adjacent nodes (one step at a time)
    const diff = Math.abs(targetIdx - this.currentNodeIdx);
    if (diff === 0) return;

    // If clicking a non-adjacent node, walk through each node in sequence
    if (diff > 1) {
      this._walkPath(targetIdx);
      return;
    }

    this.playerMoving = true;
    const prev = this.currentNodeIdx;
    this.currentNodeIdx = targetIdx;
    const target = this.nodes[targetIdx];

    // Stop bob tween, move, restart bob
    this.tweens.killTweensOf(this.player);

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y - 18,
      duration: 200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.playerMoving = false;
        // Restart bob
        this.tweens.add({
          targets: this.player,
          y: target.y - 22,
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

  /**
   * Walk through multiple nodes in sequence to reach a distant target.
   */
  _walkPath(targetIdx) {
    if (this.playerMoving) return;

    const maxUnlocked = this.progression.getMaxUnlockedLevel();
    // Clamp target to furthest unlocked
    let clampedTarget = targetIdx;
    if (equationsData[clampedTarget].level > maxUnlocked) {
      // Find the last unlocked index before target
      for (let i = targetIdx; i >= 0; i--) {
        if (equationsData[i].level <= maxUnlocked) {
          clampedTarget = i;
          break;
        }
      }
    }
    if (clampedTarget === this.currentNodeIdx) return;

    this.playerMoving = true;
    const direction = clampedTarget > this.currentNodeIdx ? 1 : -1;
    const steps = [];
    let idx = this.currentNodeIdx;
    while (idx !== clampedTarget) {
      idx += direction;
      steps.push(idx);
    }

    this.tweens.killTweensOf(this.player);

    const walkStep = (stepIdx) => {
      if (stepIdx >= steps.length) {
        this.playerMoving = false;
        const finalNode = this.nodes[this.currentNodeIdx];
        this.tweens.add({
          targets: this.player,
          y: finalNode.y - 22,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this._highlightCurrentNode();
        this._updateInfoPanel();
        return;
      }

      const nextIdx = steps[stepIdx];
      this.currentNodeIdx = nextIdx;
      const node = this.nodes[nextIdx];

      this.tweens.add({
        targets: this.player,
        x: node.x,
        y: node.y - 18,
        duration: 120,
        ease: 'Linear',
        onComplete: () => walkStep(stepIdx + 1)
      });
    };

    walkStep(0);
  }

  _highlightCurrentNode() {
    const maxUnlocked = this.progression.getMaxUnlockedLevel();

    this.nodeSprites.forEach((sprite, i) => {
      const eq = equationsData[i];
      const unlocked = eq.level <= maxUnlocked;
      const completed = this.progression.getLevelData(eq.id);

      if (i === this.currentNodeIdx) {
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

    // Flash the node
    const sprite = this.nodeSprites[this.currentNodeIdx];
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
  }

  _buildHUD(width, height) {
    // Fixed HUD container
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xp = this.progression.getXP();

    // Title bar background
    const titleBarHeight = 70;
    const titleBar = this.add.graphics().setScrollFactor(0).setDepth(99);
    titleBar.fillStyle(0x1a1a2e, 0.92);
    titleBar.fillRect(0, 0, width, titleBarHeight);
    titleBar.lineStyle(2, 0x2a2a44, 0.6);
    titleBar.lineBetween(0, titleBarHeight, width, titleBarHeight);

    // Left side container - Title & Rank
    const leftPadding = 24;
    const topPadding = 16;

    // Title (top-left)
    this.add.text(leftPadding, topPadding, 'ChemQuest', {
      fontFamily: 'monospace', fontSize: '18px', color: '#00ff88', fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(100);

    // Rank (below title)
    this.add.text(leftPadding, topPadding + 28, rank.title, {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffdd44'
    }).setScrollFactor(0).setDepth(100);

    // Right side container - XP & Streak
    const rightPadding = 24;

    // XP bar (top right)
    if (nextRank) {
      const barW = 140, barH = 8;
      const barX = width - barW - rightPadding;
      const barY = topPadding;
      const pct = Math.min(1, (xp - rank.xp) / (nextRank.xp - rank.xp));

      const xpBg = this.add.graphics().setScrollFactor(0).setDepth(100);
      xpBg.fillStyle(0x333355, 1);
      xpBg.fillRoundedRect(barX, barY, barW, barH, 4);

      const xpFill = this.add.graphics().setScrollFactor(0).setDepth(100);
      xpFill.fillStyle(0x00ff88, 1);
      xpFill.fillRoundedRect(barX, barY, barW * pct, barH, 4);

      this.add.text(width - rightPadding, barY + 16, `${xp} XP`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#aaaacc'
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    }

    // Streak
    const streak = this.progression.getStreak();
    if (streak > 0) {
      this.add.text(width - rightPadding, topPadding + 36, `Streak: ${streak}`, {
        fontFamily: 'monospace', fontSize: '10px',
        color: streak >= 5 ? '#ff6644' : '#ffdd44'
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    }

    // Settings button
    const settingsBtn = this.add.text(24, height - 28, '[Settings]', {
      fontFamily: 'monospace', fontSize: '11px', color: '#6666aa'
    }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this._toggleSettings());

    // Controls hint
    this.add.text(width / 2, height - 18, 'Arrow keys to move  |  Enter to play', {
      fontFamily: 'monospace', fontSize: '10px', color: '#555577'
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);
  }

  _buildInfoPanel(width, height) {
    // Info panel at the bottom showing current level details
    const panelH = 60;
    const panelY = height - panelH - 32;

    this.infoBg = this.add.graphics().setScrollFactor(0).setDepth(99);
    this.infoBg.fillStyle(0x1a1a2e, 0.92);
    this.infoBg.fillRoundedRect(width / 2 - 220, panelY, 440, panelH, 10);
    this.infoBg.lineStyle(2, 0x2a2a44, 0.6);
    this.infoBg.strokeRoundedRect(width / 2 - 220, panelY, 440, panelH, 10);

    this.infoTitle = this.add.text(width / 2, panelY + 14, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.infoSub = this.add.text(width / 2, panelY + 36, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#aaaacc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.infoStars = [];
    for (let s = 0; s < 3; s++) {
      const star = this.add.image(width / 2 + 170 + s * 16, panelY + 16, 'star_empty')
        .setScale(0.6).setScrollFactor(0).setDepth(100);
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
      unlocked
        ? `Level ${eq.level}${bossTag}`
        : `Level ${eq.level}: LOCKED`
    );
    this.infoTitle.setColor(unlocked ? (eq.boss ? '#ff6644' : '#ffffff') : '#444466');

    this.infoSub.setText(
      unlocked
        ? `${typeLabel}  |  ${diffLabel}  |  par: ${eq.par_time}s  |  ${completed ? 'COMPLETED' : 'not yet cleared'}`
        : 'Earn more XP to unlock this region'
    );

    this.infoStars.forEach((star, s) => {
      if (completed && s < completed.stars) {
        star.setTexture('star_filled');
      } else {
        star.setTexture('star_empty');
      }
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
    const D = 200; // depth for all settings elements

    // Track all elements so we can destroy them together
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

    // Full-screen blocker so clicks don't pass through
    const blocker = _add(
      this.add.zone(cx, cy, width, height)
        .setInteractive()
    );
    blocker.on('pointerdown', () => {}); // swallow clicks

    // Panel background
    const bg = _add(this.add.graphics());
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(0x1a1a2e, 0.98);
    bg.fillRoundedRect(cx - 160, cy - 110, 320, 220, 12);
    bg.lineStyle(2, 0x5555aa, 0.8);
    bg.strokeRoundedRect(cx - 160, cy - 110, 320, 220, 12);

    // Title
    _add(this.add.text(cx, cy - 88, 'Settings', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5));

    // Separator
    const sep = _add(this.add.graphics());
    sep.lineStyle(1, 0x3344aa, 0.3);
    sep.lineBetween(cx - 140, cy - 65, cx + 140, cy - 65);

    // Colorblind toggle
    const cbText = _add(this.add.text(cx - 130, cy - 40, `Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaacc'
    }).setInteractive({ useHandCursor: true }));
    cbText.on('pointerdown', () => {
      settings.colorblindMode = !settings.colorblindMode;
      this.progression.updateSettings(settings);
      cbText.setText(`Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`);
    });
    cbText.on('pointerover', () => cbText.setColor('#ffffff'));
    cbText.on('pointerout', () => cbText.setColor('#aaaacc'));

    // Reset progress
    const resetBtn = _add(this.add.text(cx, cy + 40, '[ Reset All Progress ]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    resetBtn.on('pointerdown', () => {
      this.progression.resetAll();
      this.settingsPanel = null; // prevent double-destroy
      this.scene.restart({ progression: this.progression });
    });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ff6666'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#ff4444'));

    // Close button
    const closeBtn = _add(this.add.text(cx + 140, cy - 98, '\u2715', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ff6666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
    closeBtn.on('pointerdown', destroyPanel);
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff9999'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ff6666'));
  }
}
