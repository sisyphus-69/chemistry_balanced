import Phaser from 'phaser';

/**
 * BootScene — Asset preloading & high-end procedural texture generation.
 *
 * Every sprite is built with multiple layered draws to create depth:
 *   • outer glow / shadow pass
 *   • base fill
 *   • mid-tone shading ring
 *   • specular highlight arc (top-left)
 *   • bright specular dot
 *   • rim-light outline
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
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, barY + barH + 15, '0%', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaacc'
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
  // Colour helpers
  // ───────────────────────────────────────────
  _col(hex) {
    return Phaser.Display.Color.IntegerToColor(hex);
  }

  /** Lighten a hex colour by `amount` (0-255 per channel) */
  _lighten(hex, amount) {
    const c = this._col(hex);
    return Phaser.Display.Color.GetColor(
      Math.min(255, c.red + amount),
      Math.min(255, c.green + amount),
      Math.min(255, c.blue + amount)
    );
  }

  /** Darken a hex colour */
  _darken(hex, amount) {
    const c = this._col(hex);
    return Phaser.Display.Color.GetColor(
      Math.max(0, c.red - amount),
      Math.max(0, c.green - amount),
      Math.max(0, c.blue - amount)
    );
  }

  /** Draw a filled arc (pie slice) — used for specular highlights */
  _arc(g, cx, cy, r, startDeg, endDeg) {
    const startRad = Phaser.Math.DegToRad(startDeg);
    const endRad = Phaser.Math.DegToRad(endDeg);
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, r, startRad, endRad, false);
    g.closePath();
    g.fillPath();
  }

  /** Draw a star polygon path */
  _starPath(g, cx, cy, outerR, innerR, points) {
    const verts = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = -Math.PI / 2 + (Math.PI / points) * i;
      const r = i % 2 === 0 ? outerR : innerR;
      verts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
    g.closePath();
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
  }

  // ───────────────────────────────────────────
  // 1. ELEMENT ORBS — glossy 3D spheres
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

    const S = 36; // slightly bigger for detail
    const cx = S / 2, cy = S / 2, R = S / 2 - 2;

    for (const [sym, baseCol] of Object.entries(elements)) {
      const g = this.make.graphics({ add: false });

      // a) Outer glow
      g.fillStyle(baseCol, 0.15);
      g.fillCircle(cx, cy, R + 1);

      // b) Shadow hemisphere (lower-right darker)
      g.fillStyle(this._darken(baseCol, 80), 1);
      g.fillCircle(cx + 1, cy + 1, R);

      // c) Base sphere
      g.fillStyle(baseCol, 1);
      g.fillCircle(cx, cy, R);

      // d) Upper-lighter hemisphere overlay
      g.fillStyle(this._lighten(baseCol, 40), 0.45);
      g.fillCircle(cx - 1, cy - 2, R - 2);

      // e) Specular highlight arc (upper-left quadrant)
      g.fillStyle(0xffffff, 0.30);
      this._arc(g, cx - 2, cy - 2, R - 4, 200, 320);

      // f) Hot specular dot
      g.fillStyle(0xffffff, 0.70);
      g.fillCircle(cx - R * 0.30, cy - R * 0.30, R * 0.18);

      // g) Rim light
      g.lineStyle(1, this._lighten(baseCol, 60), 0.35);
      g.strokeCircle(cx, cy, R);

      g.generateTexture(`orb_${sym}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 2. COEFFICIENT TOKENS — bevelled tiles
  // ───────────────────────────────────────────
  _genCoefficientTokens() {
    const S = 44;
    for (let n = 1; n <= 9; n++) {
      const g = this.make.graphics({ add: false });

      // Drop shadow
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(2, 3, S - 2, S - 2, 8);

      // Base
      g.fillStyle(0x22224a, 1);
      g.fillRoundedRect(0, 0, S, S, 8);

      // Top bevel (lighter)
      g.fillStyle(0x3a3a6a, 1);
      g.fillRoundedRect(1, 1, S - 2, S / 2, 8);

      // Inner face
      g.fillStyle(0x2e2e58, 1);
      g.fillRoundedRect(3, 3, S - 6, S - 6, 6);

      // Top-edge shine
      g.fillStyle(0xffffff, 0.08);
      g.fillRoundedRect(4, 3, S - 8, 6, 4);

      // Border
      g.lineStyle(1.5, 0x6666bb, 0.7);
      g.strokeRoundedRect(0, 0, S, S, 8);

      g.generateTexture(`token_${n}`, S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 3. COEFFICIENT SLOTS — empty & active
  // ───────────────────────────────────────────
  _genCoefficientSlots() {
    const S = 44;

    // Empty slot (dashed look)
    {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x16162e, 0.5);
      g.fillRoundedRect(0, 0, S, S, 8);
      // Dashed border effect (draw small segments)
      g.lineStyle(2, 0x4444aa, 0.5);
      g.strokeRoundedRect(0, 0, S, S, 8);
      // Inner subtle corner accents
      g.lineStyle(1, 0x5555bb, 0.3);
      g.strokeRoundedRect(3, 3, S - 6, S - 6, 5);
      g.generateTexture('coeff_slot', S, S);
      g.destroy();
    }

    // Active / filled slot
    {
      const pad = 2;
      const TS = S + pad * 2;
      const g = this.make.graphics({ add: false });

      // Glow behind (fills entire padded texture)
      g.fillStyle(0x3355aa, 0.25);
      g.fillRoundedRect(0, 0, TS, TS, 10);

      // Base (inset by pad)
      g.fillStyle(0x2a2a5a, 1);
      g.fillRoundedRect(pad, pad, S, S, 8);

      // Top bevel
      g.fillStyle(0x3a3a70, 1);
      g.fillRoundedRect(pad + 1, pad + 1, S - 2, S / 2, 8);

      // Inner face
      g.fillStyle(0x303066, 1);
      g.fillRoundedRect(pad + 3, pad + 3, S - 6, S - 6, 6);

      // Top edge shine
      g.fillStyle(0x88aaff, 0.12);
      g.fillRoundedRect(pad + 4, pad + 3, S - 8, 5, 4);

      // Border
      g.lineStyle(2, 0x7799ee, 0.8);
      g.strokeRoundedRect(pad, pad, S, S, 8);

      g.generateTexture('coeff_slot_active', TS, TS);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 4. BALANCE SCALE — ornate, with chains
  // ───────────────────────────────────────────
  _genScale() {
    // --- Base (pillar + ornate pedestal) ---
    {
      const W = 220, H = 110;
      const g = this.make.graphics({ add: false });
      const cx = W / 2;

      // Shadow under pedestal
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(cx, H - 6, 130, 14);

      // Pedestal (layered trapezoid)
      g.fillStyle(0x3d3d5c, 1);
      g.fillRect(cx - 55, H - 16, 110, 16);
      g.fillStyle(0x4a4a6e, 1);
      g.fillRect(cx - 45, H - 24, 90, 10);
      g.fillStyle(0x555580, 1);
      g.fillRect(cx - 35, H - 30, 70, 8);

      // Pillar
      g.fillStyle(0x555580, 1);
      g.fillRect(cx - 7, 28, 14, H - 56);
      // Pillar shading (left light, right dark)
      g.fillStyle(0x6666aa, 0.4);
      g.fillRect(cx - 7, 28, 5, H - 56);
      g.fillStyle(0x000000, 0.15);
      g.fillRect(cx + 3, 28, 4, H - 56);

      // Pillar decorative rings
      for (const ry of [36, H - 36]) {
        g.fillStyle(0x7777aa, 1);
        g.fillRect(cx - 9, ry, 18, 3);
        g.fillStyle(0xaaaacc, 0.3);
        g.fillRect(cx - 9, ry, 18, 1);
      }

      // Fulcrum — ornate circle with gem
      g.fillStyle(0x7777aa, 1);
      g.fillCircle(cx, 26, 12);
      g.fillStyle(0x8888bb, 1);
      g.fillCircle(cx, 26, 9);
      // Gem in center
      g.fillStyle(0x00ccff, 1);
      g.fillCircle(cx, 26, 4);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(cx - 1, 25, 2);
      // Rim
      g.lineStyle(2, 0x9999cc, 0.6);
      g.strokeCircle(cx, 26, 12);

      g.generateTexture('scale_base', W, H);
      g.destroy();
    }

    // --- Beam (with rivets and chain attachment points) ---
    {
      const W = 320, H = 16;
      const g = this.make.graphics({ add: false });
      const cy = H / 2;

      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(1, cy + 1, W - 2, 7, 3);

      // Main beam
      g.fillStyle(0x6a6a90, 1);
      g.fillRoundedRect(0, cy - 3, W, 7, 3);

      // Top edge highlight
      g.fillStyle(0x8888bb, 0.6);
      g.fillRect(4, cy - 3, W - 8, 2);

      // Rivets along beam
      for (let rx = 20; rx < W; rx += 30) {
        g.fillStyle(0x9999bb, 1);
        g.fillCircle(rx, cy, 2.5);
        g.fillStyle(0xbbbbdd, 0.5);
        g.fillCircle(rx - 0.5, cy - 0.5, 1);
      }

      // Chain attachment brackets (left + right)
      for (const bx of [18, W - 18]) {
        g.fillStyle(0x7777aa, 1);
        g.fillRect(bx - 4, cy - 5, 8, 12);
        g.fillStyle(0x8888bb, 0.5);
        g.fillRect(bx - 4, cy - 5, 8, 2);
        g.lineStyle(1, 0x9999cc, 0.4);
        g.strokeRect(bx - 4, cy - 5, 8, 12);
      }

      g.generateTexture('scale_beam', W, H);
      g.destroy();
    }

    // --- Pans (golden dish) ---
    {
      const W = 110, H = 18;
      const g = this.make.graphics({ add: false });

      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(W / 2, H - 2, W - 6, 8);

      // Dish body (layered for depth)
      g.fillStyle(0x887744, 1);
      g.fillRoundedRect(2, 4, W - 4, H - 6, 6);
      g.fillStyle(0xaa9955, 1);
      g.fillRoundedRect(4, 4, W - 8, H - 8, 5);

      // Rim highlight
      g.fillStyle(0xddcc88, 0.5);
      g.fillRoundedRect(6, 4, W - 12, 3, 3);

      // Inner surface
      g.fillStyle(0xccbb77, 0.6);
      g.fillRoundedRect(8, 6, W - 16, H - 12, 4);

      g.lineStyle(1, 0xccbb77, 0.4);
      g.strokeRoundedRect(2, 4, W - 4, H - 6, 6);

      g.generateTexture('scale_pan', W, H);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 5. BUTTONS — polished with gradient & shine
  // ───────────────────────────────────────────
  _genButtons() {
    // CHECK button
    {
      const W = 130, H = 44;
      const g = this.make.graphics({ add: false });

      // Drop shadow
      g.fillStyle(0x005522, 0.5);
      g.fillRoundedRect(2, 3, W, H, 10);

      // Base
      g.fillStyle(0x00884a, 1);
      g.fillRoundedRect(0, 0, W, H, 10);

      // Upper gradient band
      g.fillStyle(0x00bb66, 1);
      g.fillRoundedRect(1, 1, W - 2, H / 2, 10);

      // Inner face
      g.fillStyle(0x00aa55, 1);
      g.fillRoundedRect(2, 2, W - 4, H - 4, 9);

      // Top shine
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(6, 3, W - 12, H / 3, 6);

      // Bottom edge darken
      g.fillStyle(0x000000, 0.15);
      g.fillRoundedRect(6, H - 12, W - 12, 8, 4);

      // Border
      g.lineStyle(1.5, 0x44dd88, 0.5);
      g.strokeRoundedRect(0, 0, W, H, 10);

      g.generateTexture('btn_check', W, H);
      g.destroy();
    }

    // HINT button (circle)
    {
      const S = 44, cx = S / 2, cy = S / 2, R = S / 2 - 2;
      const g = this.make.graphics({ add: false });

      // Shadow
      g.fillStyle(0x664400, 0.4);
      g.fillCircle(cx + 1, cy + 1, R);

      // Base
      g.fillStyle(0xaa7700, 1);
      g.fillCircle(cx, cy, R);

      // Upper half lighter
      g.fillStyle(0xcc9922, 0.7);
      g.fillCircle(cx, cy - 2, R - 2);

      // Inner
      g.fillStyle(0xbb8811, 1);
      g.fillCircle(cx, cy, R - 3);

      // Specular
      g.fillStyle(0xffffff, 0.25);
      this._arc(g, cx - 2, cy - 3, R - 5, 210, 330);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(cx - 4, cy - 5, 3);

      // Rim
      g.lineStyle(1.5, 0xddaa44, 0.5);
      g.strokeCircle(cx, cy, R);

      g.generateTexture('btn_hint', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 6. PARTICLES — radial-gradient blobs
  // ───────────────────────────────────────────
  _genParticles() {
    // Gold sparkle
    {
      const S = 12, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffdd44, 0.15);
      g.fillCircle(cx, cy, 6);
      g.fillStyle(0xffdd44, 0.4);
      g.fillCircle(cx, cy, 4);
      g.fillStyle(0xffee88, 0.8);
      g.fillCircle(cx, cy, 2.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx, cy, 1);
      g.generateTexture('particle_gold', S, S);
      g.destroy();
    }
    // Red puff
    {
      const S = 10, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xff4444, 0.1);
      g.fillCircle(cx, cy, 5);
      g.fillStyle(0xff4444, 0.4);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(0xff8888, 0.8);
      g.fillCircle(cx, cy, 1.5);
      g.generateTexture('particle_red', S, S);
      g.destroy();
    }
    // Green sparkle (for correct answers)
    {
      const S = 12, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x00ff88, 0.12);
      g.fillCircle(cx, cy, 6);
      g.fillStyle(0x00ff88, 0.4);
      g.fillCircle(cx, cy, 3.5);
      g.fillStyle(0xaaffcc, 0.9);
      g.fillCircle(cx, cy, 1.5);
      g.generateTexture('particle_green', S, S);
      g.destroy();
    }
    // White twinkle (4-pointed star)
    {
      const S = 14, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(cx, cy, 6);
      g.fillStyle(0xffffff, 0.7);
      // Horizontal beam
      g.fillRect(cx - 5, cy - 0.5, 10, 1);
      // Vertical beam
      g.fillRect(cx - 0.5, cy - 5, 1, 10);
      // Bright center
      g.fillStyle(0xffffff, 1);
      g.fillCircle(cx, cy, 1.5);
      g.generateTexture('particle_twinkle', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 7. STARS — 3D metallic gold / empty grey
  // ───────────────────────────────────────────
  _genStars() {
    const S = 28, cx = S / 2, cy = S / 2;

    // Filled star (gold, layered)
    {
      const g = this.make.graphics({ add: false });

      // Shadow
      g.fillStyle(0x000000, 0.25);
      this._starPath(g, cx + 1, cy + 1, 13, 5.5, 5);
      g.fillPath();

      // Dark base
      g.fillStyle(0xbb8800, 1);
      this._starPath(g, cx, cy, 13, 5.5, 5);
      g.fillPath();

      // Bright overlay
      g.fillStyle(0xffdd00, 1);
      this._starPath(g, cx, cy, 12, 5, 5);
      g.fillPath();

      // Inner lighter
      g.fillStyle(0xffee55, 0.7);
      this._starPath(g, cx - 0.5, cy - 0.5, 9, 4, 5);
      g.fillPath();

      // Hot highlight
      g.fillStyle(0xffffff, 0.4);
      this._starPath(g, cx - 1, cy - 2, 5, 2.5, 5);
      g.fillPath();

      // Outline
      g.lineStyle(1, 0xddaa00, 0.5);
      this._starPath(g, cx, cy, 13, 5.5, 5);
      g.strokePath();

      g.generateTexture('star_filled', S, S);
      g.destroy();
    }

    // Empty star
    {
      const g = this.make.graphics({ add: false });

      g.fillStyle(0x333355, 0.6);
      this._starPath(g, cx, cy, 12, 5, 5);
      g.fillPath();

      g.fillStyle(0x444466, 0.3);
      this._starPath(g, cx, cy, 9, 4, 5);
      g.fillPath();

      g.lineStyle(1, 0x555577, 0.5);
      this._starPath(g, cx, cy, 12, 5, 5);
      g.strokePath();

      g.generateTexture('star_empty', S, S);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 8. OVERWORLD PLAYER — detailed flask character
  // ───────────────────────────────────────────
  _genOverworldPlayer() {
    const S = 38;
    const g = this.make.graphics({ add: false });
    const cx = S / 2;

    // ---- Drop shadow ----
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, S - 2, 22, 6);

    // ---- Flask body ----
    // Dark outline
    g.fillStyle(0x006633, 1);
    g.fillRoundedRect(7, 12, 24, 20, 6);

    // Main body fill
    g.fillStyle(0x00cc66, 1);
    g.fillRoundedRect(8, 13, 22, 18, 5);

    // Body shading — left lighter
    g.fillStyle(0x00ee77, 0.5);
    g.fillRoundedRect(9, 13, 10, 16, 4);

    // Body shading — right darker
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(21, 14, 8, 16, 4);

    // Liquid level line
    g.fillStyle(0x00ff88, 0.4);
    g.fillRoundedRect(10, 22, 18, 7, 3);

    // Bubble highlights in liquid
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(14, 25, 2);
    g.fillCircle(21, 23, 1.5);
    g.fillCircle(17, 27, 1);

    // ---- Flask neck ----
    g.fillStyle(0x00bb55, 1);
    g.fillRect(13, 5, 12, 9);
    // Neck shading
    g.fillStyle(0x00dd66, 0.5);
    g.fillRect(13, 5, 5, 9);

    // ---- Cork / cap (flush to top) ----
    g.fillStyle(0xcc8833, 1);
    g.fillRoundedRect(11, 0, 16, 7, 3);
    // Cork wood grain lines
    g.fillStyle(0xddaa55, 0.5);
    g.fillRect(13, 1, 12, 1);
    g.fillRect(13, 4, 12, 1);
    // Cork highlight
    g.fillStyle(0xeebb66, 0.4);
    g.fillRoundedRect(12, 0, 14, 3, 2);

    // ---- Face ----
    // Eyes (white + black pupil + highlight)
    for (const ex of [14, 23]) {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(ex, 18, 3);
      g.fillStyle(0x1a1a2e, 1);
      g.fillCircle(ex + 0.5, 18.5, 1.8);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(ex - 0.5, 17.5, 0.8);
    }

    // Mouth (small smile)
    g.lineStyle(1.5, 0x006633, 1);
    g.beginPath();
    g.arc(cx, 21, 3, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();

    // ---- Feet ----
    // Left shoe
    g.fillStyle(0x005522, 1);
    g.fillRoundedRect(8, 31, 8, 5, 2);
    g.fillStyle(0x007733, 0.5);
    g.fillRoundedRect(8, 31, 8, 2, 2);
    // Right shoe
    g.fillStyle(0x005522, 1);
    g.fillRoundedRect(22, 31, 8, 5, 2);
    g.fillStyle(0x007733, 0.5);
    g.fillRoundedRect(22, 31, 8, 2, 2);

    // ---- Specular shine on flask body ----
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(10, 14, 4, 10, 2);

    g.generateTexture('player_flask', S, S);
    g.destroy();
  }

  // ───────────────────────────────────────────
  // 9. OVERWORLD NODES — crystal/gem style
  // ───────────────────────────────────────────
  _genOverworldNodes() {
    const R = 15;
    const TEX = 50; // texture size (R + glow + margin, centered)
    const cx = TEX / 2, cy = TEX / 2;

    const buildNode = (key, baseCol, ringCol, ringAlpha, glowCol) => {
      const g = this.make.graphics({ add: false });

      // Outer glow
      if (glowCol) {
        g.fillStyle(glowCol, 0.12);
        g.fillCircle(cx, cy, R + 4);
        g.fillStyle(glowCol, 0.06);
        g.fillCircle(cx, cy, R + 7);
      }

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(cx + 1, cy + 1, R);

      // Base fill
      g.fillStyle(this._darken(baseCol, 30), 1);
      g.fillCircle(cx, cy, R);

      // Inner lighter core
      g.fillStyle(baseCol, 1);
      g.fillCircle(cx, cy, R - 2);

      // Upper hemisphere shine
      g.fillStyle(this._lighten(baseCol, 40), 0.4);
      g.fillCircle(cx - 1, cy - 2, R - 4);

      // Specular highlight
      g.fillStyle(0xffffff, 0.2);
      this._arc(g, cx - 2, cy - 3, R - 5, 200, 330);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(cx - R * 0.25, cy - R * 0.25, 2.5);

      // Ring
      g.lineStyle(2.5, ringCol, ringAlpha);
      g.strokeCircle(cx, cy, R);

      // Thin inner ring
      g.lineStyle(0.5, this._lighten(ringCol, 50), ringAlpha * 0.3);
      g.strokeCircle(cx, cy, R - 3);

      g.generateTexture(key, TEX, TEX);
      g.destroy();
    };

    buildNode('node_normal',   0x2a2a4a, 0x5555aa, 0.8, null);
    buildNode('node_complete', 0x1a3a2a, 0x00ff88, 0.9, 0x00ff88);
    buildNode('node_current',  0x2a2a5a, 0x00ccff, 1.0, 0x00ccff);
    buildNode('node_locked',   0x1a1a2a, 0x333355, 0.4, null);

    // Boss node — bigger, red, with skull-like marks
    {
      const BR = 19;
      const BTEX = 64; // texture size for boss node (centered)
      const bcx = BTEX / 2, bcy = BTEX / 2;
      const g = this.make.graphics({ add: false });

      // Red glow
      g.fillStyle(0xff4444, 0.10);
      g.fillCircle(bcx, bcy, BR + 6);
      g.fillStyle(0xff4444, 0.05);
      g.fillCircle(bcx, bcy, BR + 10);

      // Shadow
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(bcx + 1, bcy + 1, BR);

      // Dark red base
      g.fillStyle(0x3a1111, 1);
      g.fillCircle(bcx, bcy, BR);

      // Core
      g.fillStyle(0x551a1a, 1);
      g.fillCircle(bcx, bcy, BR - 2);

      // Upper shine
      g.fillStyle(0x772222, 0.6);
      g.fillCircle(bcx - 1, bcy - 3, BR - 5);

      // Specular
      g.fillStyle(0xffffff, 0.15);
      this._arc(g, bcx - 2, bcy - 4, BR - 6, 210, 330);
      g.fillStyle(0xff8888, 0.4);
      g.fillCircle(bcx - BR * 0.25, bcy - BR * 0.3, 3);

      // Danger cross marks
      g.lineStyle(2, 0xff2222, 0.35);
      g.lineBetween(bcx - 5, bcy - 5, bcx + 5, bcy + 5);
      g.lineBetween(bcx + 5, bcy - 5, bcx - 5, bcy + 5);

      // Ring
      g.lineStyle(3, 0xff4444, 0.9);
      g.strokeCircle(bcx, bcy, BR);

      // Spiky outer ring accents (4 notches)
      for (let a = 0; a < 4; a++) {
        const angle = Phaser.Math.DegToRad(a * 90 + 45);
        const ox = Math.cos(angle) * (BR + 2);
        const oy = Math.sin(angle) * (BR + 2);
        g.fillStyle(0xff4444, 0.7);
        g.fillCircle(bcx + ox, bcy + oy, 3);
        g.fillStyle(0xff8888, 0.4);
        g.fillCircle(bcx + ox - 0.5, bcy + oy - 0.5, 1.5);
      }

      g.generateTexture('node_boss', BTEX, BTEX);
      g.destroy();
    }
  }

  // ───────────────────────────────────────────
  // 10. OVERWORLD MISC — path dots, banner
  // ───────────────────────────────────────────
  _genOverworldMisc() {
    // Path dot (glowing)
    {
      const S = 8, cx = S / 2, cy = S / 2;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x555577, 0.15);
      g.fillCircle(cx, cy, 4);
      g.fillStyle(0x6666aa, 0.5);
      g.fillCircle(cx, cy, 2.5);
      g.fillStyle(0x8888cc, 0.8);
      g.fillCircle(cx, cy, 1.5);
      g.generateTexture('path_dot', S, S);
      g.destroy();
    }

    // Region banner
    {
      const W = 210, H = 26;
      const g = this.make.graphics({ add: false });

      // Shadow
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(2, 2, W, H, 6);

      // Base
      g.fillStyle(0x141428, 0.92);
      g.fillRoundedRect(0, 0, W, H, 6);

      // Top edge shine
      g.fillStyle(0xffffff, 0.04);
      g.fillRoundedRect(2, 1, W - 4, 4, 4);

      // Side accent lines
      g.fillStyle(0x5555aa, 0.4);
      g.fillRect(4, 5, 2, H - 10);
      g.fillRect(W - 6, 5, 2, H - 10);

      // Border
      g.lineStyle(1, 0x4444aa, 0.5);
      g.strokeRoundedRect(0, 0, W, H, 6);

      g.generateTexture('region_banner', W, H);
      g.destroy();
    }
  }

  create() {
    this.scene.start('MenuScene');
  }
}
