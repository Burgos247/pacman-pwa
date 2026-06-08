/**
 * Generates Bitcoin-themed sprites at runtime using Canvas2D and registers
 * them as Phaser textures. Avoids shipping new asset files.
 */
import Phaser from 'phaser';

const TILE = 16;
const PAC_FRAMES = 14;
const CURRENCY_SYMBOLS = ['€', '$', '£', '¥', '₽'] as const;
const BITCOIN_ORANGE = '#f7931a';
const PELLET_GOLD = '#f7c948';

/**
 * Draw an orange Bitcoin pacman with a wedge cut at `mouthAngle` (in radians).
 * `scale` shrinks the body radius (used by death-animation frames).
 */
function drawPacmanFrame(ctx: CanvasRenderingContext2D, mouthAngle: number, scale = 1) {
  ctx.clearRect(0, 0, TILE, TILE);
  if (scale <= 0) return;

  const cx = TILE / 2;
  const cy = TILE / 2;
  const radius = (TILE / 2 - 1) * scale;

  ctx.fillStyle = BITCOIN_ORANGE;
  ctx.beginPath();
  if (mouthAngle <= 0.001) {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, mouthAngle / 2, Math.PI * 2 - mouthAngle / 2);
    ctx.closePath();
  }
  ctx.fill();

  // ₿ glyph on the upper half, scales with body radius.
  if (scale > 0.5) {
    const fontPx = Math.max(6, Math.floor(10 * scale));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₿', cx, cy - 1);
  }
}

function drawCurrency(ctx: CanvasRenderingContext2D, symbol: string) {
  ctx.clearRect(0, 0, TILE, TILE);
  ctx.fillStyle = '#ffffff';
  ctx.font = `10px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, TILE / 2, TILE / 2 + 1);
}

function drawLightningBolt(ctx: CanvasRenderingContext2D) {
  // Gold coin background
  ctx.fillStyle = PELLET_GOLD;
  ctx.beginPath();
  ctx.arc(TILE / 2, TILE / 2, TILE / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  // Lightning bolt path (white, classic LN zigzag)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(4, 9);
  ctx.lineTo(7, 9);
  ctx.lineTo(6, 14);
  ctx.lineTo(12, 7);
  ctx.lineTo(9, 7);
  ctx.lineTo(11, 2);
  ctx.closePath();
  ctx.fill();
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas2D unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Register the 'pacman' spritesheet:
 *   frames 0..2 — munch closed/half/open (loop animation)
 *   frames 3..13 — death animation (orange wedge shrinking)
 * Indices match the legacy spritesheet so existing animations keep working.
 */
function registerPacman(scene: Phaser.Scene) {
  const sheet = makeCanvas(TILE * PAC_FRAMES, TILE);
  const munchAngles = [0, Math.PI / 4, Math.PI / 1.6];
  const dieScales = Array.from({ length: PAC_FRAMES - 3 }, (_, i) => 1 - (i + 1) / (PAC_FRAMES - 3));

  for (let i = 0; i < PAC_FRAMES; i++) {
    sheet.ctx.save();
    sheet.ctx.translate(i * TILE, 0);
    if (i < 3) {
      drawPacmanFrame(sheet.ctx, munchAngles[i]);
    } else {
      drawPacmanFrame(sheet.ctx, Math.PI / 1.6, dieScales[i - 3]);
    }
    sheet.ctx.restore();
  }

  scene.textures.remove('pacman');
  scene.textures.addSpriteSheet('pacman', sheet.canvas as unknown as HTMLImageElement, {
    frameWidth: TILE,
    frameHeight: TILE,
  });
}

/**
 * Register the 'pellet' spritesheet, one frame per fiat currency, plus the
 * 'pill' texture as a larger gold ₿ for power pellets.
 */
function registerPellet(scene: Phaser.Scene) {
  const sheet = makeCanvas(TILE * CURRENCY_SYMBOLS.length, TILE);
  CURRENCY_SYMBOLS.forEach((symbol, i) => {
    sheet.ctx.save();
    sheet.ctx.translate(i * TILE, 0);
    drawCurrency(sheet.ctx, symbol);
    sheet.ctx.restore();
  });
  scene.textures.remove('pellet');
  scene.textures.addSpriteSheet('pellet', sheet.canvas as unknown as HTMLImageElement, {
    frameWidth: TILE,
    frameHeight: TILE,
  });
}

function registerPill(scene: Phaser.Scene) {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  drawLightningBolt(ctx);
  scene.textures.remove('pill');
  scene.textures.addImage('pill', canvas as unknown as HTMLImageElement);
}

/**
 * Bitcoin-themed bonus fruits. Each is a 16x16 emoji on transparent bg.
 * Keys must stay in sync with BONUS_MULT in GameScene.
 */
export const BONUSES = [
  { key: 'pizza', emoji: '🍕', mult: 2 },
  { key: 'whitepaper', emoji: '📄', mult: 3 },
  { key: 'node', emoji: '🖥', mult: 4 },
  { key: 'keys', emoji: '🔐', mult: 5 },
  { key: 'satoshi', emoji: '⚡', mult: 6 },
  { key: 'orange', emoji: '🍊', mult: 7 },
  { key: 'mining', emoji: '⛏', mult: 8 },
  { key: 'privkey', emoji: '🔑', mult: 10 },
] as const;

function registerBonus(scene: Phaser.Scene, key: string, emoji: string) {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  ctx.font = '13px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, TILE / 2, TILE / 2 + 1);
  scene.textures.remove(key);
  scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
}

/**
 * Central bank palettes for each ghost (FED, ECB, BoJ, BoE).
 */
const BANK_THEMES = {
  blinky: { body: '#2d5e3e', accent: '#fed049', flag: '#ffffff' }, // FED (greenback)
  pinky: { body: '#003399', accent: '#ffcc00', flag: '#ffcc00' },  // ECB (EU blue)
  inky: { body: '#bc002d', accent: '#ffffff', flag: '#ffffff' },   // BoJ (Japan red)
  clyde: { body: '#7b1e2d', accent: '#f7c948', flag: '#ffffff' },  // BoE (BoE red)
} as const;

type BankKey = keyof typeof BANK_THEMES;
type BankTheme = (typeof BANK_THEMES)[BankKey];

function drawBankFacade(ctx: CanvasRenderingContext2D, theme: BankTheme, phase: 0 | 1) {
  ctx.clearRect(0, 0, TILE, TILE);

  // Triangular pediment (the classical roof) sits on top.
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(1, 5);
  ctx.lineTo(15, 5);
  ctx.closePath();
  ctx.fill();

  // Tiny flag-coloured stripe along the entablature for character.
  ctx.fillStyle = theme.flag;
  ctx.fillRect(2, 5, 12, 1);

  // Building body (between pediment and floor) — the column zone.
  ctx.fillStyle = theme.body;
  ctx.fillRect(2, 6, 12, 7);

  // Four pillars; phase shifts highlights to suggest motion.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const x = 3 + i * 3;
    ctx.fillRect(x, 7, 1, 6);
  }
  // Phase highlight: a single bright pillar slides across.
  ctx.fillStyle = theme.accent;
  const hl = phase === 0 ? 3 + 0 * 3 : 3 + 2 * 3;
  ctx.fillRect(hl, 7, 1, 6);

  // Floor slab.
  ctx.fillStyle = theme.accent;
  ctx.fillRect(1, 13, 14, 1);

  // Two-step base; widen the bottom step on alternate phases for a subtle
  // walk feel.
  ctx.fillStyle = theme.body;
  if (phase === 0) {
    ctx.fillRect(1, 14, 14, 1);
    ctx.fillRect(0, 15, 16, 1);
  } else {
    ctx.fillRect(0, 14, 16, 1);
    ctx.fillRect(1, 15, 14, 1);
  }
}

function drawFrightenedBank(ctx: CanvasRenderingContext2D, blink: boolean) {
  ctx.clearRect(0, 0, TILE, TILE);
  // Panicked banker — blue/white background, big "?" centered.
  const bg = blink ? '#ffffff' : '#1832a8';
  const fg = blink ? '#1832a8' : '#ffffff';
  ctx.fillStyle = bg;
  // Building silhouette but in panic colors.
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(1, 5);
  ctx.lineTo(15, 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(2, 5, 12, 9);
  ctx.fillRect(1, 14, 14, 2);
  ctx.fillStyle = fg;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 8, 10);
}

function drawDeadEyes(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.clearRect(0, 0, TILE, TILE);
  // Defeated bankers reduced to floating eyes returning to base.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 6, 3, 4);
  ctx.fillRect(9, 6, 3, 4);
  ctx.fillStyle = '#1832a8';
  const dirs = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const [dx, dy] = dirs[frame % dirs.length];
  ctx.fillRect(5 + dx, 7 + dy, 1, 2);
  ctx.fillRect(10 + dx, 7 + dy, 1, 2);
}

function registerBankGhost(scene: Phaser.Scene, key: BankKey) {
  // Match the 14-frame layout the Ghost animations expect:
  // 0..7 walk, 8..9 bored, 10..11 prenormal, 12..15 dead-<name>.
  const FRAMES = 16;
  const sheet = makeCanvas(TILE * FRAMES, TILE);
  const theme = BANK_THEMES[key];

  for (let i = 0; i < FRAMES; i++) {
    sheet.ctx.save();
    sheet.ctx.translate(i * TILE, 0);
    if (i < 8) {
      drawBankFacade(sheet.ctx, theme, (i % 2) as 0 | 1);
    } else if (i < 10) {
      drawFrightenedBank(sheet.ctx, false);
    } else if (i < 12) {
      drawFrightenedBank(sheet.ctx, true);
    } else {
      drawDeadEyes(sheet.ctx, i - 12);
    }
    sheet.ctx.restore();
  }

  scene.textures.remove(key);
  scene.textures.addSpriteSheet(key, sheet.canvas as unknown as HTMLImageElement, {
    frameWidth: TILE,
    frameHeight: TILE,
  });
}

export function registerBitcoinSprites(scene: Phaser.Scene) {
  registerPacman(scene);
  registerPellet(scene);
  registerPill(scene);
  BONUSES.forEach((b) => registerBonus(scene, b.key, b.emoji));
  (['blinky', 'pinky', 'inky', 'clyde'] as const).forEach((g) => registerBankGhost(scene, g));
}

export const CURRENCY_FRAME_COUNT = CURRENCY_SYMBOLS.length;
