import Phaser from 'phaser';
import { PIXEL_FONT } from '../ui/PixelText.js';

/**
 * BootScene — Gen 4 RPG pixel-art texture generation.
 *
 * All sprites are drawn with hard pixel edges, limited palettes (4-6 colors),
 * and deliberately blocky/chunky shapes. No anti-aliasing or gradients.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.cameras.main;
    const barW = 300, barH = 20;
    const barX = (width - barW) / 2;
    const barY = height / 2;

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x333355, 1);
    bgBar.fillRect(barX, barY, barW, barH);

    const progressBar = this.add.graphics();

    const loadingText = this.add.text(width / 2, barY - 30, 'Loading ChemQuest...', {
      fontFamily: PIXEL_FONT, fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, barY + barH + 15, '0%', {
      fontFamily: PIXEL_FONT, fontSize: '8px', color: '#aaaacc'
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

    this._generateTextures();
  }

  // ───────────────────────────────────────────
  // Pixel helpers
  // ───────────────────────────────────────────
  _px(g, x, y, w, h, color, alpha = 1) {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, w, h);
  }

  _pxCircle(g, cx, cy, r, color, alpha = 1) {
    // Pixel-art circle using filled rectangles
    g.fillStyle(color, alpha);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          g.fillRect(cx + dx, cy + dy, 1, 1);
        }
      }
    }
  }

  _pxOutlineCircle(g, cx, cy, r, color, alpha = 1) {
    g.fillStyle(color, alpha);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = dx * dx + dy * dy;
        if (dist <= r * r && dist > (r - 1.5) * (r - 1.5)) {
          g.fillRect(cx + dx, cy + dy, 1, 1);
        }
      }
    }
  }

  _col(hex) {
    return Phaser.Display.Color.IntegerToColor(hex);
  }

  _lighten(hex, amount) {
    const c = this._col(hex);
    return Phaser.Display.Color.GetColor(
      Math.min(255, c.red + amount),
      Math.min(255, c.green + amount),
      Math.min(255, c.blue + amount)
    );
  }

  _darken(hex, amount) {
    const c = this._col(hex);
    return Phaser.Display.Color.GetColor(
      Math.max(0, c.red - amount),
      Math.max(0, c.green - amount),
      Math.max(0, c.blue - amount)
    );
  }

  // ───────────────────────────────────────────
  // Master generation
  // ───────────────────────────────────────────
  _generateTextures() {
    this._genElementOrbs();
    this._genCoefficientTokens();
    this._genCoefficientSlots();
    this._genScale();
    this._genButtons();
    this._genParticles();
    this._genStars();
    this._genOverworldPlayer();
    this._genOverworldNodes();
    this._genOverworldMisc();
    this._genProfessorAurum();
    this._genHPBarParts();
    this._genRPGFrames();
  }

  // ───────────────────────────────────────────
  // 1. ELEMENT ORBS — flat pixel circles with outline
  // ───────────────────────────────────────────
  _genElementOrbs() {
    const elements = {
      'H':  0xFFFFFF, 'He': 0xD9FFFF, 'Li': 0xCC80FF,
      'C':  0x555555, 'N':  0x3050F8, 'O':  0xFF0D0D,
      'F':  0x90E050, 'Na': 0xAB5CF2, 'Mg': 0x8AFF00,
      'Al': 0xBFA6A6, 'P':  0xFF8000, 'S':  0xFFFF30,
      'Cl': 0x1FF01F, 'K':  0x8F40D4, 'Ca': 0x3DFF00,
      'Fe': 0xE06633, 'Cu': 0xC88033, 'Zn': 0x7D80B0,
      'Ba': 0x00C900, 'Ag': 0xC0C0C0, 'Pb': 0x575961,
      'I':  0x940094
    };

    const S = 36;
    const cx = S / 2, cy = S / 2, R = 14;

    for (const [sym, baseCol] of Object.entries(elements)) {
      const g = this.make.graphics({ add: false });

      // 1px outline
      this._pxCircle(g, cx, cy, R, this._darken(baseCol, 60));

      // Base fill
      this._pxCircle(g, cx, cy, R - 1, baseCol);

      // Highlight pixel (top-left)
      this._px(g, cx - 5, cy - 5, 2, 2, 0xffffff, 0.7);
      this._px(g, cx - 3, cy - 6, 2, 1, 0xffffff, 0.5);

      // Darker bottom-right
      this._px(g, cx + 3, cy + 4, 3, 2, this._darken(baseCol, 40), 0.5);

      g.generateTexture(`orb_${sym}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 2. COEFFICIENT TOKENS — chunky RPG tiles
  // ───────────────────────────────────────────
  _genCoefficientTokens() {
    const S = 44;
    for (let n = 1; n <= 9; n++) {
      const g = this.make.graphics({ add: false });

      // Thick border
      this._px(g, 0, 0, S, S, 0x22224a);

      // Inner face
      this._px(g, 2, 2, S - 4, S - 4, 0x2e2e58);

      // Top bevel (lighter)
      this._px(g, 2, 2, S - 4, 2, 0x4a4a7a);

      // Left bevel
      this._px(g, 2, 2, 2, S - 4, 0x3a3a6a);

      // Bottom shadow
      this._px(g, 2, S - 4, S - 4, 2, 0x1a1a3a);

      // Right shadow
      this._px(g, S - 4, 2, 2, S - 4, 0x1a1a3a);

      // Outer border highlight top-left
      this._px(g, 0, 0, S, 1, 0x5555aa, 0.5);
      this._px(g, 0, 0, 1, S, 0x5555aa, 0.5);

      g.generateTexture(`token_${n}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 3. COEFFICIENT SLOTS — empty & active
  // ───────────────────────────────────────────
  _genCoefficientSlots() {
    const S = 44;

    // Empty slot
    {
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, S, S, 0x16162e, 0.6);

      // Dashed border effect
      for (let i = 0; i < S; i += 4) {
        this._px(g, i, 0, 2, 1, 0x4444aa, 0.5);
        this._px(g, i, S - 1, 2, 1, 0x4444aa, 0.5);
        this._px(g, 0, i, 1, 2, 0x4444aa, 0.5);
        this._px(g, S - 1, i, 1, 2, 0x4444aa, 0.5);
      }

      g.generateTexture('coeff_slot', S, S);
      g.destroy();
    }

    // Active slot
    {
      const pad = 2;
      const TS = S + pad * 2;
      const g = this.make.graphics({ add: false });

      // Glow
      this._px(g, 0, 0, TS, TS, 0x3355aa, 0.2);

      // Thick border
      this._px(g, pad, pad, S, S, 0x5566cc);

      // Inner face
      this._px(g, pad + 2, pad + 2, S - 4, S - 4, 0x303066);

      // Top bevel
      this._px(g, pad + 2, pad + 2, S - 4, 2, 0x4a4a8a);

      // Bottom shadow
      this._px(g, pad + 2, pad + S - 4, S - 4, 2, 0x1a1a44);

      g.generateTexture('coeff_slot_active', TS, TS);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 4. BALANCE SCALE — simplified pixel art
  // ───────────────────────────────────────────
  _genScale() {
    // Base
    {
      const W = 220, H = 110;
      const g = this.make.graphics({ add: false });
      const cx = W / 2;

      // Pedestal
      this._px(g, cx - 50, H - 14, 100, 14, 0x3d3d5c);
      this._px(g, cx - 40, H - 22, 80, 8, 0x4a4a6e);
      this._px(g, cx - 30, H - 28, 60, 6, 0x555580);

      // Pillar
      this._px(g, cx - 5, 30, 10, H - 56, 0x555580);
      this._px(g, cx - 5, 30, 4, H - 56, 0x6666aa, 0.4);

      // Decorative rings
      this._px(g, cx - 7, 34, 14, 2, 0x7777aa);
      this._px(g, cx - 7, H - 34, 14, 2, 0x7777aa);

      // Fulcrum circle
      this._pxCircle(g, cx, 26, 10, 0x7777aa);
      this._pxCircle(g, cx, 26, 7, 0x8888bb);
      // Gem
      this._pxCircle(g, cx, 26, 3, 0x00ccff);
      this._px(g, cx - 1, 24, 2, 2, 0xffffff, 0.6);

      g.generateTexture('scale_base', W, H);
      g.destroy();
    }

    // Beam
    {
      const W = 320, H = 16;
      const g = this.make.graphics({ add: false });
      const cy = H / 2;

      // Main beam
      this._px(g, 0, cy - 3, W, 6, 0x6a6a90);
      this._px(g, 0, cy - 3, W, 2, 0x8888bb, 0.5);

      // Rivets
      for (let rx = 20; rx < W; rx += 30) {
        this._px(g, rx - 1, cy - 1, 3, 3, 0x9999bb);
        this._px(g, rx - 1, cy - 1, 1, 1, 0xbbbbdd, 0.6);
      }

      // Brackets
      for (const bx of [18, W - 18]) {
        this._px(g, bx - 3, cy - 4, 6, 10, 0x7777aa);
        this._px(g, bx - 3, cy - 4, 6, 1, 0x9999cc, 0.5);
      }

      g.generateTexture('scale_beam', W, H);
      g.destroy();
    }

    // Pans
    {
      const W = 110, H = 18;
      const g = this.make.graphics({ add: false });

      this._px(g, 4, 4, W - 8, H - 6, 0x887744);
      this._px(g, 6, 4, W - 12, 2, 0xddcc88, 0.5);
      this._px(g, 8, 6, W - 16, H - 10, 0xccbb77, 0.5);
      // Border
      this._px(g, 4, 4, W - 8, 1, 0xccbb77);
      this._px(g, 4, H - 3, W - 8, 1, 0x665533);

      g.generateTexture('scale_pan', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 5. BUTTONS — RPG menu style with thick borders
  // ───────────────────────────────────────────
  _genButtons() {
    // CHECK button
    {
      const W = 130, H = 44;
      const g = this.make.graphics({ add: false });

      // Shadow
      this._px(g, 2, 3, W, H, 0x005522, 0.5);

      // Base
      this._px(g, 0, 0, W, H, 0x006633);

      // Inner face
      this._px(g, 2, 2, W - 4, H - 4, 0x00884a);

      // Top bevel
      this._px(g, 2, 2, W - 4, 3, 0x00bb66);

      // Bottom shadow
      this._px(g, 2, H - 5, W - 4, 3, 0x004422);

      // Border
      this._px(g, 0, 0, W, 2, 0x44dd88, 0.5);
      this._px(g, 0, H - 2, W, 2, 0x44dd88, 0.3);
      this._px(g, 0, 0, 2, H, 0x44dd88, 0.4);
      this._px(g, W - 2, 0, 2, H, 0x44dd88, 0.3);

      g.generateTexture('btn_check', W, H);
      g.destroy();
    }

    // HINT button
    {
      const S = 44;
      const g = this.make.graphics({ add: false });
      const cx = S / 2, cy = S / 2;

      // Background circle
      this._pxCircle(g, cx, cy, S / 2 - 2, 0xaa7700);
      this._pxCircle(g, cx, cy, S / 2 - 4, 0xbb8811);
      this._pxOutlineCircle(g, cx, cy, S / 2 - 2, 0xddaa44);

      // Highlight
      this._px(g, cx - 4, cy - 6, 2, 2, 0xffffff, 0.5);

      g.generateTexture('btn_hint', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 6. PARTICLES — simple pixel blobs
  // ───────────────────────────────────────────
  _genParticles() {
    // Gold sparkle
    {
      const S = 12, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 1, cy - 1, 3, 3, 0xffdd44);
      this._px(g, cx, cy, 1, 1, 0xffffff);
      g.generateTexture('particle_gold', S, S);
      g.destroy();
    }
    // Red puff
    {
      const S = 10, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 1, cy - 1, 3, 3, 0xff4444);
      this._px(g, cx, cy, 1, 1, 0xff8888);
      g.generateTexture('particle_red', S, S);
      g.destroy();
    }
    // Green sparkle
    {
      const S = 12, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 1, cy - 1, 3, 3, 0x00ff88);
      this._px(g, cx, cy, 1, 1, 0xaaffcc);
      g.generateTexture('particle_green', S, S);
      g.destroy();
    }
    // White twinkle (cross)
    {
      const S = 14, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 3, cy, 7, 1, 0xffffff, 0.8);
      this._px(g, cx, cy - 3, 1, 7, 0xffffff, 0.8);
      this._px(g, cx, cy, 1, 1, 0xffffff);
      g.generateTexture('particle_twinkle', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 7. STARS — pixel 5-pointed star
  // ───────────────────────────────────────────
  _genStars() {
    const S = 28, cx = S / 2, cy = S / 2;

    const drawPixelStar = (g, cx, cy, size, color) => {
      g.fillStyle(color, 1);
      // Center row
      g.fillRect(cx - size, cy - 1, size * 2 + 1, 3);
      // Top spike
      g.fillRect(cx - 1, cy - size, 3, size);
      // Bottom spike
      g.fillRect(cx - 1, cy + 1, 3, size - 2);
      // Diagonal fills
      g.fillRect(cx - size + 2, cy - size + 3, 2, 2);
      g.fillRect(cx + size - 3, cy - size + 3, 2, 2);
      g.fillRect(cx - size + 2, cy + size - 5, 2, 2);
      g.fillRect(cx + size - 3, cy + size - 5, 2, 2);
      // Mid-fills
      g.fillRect(cx - size + 1, cy - 3, 3, 2);
      g.fillRect(cx + size - 3, cy - 3, 3, 2);
      g.fillRect(cx - size + 1, cy + 2, 3, 2);
      g.fillRect(cx + size - 3, cy + 2, 3, 2);
    };

    // Filled star (gold)
    {
      const g = this.make.graphics({ add: false });
      drawPixelStar(g, cx, cy, 12, 0xbb8800);
      drawPixelStar(g, cx, cy, 11, 0xffdd00);
      // Highlight
      this._px(g, cx - 2, cy - 4, 2, 2, 0xffffff, 0.5);
      g.generateTexture('star_filled', S, S);
      g.destroy();
    }

    // Empty star
    {
      const g = this.make.graphics({ add: false });
      drawPixelStar(g, cx, cy, 12, 0x333355);
      drawPixelStar(g, cx, cy, 11, 0x444466);
      g.generateTexture('star_empty', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 8. OVERWORLD PLAYER — pixel flask character
  // ───────────────────────────────────────────
  _genOverworldPlayer() {
    const S = 38;
    const g = this.make.graphics({ add: false });
    const cx = S / 2;

    // Drop shadow
    this._px(g, cx - 8, S - 4, 16, 4, 0x000000, 0.25);

    // Flask body - dark outline
    this._px(g, 7, 12, 24, 20, 0x006633);
    // Main body
    this._px(g, 8, 13, 22, 18, 0x00cc66);
    // Left highlight
    this._px(g, 9, 14, 4, 14, 0x00ee77, 0.5);
    // Right shadow
    this._px(g, 24, 14, 5, 14, 0x009944, 0.5);

    // Liquid level
    this._px(g, 10, 22, 18, 7, 0x00ff88, 0.4);
    // Bubbles
    this._px(g, 13, 24, 2, 2, 0xffffff, 0.35);
    this._px(g, 20, 23, 2, 2, 0xffffff, 0.3);
    this._px(g, 16, 26, 1, 1, 0xffffff, 0.4);

    // Neck
    this._px(g, 13, 5, 12, 9, 0x00bb55);
    this._px(g, 13, 5, 5, 9, 0x00dd66, 0.5);

    // Cork
    this._px(g, 11, 0, 16, 7, 0xcc8833);
    this._px(g, 13, 1, 12, 1, 0xddaa55, 0.5);
    this._px(g, 13, 4, 12, 1, 0xddaa55, 0.5);
    this._px(g, 12, 0, 14, 3, 0xeebb66, 0.3);

    // Eyes
    for (const ex of [14, 23]) {
      this._px(g, ex - 2, 16, 4, 4, 0xffffff);
      this._px(g, ex - 1, 17, 2, 2, 0x1a1a2e);
      this._px(g, ex - 2, 16, 1, 1, 0xffffff, 0.8);
    }

    // Mouth
    this._px(g, cx - 3, 22, 6, 1, 0x006633);
    this._px(g, cx - 4, 21, 1, 1, 0x006633);
    this._px(g, cx + 3, 21, 1, 1, 0x006633);

    // Feet
    this._px(g, 8, 31, 8, 5, 0x005522);
    this._px(g, 22, 31, 8, 5, 0x005522);
    this._px(g, 8, 31, 8, 2, 0x007733, 0.5);
    this._px(g, 22, 31, 8, 2, 0x007733, 0.5);

    // Specular
    this._px(g, 10, 15, 3, 6, 0xffffff, 0.15);

    g.generateTexture('player_flask', S, S);
    g.destroy();
  }

  // ───────────────────────────────────────────
  // 9. OVERWORLD NODES — pixel RPG location icons
  // ───────────────────────────────────────────
  _genOverworldNodes() {
    const TEX = 50;
    const cx = TEX / 2, cy = TEX / 2;

    const buildNode = (key, baseCol, borderCol, glowCol) => {
      const g = this.make.graphics({ add: false });

      // Optional glow
      if (glowCol) {
        this._pxCircle(g, cx, cy, 18, glowCol, 0.12);
      }

      // Shadow
      this._pxCircle(g, cx + 1, cy + 1, 14, 0x000000, 0.3);

      // Base circle
      this._pxCircle(g, cx, cy, 14, this._darken(baseCol, 20));
      this._pxCircle(g, cx, cy, 12, baseCol);

      // Highlight
      this._px(g, cx - 5, cy - 5, 3, 2, this._lighten(baseCol, 50), 0.4);

      // Border ring
      this._pxOutlineCircle(g, cx, cy, 14, borderCol);

      g.generateTexture(key, TEX, TEX);
      g.destroy();
    };

    buildNode('node_normal',   0x2a2a4a, 0x5555aa, null);
    buildNode('node_complete', 0x1a3a2a, 0x00ff88, 0x00ff88);
    buildNode('node_current',  0x2a2a5a, 0x00ccff, 0x00ccff);
    buildNode('node_locked',   0x1a1a2a, 0x333355, null);

    // Boss node — bigger
    {
      const BTEX = 64;
      const bcx = BTEX / 2, bcy = BTEX / 2;
      const g = this.make.graphics({ add: false });

      // Red glow
      this._pxCircle(g, bcx, bcy, 24, 0xff4444, 0.1);

      // Shadow
      this._pxCircle(g, bcx + 1, bcy + 1, 18, 0x000000, 0.3);

      // Base
      this._pxCircle(g, bcx, bcy, 18, 0x3a1111);
      this._pxCircle(g, bcx, bcy, 16, 0x551a1a);

      // Cross marks
      for (let i = -4; i <= 4; i++) {
        this._px(g, bcx + i, bcy + i, 2, 2, 0xff2222, 0.35);
        this._px(g, bcx + i, bcy - i, 2, 2, 0xff2222, 0.35);
      }

      // Border
      this._pxOutlineCircle(g, bcx, bcy, 18, 0xff4444, 0.9);

      // Spiky accents
      for (let a = 0; a < 4; a++) {
        const angle = (a * 90 + 45) * Math.PI / 180;
        const ox = Math.round(Math.cos(angle) * 20);
        const oy = Math.round(Math.sin(angle) * 20);
        this._px(g, bcx + ox - 1, bcy + oy - 1, 3, 3, 0xff4444, 0.7);
      }

      g.generateTexture('node_boss', BTEX, BTEX);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 10. OVERWORLD MISC — path dots, banner
  // ───────────────────────────────────────────
  _genOverworldMisc() {
    // Path dot
    {
      const S = 8, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 1, cy - 1, 3, 3, 0x6666aa, 0.5);
      this._px(g, cx, cy, 1, 1, 0x8888cc, 0.8);
      g.generateTexture('path_dot', S, S);
      g.destroy();
    }

    // Region banner
    {
      const W = 210, H = 26;
      const g = this.make.graphics({ add: false });

      this._px(g, 0, 0, W, H, 0x141428, 0.92);
      // Top border
      this._px(g, 0, 0, W, 2, 0x5555aa, 0.4);
      // Bottom border
      this._px(g, 0, H - 2, W, 2, 0x5555aa, 0.4);
      // Side accents
      this._px(g, 2, 2, 2, H - 4, 0x5555aa, 0.3);
      this._px(g, W - 4, 2, 2, H - 4, 0x5555aa, 0.3);

      g.generateTexture('region_banner', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 11. PROFESSOR AURUM — 64×64 pixel scientist
  // ───────────────────────────────────────────
  _genProfessorAurum() {
    const S = 64;
    const g = this.make.graphics({ add: false });

    // Background circle
    this._pxCircle(g, 32, 32, 30, 0x1a1a2e);
    this._pxOutlineCircle(g, 32, 32, 30, 0xddaa44, 0.6);

    // Body / lab coat (gold/yellow)
    this._px(g, 18, 34, 28, 24, 0xccaa33);
    this._px(g, 20, 34, 24, 22, 0xddbb44);
    // Coat lapels
    this._px(g, 28, 34, 8, 12, 0xeedd66);
    // Coat highlights
    this._px(g, 20, 34, 3, 18, 0xeedd66, 0.3);

    // Head (skin)
    this._px(g, 22, 14, 20, 20, 0xffccaa);
    this._px(g, 24, 16, 16, 16, 0xffe0c0);

    // White hair
    this._px(g, 20, 10, 24, 8, 0xeeeeee);
    this._px(g, 18, 14, 4, 10, 0xdddddd);
    this._px(g, 42, 14, 4, 10, 0xdddddd);
    // Hair highlight
    this._px(g, 24, 11, 6, 2, 0xffffff, 0.5);

    // Glasses (round)
    this._px(g, 24, 20, 7, 6, 0x333355);
    this._px(g, 33, 20, 7, 6, 0x333355);
    this._px(g, 25, 21, 5, 4, 0x88ccff, 0.6);
    this._px(g, 34, 21, 5, 4, 0x88ccff, 0.6);
    // Bridge
    this._px(g, 31, 22, 2, 2, 0x333355);
    // Lens glare
    this._px(g, 26, 21, 2, 1, 0xffffff, 0.5);
    this._px(g, 35, 21, 2, 1, 0xffffff, 0.5);

    // Eyes behind glasses
    this._px(g, 27, 22, 2, 2, 0x1a1a2e);
    this._px(g, 36, 22, 2, 2, 0x1a1a2e);

    // Smile
    this._px(g, 28, 28, 8, 1, 0xcc8866);
    this._px(g, 27, 27, 1, 1, 0xcc8866);
    this._px(g, 36, 27, 1, 1, 0xcc8866);

    // Hands
    this._px(g, 14, 50, 6, 6, 0xffccaa);
    this._px(g, 44, 50, 6, 6, 0xffccaa);

    // Test tube in right hand
    this._px(g, 46, 42, 4, 12, 0xaaddff, 0.8);
    this._px(g, 47, 48, 2, 4, 0x00ff88, 0.7);

    g.generateTexture('prof_aurum', S, S);
    g.destroy();
  }

  // ───────────────────────────────────────────
  // 12. HP BAR PARTS — background and fill textures
  // ───────────────────────────────────────────
  _genHPBarParts() {
    // HP bar background (dark track)
    {
      const W = 200, H = 14;
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, W, H, 0x111122);
      this._px(g, 0, 0, W, 1, 0x333355, 0.5);
      this._px(g, 0, H - 1, W, 1, 0x000011, 0.5);
      this._px(g, 0, 0, 1, H, 0x333355, 0.3);
      this._px(g, W - 1, 0, 1, H, 0x000011, 0.3);
      g.generateTexture('hp_bar_bg', W, H);
      g.destroy();
    }

    // HP bar fill (green — will be tinted per element)
    {
      const W = 196, H = 10;
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, W, H, 0x00cc66);
      this._px(g, 0, 0, W, 3, 0x00ff88, 0.4);
      this._px(g, 0, H - 2, W, 2, 0x009944, 0.3);
      g.generateTexture('hp_bar_fill', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 13. RPG FRAMES — dialogue box, control panel
  // ───────────────────────────────────────────
  _genRPGFrames() {
    // Dialogue box
    {
      const W = 760, H = 80;
      const g = this.make.graphics({ add: false });

      // Outer border
      this._px(g, 0, 0, W, H, 0x222244);
      // Inner fill
      this._px(g, 2, 2, W - 4, H - 4, 0x0d0d1a);
      // Top bevel
      this._px(g, 2, 2, W - 4, 2, 0x333366);
      // Bottom bevel
      this._px(g, 2, H - 4, W - 4, 2, 0x111133);
      // Inner frame
      this._px(g, 4, 4, W - 8, H - 8, 0x111128, 0.9);

      g.generateTexture('dialogue_box', W, H);
      g.destroy();
    }

    // Control panel background
    {
      const W = 800, H = 240;
      const g = this.make.graphics({ add: false });

      this._px(g, 0, 0, W, H, 0x0a0a1a);
      // Top border
      this._px(g, 0, 0, W, 3, 0x333366);
      this._px(g, 0, 3, W, 1, 0x222244, 0.5);
      // Inner subtle
      this._px(g, 0, 4, W, H - 4, 0x0d0d1e, 0.9);

      g.generateTexture('control_panel', W, H);
      g.destroy();
    }

    // RPG window frame (generic, for stats/info panels)
    {
      const W = 320, H = 200;
      const g = this.make.graphics({ add: false });

      // Outer border
      this._px(g, 0, 0, W, H, 0x333366);
      // Inner border
      this._px(g, 2, 2, W - 4, H - 4, 0x222244);
      // Fill
      this._px(g, 4, 4, W - 8, H - 8, 0x0d0d1a);
      // Bevel top
      this._px(g, 4, 4, W - 8, 2, 0x444477, 0.4);
      // Bevel bottom
      this._px(g, 4, H - 6, W - 8, 2, 0x111133, 0.5);
      // Corner accents
      this._px(g, 0, 0, 4, 4, 0x5555aa, 0.6);
      this._px(g, W - 4, 0, 4, 4, 0x5555aa, 0.6);
      this._px(g, 0, H - 4, 4, 4, 0x5555aa, 0.6);
      this._px(g, W - 4, H - 4, 4, 4, 0x5555aa, 0.6);

      g.generateTexture('rpg_frame', W, H);
      g.destroy();
    }
  }

  create() {
    this.scene.start('MenuScene');
  }
}
