import Phaser from 'phaser';
import { PIXEL_FONT } from './PixelText.js';
import { EquationEngine } from '../systems/EquationEngine.js';
import elementsData from '../data/elements.json';

/**
 * BattleUI — Shared UI helpers for GameScene and BossScene.
 *
 * Provides:
 *   buildSteppers  — inline ▲/▼ arrows on each coefficient slot
 *   buildAtomTally — animated element-balance bars
 *   buildNumberStrip — compact 1-row 1–9 picker
 *   drawDivider    — themed horizontal rule
 */
export class BattleUI {

  // ─────────────────────────────────────────────
  // 1. INLINE COEFFICIENT STEPPERS (▲ / ▼)
  // ─────────────────────────────────────────────
  /**
   * Attach ▲/▼ stepper arrows to each coefficient slot.
   *
   * @param {Phaser.Scene} scene
   * @param {Array} slots - Array of { bg, text, cursor, side, index }
   * @param {CoefficientManager} coeffManager
   * @param {object} opts
   * @param {number}   opts.arrowTint      - tint for arrows (default 0xffffff)
   * @param {Function} opts.onChanged      - () => called after any change
   * @param {Function} opts.soundCoeffChange - () => play sound
   * @param {Phaser.GameObjects.Container} [opts.container] - optional container to add into
   * @returns {Array} stepperObjects for cleanup
   */
  static buildSteppers(scene, slots, coeffManager, opts = {}) {
    const {
      arrowTint = 0xffffff,
      onChanged,
      soundCoeffChange,
      container
    } = opts;

    const steppers = [];

    slots.forEach((slot) => {
      const sx = slot.bg.x;
      const sy = slot.bg.y;

      // ▲ arrow above the slot
      const up = scene.add.image(sx, sy - 24, 'arrow_up').setScale(1.0);
      up.setTint(arrowTint);
      up.setInteractive({ useHandCursor: true });
      up.on('pointerdown', () => {
        const cur = slot.side === 'reactant'
          ? coeffManager.getReactantCoeff(slot.index)
          : coeffManager.getProductCoeff(slot.index);
        const next = Math.min(9, cur + 1);
        if (slot.side === 'reactant') coeffManager.setReactantCoeff(slot.index, next);
        else coeffManager.setProductCoeff(slot.index, next);
        if (soundCoeffChange) soundCoeffChange();
      });
      up.on('pointerover', () => up.setScale(1.15));
      up.on('pointerout', () => up.setScale(1.0));

      // ▼ arrow below the slot
      const down = scene.add.image(sx, sy + 24, 'arrow_down').setScale(1.0);
      down.setTint(arrowTint);
      down.setInteractive({ useHandCursor: true });
      down.on('pointerdown', () => {
        const cur = slot.side === 'reactant'
          ? coeffManager.getReactantCoeff(slot.index)
          : coeffManager.getProductCoeff(slot.index);
        const next = Math.max(1, cur - 1);
        if (slot.side === 'reactant') coeffManager.setReactantCoeff(slot.index, next);
        else coeffManager.setProductCoeff(slot.index, next);
        if (soundCoeffChange) soundCoeffChange();
      });
      down.on('pointerover', () => down.setScale(1.15));
      down.on('pointerout', () => down.setScale(1.0));

      if (container) {
        container.add(up);
        container.add(down);
      }

      steppers.push({ up, down, slot });
    });

    return steppers;
  }

  // ─────────────────────────────────────────────
  // 2. ATOM TALLY BARS
  // ─────────────────────────────────────────────
  /**
   * Build animated element-balance tally bars.
   *
   * @param {Phaser.Scene} scene
   * @param {object} equation - equation data (reactants, products, etc.)
   * @param {object} opts
   * @param {number} opts.x        - left edge X
   * @param {number} opts.y        - top Y for the tally section
   * @param {number} opts.width    - available width
   * @param {string} opts.labelColor   - CSS color for section label
   * @param {number} opts.unbalancedBar - hex color for unbalanced bars
   * @param {number} opts.balancedBar   - hex color for balanced bars
   * @param {string} opts.dimTextColor  - CSS color for dim numbers
   * @param {number} opts.bgTint        - hex color for alternating row bg
   * @param {Phaser.GameObjects.Container} [opts.container]
   * @returns {{ rows: Array, update: Function, destroy: Function }}
   */
  static buildAtomTally(scene, equation, opts = {}) {
    const {
      x = 16,
      y = 200,
      width = 400,
      labelColor = '#334488',
      unbalancedBar = 0xff5533,
      balancedBar = 0x00ff88,
      dimTextColor = '#777799',
      bgTint = 0x070718,
      container
    } = opts;

    const allElements = EquationEngine.getElements(equation);
    const rowH = 22;

    // Layout zones within the width:
    // [sym 40px] [leftBar zone] [leftNum 24] : [rightNum 24] [rightBar zone] [status 20]
    const symW = 40;
    const numW = 24;
    const statusW = 20;
    const gapCenter = 10; // half-gap around the ":"
    const centerX = x + width / 2;
    const barMaxW = Math.max(30, Math.floor((width / 2) - symW - numW - gapCenter - 8));

    const rows = [];

    allElements.forEach((el, i) => {
      const ry = y + i * rowH;
      const cy = ry + rowH / 2;

      const elData = elementsData[el] || {};
      const hexColor = elData.color || '#aabbff';
      const numericColor = Phaser.Display.Color.HexStringToColor(hexColor).color;

      // Alternating row background
      if (i % 2 === 0) {
        const rbg = scene.add.graphics();
        rbg.fillStyle(bgTint, 0.5);
        rbg.fillRect(x, ry, width, rowH - 1);
        if (container) container.add(rbg);
      }

      // Element color dot + symbol
      const dotG = scene.add.graphics();
      dotG.fillStyle(numericColor, 0.9);
      dotG.fillCircle(x + 8, cy, 3);
      if (container) container.add(dotG);

      const sym = scene.add.text(x + 16, cy, el, {
        fontFamily: PIXEL_FONT, fontSize: '9px', color: hexColor
      }).setOrigin(0, 0.5);
      if (container) container.add(sym);

      // Left count (reactant) — right-aligned just before center
      const leftNum = scene.add.text(centerX - gapCenter, cy, '0', {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: dimTextColor
      }).setOrigin(1, 0.5);
      if (container) container.add(leftNum);

      // Center divider
      const divider = scene.add.text(centerX, cy, ':', {
        fontFamily: PIXEL_FONT, fontSize: '8px', color: '#333355'
      }).setOrigin(0.5, 0.5);
      if (container) container.add(divider);

      // Right count (product) — left-aligned just after center
      const rightNum = scene.add.text(centerX + gapCenter, cy, '0', {
        fontFamily: PIXEL_FONT, fontSize: '10px', color: dimTextColor
      }).setOrigin(0, 0.5);
      if (container) container.add(rightNum);

      // Status mark
      const status = scene.add.text(x + width - 8, cy, '—', {
        fontFamily: PIXEL_FONT, fontSize: '9px', color: '#333355'
      }).setOrigin(1, 0.5);
      if (container) container.add(status);

      // Bar graphics (drawn dynamically)
      const barG = scene.add.graphics();
      if (container) container.add(barG);

      rows.push({ element: el, leftNum, rightNum, status, barG, ry, numericColor });
    });

    // ── update function ──
    const prevBalanced = new Set();
    const update = (reactantCoeffs, productCoeffs, soundElementBalanced) => {
      const result = EquationEngine.validate(equation, reactantCoeffs, productCoeffs);

      let maxCount = 1;
      for (const el of allElements) {
        const ei = result.elements[el] || { left: 0, right: 0 };
        maxCount = Math.max(maxCount, ei.left, ei.right);
      }

      rows.forEach(({ element, leftNum, rightNum, status, barG, ry }) => {
        const ei = result.elements[element] || { left: 0, right: 0, balanced: false };
        leftNum.setText(ei.left.toString());
        rightNum.setText(ei.right.toString());

        barG.clear();
        const barY = ry + 5;
        const barH = rowH - 10;
        const barCol = ei.balanced ? balancedBar : unbalancedBar;

        // Left bar — grows leftward from the number column
        const leftW = maxCount > 0 ? Math.round((ei.left / maxCount) * barMaxW) : 0;
        const leftBarEnd = centerX - gapCenter - numW;
        const leftBarX = leftBarEnd - leftW;
        if (leftW > 0) {
          barG.fillStyle(barCol, 0.45);
          barG.fillRect(leftBarX, barY, leftW, barH);
          barG.fillStyle(barCol, 0.15);
          barG.fillRect(leftBarX, barY, leftW, 1);
        }

        // Right bar — grows rightward from the number column
        const rightW = maxCount > 0 ? Math.round((ei.right / maxCount) * barMaxW) : 0;
        const rightBarStart = centerX + gapCenter + numW;
        if (rightW > 0) {
          barG.fillStyle(barCol, 0.45);
          barG.fillRect(rightBarStart, barY, rightW, barH);
          barG.fillStyle(barCol, 0.15);
          barG.fillRect(rightBarStart, barY, rightW, 1);
        }

        if (ei.balanced) {
          leftNum.setColor('#00ff88');
          rightNum.setColor('#00ff88');
          status.setText('✓').setColor('#00ff88');
          if (!prevBalanced.has(element)) {
            prevBalanced.add(element);
            if (soundElementBalanced) soundElementBalanced();
            scene.tweens.add({
              targets: [leftNum, rightNum, status],
              alpha: 0, duration: 80, yoyo: true, repeat: 3
            });
          }
        } else {
          prevBalanced.delete(element);
          leftNum.setColor(dimTextColor);
          rightNum.setColor(dimTextColor);
          status.setText('✗').setColor(ei.left > ei.right ? '#ff8844' : '#ff5533');
        }
      });
    };

    const destroy = () => {
      rows.forEach(r => {
        r.barG.destroy();
        r.leftNum.destroy();
        r.rightNum.destroy();
        r.status.destroy();
      });
    };

    return { rows, update, destroy, height: allElements.length * rowH };
  }

  // ─────────────────────────────────────────────
  // 3. COMPACT NUMBER STRIP (1-row, 1–9)
  // ─────────────────────────────────────────────
  /**
   * Build a slim horizontal 1–9 number strip.
   *
   * @param {Phaser.Scene} scene
   * @param {object} opts
   * @param {number} opts.centerX
   * @param {number} opts.centerY
   * @param {string} opts.numColor  - CSS color for numbers
   * @param {number} opts.bgColor   - hex fill for cell background
   * @param {Function} opts.onTap   - (n) => called when number tapped
   * @param {Phaser.GameObjects.Container} [opts.container]
   * @returns {{ tokens: Array }}
   */
  static buildNumberStrip(scene, opts = {}) {
    const {
      centerX,
      centerY,
      numColor = '#aaccff',
      bgColor = 0x22224a,
      onTap,
      container
    } = opts;

    const cellW = 32;
    const gap = 3;
    const totalW = cellW * 9 + gap * 8;
    const startX = centerX - totalW / 2 + cellW / 2;

    const tokens = [];

    for (let n = 1; n <= 9; n++) {
      const tx = startX + (n - 1) * (cellW + gap);

      // Cell background
      const cellBg = scene.add.graphics();
      cellBg.fillStyle(bgColor, 0.85);
      cellBg.fillRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
      cellBg.lineStyle(1, 0x4444aa, 0.4);
      cellBg.strokeRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
      if (container) container.add(cellBg);

      // Number text
      const numText = scene.add.text(tx, centerY, n.toString(), {
        fontFamily: PIXEL_FONT, fontSize: '14px', color: numColor
      }).setOrigin(0.5);
      if (container) container.add(numText);

      // Interactive zone
      const zone = scene.add.zone(tx, centerY, cellW, cellW).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => {
        numText.setColor('#ffffff');
        cellBg.clear();
        cellBg.fillStyle(0x3344aa, 0.9);
        cellBg.fillRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
        cellBg.lineStyle(1, 0x6677cc, 0.6);
        cellBg.strokeRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
      });
      zone.on('pointerout', () => {
        numText.setColor(numColor);
        cellBg.clear();
        cellBg.fillStyle(bgColor, 0.85);
        cellBg.fillRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
        cellBg.lineStyle(1, 0x4444aa, 0.4);
        cellBg.strokeRoundedRect(tx - cellW / 2, centerY - cellW / 2, cellW, cellW, 4);
      });
      zone.on('pointerdown', () => {
        if (onTap) onTap(n);
        scene.tweens.add({
          targets: numText,
          scaleX: 1.3, scaleY: 1.3, duration: 60, yoyo: true
        });
      });
      if (container) container.add(zone);

      tokens.push({ cellBg, numText, zone, n });
    }

    return { tokens };
  }

  // ─────────────────────────────────────────────
  // 4. DIVIDER
  // ─────────────────────────────────────────────
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
