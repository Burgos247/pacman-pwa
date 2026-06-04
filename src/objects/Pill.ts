import Phaser from 'phaser';

export class Pill extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, tileSize: number) {
    // Tiled stores pills as point objects whose (x, y) already sits at the
    // tile center, so render the sprite directly there without offsetting.
    super(scene, x, y, 'pill');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(tileSize, tileSize);
    body.setImmovable(true);
    this.setOrigin(0.5);
  }
}
