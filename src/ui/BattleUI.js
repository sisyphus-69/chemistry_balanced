import { PIXEL_FONT } from './PixelText.js';

/**
 * BattleUI — Shared control panel builder for GameScene and BossScene.
 * Creates the 3×3 coefficient grid and bottom panel background.
 */
export class BattleUI {
  /**
   * Build the bottom control panel with a 3×3 grid of number tokens.
   *
   * @param {Phaser.Scene} scene
   * @param {number} panelY - Top of the panel area
   * @param {object} opts - Options
   * @param {number} opts.gridCenterX - X center of the 3×3 grid
   * @param {number} opts.gridCenterY - Y center of the 3×3 grid
   * @param {string} opts.numColor - CSS color for number text
   * @param {Function} opts.onDragEnd - (n, pointer) => called when drag ends on a slot
   * @param {Function} opts.onTap - (n) => called when token is tapped
   * @returns {{ tokens: Array, panel: Phaser.GameObjects.Graphics }}
   */
  static buildGrid(scene, opts) {
    const {
      gridCenterX, gridCenterY,
      numColor = '#aaccff',
      onDragEnd,
      onTap
    } = opts;

    const cellSize = 69;
    const gap = 6;
    const totalSize = cellSize * 3 + gap * 2;
    const startX = gridCenterX - totalSize / 2 + cellSize / 2;
    const startY = gridCenterY - totalSize / 2 + cellSize / 2;

    const tokens = [];

    for (let n = 1; n <= 9; n++) {
      const row = Math.floor((n - 1) / 3);
      const col = (n - 1) % 3;
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);

      const btn = scene.add.image(x, y, `token_${n}`).setScale(1.35);
      const numText = scene.add.text(x, y, n.toString(), {
        fontFamily: PIXEL_FONT, fontSize: '24px', color: numColor
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true, draggable: true });

      // Click: directly apply number if callback provided
      btn.on('pointerdown', () => {
        if (onTap) onTap(n);
      });

      let dragSprite = null;

      btn.on('dragstart', () => {
        btn.setScale(1.5);
        btn.setAlpha(0.7);
      });

      btn.on('drag', (pointer) => {
        if (!dragSprite) {
          dragSprite = scene.add.text(pointer.x, pointer.y, n.toString(), {
            fontFamily: PIXEL_FONT, fontSize: '30px', color: '#00ff88',
            backgroundColor: '#2a2a4a', padding: { x: 9, y: 5 }
          }).setOrigin(0.5);
        }
        dragSprite.setPosition(pointer.x, pointer.y);
      });

      btn.on('dragend', (pointer) => {
        btn.setScale(1.35);
        btn.setAlpha(1);
        if (dragSprite) {
          dragSprite.destroy();
          dragSprite = null;
        }
        if (onDragEnd) onDragEnd(n, pointer);
      });

      tokens.push({ btn, numText, n });
    }

    return { tokens };
  }

  /**
   * Draw a themed divider line across the screen.
   * @param {Phaser.Scene} scene
   * @param {number} y
   * @param {number} width
   * @param {number} color
   * @returns {Phaser.GameObjects.Graphics}
   */
  static drawDivider(scene, y, width, color = 0x333366) {
    const g = scene.add.graphics();
    g.fillStyle(color, 0.6);
    g.fillRect(0, y, width, 2);
    g.fillStyle(color, 0.2);
    g.fillRect(0, y + 2, width, 1);
    return g;
  }
}
