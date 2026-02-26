import Phaser from 'phaser';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import equationsData from '../data/equations.json';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data) {
    this.progression = data.progression || new ProgressionSystem();
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, 40, 'ChemQuest', {
      fontFamily: 'monospace',
      fontSize: '36px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 72, 'Equation Balancer', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#8888aa'
    }).setOrigin(0.5);

    // Rank & XP
    const rank = this.progression.getRank();
    const nextRank = this.progression.getNextRank();
    const xp = this.progression.getXP();

    this.add.text(width / 2, 100, rank.title, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffdd44'
    }).setOrigin(0.5);

    if (nextRank) {
      const xpProgress = xp - rank.xp;
      const xpNeeded = nextRank.xp - rank.xp;
      const pct = Math.min(1, xpProgress / xpNeeded);

      // XP bar
      const barW = 200, barH = 8;
      const barX = width / 2 - barW / 2;
      const barY = 115;
      this.add.graphics()
        .fillStyle(0x333355, 1)
        .fillRect(barX, barY, barW, barH);
      this.add.graphics()
        .fillStyle(0x00ff88, 1)
        .fillRect(barX, barY, barW * pct, barH);

      this.add.text(width / 2, barY + 14, `${xp} / ${nextRank.xp} XP`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#aaaacc'
      }).setOrigin(0.5);
    }

    // Level grid
    const startY = 150;
    const cols = 10;
    const cellSize = 52;
    const gridW = cols * cellSize;
    const offsetX = (width - gridW) / 2 + cellSize / 2;
    const maxUnlocked = this.progression.getMaxUnlockedLevel();

    // Scroll container for levels
    const bandLabels = [
      { level: 1, label: 'Synthesis' },
      { level: 11, label: 'Decomposition' },
      { level: 16, label: 'Single Replacement' },
      { level: 21, label: 'Double Replacement' },
      { level: 27, label: 'Combustion & Mixed' }
    ];

    let currentBandIdx = 0;
    let yOffset = startY;

    equationsData.forEach((eq, i) => {
      // Check if we need a band label
      if (currentBandIdx < bandLabels.length && eq.level === bandLabels[currentBandIdx].level) {
        if (i > 0) yOffset += 10;
        this.add.text(offsetX - cellSize / 2 + 5, yOffset, bandLabels[currentBandIdx].label, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6666aa'
        });
        yOffset += 18;
        currentBandIdx++;
      }

      const col = i % cols;
      const x = offsetX + col * cellSize;
      const y = yOffset;

      if (col === cols - 1) {
        yOffset += cellSize;
      }

      const levelNum = eq.level;
      const unlocked = levelNum <= maxUnlocked;
      const completed = this.progression.getLevelData(eq.id);

      // Level cell background
      const bg = this.add.graphics();
      if (!unlocked) {
        bg.fillStyle(0x222233, 0.5);
      } else if (eq.boss) {
        bg.fillStyle(0x442222, 0.8);
      } else {
        bg.fillStyle(0x2a2a4a, 0.8);
      }
      bg.fillRoundedRect(x - 20, y - 16, 44, 44, 6);

      if (unlocked) {
        bg.lineStyle(1, eq.boss ? 0xff4444 : 0x5555aa, 0.6);
        bg.strokeRoundedRect(x - 20, y - 16, 44, 44, 6);
      }

      // Level number
      const numText = this.add.text(x + 2, y, `${levelNum}`, {
        fontFamily: 'monospace',
        fontSize: unlocked ? '16px' : '12px',
        color: unlocked ? '#ffffff' : '#444466'
      }).setOrigin(0.5);

      // Stars
      if (completed) {
        for (let s = 0; s < 3; s++) {
          const starX = x - 10 + s * 10;
          const starY = y + 14;
          this.add.image(starX, starY, s < completed.stars ? 'star_filled' : 'star_empty')
            .setScale(0.5);
        }
      }

      // Boss indicator
      if (eq.boss && unlocked) {
        this.add.text(x + 2, y - 10, 'BOSS', {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#ff4444'
        }).setOrigin(0.5);
      }

      // Lock icon for locked levels
      if (!unlocked) {
        this.add.text(x + 2, y + 2, '🔒', {
          fontSize: '10px'
        }).setOrigin(0.5);
      }

      // Click handler
      if (unlocked) {
        const hitZone = this.add.zone(x + 2, y + 4, 44, 44)
          .setInteractive({ useHandCursor: true });

        hitZone.on('pointerover', () => {
          bg.clear();
          bg.fillStyle(eq.boss ? 0x663333 : 0x3a3a6a, 0.9);
          bg.fillRoundedRect(x - 20, y - 16, 44, 44, 6);
          bg.lineStyle(2, eq.boss ? 0xff6666 : 0x7777cc, 0.8);
          bg.strokeRoundedRect(x - 20, y - 16, 44, 44, 6);
        });

        hitZone.on('pointerout', () => {
          bg.clear();
          bg.fillStyle(eq.boss ? 0x442222 : 0x2a2a4a, 0.8);
          bg.fillRoundedRect(x - 20, y - 16, 44, 44, 6);
          bg.lineStyle(1, eq.boss ? 0xff4444 : 0x5555aa, 0.6);
          bg.strokeRoundedRect(x - 20, y - 16, 44, 44, 6);
        });

        hitZone.on('pointerdown', () => {
          const sceneKey = eq.boss ? 'BossScene' : 'GameScene';
          this.scene.start(sceneKey, {
            equation: eq,
            progression: this.progression
          });
        });
      }
    });

    // Streak display
    const streak = this.progression.getStreak();
    if (streak > 0) {
      this.add.text(width - 10, 10, `Streak: ${streak}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: streak >= 5 ? '#ff6644' : '#ffdd44'
      }).setOrigin(1, 0);
    }

    // Settings button
    const settingsBtn = this.add.text(10, 10, '[Settings]', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8888aa'
    }).setInteractive({ useHandCursor: true });

    settingsBtn.on('pointerdown', () => {
      this._toggleSettings();
    });

    this.settingsPanel = null;
  }

  _toggleSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.destroy();
      this.settingsPanel = null;
      return;
    }

    const { width, height } = this.cameras.main;
    const settings = this.progression.getSettings();

    this.settingsPanel = this.add.container(width / 2, height / 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-150, -100, 300, 200, 10);
    bg.lineStyle(2, 0x5555aa, 1);
    bg.strokeRoundedRect(-150, -100, 300, 200, 10);
    this.settingsPanel.add(bg);

    const title = this.add.text(0, -80, 'Settings', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);
    this.settingsPanel.add(title);

    // Colorblind mode toggle
    const cbText = this.add.text(-100, -30, `Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaacc'
    }).setInteractive({ useHandCursor: true });
    cbText.on('pointerdown', () => {
      settings.colorblindMode = !settings.colorblindMode;
      this.progression.updateSettings(settings);
      cbText.setText(`Colorblind Mode: ${settings.colorblindMode ? 'ON' : 'OFF'}`);
    });
    this.settingsPanel.add(cbText);

    // Reset progress
    const resetBtn = this.add.text(0, 60, '[Reset Progress]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resetBtn.on('pointerdown', () => {
      this.progression.resetAll();
      this.scene.restart({ progression: this.progression });
    });
    this.settingsPanel.add(resetBtn);

    // Close button
    const closeBtn = this.add.text(130, -90, 'X', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ff6666'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.settingsPanel.destroy();
      this.settingsPanel = null;
    });
    this.settingsPanel.add(closeBtn);
  }
}
