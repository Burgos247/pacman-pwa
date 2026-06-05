import { getTopScores, submitScore, type ScoreEntry } from './scoreClient';

export interface GameOverOptions {
  score: number;
  level: number;
  title: 'GAME OVER' | 'YOU WIN!';
  /** Fired when the player presses the restart button. */
  onRestart: () => void;
}

const STYLE_ID = 'pactoshi-overlay-style';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .pt-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.78);
      font-family: monospace;
      color: #ffffff;
      z-index: 1000;
      padding: 16px;
    }
    .pt-card {
      background: #0a0a0a;
      border: 2px solid #f7931a;
      border-radius: 8px;
      padding: 20px 24px;
      width: min(420px, 100%);
      max-height: 90vh;
      overflow-y: auto;
    }
    .pt-title { color: #f7931a; font-size: 22px; font-weight: bold; text-align: center; margin: 0 0 12px; }
    .pt-score { font-size: 14px; text-align: center; margin-bottom: 16px; opacity: 0.85; }
    .pt-score b { color: #fed049; font-size: 20px; }
    .pt-form { display: flex; gap: 8px; margin-bottom: 16px; }
    .pt-form input {
      flex: 1; background: #111; border: 1px solid #444; border-radius: 4px;
      color: #fff; padding: 8px 10px; font-family: monospace; font-size: 14px;
      text-transform: uppercase;
    }
    .pt-form input:focus { outline: none; border-color: #f7931a; }
    .pt-form button, .pt-restart button {
      background: #f7931a; color: #000; border: none; border-radius: 4px;
      padding: 8px 14px; font-family: monospace; font-weight: bold; cursor: pointer;
    }
    .pt-form button:disabled { background: #555; cursor: default; }
    .pt-section-title { color: #fed049; font-size: 12px; margin: 12px 0 6px; letter-spacing: 1px; }
    .pt-list { list-style: none; padding: 0; margin: 0 0 12px; font-size: 13px; }
    .pt-list li {
      display: grid; grid-template-columns: 28px 1fr auto; gap: 8px;
      padding: 3px 6px; border-bottom: 1px solid #222;
    }
    .pt-list li.you { background: rgba(247,147,26,0.15); }
    .pt-list .rank { color: #fed049; }
    .pt-list .score { color: #fff; }
    .pt-empty { opacity: 0.5; font-size: 12px; text-align: center; padding: 8px; }
    .pt-restart { text-align: center; font-size: 12px; opacity: 0.7; }
    .pt-restart button { margin-bottom: 6px; }
    .pt-hint { opacity: 0.6; font-size: 11px; text-align: center; margin-top: 8px; }
  `;
  document.head.appendChild(s);
}

function renderList(target: HTMLElement, scores: ScoreEntry[], highlightTs: number | null) {
  if (scores.length === 0) {
    target.innerHTML = `<div class="pt-empty">no scores yet — be the first</div>`;
    return;
  }
  target.innerHTML = scores
    .map((s, i) => {
      const cls = highlightTs && s.ts === highlightTs ? ' class="you"' : '';
      const safe = s.name.replace(/[<>&]/g, '');
      return `<li${cls}><span class="rank">${i + 1}</span><span>${safe}</span><span class="score">${s.score}</span></li>`;
    })
    .join('');
}

export function showGameOverOverlay(opts: GameOverOptions): void {
  ensureStyles();

  const overlay = document.createElement('div');
  overlay.className = 'pt-overlay';
  overlay.innerHTML = `
    <div class="pt-card">
      <h2 class="pt-title">${opts.title}</h2>
      <div class="pt-score">final score <br><b>${opts.score}</b></div>
      <form class="pt-form" autocomplete="off">
        <input name="name" maxlength="12" placeholder="your name" autocapitalize="characters" />
        <button type="submit">save</button>
      </form>
      <div class="pt-section-title">TOP 10</div>
      <ol class="pt-list" data-list></ol>
      <div class="pt-restart">
        <button type="button" data-restart>play again</button>
        <div class="pt-hint">SPACE / tap also restarts</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector<HTMLElement>('[data-list]')!;
  const form = overlay.querySelector<HTMLFormElement>('.pt-form')!;
  const input = form.querySelector<HTMLInputElement>('input[name="name"]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const restartBtn = overlay.querySelector<HTMLButtonElement>('[data-restart]')!;
  let highlightTs: number | null = null;

  const refresh = async () => {
    const top = await getTopScores(10);
    renderList(list, top, highlightTs);
  };
  refresh();

  // Focus only on desktop; mobile keyboard popping up on game over is annoying.
  if (!('ontouchstart' in window)) input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'saving…';
    const ts = Date.now();
    highlightTs = ts;
    await submitScore({ name, score: opts.score, level: opts.level });
    await refresh();
    submitBtn.textContent = 'saved';
    input.disabled = true;
  });

  const cleanup = () => {
    overlay.remove();
  };

  const restart = () => {
    cleanup();
    opts.onRestart();
  };

  restartBtn.addEventListener('click', restart);

  // Allow SPACE / tap outside the form to restart too.
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && document.activeElement !== input) {
      e.preventDefault();
      window.removeEventListener('keydown', onKey);
      restart();
    }
  };
  window.addEventListener('keydown', onKey);
}
