const LS_KEY = 'pactoshi:scores';

export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  ts: number;
}

function readLocal(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLocal(scores: ScoreEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(scores));
  } catch {
    // ignore quota errors
  }
}

export async function getTopScores(limit = 10): Promise<ScoreEntry[]> {
  try {
    const r = await fetch(`/api/scores?limit=${limit}`);
    if (r.ok) {
      const body = (await r.json()) as { scores: ScoreEntry[]; kv: boolean };
      // If the server reports KV is configured, trust it (even when empty).
      if (body.kv) return body.scores;
    }
  } catch {
    // fall through to localStorage
  }
  return readLocal()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function submitScore(entry: Omit<ScoreEntry, 'ts'>): Promise<void> {
  const clean: ScoreEntry = {
    name: entry.name.trim().slice(0, 12).toUpperCase() || 'ANON',
    score: Math.max(0, Math.floor(entry.score)),
    level: Math.max(0, Math.floor(entry.level)),
    ts: Date.now(),
  };
  try {
    const r = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean),
    });
    if (r.ok) {
      const body = (await r.json()) as { ok?: boolean; kv?: boolean };
      if (body.ok) return;
    }
  } catch {
    // fall through
  }
  const local = readLocal();
  local.push(clean);
  local.sort((a, b) => b.score - a.score);
  writeLocal(local.slice(0, 100));
}
