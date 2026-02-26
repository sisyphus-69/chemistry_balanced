import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Create loading bar
    const { width, height } = this.cameras.main;
    const barW = 300, barH = 20;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    // Background bar
    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x333355, 1);
    bgBar.fillRect(barX, barY, barW, barH);

    // Progress bar
    const progressBar = this.add.graphics();

    // Loading text
    const loadingText = this.add.text(width / 2, barY - 30, 'Loading ChemQuest...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, barY + barH + 15, '0%', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaacc'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff88, 1);
      progressBar.fillRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      bgBar.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Generate all sprite textures programmatically
    this._generateTextures();
  }

  _generateTextures() {
    // Element orb textures (colored circles with symbols)
    const elements = {
      'H':  { color: 0xFFFFFF, text: '#000000' },
      'He': { color: 0xD9FFFF, text: '#000000' },
      'Li': { color: 0xCC80FF, text: '#ffffff' },
      'C':  { color: 0x555555, text: '#ffffff' },
      'N':  { color: 0x3050F8, text: '#ffffff' },
      'O':  { color: 0xFF0D0D, text: '#ffffff' },
      'F':  { color: 0x90E050, text: '#000000' },
      'Na': { color: 0xAB5CF2, text: '#ffffff' },
      'Mg': { color: 0x8AFF00, text: '#000000' },
      'Al': { color: 0xBFA6A6, text: '#000000' },
      'P':  { color: 0xFF8000, text: '#ffffff' },
      'S':  { color: 0xFFFF30, text: '#000000' },
      'Cl': { color: 0x1FF01F, text: '#000000' },
      'K':  { color: 0x8F40D4, text: '#ffffff' },
      'Ca': { color: 0x3DFF00, text: '#000000' },
      'Fe': { color: 0xE06633, text: '#ffffff' },
      'Cu': { color: 0xC88033, text: '#ffffff' },
      'Zn': { color: 0x7D80B0, text: '#ffffff' },
      'Ba': { color: 0x00C900, text: '#000000' },
      'Ag': { color: 0xC0C0C0, text: '#000000' },
      'Pb': { color: 0x575961, text: '#ffffff' },
      'I':  { color: 0x940094, text: '#ffffff' }
    };

    const orbSize = 32;
    for (const [symbol, info] of Object.entries(elements)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(info.color, 1);
      g.fillCircle(orbSize / 2, orbSize / 2, orbSize / 2 - 1);
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeCircle(orbSize / 2, orbSize / 2, orbSize / 2 - 1);
      g.generateTexture(`orb_${symbol}`, orbSize, orbSize);
      g.destroy();
    }

    // Coefficient token textures (1-9)
    for (let n = 1; n <= 9; n++) {
      const g = this.make.graphics({ add: false });
      const size = 40;
      g.fillStyle(0x2a2a4a, 1);
      g.fillRoundedRect(0, 0, size, size, 6);
      g.lineStyle(2, 0x5555aa, 1);
      g.strokeRoundedRect(0, 0, size, size, 6);
      g.generateTexture(`token_${n}`, size, size);
      g.destroy();
    }

    // Empty coefficient slot texture
    {
      const g = this.make.graphics({ add: false });
      const size = 40;
      g.lineStyle(2, 0x5555aa, 0.6);
      g.strokeRoundedRect(0, 0, size, size, 6);
      g.generateTexture('coeff_slot', size, size);
      g.destroy();
    }

    // Active/filled coefficient slot
    {
      const g = this.make.graphics({ add: false });
      const size = 40;
      g.fillStyle(0x3a3a6a, 1);
      g.fillRoundedRect(0, 0, size, size, 6);
      g.lineStyle(2, 0x7777cc, 1);
      g.strokeRoundedRect(0, 0, size, size, 6);
      g.generateTexture('coeff_slot_active', size, size);
      g.destroy();
    }

    // Scale base texture
    {
      const g = this.make.graphics({ add: false });
      // Pillar
      g.fillStyle(0x666688, 1);
      g.fillRect(95, 30, 10, 70);
      // Base triangle
      g.fillStyle(0x555577, 1);
      g.fillTriangle(100, 30, 70, 100, 130, 100);
      // Fulcrum circle
      g.fillStyle(0x8888aa, 1);
      g.fillCircle(100, 30, 8);
      g.generateTexture('scale_base', 200, 100);
      g.destroy();
    }

    // Scale beam
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x8888aa, 1);
      g.fillRect(0, 3, 300, 6);
      // Left pan holder
      g.fillRect(20, 0, 4, 12);
      // Right pan holder
      g.fillRect(276, 0, 4, 12);
      g.generateTexture('scale_beam', 300, 12);
      g.destroy();
    }

    // Scale pans
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x9999bb, 0.5);
      g.fillRoundedRect(0, 0, 100, 8, 4);
      g.generateTexture('scale_pan', 100, 8);
      g.destroy();
    }

    // Button textures
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x00aa55, 1);
      g.fillRoundedRect(0, 0, 120, 40, 8);
      g.generateTexture('btn_check', 120, 40);
      g.destroy();
    }

    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xaa8800, 1);
      g.fillRoundedRect(0, 0, 40, 40, 20);
      g.generateTexture('btn_hint', 40, 40);
      g.destroy();
    }

    // Particle texture
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffdd44, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('particle_gold', 8, 8);
      g.destroy();
    }

    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff4444, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('particle_red', 6, 6);
      g.destroy();
    }

    // Star textures
    this._generateStarTexture('star_filled', 0xffdd00, 1);
    this._generateStarTexture('star_empty', 0x444466, 0.5);

    // --- Overworld map textures ---

    // Player sprite (little flask-shaped character)
    {
      const g = this.make.graphics({ add: false });
      const s = 28;
      // Body (flask shape)
      g.fillStyle(0x00ff88, 1);
      g.fillRoundedRect(6, 8, 16, 16, 4);
      // Neck
      g.fillStyle(0x00ff88, 1);
      g.fillRect(10, 2, 8, 8);
      // Cork / head
      g.fillStyle(0xffdd44, 1);
      g.fillRoundedRect(9, 0, 10, 5, 2);
      // Eyes
      g.fillStyle(0x000000, 1);
      g.fillCircle(11, 14, 2);
      g.fillCircle(17, 14, 2);
      // Feet
      g.fillStyle(0x008844, 1);
      g.fillRoundedRect(6, 22, 6, 4, 2);
      g.fillRoundedRect(16, 22, 6, 4, 2);
      g.generateTexture('player_flask', s, s);
      g.destroy();
    }

    // Level node: normal (circle)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x2a2a4a, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(2, 0x5555aa, 1);
      g.strokeCircle(16, 16, 14);
      g.generateTexture('node_normal', 32, 32);
      g.destroy();
    }

    // Level node: boss (larger, red ring)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x442222, 1);
      g.fillCircle(18, 18, 16);
      g.lineStyle(3, 0xff4444, 1);
      g.strokeCircle(18, 18, 16);
      g.generateTexture('node_boss', 36, 36);
      g.destroy();
    }

    // Level node: locked (dimmed)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1a2a, 0.6);
      g.fillCircle(16, 16, 14);
      g.lineStyle(1, 0x333355, 0.5);
      g.strokeCircle(16, 16, 14);
      g.generateTexture('node_locked', 32, 32);
      g.destroy();
    }

    // Level node: completed
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x1a3a2a, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(2, 0x00ff88, 0.8);
      g.strokeCircle(16, 16, 14);
      g.generateTexture('node_complete', 32, 32);
      g.destroy();
    }

    // Level node: current (highlighted)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x3a3a6a, 1);
      g.fillCircle(16, 16, 14);
      g.lineStyle(3, 0x00ccff, 1);
      g.strokeCircle(16, 16, 14);
      g.generateTexture('node_current', 32, 32);
      g.destroy();
    }

    // Path dot (for dotted trail between nodes)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x555577, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('path_dot', 6, 6);
      g.destroy();
    }

    // Region banner background
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x1a1a2e, 0.85);
      g.fillRoundedRect(0, 0, 200, 22, 4);
      g.lineStyle(1, 0x5555aa, 0.6);
      g.strokeRoundedRect(0, 0, 200, 22, 4);
      g.generateTexture('region_banner', 200, 22);
      g.destroy();
    }
  }

  _generateStarTexture(key, color, alpha) {
    const g = this.make.graphics({ add: false });
    g.fillStyle(color, alpha);
    // Draw a 5-pointed star
    const cx = 12, cy = 12, outerR = 12, innerR = 5;
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 2 * -1) + (Math.PI / 5) * i;
      const r = i % 2 === 0 ? outerR : innerR;
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture(key, 24, 24);
    g.destroy();
  }

  create() {
    this.scene.start('MenuScene');
  }
}
