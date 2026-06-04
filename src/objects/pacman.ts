import Phaser from 'phaser';
import { TurningObject } from './TurningObject';
import { Dir } from '../utils/directions';
import type { PacmanMode, SFX } from '../types/game';

export class Pacman extends TurningObject {
  mode: PacmanMode = 'normal';
  sfx!: SFX;
  started = false;

  private startFrame = 0;
  private powerTimer?: Phaser.Time.TimerEvent;
  private afterStartFn?: () => void;
  private onPowerEnd?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, tileSize: number, speed: number) {
    super(scene, x, y, 'pacman', 0, tileSize, speed, 16);
    this.setAnimations();
    this.setSFX();
  }

  afterStart(callback: () => void) {
    this.afterStartFn = callback;
  }

  onControls(direction: Dir) {
    if (direction !== this.current && this.active) {
      this.checkDirection(direction);
    }

    if (!this.started && this.turning === direction) {
      this.disablePowerMode();
      this.move(direction);
      this.sfx.munch.play({ loop: true });
      this.started = true;
      this.afterStartFn?.();
    }
  }

  enablePowerMode(time: number, onStart: () => void, onEnd: () => void) {
    if (this.mode === 'power' && this.powerTimer) {
      time += this.powerTimer.getRemaining();
      this.powerTimer.remove();
    } else {
      this.mode = 'power';
    }

    onStart();
    this.onPowerEnd = onEnd;
    this.powerTimer = this.scene.time.delayedCall(time, () => {
      this.disablePowerMode();
      this.onPowerEnd?.();
    });
  }

  disablePowerMode() {
    this.mode = 'normal';
  }

  move(direction: Dir) {
    super.move(direction);
    this.play('munch', true);

    this.setFlipX(false);
    this.setAngle(0);

    if (direction === Dir.LEFT) {
      this.setFlipX(true);
    } else if (direction === Dir.UP) {
      this.setAngle(270);
    } else if (direction === Dir.DOWN) {
      this.setAngle(90);
    }
  }

  die() {
    this.stop();
    this.setFlipX(false);
    this.setAngle(0);
    this.sfx.munch.stop();
    // Disable the physics body so no overlap re-triggers during the die
    // animation (would cost extra lives and freeze ghost escape tweens).
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.play('die');
    this.sfx.death.play();
  }

  doRespawn() {
    super.doRespawn();
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    this.started = false;
    this.setFrame(this.startFrame);
  }

  private setAnimations() {
    const anims = this.scene.anims;
    if (!anims.exists('munch')) {
      anims.create({
        key: 'munch',
        frames: anims.generateFrameNumbers('pacman', { frames: [0, 1, 2, 1, 0] }),
        frameRate: 15,
        repeat: -1,
      });
    }
    if (!anims.exists('die')) {
      anims.create({
        key: 'die',
        frames: anims.generateFrameNumbers('pacman', { frames: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }),
        frameRate: 10,
        repeat: 0,
      });
    }
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'die', () => {
      this.setVisible(false);
      this.setFrame(this.startFrame);
      this.doRespawn();
    });
  }

  private setSFX() {
    this.sfx = {
      munch: this.scene.sound.add('munch', { volume: 0.5 }),
      death: this.scene.sound.add('death'),
    };
  }
}
