/**
 * Pixel font helper for the Gen 4 RPG UI.
 * All UI text should use PIXEL_FONT for the Gen 4 aesthetic.
 */
export const PIXEL_FONT = '"Press Start 2P", monospace';

/**
 * Create a Phaser text object with the pixel font.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {number} size - Font size in px
 * @param {string} color - CSS color string
 * @param {object} [opts] - Additional Phaser text style overrides
 * @returns {Phaser.GameObjects.Text}
 */
export function pixelText(scene, x, y, text, size, color, opts = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: PIXEL_FONT,
    fontSize: `${size}px`,
    color,
    ...opts
  });
}

/**
 * Compute a scaled font size relative to an 800×600 base.
 * @param {number} base - Base font size at 800×600
 * @param {number} w - Current viewport width
 * @param {number} h - Current viewport height
 * @returns {number}
 */
export function scaledSize(base, w, h) {
  return Math.round(base * Math.min(w / 800, h / 600));
}
