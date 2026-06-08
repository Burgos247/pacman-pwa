import Phaser from 'phaser';
import { Pacman } from '../objects/Pacman';
import { Ghost } from '../objects/Ghost';
import { Pill } from '../objects/Pill';
import { Portal } from '../objects/Portal';
import { Dir } from '../utils/directions';
import { difficulty, MAX_LEVEL, TILE_SIZE } from '../config/difficulty';
import { getObjectsByType, getRespawnPoint, getTargetPoint } from '../utils/tilemap';
import { BONUSES, CURRENCY_FRAME_COUNT } from '../utils/sprites';
import { showGameOverOverlay } from '../utils/gameOverOverlay';
import type { DifficultyLevel, GhostName, SFX } from '../types/game';

interface GameSceneData {
  level?: number;
  lifes?: number;
  score?: number;
}

const GHOST_NAMES: readonly GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'] as const;
const BONUS_THRESHOLDS = new Set([60, 120, 150]);
const BONUS_MULT: Record<string, number> = Object.fromEntries(BONUSES.map((b) => [b.key, b.mult]));
const POINTS: Record<string, number> = { pellet: 10, pill: 50 };

export class GameScene extends Phaser.Scene {
  map!: Phaser.Tilemaps.Tilemap;
  bgLayer!: Phaser.Tilemaps.TilemapLayer;
  wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  active = true;
  score = 0;
  multi = 1;
  lifes = 3;
  level = 1;
  difficlty!: DifficultyLevel;
  pellets!: Phaser.Physics.Arcade.Group;
  pills!: Phaser.Physics.Arcade.Group;
  bonuses!: Phaser.Physics.Arcade.Group;
  portals: Portal[] = [];
  ghosts: Ghost[] = [];
  pacman!: Pacman;
  ghostsHome = new Phaser.Math.Vector2();

  controls?: Phaser.Types.Input.Keyboard.CursorKeys;
  spaceKey?: Phaser.Input.Keyboard.Key;
  isTouch = false;
  swipeStart: { x: number; y: number; t: number } | null = null;
  private firstStart = true;
  private overlayShown = false;

  sfx!: SFX;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private notification!: Phaser.GameObjects.BitmapText;
  private lifesArea: Phaser.GameObjects.Sprite[] = [];
  private eatenPellets = 0;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData) {
    this.level = data.level ?? 1;
    this.lifes = data.lifes ?? 3;
    this.score = data.score ?? 0;
    this.difficlty = difficulty[Math.min(this.level - 1, difficulty.length - 1)];
    this.multi = this.difficlty.multiplier;
    this.active = true;
    this.isTouch = this.sys.game.device.input.touch;
    this.portals = [];
    this.ghosts = [];
    this.lifesArea = [];
    this.eatenPellets = 0;
    this.firstStart = true;
    this.overlayShown = false;
  }

  create() {
    this.setTiles();
    this.createPortals();
    this.createPellets();
    this.createPills();
    this.createGhosts();
    this.createPacman();

    this.setControls();
    this.initUI();
    this.initSfx();

    this.physics.add.collider(this.pacman, this.wallsLayer);
    this.ghosts.forEach((g) => this.physics.add.collider(g, this.wallsLayer));

    this.physics.add.overlap(this.pacman, this.portals, this.teleport, undefined, this);
    this.ghosts.forEach((g) =>
      this.physics.add.overlap(g, this.portals, this.teleport, undefined, this),
    );
    this.physics.add.overlap(this.pacman, this.pellets, this.collect, undefined, this);
    this.physics.add.overlap(this.pacman, this.bonuses, this.bonus, undefined, this);
    this.physics.add.overlap(this.pacman, this.pills, this.powerMode, undefined, this);
    this.ghosts.forEach((g) =>
      this.physics.add.overlap(this.pacman, g, () => this.meetGhost(g), undefined, this),
    );

    this.sfx.intro.play();
    this.startReadyCountdown();
  }

  private openScoreboard(title: 'GAME OVER' | 'YOU WIN!') {
    if (this.overlayShown) return;
    this.overlayShown = true;
    const finalScore = this.score;
    const finalLevel = title === 'YOU WIN!' ? MAX_LEVEL : Math.max(1, this.level);
    showGameOverOverlay({
      title,
      score: finalScore,
      level: finalLevel,
      onRestart: () => {
        this.scene.restart({ level: 1, lifes: 3, score: 0 });
      },
    });
  }

  private popText(x: number, y: number, text: string, tint = 0xffffff, size = 8) {
    const t = this.add.bitmapText(x, y, 'kong', text, size).setOrigin(0.5).setTint(tint).setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 18,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private startReadyCountdown() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 + 24;
    const ready = this.add.bitmapText(cx, cy, 'kong', 'READY!', 16).setOrigin(0.5).setTint(0xfed049);
    this.pacman.canStart = false;
    this.time.delayedCall(2000, () => {
      ready.destroy();
      this.pacman.canStart = true;
    });
  }

  update() {
    if (!this.active) {
      this.ghosts.forEach((g) => g.stop());
      this.pacman.stop();
      // While the end-of-game overlay is up, it owns the restart UX.
      if (this.overlayShown) return;
      const spaceDown = this.spaceKey?.isDown;
      const tap = this.input.activePointer.isDown;
      if (spaceDown || tap) {
        if (this.lifes <= 0) {
          this.scene.restart({ level: 1, lifes: 3, score: 0 });
        } else if (this.level <= MAX_LEVEL) {
          this.scene.restart({ level: this.level, lifes: this.lifes + 1, score: this.score });
        } else {
          this.scene.restart({ level: 1, lifes: 3, score: 0 });
        }
      }
      return;
    }

    const blinky = this.ghosts[0];
    const chaseCtx = {
      pacmanX: this.pacman.x,
      pacmanY: this.pacman.y,
      pacmanDir: this.pacman.current,
      blinkyX: blinky?.x ?? this.pacman.x,
      blinkyY: blinky?.y ?? this.pacman.y,
    };
    this.ghosts.forEach((g) => {
      g.updatePosition(this.wallsLayer);
      g.updateTarget(chaseCtx);
    });

    if (this.pacman.mode === 'power') {
      // We don't have an exact remaining check, but ghost "normalSoon" is handled inside power timer below.
    }

    this.pacman.updatePosition(this.wallsLayer);
    this.checkControls();
  }

  private checkControls() {
    if (this.isTouch) {
      this.swipeControls();
    } else {
      this.keyboardControls();
    }

    if (this.pacman.turning !== Dir.NONE) {
      this.pacman.turn();
    }
  }

  private keyboardControls() {
    const c = this.controls;
    if (!c) return;
    if (c.left.isDown) this.pacman.onControls(Dir.LEFT);
    else if (c.right.isDown) this.pacman.onControls(Dir.RIGHT);
    else if (c.up.isDown) this.pacman.onControls(Dir.UP);
    else if (c.down.isDown) this.pacman.onControls(Dir.DOWN);
    else this.pacman.turning = Dir.NONE;
  }

  private swipeControls() {
    // Swipe handled via pointer events. This pulse keeps turning consistent.
  }

  private createPortals() {
    const list = getObjectsByType(this.map, 'portal');
    list.forEach((p) => {
      const portalProps = this.readProps(p.properties, ['i', 'target']);
      const portal = new Portal(
        this,
        p.x ?? 0,
        p.y ?? 0,
        p.width ?? 1,
        p.height ?? 1,
        { i: Number(portalProps.i ?? 0), target: Number(portalProps.target ?? 0) },
      );
      this.portals.push(portal);
    });
  }

  private readProps(raw: unknown, keys: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!raw) return result;
    if (Array.isArray(raw)) {
      for (const entry of raw as Array<{ name?: string; value?: unknown }>) {
        if (entry.name && keys.includes(entry.name)) result[entry.name] = entry.value;
      }
    } else if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      for (const k of keys) if (k in obj) result[k] = obj[k];
    }
    return result;
  }

  private createPellets() {
    this.pellets = this.physics.add.group();
    this.bonuses = this.physics.add.group();

    // Tiled exports pellets as objects with gid=7 in the 'objects' layer.
    // We create our own sprites by walking through objects with gid=7.
    const layer = this.map.getObjectLayer('objects');
    if (!layer) return;
    layer.objects.forEach((o) => {
      if (o.gid === 7) {
        // Tiled uses bottom-left origin for gid objects.
        const x = (o.x ?? 0) + (o.width ?? TILE_SIZE) / 2;
        const y = (o.y ?? 0) - (o.height ?? TILE_SIZE) / 2;
        const frame = Phaser.Math.Between(0, CURRENCY_FRAME_COUNT - 1);
        const pellet = this.pellets.create(x, y, 'pellet', frame) as Phaser.Physics.Arcade.Sprite;
        pellet.setOrigin(0.5);
        pellet.setData('kind', 'pellet');
        (pellet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      }
    });
  }

  private createPills() {
    this.pills = this.physics.add.group();
    const list = getObjectsByType(this.map, 'pill');
    list.forEach((p) => {
      const pill = new Pill(this, p.x ?? 0, p.y ?? 0, TILE_SIZE);
      pill.setData('kind', 'pill');
      this.pills.add(pill);
    });
  }

  private createGhosts() {
    const home = getRespawnPoint(this.map, 'blinky');
    this.ghostsHome.set(home.x, home.y);
    GHOST_NAMES.forEach((name) => this.addGhost(name));
  }

  private addGhost(name: GhostName) {
    const respawn = getRespawnPoint(this.map, name);
    let target: { x: number; y: number };
    try {
      target = getTargetPoint(this.map, name);
    } catch {
      target = { x: 0, y: 0 };
    }
    const ghost = new Ghost(
      this,
      respawn.x,
      respawn.y,
      name,
      TILE_SIZE,
      this.difficlty.ghostSpeed,
      target,
      { x: this.ghostsHome.x, y: this.ghostsHome.y },
      this.difficlty.wavesDurations,
    );
    this.ghosts.push(ghost);
  }

  private createPacman() {
    const respawn = getRespawnPoint(this.map, 'pacman');
    this.pacman = new Pacman(this, respawn.x, respawn.y, TILE_SIZE, this.difficlty.pacmanSpeed);
    this.pacman.afterStart(() => this.afterPacmanRun());
  }

  private afterPacmanRun() {
    this.sfx.intro.stop();
    const [blinky, pinky, inky, clyde] = this.ghosts;
    if (this.firstStart) {
      blinky?.onStart();
      pinky?.escapeFromHome(800);
      inky?.escapeFromHome(1000);
      clyde?.escapeFromHome(1200);
      this.firstStart = false;
    } else {
      // After a death, all four ghosts wait inside the house for >= 1s
      // before emerging through the gate one by one.
      blinky?.escapeFromHome(1000);
      pinky?.escapeFromHome(1300);
      inky?.escapeFromHome(1600);
      clyde?.escapeFromHome(1900);
    }
  }

  private teleport: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (unit, portalObj) => {
    const movable = unit as unknown as Pacman | Ghost;
    if (this.time.now < movable.teleportCooldownUntil) return;
    const portal = portalObj as unknown as Portal;
    const dest = this.portals.find((p) => p.props.i === portal.props.target);
    if (!dest) return;
    movable.teleport(portal.edgeX, portal.edgeY, dest.edgeX, dest.edgeY);
  };

  private collect: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_pacman, item) => {
    const sprite = item as Phaser.Physics.Arcade.Sprite;
    const kind = (sprite.getData('kind') as string) || 'pellet';
    const points = POINTS[kind] ?? 0;
    if (points) {
      sprite.disableBody(true, true);
      this.updateScore(points);
      this.eatenPellets++;
    }

    if (this.pellets.countActive(true) === 0) {
      this.pacman.sfx.munch.stop();
      const nextLevel = this.level < MAX_LEVEL;
      const text = nextLevel ? `level ${this.level} completed` : 'game completed';
      this.level++;
      this.active = false;
      this.ghosts.forEach((g) => g.stop());
      if (!nextLevel) {
        this.sfx.win.play();
        this.openScoreboard('YOU WIN!');
      } else {
        const hint = this.isTouch ? 'tap to continue' : 'press space to continue';
        this.showNotification(`${text}\n${hint}`);
      }
    } else if (BONUS_THRESHOLDS.has(this.eatenPellets)) {
      const pick = BONUSES[Phaser.Math.Between(0, BONUSES.length - 1)];
      this.placeBonus(pick.key);
    }
  };

  private bonus: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_pacman, item) => {
    const sprite = item as Phaser.Physics.Arcade.Sprite;
    const key = sprite.texture.key;
    const amount = BONUS_MULT[key] ?? 1;
    this.popText(sprite.x, sprite.y, `x${amount}`, 0xfed049, 12);
    sprite.destroy();
    this.sfx.fruit.play();
    this.multi *= amount;
    this.time.delayedCall(3000, () => {
      this.multi = this.difficlty.multiplier;
    });
  };

  private powerMode: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_pacman, pill) => {
    const sprite = pill as Phaser.Physics.Arcade.Sprite;
    this.popText(sprite.x, sprite.y, `+${POINTS.pill * this.multi}`, 0xf7c948, 10);
    sprite.disableBody(true, true);
    this.updateScore(POINTS.pill);

    this.pacman.enablePowerMode(
      this.difficlty.powerModeTime,
      () => this.onPowerStart(),
      () => this.onPowerEnd(),
    );
  };

  private onPowerStart() {
    this.sfx.intermission.play();
    this.ghosts.forEach((g) => g.enableFrightenedMode());
    const remaining = this.difficlty.powerModeTime;
    this.time.delayedCall(remaining * 0.7, () => {
      this.ghosts.forEach((g) => g.normalSoon());
    });
  }

  private onPowerEnd() {
    this.sfx.intermission.stop();
    this.sfx.regenerate.play();
    this.ghosts.forEach((g) => g.disableFrightenedMode());
  }

  private meetGhost(ghost: Ghost) {
    // Bail out if the scene is no longer running its game loop — otherwise
    // the overlap keeps firing while pacman sits on the ghost during game
    // over, driving `lifes` negative and tripping the else-branch repeatedly.
    if (!this.active) return;
    if (!this.pacman.active || !ghost.active) return;
    if (ghost.mode === 'frightened' && this.pacman.mode === 'power') {
      this.popText(ghost.x, ghost.y, `+${200 * this.multi}`, 0x00ffff, 12);
      ghost.die();
      this.updateScore(200);
    } else if (ghost.mode === 'dead') {
      return;
    } else {
      this.ghosts.forEach((g) => g.stop());
      this.updateLifes(-1);
      if (this.lifes <= 0) {
        this.pacman.sfx.munch.stop();
        this.sfx.over.play();
        this.active = false;
        this.openScoreboard('GAME OVER');
      } else {
        this.pacman.die();
        this.ghosts.forEach((g) => g.doRespawn());
        // Blinky's normal respawn point is at the gate (outside the house);
        // tuck him in alongside pinky so he re-emerges with a delay too.
        const blinky = this.ghosts[0];
        const pinky = this.ghosts[1];
        if (blinky && pinky) {
          blinky.setPosition(pinky.x, pinky.y);
          (blinky.body as Phaser.Physics.Arcade.Body).reset(pinky.x, pinky.y);
        }
        // After the die animation finishes pacman is back at his respawn;
        // show READY! again to mirror the original Pacman pacing.
        this.time.delayedCall(1300, () => {
          if (this.active) this.startReadyCountdown();
        });
      }
    }
  }

  private setTiles() {
    this.map = this.make.tilemap({ key: 'level' });
    const tileset = this.map.addTilesetImage('walls', 'walls');
    if (!tileset) throw new Error('walls tileset failed to load');

    const bg = this.map.createLayer('background', tileset, 0, 0);
    const walls = this.map.createLayer('walls', tileset, 0, 0);
    if (!bg || !walls) throw new Error('failed to create tilemap layers');
    this.bgLayer = bg;
    this.wallsLayer = walls;
    this.wallsLayer.setCollisionBetween(1, 33);
  }

  private getRandomPelletPosition(): { x: number; y: number } {
    const active = this.pellets.getChildren().filter((c) => c.active);
    if (!active.length) return { x: 0, y: 0 };
    const pick = active[Phaser.Math.Between(0, active.length - 1)] as Phaser.Physics.Arcade.Sprite;
    return { x: pick.x, y: pick.y };
  }

  private placeBonus(name: string) {
    const pos = this.getRandomPelletPosition();
    const sprite = this.bonuses.create(pos.x, pos.y, name) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    // Fruits stay ~10s then vanish — fade out as a hint to the player.
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      delay: 8000,
      duration: 2000,
      onComplete: () => sprite.destroy(),
    });
  }

  private initUI() {
    const cx = this.scale.width / 2;
    const text = this.score === 0 ? '00' : `${this.score}`;
    this.scoreText = this.add.bitmapText(cx, 16, 'kong', text, 16).setOrigin(0.5);
    this.notification = this.add
      .bitmapText(cx, this.scale.height / 2 + 48, 'kong', '', 16)
      .setOrigin(0.5)
      .setAlpha(0);
    this.updateLifes(0);
  }

  private updateScore(points: number) {
    this.score += points * this.multi;
    this.scoreText.setText(`${this.score}`);
  }

  private updateLifes(amount: number) {
    this.lifes += amount;
    if (this.lifesArea.length && this.lifesArea.length > this.lifes) {
      const life = this.lifesArea.pop();
      if (life) {
        this.tweens.add({
          targets: life,
          alpha: 0,
          duration: 300,
          onComplete: () => life.destroy(),
        });
      }
    } else {
      this.lifesArea.forEach((s) => s.destroy());
      this.lifesArea = [];
      const size = TILE_SIZE;
      for (let i = 0; i < this.lifes; i++) {
        const sprite = this.add.sprite(
          this.scale.width - 12 - i * (size + 4),
          16,
          'pacman',
          1,
        );
        sprite.setOrigin(1, 0.5);
        sprite.setDepth(100);
        this.lifesArea.push(sprite);
      }
    }
  }

  private showNotification(text: string) {
    this.notification.setText(text.toUpperCase());
    this.tweens.add({ targets: this.notification, alpha: 1, duration: 300 });
  }

  private initSfx() {
    this.sfx = {
      intro: this.sound.add('intro'),
      over: this.sound.add('over'),
      win: this.sound.add('win'),
      fruit: this.sound.add('fruit'),
      intermission: this.sound.add('intermission'),
      regenerate: this.sound.add('regenerate'),
    };
  }

  private setControls() {
    if (this.isTouch) {
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.swipeStart = { x: p.x, y: p.y, t: p.event.timeStamp };
      });
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (!this.swipeStart) return;
        const dx = p.x - this.swipeStart.x;
        const dy = p.y - this.swipeStart.y;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx < 16 && ady < 16) return;
        if (adx > ady) {
          this.pacman.onControls(dx > 0 ? Dir.RIGHT : Dir.LEFT);
        } else {
          this.pacman.onControls(dy > 0 ? Dir.DOWN : Dir.UP);
        }
        this.swipeStart = null;
      });
    } else {
      const kb = this.input.keyboard;
      if (kb) {
        this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.controls = kb.createCursorKeys();
      }
    }
  }
}
