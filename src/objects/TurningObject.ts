import Phaser from 'phaser';
import { Dir, OPPOSITE } from '../utils/directions';

export abstract class TurningObject extends Phaser.Physics.Arcade.Sprite {
  turning: Dir = Dir.NONE;
  current: Dir = Dir.NONE;
  marker = new Phaser.Math.Vector2();

  // Tile neighbors keyed by Dir.LEFT/RIGHT/UP/DOWN. `null` => out of bounds.
  // A wall is a tile with `index !== -1` (legacy convention).
  directions: Record<Dir, Phaser.Tilemaps.Tile | null> = {
    [Dir.NONE]: null,
    [Dir.LEFT]: null,
    [Dir.RIGHT]: null,
    [Dir.UP]: null,
    [Dir.DOWN]: null,
  };

  protected currentSpeed: number;
  protected respawnPoint = new Phaser.Math.Vector2();
  protected turnPoint = new Phaser.Math.Vector2();
  // Block further teleports for a short window so widened portal hitboxes
  // can't re-trigger immediately on the exit side.
  teleportCooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    key: string,
    frame: number,
    public tileSize: number,
    public speed: number,
    protected threshold = 4,
  ) {
    super(scene, x, y, key, frame);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.respawnPoint.set(x, y);
    this.currentSpeed = speed;

    this.setOrigin(0.5);

    // Body fits inside a tile so it doesn't graze adjacent rows/cols.
    // move() locks the off-axis position to the tile center to keep this
    // invariant while moving.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(tileSize / 2, tileSize / 2, true);
  }

  updatePosition(wallsLayer: Phaser.Tilemaps.TilemapLayer) {
    this.setMarker();
    this.updateSensor(wallsLayer);
  }

  setMarker() {
    this.marker.x = Math.floor(Phaser.Math.Snap.Floor(Math.floor(this.x), this.tileSize) / this.tileSize);
    this.marker.y = Math.floor(Phaser.Math.Snap.Floor(Math.floor(this.y), this.tileSize) / this.tileSize);
  }

  updateSensor(wallsLayer: Phaser.Tilemaps.TilemapLayer) {
    const mx = this.marker.x;
    const my = this.marker.y;
    this.directions[Dir.LEFT] = wallsLayer.getTileAt(mx - 1, my, true);
    this.directions[Dir.RIGHT] = wallsLayer.getTileAt(mx + 1, my, true);
    this.directions[Dir.UP] = wallsLayer.getTileAt(mx, my - 1, true);
    this.directions[Dir.DOWN] = wallsLayer.getTileAt(mx, my + 1, true);
  }

  checkDirection(turnTo: Dir) {
    const tile = this.directions[turnTo];
    if (this.turning === turnTo || tile === null || tile.index !== -1) {
      return;
    }

    if (this.current === OPPOSITE[turnTo]) {
      this.move(turnTo);
    } else {
      this.turning = turnTo;
      this.turnPoint.x = this.marker.x * this.tileSize + this.tileSize / 2;
      this.turnPoint.y = this.marker.y * this.tileSize + this.tileSize / 2;
    }
  }

  move(direction: Dir) {
    let speed = this.currentSpeed;
    if (direction === Dir.LEFT || direction === Dir.UP) speed = -speed;

    // Compute the perpendicular-axis snap from the current sprite position,
    // not from `this.marker` (which may be stale or unset on first call).
    if (direction === Dir.LEFT || direction === Dir.RIGHT) {
      const tileY = Math.floor(this.y / this.tileSize);
      const cy = tileY * this.tileSize + this.tileSize / 2;
      this.y = cy;
      (this.body as Phaser.Physics.Arcade.Body).reset(this.x, cy);
      this.setVelocity(speed, 0);
    } else if (direction === Dir.UP || direction === Dir.DOWN) {
      const tileX = Math.floor(this.x / this.tileSize);
      const cx = tileX * this.tileSize + this.tileSize / 2;
      this.x = cx;
      (this.body as Phaser.Physics.Arcade.Body).reset(cx, this.y);
      this.setVelocity(0, speed);
    }

    this.current = direction;
  }

  turn(): boolean {
    const cx = Math.floor(this.x);
    const cy = Math.floor(this.y);

    if (
      !Phaser.Math.Fuzzy.Equal(cx, this.turnPoint.x, this.threshold) ||
      !Phaser.Math.Fuzzy.Equal(cy, this.turnPoint.y, this.threshold)
    ) {
      return false;
    }

    this.x = this.turnPoint.x;
    this.y = this.turnPoint.y;
    (this.body as Phaser.Physics.Arcade.Body).reset(this.turnPoint.x, this.turnPoint.y);

    this.move(this.turning);
    this.turning = Dir.NONE;
    return true;
  }

  stop(): this {
    this.setVelocity(0, 0);
    this.current = Dir.NONE;
    this.turning = Dir.NONE;
    return this;
  }

  kill() {
    this.setActive(false);
    this.setVisible(false);
    this.stop();
  }

  doRespawn() {
    this.stop();
    this.setPosition(this.respawnPoint.x, this.respawnPoint.y);
    (this.body as Phaser.Physics.Arcade.Body).reset(this.respawnPoint.x, this.respawnPoint.y);
    this.setActive(true);
    this.setVisible(true);
  }

  updateSpeed(value: number) {
    this.currentSpeed = value;
  }

  restoreSpeed() {
    this.currentSpeed = this.speed;
  }

  teleport(portalX: number, portalY: number, targetX: number, targetY: number) {
    let x: number;
    let y: number;

    // Exit one full tile past the target portal edge so the inflated hitbox
    // doesn't re-trigger the overlap on the next frame.
    if (portalX === targetX || portalX > targetX) {
      x = targetX + this.tileSize + this.tileSize / 2;
    } else {
      x = targetX - this.tileSize - this.tileSize / 2;
    }

    if (portalY === targetY || portalY > targetY) {
      y = targetY + this.tileSize / 2;
    } else {
      y = targetY - this.tileSize / 2;
    }

    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.teleportCooldownUntil = this.scene.time.now + 200;
    this.move(this.current);
  }
}
