import { PIXEL_FONT } from './PixelText.js';

/**
 * RPG-style HP bar for displaying element atom counts.
 * Shows element symbol, a fill bar, and left:right counts.
 */
export class HPBar {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x - Left edge of the bar
   * @param {number} y - Center Y of the bar
   * @param {number} barWidth - Width of the fill area
   * @param {string} element - Element symbol (e.g. 'H')
   * @param {number} orbColor - Hex color for the element orb
   */
  constructor(scene, x, y, barWidth, element, orbColor) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.barWidth = barWidth;
    this.element = element;

    // Element orb (small)
    const texKey = `orb_${element}`;
    if (scene.textures.exists(texKey)) {
      this.orb = scene.add.image(x, y, texKey).setScale(0.82).setOrigin(0.5);
    }

    // Element symbol
    this.symText = scene.add.text(x + 27, y, element, {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: orbColor || '#ffffff'
    }).setOrigin(0, 0.5);

    // Bar background
    const barX = x + 60;
    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x111122, 1);
    this.barBg.fillRect(barX, y - 9, barWidth, 18);
    this.barBg.lineStyle(1, 0x333355, 0.5);
    this.barBg.strokeRect(barX, y - 9, barWidth, 18);
    this.barStartX = barX;

    // Bar fill
    this.barFill = scene.add.graphics();

    // Count text: "L : R"
    this.countText = scene.add.text(barX + barWidth + 12, y, '0 : 0', {
      fontFamily: PIXEL_FONT, fontSize: '15px', color: '#ffffff'
    }).setOrigin(0, 0.5);

    // Status icon
    this.statusText = scene.add.text(barX + barWidth + 98, y, '', {
      fontFamily: PIXEL_FONT, fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);

    // Flash bar for balance-achieved effect
    this.flashBar = scene.add.rectangle(
      barX + barWidth / 2, y, barWidth, 18, 0x00ff88, 0
    );
  }

  /**
   * Update the bar with new left/right counts.
   * @param {number} left - Atom count on reactant side
   * @param {number} right - Atom count on product side
   * @param {boolean} balanced - Whether this element is balanced
   */
  update(left, right, balanced) {
    const max = Math.max(left, right, 1);
    const leftPct = left / max;
    const rightPct = right / max;
    const fillPct = Math.min(leftPct, rightPct);

    this.barFill.clear();

    if (balanced) {
      // Green fill
      this.barFill.fillStyle(0x00cc66, 1);
      this.barFill.fillRect(this.barStartX + 1, this.y - 8, (this.barWidth - 2) * fillPct, 16);
      this.barFill.fillStyle(0x00ff88, 0.3);
      this.barFill.fillRect(this.barStartX + 1, this.y - 8, (this.barWidth - 2) * fillPct, 5);

      this.countText.setText(`${left} : ${right}`).setColor('#00ff88');
      this.statusText.setText('\u2713').setColor('#00ff88');
      this.symText.setColor('#00ff88');
    } else {
      // Red/orange fill
      const color = leftPct > rightPct ? 0xff6644 : 0xff8844;
      this.barFill.fillStyle(color, 1);
      this.barFill.fillRect(this.barStartX + 1, this.y - 8, (this.barWidth - 2) * fillPct, 16);
      this.barFill.fillStyle(0xffffff, 0.15);
      this.barFill.fillRect(this.barStartX + 1, this.y - 8, (this.barWidth - 2) * fillPct, 5);

      this.countText.setText(`${left} : ${right}`).setColor('#ff6644');
      this.statusText.setText('\u2717').setColor('#ff6644');
      this.symText.setColor('#ff6644');
    }
  }

  /**
   * Flash green when element becomes balanced.
   */
  flash() {
    this.flashBar.setAlpha(0.2);
    this.scene.tweens.add({
      targets: this.flashBar,
      alpha: 0,
      duration: 500
    });
  }

  /**
   * Shake the count texts on fail.
   */
  shake() {
    this.scene.tweens.add({
      targets: [this.countText, this.statusText],
      scaleX: 1.3, scaleY: 1.3,
      duration: 80, yoyo: true, repeat: 2
    });
  }

  /**
   * Add all elements to a container.
   */
  addToContainer(container) {
    if (this.orb) container.add(this.orb);
    container.add(this.symText);
    container.add(this.barBg);
    container.add(this.barFill);
    container.add(this.countText);
    container.add(this.statusText);
    container.add(this.flashBar);
  }
}
