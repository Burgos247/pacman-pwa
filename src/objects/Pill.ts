import Phaser from 'phaser';

export class Pill extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, tileSize: number) {
    const offset = tileSize / 2;
    super(scene, x - offset, y - offset, 'pill');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(tileSize, tileSize);
    body.setImmovable(true);
    this.setOrigin(0.5);
  }
}
