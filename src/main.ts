import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'root',
  width: 448,
  height: 576,
  pixelArt: true,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, GameScene],
};

const game = new Phaser.Game(config);
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
