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
  { key: 'wallet', emoji: '👛', mult: 2 },
  { key: 'whitepaper', emoji: '📄', mult: 3 },
  { key: 'node', emoji: '🖥', mult: 4 },
  { key: 'keys', emoji: '🔐', mult: 5 },
  { key: 'satoshi', emoji: '⚡', mult: 6 },
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

export function registerBitcoinSprites(scene: Phaser.Scene) {
  registerPacman(scene);
  registerPellet(scene);
  registerPill(scene);
  BONUSES.forEach((b) => registerBonus(scene, b.key, b.emoji));
}

export const CURRENCY_FRAME_COUNT = CURRENCY_SYMBOLS.length;
