import Phaser from 'phaser';
import { PIXEL_FONT } from '../ui/PixelText.js';

/**
 * BootScene — Gen 4 RPG pixel-art texture generation.
 *
 * All sprites are drawn with hard pixel edges, limited palettes (4-6 colors),
 * and deliberately blocky/chunky shapes. No anti-aliasing or gradients.
 *
 * Textures scaled for 1200×900 resolution (1.5× base).
 * Cyberpunk aesthetic: neon glows, corner brackets, accent borders.
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
    this._genRankBadges();
  }

  // ───────────────────────────────────────────
  // 1. ELEMENT ORBS — clustered glowing pixel orbs
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
      'I':  0x940094,
      'Si': 0xF0C8A0, 'Cr': 0x8A99C7, 'Mn': 0x9C7AC7, 'Sn': 0x668080
    };

    const S = 54;
    const cx = S / 2, cy = S / 2, R = 18;

    for (const [sym, baseCol] of Object.entries(elements)) {
      const g = this.make.graphics({ add: false });

      // Core orb (Base fill)
      this._pxCircle(g, cx, cy, R, baseCol);

      // Secondary clustered orb (top-right)
      this._pxCircle(g, cx + 9, cy - 6, R * 0.6, baseCol);
      // Tertiary clustered orb (bottom-left)
      this._pxCircle(g, cx - 8, cy + 8, R * 0.7, baseCol);

      // Dark outlines for cluster definition
      this._pxCircle(g, cx, cy, R, this._darken(baseCol, 40));
      this._pxCircle(g, cx + 9, cy - 6, R * 0.6, this._darken(baseCol, 40));
      this._pxCircle(g, cx - 8, cy + 8, R * 0.7, this._darken(baseCol, 40));

      // Re-fill cores to cover inner outlines
      this._pxCircle(g, cx, cy, R - 1, baseCol);
      this._pxCircle(g, cx + 9, cy - 6, R * 0.6 - 1, baseCol);
      this._pxCircle(g, cx - 8, cy + 8, R * 0.7 - 1, baseCol);

      // Highlights for each cluster component
      // Main
      this._px(g, cx - 6, cy - 6, 5, 5, 0xffffff, 0.7);
      // Top-right
      this._px(g, cx + 6, cy - 9, 3, 3, 0xffffff, 0.7);
      // Bottom-left
      this._px(g, cx - 11, cy + 5, 3, 3, 0xffffff, 0.7);

      // Glow effect (ambient light behind cluster)
      const glowR = R * 1.5;
      g.fillStyle(baseCol, 0.15);
      g.fillCircle(cx, cy, glowR);

      g.generateTexture(`orb_${sym}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 2. COEFFICIENT TOKENS — chunky RPG tiles
  // ───────────────────────────────────────────
  _genCoefficientTokens() {
    const S = 66;
    for (let n = 1; n <= 9; n++) {
      const g = this.make.graphics({ add: false });

      // Thick border
      this._px(g, 0, 0, S, S, 0x22224a);

      // Inner face
      this._px(g, 3, 3, S - 6, S - 6, 0x2e2e58);

      // Top bevel (lighter)
      this._px(g, 3, 3, S - 6, 3, 0x4a4a7a);

      // Left bevel
      this._px(g, 3, 3, 3, S - 6, 0x3a3a6a);

      // Bottom shadow
      this._px(g, 3, S - 6, S - 6, 3, 0x1a1a3a);

      // Right shadow
      this._px(g, S - 6, 3, 3, S - 6, 0x1a1a3a);

      // Outer border highlight top-left
      this._px(g, 0, 0, S, 2, 0x5555aa, 0.5);
      this._px(g, 0, 0, 2, S, 0x5555aa, 0.5);

      // Neon glow ring inside bevel (cyberpunk accent)
      this._px(g, 5, 5, S - 10, 1, 0x00ffcc, 0.3);
      this._px(g, 5, S - 6, S - 10, 1, 0x00ffcc, 0.3);
      this._px(g, 5, 5, 1, S - 10, 0x00ffcc, 0.3);
      this._px(g, S - 6, 5, 1, S - 10, 0x00ffcc, 0.3);

      g.generateTexture(`token_${n}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 3. COEFFICIENT SLOTS — empty & active
  // ───────────────────────────────────────────
  _genCoefficientSlots() {
    const S = 66;

    // Empty slot
    {
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, S, S, 0x16162e, 0.6);

      // Dashed border effect
      for (let i = 0; i < S; i += 6) {
        this._px(g, i, 0, 3, 2, 0x4444aa, 0.5);
        this._px(g, i, S - 2, 3, 2, 0x4444aa, 0.5);
        this._px(g, 0, i, 2, 3, 0x4444aa, 0.5);
        this._px(g, S - 2, i, 2, 3, 0x4444aa, 0.5);
      }

      g.generateTexture('coeff_slot', S, S);
      g.destroy();
    }

    // Active slot
    {
      const pad = 3;
      const TS = S + pad * 2;
      const g = this.make.graphics({ add: false });

      // Glow
      this._px(g, 0, 0, TS, TS, 0x3355aa, 0.2);

      // Thick border
      this._px(g, pad, pad, S, S, 0x5566cc);

      // Inner face
      this._px(g, pad + 3, pad + 3, S - 6, S - 6, 0x303066);

      // Top bevel
      this._px(g, pad + 3, pad + 3, S - 6, 3, 0x4a4a8a);

      // Bottom shadow
      this._px(g, pad + 3, pad + S - 6, S - 6, 3, 0x1a1a44);

      g.generateTexture('coeff_slot_active', TS, TS);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 4. BATTLE PLATFORMS (Replaces old medieval scale)
  // ───────────────────────────────────────────
  _genScale() {
    // Base (Optional/Hidden in new layout but kept for compatibility)
    {
      const W = 330, H = 165;
      const g = this.make.graphics({ add: false });
      g.generateTexture('scale_base', W, H);
      g.destroy();
    }

    // Beam (Optional/Hidden)
    {
      const W = 480, H = 24;
      const g = this.make.graphics({ add: false });
      g.generateTexture('scale_beam', W, H);
      g.destroy();
    }

    // Platform (Cylindrical pseudo-3D pedestal)
    {
      const W = 240, H = 120;
      const g = this.make.graphics({ add: false });
      const cx = W / 2, cy = H / 2;

      // Bottom shadow
      g.fillStyle(0x000000, 0.6);
      g.fillEllipse(cx, cy + 23, 210, 60);

      // Main cylinder body
      g.fillStyle(0x112233, 1);
      g.fillRect(cx - 98, cy - 15, 195, 30);
      g.fillEllipse(cx, cy + 15, 195, 45); // Bottom curve

      // Cylinder dark shading (left/right)
      g.fillStyle(0x0a111a, 0.6);
      g.fillRect(cx - 98, cy - 15, 30, 30);
      g.fillEllipse(cx - 83, cy + 15, 30, 30);
      g.fillRect(cx + 68, cy - 15, 30, 30);
      g.fillEllipse(cx + 83, cy + 15, 30, 30);

      // Glowing rim light (cyan)
      g.fillStyle(0x00ff88, 0.8);
      g.fillEllipse(cx, cy - 12, 201, 51);

      // Top surface
      g.fillStyle(0x1a2e3a, 1);
      g.fillEllipse(cx, cy - 15, 195, 45);

      // Inner glowing ring on top surface
      g.lineStyle(3, 0x00ff88, 0.4);
      g.strokeEllipse(cx, cy - 15, 165, 36);

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
      const W = 195, H = 66;
      const g = this.make.graphics({ add: false });

      // Shadow
      this._px(g, 3, 5, W, H, 0x005522, 0.5);

      // Base
      this._px(g, 0, 0, W, H, 0x006633);

      // Inner face
      this._px(g, 3, 3, W - 6, H - 6, 0x00884a);

      // Top bevel
      this._px(g, 3, 3, W - 6, 5, 0x00bb66);

      // Bottom shadow
      this._px(g, 3, H - 8, W - 6, 5, 0x004422);

      // Border
      this._px(g, 0, 0, W, 3, 0x44dd88, 0.5);
      this._px(g, 0, H - 3, W, 3, 0x44dd88, 0.3);
      this._px(g, 0, 0, 3, H, 0x44dd88, 0.4);
      this._px(g, W - 3, 0, 3, H, 0x44dd88, 0.3);

      // Corner brackets (cyberpunk L-shapes)
      const bLen = 12, bT = 2;
      // Top-left
      this._px(g, 0, 0, bLen, bT, 0x88ffcc, 0.8);
      this._px(g, 0, 0, bT, bLen, 0x88ffcc, 0.8);
      // Top-right
      this._px(g, W - bLen, 0, bLen, bT, 0x88ffcc, 0.8);
      this._px(g, W - bT, 0, bT, bLen, 0x88ffcc, 0.8);
      // Bottom-left
      this._px(g, 0, H - bT, bLen, bT, 0x88ffcc, 0.8);
      this._px(g, 0, H - bLen, bT, bLen, 0x88ffcc, 0.8);
      // Bottom-right
      this._px(g, W - bLen, H - bT, bLen, bT, 0x88ffcc, 0.8);
      this._px(g, W - bT, H - bLen, bT, bLen, 0x88ffcc, 0.8);

      g.generateTexture('btn_check', W, H);
      g.destroy();
    }

    // HINT button
    {
      const S = 66;
      const g = this.make.graphics({ add: false });
      const cx = S / 2, cy = S / 2;

      // Background circle
      this._pxCircle(g, cx, cy, S / 2 - 3, 0xaa7700);
      this._pxCircle(g, cx, cy, S / 2 - 6, 0xbb8811);
      this._pxOutlineCircle(g, cx, cy, S / 2 - 3, 0xddaa44);

      // Highlight
      this._px(g, cx - 6, cy - 9, 3, 3, 0xffffff, 0.5);

      // Corner brackets (cyberpunk L-shapes)
      const bLen = 10, bT = 2;
      this._px(g, 0, 0, bLen, bT, 0xffcc44, 0.6);
      this._px(g, 0, 0, bT, bLen, 0xffcc44, 0.6);
      this._px(g, S - bLen, 0, bLen, bT, 0xffcc44, 0.6);
      this._px(g, S - bT, 0, bT, bLen, 0xffcc44, 0.6);
      this._px(g, 0, S - bT, bLen, bT, 0xffcc44, 0.6);
      this._px(g, 0, S - bLen, bT, bLen, 0xffcc44, 0.6);
      this._px(g, S - bLen, S - bT, bLen, bT, 0xffcc44, 0.6);
      this._px(g, S - bT, S - bLen, bT, bLen, 0xffcc44, 0.6);

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
      const S = 18, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 2, cy - 2, 5, 5, 0xffdd44);
      this._px(g, cx, cy, 2, 2, 0xffffff);
      g.generateTexture('particle_gold', S, S);
      g.destroy();
    }
    // Red puff
    {
      const S = 15, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 2, cy - 2, 5, 5, 0xff4444);
      this._px(g, cx, cy, 2, 2, 0xff8888);
      g.generateTexture('particle_red', S, S);
      g.destroy();
    }
    // Green sparkle
    {
      const S = 18, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 2, cy - 2, 5, 5, 0x00ff88);
      this._px(g, cx, cy, 2, 2, 0xaaffcc);
      g.generateTexture('particle_green', S, S);
      g.destroy();
    }
    // White twinkle (cross)
    {
      const S = 21, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 5, cy, 11, 2, 0xffffff, 0.8);
      this._px(g, cx, cy - 5, 2, 11, 0xffffff, 0.8);
      this._px(g, cx, cy, 2, 2, 0xffffff);
      g.generateTexture('particle_twinkle', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 7. STARS — pixel 5-pointed star
  // ───────────────────────────────────────────
  _genStars() {
    const S = 42, cx = S / 2, cy = S / 2;

    const drawPixelStar = (g, cx, cy, size, color) => {
      g.fillStyle(color, 1);
      // Center row
      g.fillRect(cx - size, cy - 2, size * 2 + 1, 5);
      // Top spike
      g.fillRect(cx - 2, cy - size, 5, size);
      // Bottom spike
      g.fillRect(cx - 2, cy + 1, 5, size - 3);
      // Diagonal fills
      g.fillRect(cx - size + 3, cy - size + 5, 3, 3);
      g.fillRect(cx + size - 5, cy - size + 5, 3, 3);
      g.fillRect(cx - size + 3, cy + size - 8, 3, 3);
      g.fillRect(cx + size - 5, cy + size - 8, 3, 3);
      // Mid-fills
      g.fillRect(cx - size + 2, cy - 5, 5, 3);
      g.fillRect(cx + size - 5, cy - 5, 5, 3);
      g.fillRect(cx - size + 2, cy + 3, 5, 3);
      g.fillRect(cx + size - 5, cy + 3, 5, 3);
    };

    // Filled star (brighter gold for cyberpunk)
    {
      const g = this.make.graphics({ add: false });
      drawPixelStar(g, cx, cy, 18, 0xcc9900);
      drawPixelStar(g, cx, cy, 17, 0xffee22);
      // Highlight
      this._px(g, cx - 3, cy - 6, 3, 3, 0xffffff, 0.5);
      // Sparkle cross pixels at top-left
      this._px(g, cx - 12, cy - 12, 5, 1, 0xffffff, 0.7);
      this._px(g, cx - 10, cy - 14, 1, 5, 0xffffff, 0.7);
      this._px(g, cx - 10, cy - 12, 1, 1, 0xffffff, 1.0);

      g.generateTexture('star_filled', S, S);
      g.destroy();
    }

    // Empty star
    {
      const g = this.make.graphics({ add: false });
      drawPixelStar(g, cx, cy, 18, 0x333355);
      drawPixelStar(g, cx, cy, 17, 0x444466);
      g.generateTexture('star_empty', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 8. OVERWORLD PLAYER — pixel flask character
  // ───────────────────────────────────────────
  _genOverworldPlayer() {
    const S = 57;
    const g = this.make.graphics({ add: false });
    const cx = S / 2;

    // Drop shadow
    this._px(g, cx - 12, S - 6, 24, 6, 0x000000, 0.25);

    // Flask body - dark outline
    this._px(g, 11, 18, 36, 30, 0x006633);
    // Main body
    this._px(g, 12, 20, 33, 27, 0x00cc66);
    // Left highlight
    this._px(g, 14, 21, 6, 21, 0x00ee77, 0.5);
    // Right shadow
    this._px(g, 36, 21, 8, 21, 0x009944, 0.5);

    // Liquid level
    this._px(g, 15, 33, 27, 11, 0x00ff88, 0.4);
    // Bubbles
    this._px(g, 20, 36, 3, 3, 0xffffff, 0.35);
    this._px(g, 30, 35, 3, 3, 0xffffff, 0.3);
    this._px(g, 24, 39, 2, 2, 0xffffff, 0.4);

    // Neck
    this._px(g, 20, 8, 18, 14, 0x00bb55);
    this._px(g, 20, 8, 8, 14, 0x00dd66, 0.5);

    // Cork
    this._px(g, 17, 0, 24, 11, 0xcc8833);
    this._px(g, 20, 2, 18, 2, 0xddaa55, 0.5);
    this._px(g, 20, 6, 18, 2, 0xddaa55, 0.5);
    this._px(g, 18, 0, 21, 5, 0xeebb66, 0.3);

    // Eyes
    for (const ex of [21, 35]) {
      this._px(g, ex - 3, 24, 6, 6, 0xffffff);
      this._px(g, ex - 2, 26, 3, 3, 0x1a1a2e);
      this._px(g, ex - 3, 24, 2, 2, 0xffffff, 0.8);
    }

    // Mouth
    this._px(g, cx - 5, 33, 9, 2, 0x006633);
    this._px(g, cx - 6, 32, 2, 2, 0x006633);
    this._px(g, cx + 5, 32, 2, 2, 0x006633);

    // Feet
    this._px(g, 12, 47, 12, 8, 0x005522);
    this._px(g, 33, 47, 12, 8, 0x005522);
    this._px(g, 12, 47, 12, 3, 0x007733, 0.5);
    this._px(g, 33, 47, 12, 3, 0x007733, 0.5);

    // Specular
    this._px(g, 15, 23, 5, 9, 0xffffff, 0.15);

    g.generateTexture('player_flask', S, S);
    g.destroy();
  }

  // ───────────────────────────────────────────
  // 9. OVERWORLD NODES — Pokeball-esque buttons
  // ───────────────────────────────────────────
  _genOverworldNodes() {
    const TEX = 75;
    const cx = TEX / 2, cy = TEX / 2;

    const buildNode = (key, baseCol, borderCol, accentCol) => {
      const g = this.make.graphics({ add: false });

      // Shadow
      this._pxCircle(g, cx, cy + 3, 24, 0x000000, 0.4);

      // Outer rim
      this._pxCircle(g, cx, cy, 24, borderCol);

      // Top half (colored)
      g.beginPath();
      g.arc(cx, cy, 21, Math.PI, 0, false);
      g.fillStyle(baseCol);
      g.fill();

      // Bottom half (grey/metallic)
      g.beginPath();
      g.arc(cx, cy, 21, 0, Math.PI, false);
      g.fillStyle(0x888899);
      g.fill();

      // Horizontal separator
      this._px(g, cx - 21, cy - 2, 42, 5, borderCol);

      // Center button outer
      this._pxCircle(g, cx, cy, 9, borderCol);
      // Center button inner
      this._pxCircle(g, cx, cy, 6, accentCol || 0xffffff);

      // Top highlight
      g.beginPath();
      g.arc(cx, cy, 18, Math.PI + 0.2, -0.2, false);
      g.lineStyle(3, 0xffffff, 0.4);
      g.strokePath();

      g.generateTexture(key, TEX, TEX);
      g.destroy();
    };

    buildNode('node_normal',   0x4455aa, 0x222233, 0x6677cc);
    buildNode('node_complete', 0x00cc88, 0x113322, 0x88ffcc);
    buildNode('node_current',  0x0088ff, 0x112244, 0x88ddff);
    buildNode('node_locked',   0x444455, 0x222222, 0x555566);

    // Boss node — bigger, spiky, red Pokeball
    {
      const BTEX = 96;
      const bcx = BTEX / 2, bcy = BTEX / 2;
      const g = this.make.graphics({ add: false });

      // Red glow
      this._pxCircle(g, bcx, bcy, 36, 0xff4444, 0.2);

      // Shadow
      this._pxCircle(g, bcx, bcy + 3, 27, 0x000000, 0.4);

      // Outer rim
      this._pxCircle(g, bcx, bcy, 27, 0x441111);

      // Top half (Dark Red)
      g.beginPath();
      g.arc(bcx, bcy, 24, Math.PI, 0, false);
      g.fillStyle(0xcc2222);
      g.fill();

      // Bottom half (Dark grey)
      g.beginPath();
      g.arc(bcx, bcy, 24, 0, Math.PI, false);
      g.fillStyle(0x666677);
      g.fill();

      // Horizontal separator
      this._px(g, bcx - 24, bcy - 3, 48, 6, 0x441111);

      // Center button outer
      this._pxCircle(g, bcx, bcy, 12, 0x441111);
      // Center button inner
      this._pxCircle(g, bcx, bcy, 8, 0xff4444);
      this._pxCircle(g, bcx, bcy, 3, 0xffffff);

      // Spiky accents
      for (let a = 0; a < 4; a++) {
        const angle = (a * 90 + 45) * Math.PI / 180;
        const ox = Math.round(Math.cos(angle) * 30);
        const oy = Math.round(Math.sin(angle) * 30);
        this._px(g, bcx + ox - 3, bcy + oy - 3, 8, 8, 0xff4444, 0.8);
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
      const S = 12, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      this._px(g, cx - 2, cy - 2, 5, 5, 0x6666aa, 0.5);
      this._px(g, cx, cy, 2, 2, 0x8888cc, 0.8);
      g.generateTexture('path_dot', S, S);
      g.destroy();
    }

    // Region banner
    {
      const W = 315, H = 39;
      const g = this.make.graphics({ add: false });

      this._px(g, 0, 0, W, H, 0x141428, 0.92);
      // Top border
      this._px(g, 0, 0, W, 3, 0x5555aa, 0.4);
      // Bottom border
      this._px(g, 0, H - 3, W, 3, 0x5555aa, 0.4);
      // Side accents
      this._px(g, 3, 3, 3, H - 6, 0x5555aa, 0.3);
      this._px(g, W - 6, 3, 3, H - 6, 0x5555aa, 0.3);

      g.generateTexture('region_banner', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 11. PROFESSOR AURUM — 96×96 pixel scientist
  // ───────────────────────────────────────────
  _genProfessorAurum() {
    const S = 96;
    const g = this.make.graphics({ add: false });

    // Background circle
    this._pxCircle(g, 48, 48, 45, 0x1a1a2e);
    this._pxOutlineCircle(g, 48, 48, 45, 0xddaa44, 0.6);

    // Body / lab coat (gold/yellow)
    this._px(g, 27, 51, 42, 36, 0xccaa33);
    this._px(g, 30, 51, 36, 33, 0xddbb44);
    // Coat lapels
    this._px(g, 42, 51, 12, 18, 0xeedd66);
    // Coat highlights
    this._px(g, 30, 51, 5, 27, 0xeedd66, 0.3);

    // Head (skin)
    this._px(g, 33, 21, 30, 30, 0xffccaa);
    this._px(g, 36, 24, 24, 24, 0xffe0c0);

    // White hair
    this._px(g, 30, 15, 36, 12, 0xeeeeee);
    this._px(g, 27, 21, 6, 15, 0xdddddd);
    this._px(g, 63, 21, 6, 15, 0xdddddd);
    // Hair highlight
    this._px(g, 36, 17, 9, 3, 0xffffff, 0.5);

    // Glasses (round)
    this._px(g, 36, 30, 11, 9, 0x333355);
    this._px(g, 50, 30, 11, 9, 0x333355);
    this._px(g, 38, 32, 8, 6, 0x88ccff, 0.6);
    this._px(g, 51, 32, 8, 6, 0x88ccff, 0.6);
    // Bridge
    this._px(g, 47, 33, 3, 3, 0x333355);
    // Lens glare
    this._px(g, 39, 32, 3, 2, 0xffffff, 0.5);
    this._px(g, 53, 32, 3, 2, 0xffffff, 0.5);

    // Eyes behind glasses
    this._px(g, 41, 33, 3, 3, 0x1a1a2e);
    this._px(g, 54, 33, 3, 3, 0x1a1a2e);

    // Smile
    this._px(g, 42, 42, 12, 2, 0xcc8866);
    this._px(g, 41, 41, 2, 2, 0xcc8866);
    this._px(g, 54, 41, 2, 2, 0xcc8866);

    // Hands
    this._px(g, 21, 75, 9, 9, 0xffccaa);
    this._px(g, 66, 75, 9, 9, 0xffccaa);

    // Test tube in right hand
    this._px(g, 69, 63, 6, 18, 0xaaddff, 0.8);
    this._px(g, 71, 72, 3, 6, 0x00ff88, 0.7);

    g.generateTexture('prof_aurum', S, S);
    g.destroy();
  }

  // ───────────────────────────────────────────
  // 12. HP BAR PARTS — background and fill textures
  // ───────────────────────────────────────────
  _genHPBarParts() {
    // HP bar background (dark track)
    {
      const W = 300, H = 21;
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, W, H, 0x111122);
      this._px(g, 0, 0, W, 2, 0x333355, 0.5);
      this._px(g, 0, H - 2, W, 2, 0x000011, 0.5);
      this._px(g, 0, 0, 2, H, 0x333355, 0.3);
      this._px(g, W - 2, 0, 2, H, 0x000011, 0.3);
      g.generateTexture('hp_bar_bg', W, H);
      g.destroy();
    }

    // HP bar fill (green — will be tinted per element)
    {
      const W = 294, H = 15;
      const g = this.make.graphics({ add: false });
      this._px(g, 0, 0, W, H, 0x00cc66);
      this._px(g, 0, 0, W, 5, 0x00ff88, 0.4);
      this._px(g, 0, H - 3, W, 3, 0x009944, 0.3);
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
      const W = 1140, H = 120;
      const g = this.make.graphics({ add: false });

      // Outer dark border (rounded corners simulated)
      this._px(g, 6, 0, W - 12, H, 0x111111);
      this._px(g, 0, 6, W, H - 12, 0x111111);
      this._px(g, 3, 3, W - 6, H - 6, 0x111111);

      // Main thick metallic body
      this._px(g, 6, 3, W - 12, H - 6, 0x3a3a4a);
      this._px(g, 3, 6, W - 6, H - 12, 0x3a3a4a);

      // Top/Left highlight (emboss)
      this._px(g, 9, 3, W - 18, 3, 0x5a5a6a);
      this._px(g, 3, 9, 3, H - 18, 0x5a5a6a);
      this._px(g, 6, 6, 3, 3, 0x5a5a6a);

      // Bottom/Right shadow
      this._px(g, 9, H - 6, W - 18, 3, 0x222233);
      this._px(g, W - 6, 9, 3, H - 18, 0x222233);
      this._px(g, W - 9, H - 9, 3, 3, 0x222233);

      // Inner dark screen area
      const innerX = 24, innerY = 24;
      const innerW = W - 48, innerH = H - 48;
      this._px(g, innerX, innerY, innerW, innerH, 0x0a0a1a);

      // Inner shadow (inset)
      this._px(g, innerX, innerY, innerW, 3, 0x000000);
      this._px(g, innerX, innerY, 3, innerH, 0x000000);
      // Inner highlight
      this._px(g, innerX, innerY + innerH - 3, innerW, 3, 0x2a2a3a);
      this._px(g, innerX + innerW - 3, innerY, 3, innerH, 0x2a2a3a);

      g.generateTexture('dialogue_box', W, H);
      g.destroy();
    }

    // Control panel background
    {
      const W = 1200, H = 240;
      const g = this.make.graphics({ add: false });

      // Panel sits at bottom, so top needs rounding/emboss
      this._px(g, 0, 15, W, H - 15, 0x3a3a4a);
      this._px(g, 15, 0, W - 30, H, 0x3a3a4a);
      this._px(g, 6, 6, W - 12, H - 6, 0x3a3a4a);

      // Outer black stroke for top edge
      this._px(g, 15, 0, W - 30, 3, 0x111111);
      this._px(g, 6, 3, 9, 3, 0x111111);
      this._px(g, W - 15, 3, 9, 3, 0x111111);
      this._px(g, 3, 6, 3, 9, 0x111111);
      this._px(g, W - 6, 6, 3, 9, 0x111111);
      this._px(g, 0, 15, 3, H - 15, 0x111111);
      this._px(g, W - 3, 15, 3, H - 15, 0x111111);

      // Top highlight
      this._px(g, 15, 3, W - 30, 3, 0x5a5a6a);
      this._px(g, 9, 6, 6, 3, 0x5a5a6a);
      this._px(g, 6, 9, 3, 6, 0x5a5a6a);
      this._px(g, 3, 15, 3, W - 15, 0x5a5a6a);

      // Sharp 2px accent borders (cyberpunk)
      this._px(g, 0, 15, W, 2, 0x00ffcc, 0.15);
      this._px(g, 0, H - 2, W, 2, 0x00ffcc, 0.1);

      // Decorative bolts (corners)
      this._px(g, 18, 18, 9, 9, 0x222233);
      this._px(g, 21, 21, 3, 3, 0x111111);
      this._px(g, W - 27, 18, 9, 9, 0x222233);
      this._px(g, W - 24, 21, 3, 3, 0x111111);

      // Corner brackets (cyberpunk L-shapes)
      const bLen = 18, bT = 2;
      // Top-left
      this._px(g, 6, 6, bLen, bT, 0x00ffcc, 0.4);
      this._px(g, 6, 6, bT, bLen, 0x00ffcc, 0.4);
      // Top-right
      this._px(g, W - 6 - bLen, 6, bLen, bT, 0x00ffcc, 0.4);
      this._px(g, W - 8, 6, bT, bLen, 0x00ffcc, 0.4);
      // Bottom-left
      this._px(g, 6, H - 8, bLen, bT, 0x00ffcc, 0.4);
      this._px(g, 6, H - 6 - bLen, bT, bLen, 0x00ffcc, 0.4);
      // Bottom-right
      this._px(g, W - 6 - bLen, H - 8, bLen, bT, 0x00ffcc, 0.4);
      this._px(g, W - 8, H - 6 - bLen, bT, bLen, 0x00ffcc, 0.4);

      // Inner screen area (where buttons go)
      const innerX = 45, innerY = 45;
      const innerW = W - 90, innerH = H - 60;
      this._px(g, innerX, innerY, innerW, innerH, 0x16161c);

      // Screen shadow/highlight
      this._px(g, innerX, innerY, innerW, 3, 0x05050a);
      this._px(g, innerX, innerY, 3, innerH, 0x05050a);
      this._px(g, innerX, innerY + innerH - 3, innerW, 3, 0x2a2a3a);
      this._px(g, innerX + innerW - 3, innerY, 3, innerH, 0x2a2a3a);

      g.generateTexture('control_panel', W, H);
      g.destroy();
    }

    // RPG window frame (generic, for stats/info panels)
    {
      const W = 480, H = 300;
      const g = this.make.graphics({ add: false });

      // Outer border
      this._px(g, 0, 0, W, H, 0x333366);
      // Inner border
      this._px(g, 3, 3, W - 6, H - 6, 0x222244);
      // Fill
      this._px(g, 6, 6, W - 12, H - 12, 0x0d0d1a);
      // Bevel top
      this._px(g, 6, 6, W - 12, 3, 0x444477, 0.4);
      // Bevel bottom
      this._px(g, 6, H - 9, W - 12, 3, 0x111133, 0.5);
      // Corner accents
      this._px(g, 0, 0, 6, 6, 0x5555aa, 0.6);
      this._px(g, W - 6, 0, 6, 6, 0x5555aa, 0.6);
      this._px(g, 0, H - 6, 6, 6, 0x5555aa, 0.6);
      this._px(g, W - 6, H - 6, 6, 6, 0x5555aa, 0.6);

      g.generateTexture('rpg_frame', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 14. RANK BADGES — 10 unique pixel-art shield/emblem textures
  // ───────────────────────────────────────────
  _genRankBadges() {
    const BS = 48;
    const cx = 24, cy = 24;

    // Badge 1: Apprentice (gray) — Circle outline with small flask inside
    {
      const g = this.make.graphics({ add: false });
      const col = 0x888888;

      // Dark background fill
      this._pxCircle(g, cx, cy, 22, 0x111122);
      // Colored border
      this._pxOutlineCircle(g, cx, cy, 22, col);
      this._pxOutlineCircle(g, cx, cy, 21, col);

      // Flask icon inside
      // Neck
      this._px(g, cx - 2, cy - 10, 4, 6, col);
      // Body
      this._px(g, cx - 5, cy - 4, 10, 10, col);
      // Body fill lighter
      this._px(g, cx - 4, cy - 3, 8, 8, this._lighten(col, 40));
      // Liquid
      this._px(g, cx - 4, cy + 1, 8, 4, this._lighten(col, 80));

      // 2px highlight edge
      this._px(g, cx - 10, 3, 4, 2, 0xffffff, 0.3);

      g.generateTexture('badge_1', BS, BS);
      g.destroy();
    }

    // Badge 2: Lab Tech (green) — Shield shape with flask icon
    {
      const g = this.make.graphics({ add: false });
      const col = 0x44aa44;

      // Dark background fill — shield shape
      this._px(g, 8, 4, 32, 28, 0x111122);
      this._px(g, 12, 32, 24, 6, 0x111122);
      this._px(g, 16, 38, 16, 4, 0x111122);
      this._px(g, 20, 42, 8, 3, 0x111122);

      // Colored border
      this._px(g, 8, 4, 32, 2, col);
      this._px(g, 8, 4, 2, 28, col);
      this._px(g, 38, 4, 2, 28, col);
      this._px(g, 12, 32, 2, 6, col);
      this._px(g, 34, 32, 2, 6, col);
      this._px(g, 16, 38, 2, 4, col);
      this._px(g, 30, 38, 2, 4, col);
      this._px(g, 20, 42, 8, 2, col);

      // Flask inside
      this._px(g, cx - 2, 10, 4, 5, this._lighten(col, 60));
      this._px(g, cx - 5, 15, 10, 12, this._lighten(col, 40));
      this._px(g, cx - 4, 16, 8, 10, this._lighten(col, 80));
      // Liquid
      this._px(g, cx - 4, 21, 8, 5, 0x88ff88);

      // 2px highlight edge
      this._px(g, 10, 5, 6, 2, 0xffffff, 0.3);

      g.generateTexture('badge_2', BS, BS);
      g.destroy();
    }

    // Badge 3: Molecule Engineer (blue) — Shield with atom orbits
    {
      const g = this.make.graphics({ add: false });
      const col = 0x4488ff;

      // Dark background — shield
      this._px(g, 8, 4, 32, 28, 0x111122);
      this._px(g, 12, 32, 24, 6, 0x111122);
      this._px(g, 16, 38, 16, 4, 0x111122);
      this._px(g, 20, 42, 8, 3, 0x111122);

      // Colored border
      this._px(g, 8, 4, 32, 2, col);
      this._px(g, 8, 4, 2, 28, col);
      this._px(g, 38, 4, 2, 28, col);
      this._px(g, 12, 32, 2, 6, col);
      this._px(g, 34, 32, 2, 6, col);
      this._px(g, 16, 38, 2, 4, col);
      this._px(g, 30, 38, 2, 4, col);
      this._px(g, 20, 42, 8, 2, col);

      // Atom nucleus
      this._pxCircle(g, cx, cy, 3, 0xffffff);

      // 3 orbit ellipses (drawn as pixel arcs)
      for (let angle = 0; angle < 3; angle++) {
        const rot = (angle * 60) * Math.PI / 180;
        for (let t = 0; t < Math.PI * 2; t += 0.15) {
          const ex = Math.round(cx + Math.cos(t) * 12 * Math.cos(rot) - Math.sin(t) * 5 * Math.sin(rot));
          const ey = Math.round(cy + Math.cos(t) * 12 * Math.sin(rot) + Math.sin(t) * 5 * Math.cos(rot));
          if (ex >= 10 && ex < 38 && ey >= 6 && ey < 42) {
            this._px(g, ex, ey, 1, 1, col, 0.7);
          }
        }
      }

      // 2px highlight edge
      this._px(g, 10, 5, 6, 2, 0xffffff, 0.3);

      g.generateTexture('badge_3', BS, BS);
      g.destroy();
    }

    // Badge 4: Reaction Specialist (purple) — Pentagon outline with lightning bolt
    {
      const g = this.make.graphics({ add: false });
      const col = 0xcc44ff;

      // Dark background fill
      this._pxCircle(g, cx, cy, 22, 0x111122);

      // Pentagon outline
      const pentR = 20;
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 72 - 90) * Math.PI / 180;
        const a2 = ((i + 1) * 72 - 90) * Math.PI / 180;
        const x1 = Math.round(cx + Math.cos(a1) * pentR);
        const y1 = Math.round(cy + Math.sin(a1) * pentR);
        const x2 = Math.round(cx + Math.cos(a2) * pentR);
        const y2 = Math.round(cy + Math.sin(a2) * pentR);
        // Draw line between points
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let s = 0; s <= steps; s++) {
          const px = Math.round(x1 + (x2 - x1) * s / steps);
          const py = Math.round(y1 + (y2 - y1) * s / steps);
          this._px(g, px, py, 2, 2, col);
        }
      }

      // Lightning bolt inside
      this._px(g, cx + 2, cy - 10, 4, 2, 0xffdd00);
      this._px(g, cx, cy - 8, 4, 2, 0xffdd00);
      this._px(g, cx - 2, cy - 6, 6, 2, 0xffdd00);
      this._px(g, cx, cy - 4, 4, 2, 0xffdd00);
      this._px(g, cx + 2, cy - 2, 4, 2, 0xffdd00);
      this._px(g, cx, cy, 4, 2, 0xffee44);
      this._px(g, cx - 2, cy + 2, 4, 2, 0xffdd00);
      this._px(g, cx, cy + 4, 4, 2, 0xffdd00);
      this._px(g, cx + 2, cy + 6, 4, 2, 0xffdd00);
      this._px(g, cx, cy + 8, 2, 2, 0xffdd00);

      // 2px highlight edge
      this._px(g, cx - 6, 5, 4, 2, 0xffffff, 0.3);

      g.generateTexture('badge_4', BS, BS);
      g.destroy();
    }

    // Badge 5: Master Chemist (red) — Star-bordered shield
    {
      const g = this.make.graphics({ add: false });
      const col = 0xff4444;

      // Dark background — shield
      this._px(g, 8, 4, 32, 28, 0x111122);
      this._px(g, 12, 32, 24, 6, 0x111122);
      this._px(g, 16, 38, 16, 4, 0x111122);
      this._px(g, 20, 42, 8, 3, 0x111122);

      // Colored border
      this._px(g, 8, 4, 32, 2, col);
      this._px(g, 8, 4, 2, 28, col);
      this._px(g, 38, 4, 2, 28, col);
      this._px(g, 12, 32, 2, 6, col);
      this._px(g, 34, 32, 2, 6, col);
      this._px(g, 16, 38, 2, 4, col);
      this._px(g, 30, 38, 2, 4, col);
      this._px(g, 20, 42, 8, 2, col);

      // Star border decorations (small stars along edges)
      const starPts = [[12, 8], [24, 6], [36, 8], [12, 28], [36, 28]];
      for (const [sx, sy] of starPts) {
        this._px(g, sx - 1, sy, 3, 1, 0xffcc00);
        this._px(g, sx, sy - 1, 1, 3, 0xffcc00);
      }

      // Inner star
      this._px(g, cx - 1, cy - 8, 3, 5, col);
      this._px(g, cx - 6, cy - 2, 13, 3, col);
      this._px(g, cx - 4, cy + 1, 9, 3, col);
      this._px(g, cx - 2, cy + 4, 2, 4, col);
      this._px(g, cx + 1, cy + 4, 2, 4, col);
      // Inner star brighter center
      this._px(g, cx - 1, cy - 2, 3, 3, this._lighten(col, 80));

      // 2px highlight edge
      this._px(g, 10, 5, 6, 2, 0xffffff, 0.3);

      g.generateTexture('badge_5', BS, BS);
      g.destroy();
    }

    // Badge 6: Crystal Chemist (cyan) — Diamond/crystal shape + glow
    {
      const g = this.make.graphics({ add: false });
      const col = 0x00ffcc;

      // Glow effect behind (ranks 6-10)
      this._pxCircle(g, cx, cy, 23, col, 0.15);

      // Dark background — diamond shape
      // Top triangle
      for (let row = 0; row < 16; row++) {
        const hw = row + 1;
        this._px(g, cx - hw, cy - 16 + row, hw * 2, 1, 0x111122);
      }
      // Bottom triangle
      for (let row = 0; row < 16; row++) {
        const hw = 16 - row;
        this._px(g, cx - hw, cy + row, hw * 2, 1, 0x111122);
      }

      // Diamond border
      for (let row = 0; row < 16; row++) {
        const hw = row + 1;
        this._px(g, cx - hw, cy - 16 + row, 2, 1, col);
        this._px(g, cx + hw - 2, cy - 16 + row, 2, 1, col);
      }
      for (let row = 0; row < 16; row++) {
        const hw = 16 - row;
        this._px(g, cx - hw, cy + row, 2, 1, col);
        this._px(g, cx + hw - 2, cy + row, 2, 1, col);
      }

      // Crystal facet lines
      this._px(g, cx - 1, cy - 14, 2, 28, this._lighten(col, 40), 0.4);
      this._px(g, cx - 8, cy - 1, 16, 2, this._lighten(col, 40), 0.3);

      // Sparkle at top
      this._px(g, cx - 1, cy - 12, 2, 2, 0xffffff, 0.8);

      // 2px highlight edge
      this._px(g, cx - 4, cy - 14, 4, 2, 0xffffff, 0.3);

      g.generateTexture('badge_6', BS, BS);
      g.destroy();
    }

    // Badge 7: Solar Alchemist (amber) — Circle with radiating sun rays + glow
    {
      const g = this.make.graphics({ add: false });
      const col = 0xffaa00;

      // Glow effect behind
      this._pxCircle(g, cx, cy, 23, col, 0.15);

      // Dark background
      this._pxCircle(g, cx, cy, 20, 0x111122);

      // Sun rays (8 directions)
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * Math.PI / 180;
        for (let d = 10; d < 19; d++) {
          const rx = Math.round(cx + Math.cos(angle) * d);
          const ry = Math.round(cy + Math.sin(angle) * d);
          this._px(g, rx, ry, 2, 2, col, 0.6);
        }
      }

      // Central sun circle
      this._pxCircle(g, cx, cy, 8, col);
      this._pxCircle(g, cx, cy, 6, this._lighten(col, 60));

      // Border circle
      this._pxOutlineCircle(g, cx, cy, 20, col);

      // Highlight
      this._px(g, cx - 3, cy - 4, 2, 2, 0xffffff, 0.6);

      // 2px highlight edge
      this._px(g, cx - 8, 5, 4, 2, 0xffffff, 0.3);

      g.generateTexture('badge_7', BS, BS);
      g.destroy();
    }

    // Badge 8: Abyssal Researcher (blue) — Shield with trident shape on top + glow
    {
      const g = this.make.graphics({ add: false });
      const col = 0x0066ff;

      // Glow effect behind
      this._pxCircle(g, cx, cy, 23, col, 0.15);

      // Dark background — shield
      this._px(g, 8, 10, 32, 24, 0x111122);
      this._px(g, 12, 34, 24, 4, 0x111122);
      this._px(g, 16, 38, 16, 3, 0x111122);
      this._px(g, 20, 41, 8, 3, 0x111122);

      // Colored border
      this._px(g, 8, 10, 32, 2, col);
      this._px(g, 8, 10, 2, 24, col);
      this._px(g, 38, 10, 2, 24, col);
      this._px(g, 12, 34, 2, 4, col);
      this._px(g, 34, 34, 2, 4, col);
      this._px(g, 16, 38, 2, 3, col);
      this._px(g, 30, 38, 2, 3, col);
      this._px(g, 20, 41, 8, 2, col);

      // Trident shape on top
      // Center prong
      this._px(g, cx - 1, 2, 2, 12, this._lighten(col, 60));
      // Left prong
      this._px(g, cx - 7, 2, 2, 8, this._lighten(col, 60));
      this._px(g, cx - 6, 10, 2, 2, this._lighten(col, 60));
      this._px(g, cx - 4, 10, 2, 4, this._lighten(col, 60));
      // Right prong
      this._px(g, cx + 5, 2, 2, 8, this._lighten(col, 60));
      this._px(g, cx + 4, 10, 2, 2, this._lighten(col, 60));
      this._px(g, cx + 2, 10, 2, 4, this._lighten(col, 60));
      // Crossbar
      this._px(g, cx - 7, 9, 14, 2, this._lighten(col, 40));
      // Prong tips
      this._px(g, cx - 1, 2, 2, 2, 0xffffff, 0.6);
      this._px(g, cx - 7, 2, 2, 2, 0xffffff, 0.5);
      this._px(g, cx + 5, 2, 2, 2, 0xffffff, 0.5);

      // 2px highlight edge
      this._px(g, 10, 11, 6, 2, 0xffffff, 0.3);

      g.generateTexture('badge_8', BS, BS);
      g.destroy();
    }

    // Badge 9: Plasma Theorist (pink) — Hexagonal frame with inner arcs + glow
    {
      const g = this.make.graphics({ add: false });
      const col = 0xff00aa;

      // Glow effect behind
      this._pxCircle(g, cx, cy, 23, col, 0.15);

      // Dark background
      this._pxCircle(g, cx, cy, 21, 0x111122);

      // Hexagonal frame
      const hexR = 20;
      for (let i = 0; i < 6; i++) {
        const a1 = (i * 60 - 30) * Math.PI / 180;
        const a2 = ((i + 1) * 60 - 30) * Math.PI / 180;
        const x1 = Math.round(cx + Math.cos(a1) * hexR);
        const y1 = Math.round(cy + Math.sin(a1) * hexR);
        const x2 = Math.round(cx + Math.cos(a2) * hexR);
        const y2 = Math.round(cy + Math.sin(a2) * hexR);
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let s = 0; s <= steps; s++) {
          const px = Math.round(x1 + (x2 - x1) * s / steps);
          const py = Math.round(y1 + (y2 - y1) * s / steps);
          this._px(g, px, py, 2, 2, col);
        }
      }

      // Inner arcs (3 curved lines)
      for (let arc = 0; arc < 3; arc++) {
        const startA = arc * 120;
        for (let t = 0; t < 60; t += 3) {
          const a = (startA + t) * Math.PI / 180;
          const r = 10;
          const ax = Math.round(cx + Math.cos(a) * r);
          const ay = Math.round(cy + Math.sin(a) * r);
          this._px(g, ax, ay, 2, 2, this._lighten(col, 60), 0.6);
        }
      }

      // Center dot
      this._pxCircle(g, cx, cy, 2, 0xffffff, 0.8);

      // 2px highlight edge
      this._px(g, cx - 6, 5, 4, 2, 0xffffff, 0.3);

      g.generateTexture('badge_9', BS, BS);
      g.destroy();
    }

    // Badge 10: Quantum Master (white) — Crown-topped shield with star inside + glow
    {
      const g = this.make.graphics({ add: false });
      const col = 0xffffff;

      // Glow effect behind
      this._pxCircle(g, cx, cy, 23, col, 0.15);

      // Dark background — shield
      this._px(g, 8, 12, 32, 22, 0x111122);
      this._px(g, 12, 34, 24, 4, 0x111122);
      this._px(g, 16, 38, 16, 3, 0x111122);
      this._px(g, 20, 41, 8, 3, 0x111122);

      // Colored border (white/silver)
      this._px(g, 8, 12, 32, 2, col);
      this._px(g, 8, 12, 2, 22, col);
      this._px(g, 38, 12, 2, 22, col);
      this._px(g, 12, 34, 2, 4, col);
      this._px(g, 34, 34, 2, 4, col);
      this._px(g, 16, 38, 2, 3, col);
      this._px(g, 30, 38, 2, 3, col);
      this._px(g, 20, 41, 8, 2, col);

      // Crown on top
      // Base bar
      this._px(g, 12, 10, 24, 4, 0xffdd44);
      // Crown peaks
      this._px(g, 12, 4, 4, 6, 0xffdd44);
      this._px(g, 22, 2, 4, 8, 0xffdd44);
      this._px(g, 32, 4, 4, 6, 0xffdd44);
      // Crown jewels
      this._px(g, 13, 5, 2, 2, 0xff4444);
      this._px(g, 23, 3, 2, 2, 0x4488ff);
      this._px(g, 33, 5, 2, 2, 0x44ff44);
      // Crown highlight
      this._px(g, 14, 10, 20, 1, 0xffffff, 0.4);

      // Star inside shield
      this._px(g, cx - 1, cy - 4, 2, 3, 0xffee88);
      this._px(g, cx - 5, cy - 1, 10, 2, 0xffee88);
      this._px(g, cx - 3, cy + 1, 6, 2, 0xffee88);
      this._px(g, cx - 2, cy + 3, 2, 3, 0xffee88);
      this._px(g, cx + 1, cy + 3, 2, 3, 0xffee88);
      // Star center bright
      this._px(g, cx - 1, cy - 1, 2, 2, 0xffffff);

      // 2px highlight edge
      this._px(g, 10, 13, 6, 2, 0xffffff, 0.3);

      g.generateTexture('badge_10', BS, BS);
      g.destroy();
    }
  }

  create() {
    this.scene.start('MenuScene');
  }
}
