import Phaser from 'phaser';
import type { PortalProps } from '../types/game';

export class Portal extends Phaser.GameObjects.Zone {
  declare body: Phaser.Physics.Arcade.Body;

  // Public so callers can compute teleport exits using the original Tiled
  // edge position rather than the inflated hitbox center.
  edgeX: number;
  edgeY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    public props: PortalProps,
  ) {
    // Inflate thin edge-portals so the overlap fires reliably at speed.
    const HIT = 16;
    const hitW = width <= 1 ? HIT : width;
    const hitH = height <= 1 ? HIT : height;
    super(scene, x + width / 2, y + height / 2, hitW, hitH);
    this.edgeX = x;
    this.edgeY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
  }
}
