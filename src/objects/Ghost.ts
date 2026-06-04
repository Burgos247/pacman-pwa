import Phaser from 'phaser';
import { TurningObject } from './TurningObject';
import { DELTA, Dir, OPPOSITE } from '../utils/directions';
import type { GhostMode, GhostName, SFX, Wave } from '../types/game';

export interface ChaseContext {
  pacmanX: number;
  pacmanY: number;
  pacmanDir: Dir;
  blinkyX: number;
  blinkyY: number;
}

export class Ghost extends TurningObject {
  mode: GhostMode = 'scatter';
  sfx!: SFX;
  inGame = false;
  ghostName: GhostName;

  private target = new Phaser.Math.Vector2();
  private scatterTarget = new Phaser.Math.Vector2();
  private prevMarker = new Phaser.Math.Vector2(-1, -1);
  private homeMarker = new Phaser.Math.Vector2();
  private recoverMode: GhostMode = 'scatter';
  private waveCount = 0;
  private waveTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: GhostName,
    tileSize: number,
    speed: number,
    target: { x: number; y: number },
    public home: { x: number; y: number },
    public wavesDurations: Wave[],
  ) {
    super(scene, x, y, name, 2, tileSize, speed, 8);
    this.ghostName = name;
    this.scatterTarget.set(target.x, target.y);
    this.homeMarker.set(Math.floor(home.x / tileSize), Math.floor(home.y / tileSize));
    this.setAnimations();
    this.setSFX();
  }

  updatePosition(wallsLayer: Phaser.Tilemaps.TilemapLayer) {
    if (!this.inGame && this.mode !== 'dead') return;

    super.updatePosition(wallsLayer);

    if (!this.marker.equals(this.prevMarker)) {
      const possibilities = this.getPossibleDirections();
      if (possibilities.length > 1) {
        const choice = this.chooseDirection(possibilities);
        this.checkDirection(choice);
      } else if (possibilities.length === 1) {
        this.move(possibilities[0]);
      }
      this.prevMarker.copy(this.marker);
    }

    if (this.mode === 'dead' && this.marker.equals(this.homeMarker)) {
      this.disableDeadMode();
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x === 0 && body.velocity.y === 0 && this.current !== Dir.NONE) {
      this.move(this.current);
    }

    if (this.turning !== Dir.NONE) {
      this.turn();
    }
  }

  doRespawn() {
    // Cancel any in-flight escape tween so a half-faded ghost doesn't get
    // left at alpha < 1 (which makes it look stuck/invisible).
    this.scene.tweens.killTweensOf(this);
    this.setAlpha(1);
    super.doRespawn();
    this.mode = 'scatter';
    this.restoreSpeed();
    this.inGame = false;
    this.waveCount = 0;
    this.prevMarker.set(-1, -1);
    this.waveTimer?.remove();
    this.play(this.walkKey());
    this.anims.stop();
  }

  die() {
    this.sfx.death.play();
    this.enableDeadMode();
  }

  enableFrightenedMode() {
    if (!this.inGame) return;
    if (this.mode !== 'frightened') this.recoverMode = this.mode;
    this.mode = 'frightened';
    this.play('bored');
    this.updateSpeed(this.speed * 0.5);
    this.waveTimer?.paused && (this.waveTimer.paused = true);
    if (this.waveTimer) this.waveTimer.paused = true;
    this.onModeSwitch();
  }

  disableFrightenedMode() {
    if (!this.inGame) return;
    this.mode = this.recoverMode;
    this.play(this.walkKey());
    this.restoreSpeed();
    if (this.waveTimer) this.waveTimer.paused = false;
    this.onModeSwitch();
  }

  normalSoon() {
    if (this.mode === 'frightened') this.play('prenormal');
  }

  updateTarget(ctx: ChaseContext) {
    if (!this.inGame) return;
    // Frightened picks random directions; scatter has a fixed corner; dead
    // heads home. Only chase mode benefits from per-ghost personality.
    if (this.mode !== 'chase') return;

    switch (this.ghostName) {
      case 'blinky': {
        this.target.set(ctx.pacmanX, ctx.pacmanY);
        break;
      }
      case 'pinky': {
        const d = DELTA[ctx.pacmanDir];
        this.target.set(
          ctx.pacmanX + d.x * 4 * this.tileSize,
          ctx.pacmanY + d.y * 4 * this.tileSize,
        );
        break;
      }
      case 'inky': {
        const d = DELTA[ctx.pacmanDir];
        const ax = ctx.pacmanX + d.x * 2 * this.tileSize;
        const ay = ctx.pacmanY + d.y * 2 * this.tileSize;
        this.target.set(2 * ax - ctx.blinkyX, 2 * ay - ctx.blinkyY);
        break;
      }
      case 'clyde': {
        const dx = ctx.pacmanX - this.x;
        const dy = ctx.pacmanY - this.y;
        const farEnough = dx * dx + dy * dy > (8 * this.tileSize) ** 2;
        if (farEnough) {
          this.target.set(ctx.pacmanX, ctx.pacmanY);
        } else {
          this.target.set(this.scatterTarget.x, this.scatterTarget.y);
        }
        break;
      }
    }
  }

  onStart() {
    this.inGame = true;
    this.waveCount = 0;
    this.enableScatterMode();
    this.move(Dir.LEFT);
  }

  escapeFromHome(delay: number) {
    this.scene.time.delayedCall(delay, () => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 200,
        yoyo: true,
        onYoyo: () => {
          this.setPosition(this.home.x, this.home.y);
          (this.body as Phaser.Physics.Arcade.Body).reset(this.home.x, this.home.y);
        },
        onComplete: () => {
          this.onStart();
          this.sfx.regenerate.play();
        },
      });
    });
  }

  private getPossibleDirections(): Dir[] {
    const result: Dir[] = [];
    const back = OPPOSITE[this.current];
    ([Dir.LEFT, Dir.RIGHT, Dir.UP, Dir.DOWN] as const).forEach((d) => {
      const tile = this.directions[d];
      if (tile && tile.index === -1 && d !== back) result.push(d);
    });
    return result;
  }

  private chooseDirection(possibilities: Dir[]): Dir {
    const sorted = [...possibilities].sort((a, b) => {
      const aDist = this.dirDistance(a);
      const bDist = this.dirDistance(b);
      return aDist - bDist;
    });

    if (this.mode === 'frightened') {
      return sorted[Phaser.Math.Between(0, sorted.length - 1)];
    }
    return sorted[0];
  }

  private dirDistance(d: Dir): number {
    const tile = this.directions[d];
    if (!tile) return Number.MAX_VALUE;
    const dx = tile.pixelX - this.target.x;
    const dy = tile.pixelY - this.target.y;
    return dx * dx + dy * dy;
  }

  private setAnimations() {
    const anims = this.scene.anims;
    const walkKey = this.walkKey();
    if (!anims.exists(walkKey)) {
      anims.create({
        key: walkKey,
        frames: anims.generateFrameNumbers(this.ghostName, { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!anims.exists('bored')) {
      anims.create({
        key: 'bored',
        frames: anims.generateFrameNumbers(this.ghostName, { frames: [8, 9] }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!anims.exists('prenormal')) {
      anims.create({
        key: 'prenormal',
        frames: anims.generateFrameNumbers(this.ghostName, { frames: [8, 9, 10, 11] }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!anims.exists('dead-' + this.ghostName)) {
      anims.create({
        key: 'dead-' + this.ghostName,
        frames: anims.generateFrameNumbers(this.ghostName, { frames: [12, 13, 14, 15] }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  private walkKey(): string {
    return 'walk-' + this.ghostName;
  }

  private setSFX() {
    this.sfx = {
      death: this.scene.sound.add('ghost'),
      regenerate: this.scene.sound.add('regenerate'),
    };
  }

  private getWaveDuration(): number {
    const wave = this.wavesDurations[this.waveCount];
    if (!wave) return 0;
    if (this.mode === 'scatter') return wave.scatter ?? 0;
    if (this.mode === 'chase') return wave.chase ?? 0;
    return 0;
  }

  private enableScatterMode() {
    if (!this.inGame) return;
    this.target.set(this.scatterTarget.x, this.scatterTarget.y);
    this.mode = 'scatter';
    this.play(this.walkKey());

    const duration = this.getWaveDuration();
    if (duration > 0) {
      this.waveTimer = this.scene.time.delayedCall(duration, () => {
        this.enableChaseMode();
        this.onModeSwitch();
      });
    }
  }

  private enableChaseMode() {
    if (!this.inGame) return;
    this.mode = 'chase';
    this.play(this.walkKey());

    const duration = this.getWaveDuration();
    if (duration > 0) {
      this.waveCount++;
      this.waveTimer = this.scene.time.delayedCall(duration, () => {
        this.enableScatterMode();
        this.onModeSwitch();
      });
    }
  }

  private enableDeadMode() {
    if (this.mode !== 'frightened') return;
    this.mode = 'dead';
    this.inGame = false;
    this.play('dead-' + this.ghostName);
    this.updateSpeed(this.speed * 1.5);
    this.target.set(this.homeMarker.x * this.tileSize, this.homeMarker.y * this.tileSize);
    this.onModeSwitch();
  }

  private disableDeadMode() {
    this.mode = this.recoverMode;
    this.play(this.walkKey());
    this.sfx.regenerate.play();
    this.inGame = true;
    this.restoreSpeed();
    if (this.waveTimer) this.waveTimer.paused = false;
    this.move(Dir.LEFT);
  }

  private onModeSwitch() {
    this.checkDirection(OPPOSITE[this.current]);
  }
}
