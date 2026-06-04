import Phaser from 'phaser';
import { TILE_SIZE } from '../config/difficulty';
import { registerBitcoinSprites } from '../utils/sprites';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const { width, height } = this.scale;

    const logo = this.add.image(width / 2, height / 2 - 40, 'logo');
    logo.setScale((width * 0.8) / Math.max(logo.width, 1));

    const barBg = this.add.rectangle(width / 2, height / 2 + 80, 240, 18, 0x222222);
    barBg.setStrokeStyle(2, 0xffff00);
    const bar = this.add.rectangle(width / 2 - 118, height / 2 + 80, 4, 12, 0xffff00).setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      bar.width = 236 * p;
    });

    this.load.tilemapTiledJSON('level', '/assets/levels/classic.json');
    this.load.image('walls', '/assets/sprites/tiles.png');
    this.load.image('pill', '/assets/sprites/power-pill.png');
    this.load.image('pellet', '/assets/sprites/dot.png');

    const sheet = { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE };
    this.load.spritesheet('blinky', '/assets/sprites/blinky.png', sheet);
    this.load.spritesheet('inky', '/assets/sprites/inky.png', sheet);
    this.load.spritesheet('pinky', '/assets/sprites/pinky.png', sheet);
    this.load.spritesheet('clyde', '/assets/sprites/clyde.png', sheet);
    this.load.spritesheet('pacman', '/assets/sprites/pacman.png', sheet);

    this.load.bitmapFont('kong', '/assets/font/kongtext.png', '/assets/font/kongtext.xml');

    this.load.audio('intro', ['/assets/sfx/intro.mp3', '/assets/sfx/intro.ogg']);
    this.load.audio('over', ['/assets/sfx/over.mp3', '/assets/sfx/over.ogg']);
    this.load.audio('win', ['/assets/sfx/win.mp3', '/assets/sfx/win.ogg']);
    this.load.audio('munch', ['/assets/sfx/munch.mp3', '/assets/sfx/munch.ogg']);
    this.load.audio('fruit', ['/assets/sfx/fruit.mp3', '/assets/sfx/fruit.ogg']);
    this.load.audio('intermission', ['/assets/sfx/intermission.mp3', '/assets/sfx/intermission.ogg']);
    this.load.audio('regenerate', ['/assets/sfx/regenerate.mp3', '/assets/sfx/regenerate.ogg']);
    this.load.audio('ghost', ['/assets/sfx/ghost.mp3', '/assets/sfx/ghost.ogg']);
    this.load.audio('death', ['/assets/sfx/death.mp3', '/assets/sfx/death.ogg']);
  }

  create() {
    // Override pacman/pellet/pill with Bitcoin-themed canvas sprites.
    registerBitcoinSprites(this);
    this.scene.start('Game');
  }
}
