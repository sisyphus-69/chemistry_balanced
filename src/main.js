import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BossScene } from './scenes/BossScene.js';
import { ResultScene } from './scenes/ResultScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1200,
  height: 900,
  backgroundColor: '#0d0d1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, BossScene, ResultScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  input: {
    activePointers: 3
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  }
};

const game = new Phaser.Game(config);

export default game;
