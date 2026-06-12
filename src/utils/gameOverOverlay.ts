import {
  hasNostr,
  queryTopScores,
  signAndPublishScore,
  type NostrScoreEntry,
} from './nostrClient';

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
      width: min(440px, 100%);
      max-height: 90vh;
      overflow-y: auto;
    }
    .pt-title { color: #f7931a; font-size: 22px; font-weight: bold; text-align: center; margin: 0 0 12px; }
    .pt-score { font-size: 14px; text-align: center; margin-bottom: 16px; opacity: 0.85; }
    .pt-score b { color: #fed049; font-size: 22px; display: block; margin-top: 4px; }
    .pt-form { display: flex; gap: 8px; margin-bottom: 8px; }
    .pt-form input {
      flex: 1; background: #111; border: 1px solid #444; border-radius: 4px;
      color: #fff; padding: 8px 10px; font-family: monospace; font-size: 14px;
      text-transform: uppercase;
    }
    .pt-form input:focus { outline: none; border-color: #f7931a; }
    .pt-form button, .pt-restart button {
      background: #f7931a; color: #000; border: none; border-radius: 4px;
      padding: 8px 14px; font-family: monospace; font-weight: bold; cursor: pointer;
      white-space: nowrap;
    }
    .pt-form button:disabled { background: #555; cursor: default; }
    .pt-status { font-size: 12px; min-height: 16px; margin-bottom: 12px; opacity: 0.8; }
    .pt-status.err { color: #ff6b6b; }
    .pt-status.ok { color: #6bff8e; }
    .pt-section-title { color: #fed049; font-size: 12px; margin: 12px 0 6px; letter-spacing: 1px; }
    .pt-section-title .pt-optional { color: #ffffff; opacity: 0.55; letter-spacing: 0; text-transform: lowercase; font-weight: normal; }
    .pt-skip { font-size: 11px; opacity: 0.55; margin: 6px 0 4px; text-align: center; }
    .pt-skip b { color: #fed049; opacity: 1; }
    .pt-list { list-style: none; padding: 0; margin: 0 0 12px; font-size: 13px; }
    .pt-list li {
      display: grid; grid-template-columns: 28px 1fr auto; gap: 8px;
      padding: 4px 6px; border-bottom: 1px solid #222;
      align-items: baseline;
    }
    .pt-list li.you { background: rgba(247,147,26,0.15); }
    .pt-list .rank { color: #fed049; }
    .pt-list .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pt-list .npub { display: block; font-size: 10px; opacity: 0.5; }
    .pt-list .score { color: #fff; font-weight: bold; }
    .pt-empty { opacity: 0.5; font-size: 12px; text-align: center; padding: 8px; }
    .pt-restart { text-align: center; font-size: 12px; opacity: 0.7; }
    .pt-restart button { margin-bottom: 6px; }
    .pt-hint { opacity: 0.6; font-size: 11px; text-align: center; margin-top: 8px; }
    .pt-nostr-hint { opacity: 0.6; font-size: 11px; margin-bottom: 8px; }
    .pt-nostr-hint a { color: #f7931a; }
  `;
  document.head.appendChild(s);
}

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] || c);
}

function renderList(target: HTMLElement, scores: NostrScoreEntry[], highlightPubkey: string | null) {
  if (scores.length === 0) {
    target.innerHTML = `<div class="pt-empty">no scores yet — be the first</div>`;
    return;
  }
  target.innerHTML = scores
    .map((s, i) => {
      const cls = highlightPubkey && s.pubkey === highlightPubkey ? ' class="you"' : '';
      return `<li${cls}>
        <span class="rank">${i + 1}</span>
        <span class="name">${escape(s.alias)}<span class="npub">${escape(s.npubShort)}</span></span>
        <span class="score">${s.score}</span>
      </li>`;
    })
    .join('');
}

export function showGameOverOverlay(opts: GameOverOptions): void {
  ensureStyles();

  const nostrAvailable = hasNostr();
  const nostrHint = nostrAvailable
    ? ''
    : `<div class="pt-nostr-hint">No Nostr extension detected. Install <a href="https://getalby.com/" target="_blank" rel="noopener">Alby</a> or <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener">nos2x</a> to publish your score to the global leaderboard.</div>`;

  const overlay = document.createElement('div');
  overlay.className = 'pt-overlay';
  overlay.innerHTML = `
    <div class="pt-card">
      <h2 class="pt-title">${opts.title}</h2>
      <div class="pt-score">final score<b>${opts.score}</b></div>
      <div class="pt-section-title">PUBLISH YOUR SCORE <span class="pt-optional">(optional)</span></div>
      ${nostrHint}
      <form class="pt-form" autocomplete="off">
        <input name="alias" maxlength="12" placeholder="alias (visible name)" autocapitalize="characters" />
        <button type="submit" ${nostrAvailable ? '' : 'disabled'}>sign &amp; publish</button>
      </form>
      <div class="pt-status" data-status></div>
      <div class="pt-skip">…or skip — just hit <b>play again</b> below.</div>
      <div class="pt-section-title">TOP 10 (Nostr · #pactoshi)</div>
      <ol class="pt-list" data-list></ol>
      <div class="pt-restart">
        <button type="button" data-restart>play again</button>
        <div class="pt-hint">SPACE / tap also restarts</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector<HTMLElement>('[data-list]')!;
  const status = overlay.querySelector<HTMLElement>('[data-status]')!;
  const form = overlay.querySelector<HTMLFormElement>('.pt-form')!;
  const input = form.querySelector<HTMLInputElement>('input[name="alias"]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const restartBtn = overlay.querySelector<HTMLButtonElement>('[data-restart]')!;
  let highlightPubkey: string | null = null;

  const setStatus = (text: string, cls: '' | 'ok' | 'err' = '') => {
    status.textContent = text;
    status.className = `pt-status${cls ? ' ' + cls : ''}`;
  };

  const refresh = async () => {
    setStatus('Loading leaderboard from relays…');
    try {
      const top = await queryTopScores(10);
      renderList(list, top, highlightPubkey);
      setStatus('');
    } catch (err) {
      setStatus('Could not reach Nostr relays.', 'err');
      console.warn(err);
    }
  };
  refresh();

  if (!('ontouchstart' in window)) input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!nostrAvailable) return;
    const alias = input.value.trim() || 'ANON';
    submitBtn.disabled = true;
    setStatus('Waiting for your Nostr extension to sign…');
    try {
      const entry = await signAndPublishScore({ score: opts.score, level: opts.level, alias });
      highlightPubkey = entry.pubkey;
      setStatus('Published. Refreshing leaderboard…', 'ok');
      submitBtn.textContent = 'published';
      input.disabled = true;
      await refresh();
      setStatus('Your score is on Nostr 🚀', 'ok');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Sign failed: ${msg}`, 'err');
      submitBtn.disabled = false;
    }
  });

  const cleanup = () => overlay.remove();

  const restart = () => {
    window.removeEventListener('keydown', onKey);
    cleanup();
    opts.onRestart();
  };

  restartBtn.addEventListener('click', restart);

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && document.activeElement !== input) {
      e.preventDefault();
      restart();
    }
  };
  window.addEventListener('keydown', onKey);
}
