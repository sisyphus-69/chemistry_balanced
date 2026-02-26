import { PIXEL_FONT } from './PixelText.js';

/**
 * Professor Aurum — RPG dialogue box with portrait and typewriter text.
 * Used by GameScene and BossScene for hints.
 */
export class ProfessorAurum {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this._typeTimer = null;
    this._dismissTimer = null;
  }

  /**
   * Show the Professor with a dialogue message.
   * @param {string} text - The hint text
   * @param {number} tier - Hint tier (1, 2, or 3) — determines border color
   * @param {number} [y] - Y position override
   */
  show(text, tier, y) {
    this.hide();

    const { width } = this.scene.cameras.main;
    const boxW = Math.min(720, width - 40);
    const boxH = 70;
    const boxX = width / 2;
    const boxY = y || (this.scene.cameras.main.height * 0.48);

    // Border color by tier
    const tierColors = [0xffdd44, 0xff8844, 0xff4444];
    const borderColor = tierColors[Math.min(tier - 1, 2)] || tierColors[0];
    const tierHexColors = ['#ffdd44', '#ff8844', '#ff4444'];
    const textColor = tierHexColors[Math.min(tier - 1, 2)] || tierHexColors[0];

    this.container = this.scene.add.container(boxX, boxY);

    // Box background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0d0d1a, 0.95);
    bg.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
    // Border
    bg.lineStyle(2, borderColor, 0.8);
    bg.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
    // Top bevel
    bg.fillStyle(borderColor, 0.1);
    bg.fillRect(-boxW / 2 + 2, -boxH / 2 + 2, boxW - 4, 3);
    this.container.add(bg);

    // Portrait
    if (this.scene.textures.exists('prof_aurum')) {
      const portrait = this.scene.add.image(-boxW / 2 + 40, 0, 'prof_aurum')
        .setScale(0.85).setOrigin(0.5);
      this.container.add(portrait);

      // Portrait frame
      const frame = this.scene.add.graphics();
      frame.lineStyle(2, borderColor, 0.6);
      frame.strokeRect(-boxW / 2 + 12, -26, 56, 52);
      this.container.add(frame);
    }

    // Text area
    const textX = -boxW / 2 + 78;
    const textW = boxW - 100;

    this.dialogueText = this.scene.add.text(textX, -boxH / 2 + 12, '', {
      fontFamily: PIXEL_FONT,
      fontSize: '10px',
      color: textColor,
      wordWrap: { width: textW },
      lineSpacing: 4
    });
    this.container.add(this.dialogueText);

    // Name plate
    const namePlate = this.scene.add.text(-boxW / 2 + 78, -boxH / 2 - 8, 'Prof. Aurum', {
      fontFamily: PIXEL_FONT,
      fontSize: '8px',
      color: '#ddaa44',
      backgroundColor: '#1a1a2e',
      padding: { x: 4, y: 2 }
    }).setOrigin(0, 1);
    this.container.add(namePlate);

    // Typewriter effect
    let charIdx = 0;
    this._typeTimer = this.scene.time.addEvent({
      delay: 30,
      callback: () => {
        charIdx += 2;
        this.dialogueText.setText(text.substring(0, charIdx));
        if (charIdx >= text.length) {
          this._typeTimer.remove();
          this._typeTimer = null;
        }
      },
      loop: true
    });

    // Tap to dismiss
    const dismissZone = this.scene.add.zone(0, 0, boxW, boxH).setInteractive();
    this.container.add(dismissZone);
    dismissZone.on('pointerdown', () => this.hide());

    // Auto-dismiss after 6s
    this._dismissTimer = this.scene.time.delayedCall(6000, () => {
      if (this.container) {
        this.scene.tweens.add({
          targets: this.container, alpha: 0, duration: 400,
          onComplete: () => this.hide()
        });
      }
    });

    // Fade in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container, alpha: 1, duration: 200
    });
  }

  /**
   * Hide and destroy the dialogue.
   */
  hide() {
    if (this._typeTimer) {
      this._typeTimer.remove();
      this._typeTimer = null;
    }
    if (this._dismissTimer) {
      this._dismissTimer.remove();
      this._dismissTimer = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  /**
   * Check if dialogue is currently visible.
   */
  isVisible() {
    return this.container !== null;
  }
}
