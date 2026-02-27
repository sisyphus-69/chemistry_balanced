/**
 * PanelRenderer — Reusable cyberpunk-style panel drawing.
 * Draws bordered panels with corner brackets, scanlines, and glow effects.
 */
export class PanelRenderer {
  /**
   * Draw a bordered panel with cyberpunk styling.
   * @param {Phaser.GameObjects.Graphics} g
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {object} [opts]
   * @param {number} [opts.fillColor=0x0d0d1a]
   * @param {number} [opts.fillAlpha=0.95]
   * @param {number} [opts.borderColor=0x333366]
   * @param {number} [opts.borderAlpha=0.8]
   * @param {boolean} [opts.cornerBrackets=true]
   * @param {number} [opts.bracketColor] - defaults to borderColor
   * @param {number} [opts.bracketSize=10]
   * @param {boolean} [opts.scanlines=false]
   * @param {boolean} [opts.glow=false]
   * @param {number} [opts.glowColor] - defaults to borderColor
   */
  static drawPanel(g, x, y, w, h, opts = {}) {
    const {
      fillColor = 0x0d0d1a,
      fillAlpha = 0.95,
      borderColor = 0x333366,
      borderAlpha = 0.8,
      cornerBrackets = true,
      bracketColor,
      bracketSize = 10,
      scanlines = false,
      glow = false,
      glowColor
    } = opts;

    const bc = bracketColor ?? borderColor;
    const gc = glowColor ?? borderColor;

    // Outer glow (optional)
    if (glow) {
      g.fillStyle(gc, 0.06);
      g.fillRect(x - 2, y - 2, w + 4, h + 4);
    }

    // Dark fill
    g.fillStyle(fillColor, fillAlpha);
    g.fillRect(x, y, w, h);

    // 2px border
    g.fillStyle(borderColor, borderAlpha);
    // Top
    g.fillRect(x, y, w, 2);
    // Bottom
    g.fillRect(x, y + h - 2, w, 2);
    // Left
    g.fillRect(x, y, 2, h);
    // Right
    g.fillRect(x + w - 2, y, 2, h);

    // Inner glow line (1px inside border)
    g.fillStyle(borderColor, 0.15);
    g.fillRect(x + 3, y + 3, w - 6, 1);
    g.fillRect(x + 3, y + h - 4, w - 6, 1);
    g.fillRect(x + 3, y + 3, 1, h - 6);
    g.fillRect(x + w - 4, y + 3, 1, h - 6);

    // Corner brackets
    if (cornerBrackets) {
      PanelRenderer.drawCornerBrackets(g, x, y, w, h, bc, bracketSize);
    }

    // Scanline overlay
    if (scanlines) {
      PanelRenderer.drawScanlines(g, x + 3, y + 3, w - 6, h - 6);
    }
  }

  /**
   * Draw L-shaped corner brackets at all four corners.
   */
  static drawCornerBrackets(g, x, y, w, h, color, size = 10) {
    g.fillStyle(color, 0.9);
    const t = 2; // bracket thickness

    // Top-left
    g.fillRect(x, y, size, t);
    g.fillRect(x, y, t, size);

    // Top-right
    g.fillRect(x + w - size, y, size, t);
    g.fillRect(x + w - t, y, t, size);

    // Bottom-left
    g.fillRect(x, y + h - t, size, t);
    g.fillRect(x, y + h - size, t, size);

    // Bottom-right
    g.fillRect(x + w - size, y + h - t, size, t);
    g.fillRect(x + w - t, y + h - size, t, size);
  }

  /**
   * Draw subtle horizontal scanline overlay.
   */
  static drawScanlines(g, x, y, w, h) {
    g.fillStyle(0x000000, 0.03);
    for (let sy = y; sy < y + h; sy += 4) {
      g.fillRect(x, sy, w, 1);
    }
  }

  /**
   * Draw a neon divider line.
   */
  static drawDivider(g, x, y, w, color, alpha = 0.6) {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, w, 2);
    g.fillStyle(color, 0.15);
    g.fillRect(x, y - 1, w, 1);
    g.fillRect(x, y + 2, w, 1);
  }

  /**
   * Draw a full-viewport CRT scanline overlay.
   */
  static drawCRTOverlay(g, w, h) {
    g.fillStyle(0x000000, 0.02);
    for (let y = 0; y < h; y += 4) {
      g.fillRect(0, y, w, 1);
    }
  }

  /**
   * Draw a vignette (dark edges) overlay.
   */
  static drawVignette(g, w, h, strength = 0.3) {
    const edgeW = Math.round(w * 0.08);
    const edgeH = Math.round(h * 0.06);

    // Top edge
    for (let i = 0; i < edgeH; i++) {
      const a = strength * (1 - i / edgeH);
      g.fillStyle(0x000000, a);
      g.fillRect(0, i, w, 1);
    }
    // Bottom edge
    for (let i = 0; i < edgeH; i++) {
      const a = strength * (1 - i / edgeH);
      g.fillStyle(0x000000, a);
      g.fillRect(0, h - 1 - i, w, 1);
    }
    // Left edge
    for (let i = 0; i < edgeW; i++) {
      const a = strength * 0.5 * (1 - i / edgeW);
      g.fillStyle(0x000000, a);
      g.fillRect(i, 0, 1, h);
    }
    // Right edge
    for (let i = 0; i < edgeW; i++) {
      const a = strength * 0.5 * (1 - i / edgeW);
      g.fillStyle(0x000000, a);
      g.fillRect(w - 1 - i, 0, 1, h);
    }
  }
}
