import Phaser from 'phaser';
import type { PortalProps } from '../types/game';

export class Portal extends Phaser.GameObjects.Zone {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    public props: PortalProps,
  ) {
    super(scene, x + width / 2, y + height / 2, Math.max(width, 1), Math.max(height, 1));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }
}
