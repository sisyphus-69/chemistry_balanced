import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BossScene } from './scenes/BossScene.js';
import { ResultScene } from './scenes/ResultScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: { width: 400, height: 300 },
    max: { width: 1600, height: 1200 }
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
    antialias: false
  }
};

const game = new Phaser.Game(config);

export default game;
