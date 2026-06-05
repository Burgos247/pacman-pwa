import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

const KEY = 'pactoshi:scores';
const MAX_NAME = 12;
const MAX_SCORE = 10_000_000;

interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  ts: number;
}

function kvAvailable(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!kvAvailable()) {
    if (req.method === 'GET') return res.status(200).json({ scores: [], kv: false });
    if (req.method === 'POST') return res.status(200).json({ ok: false, kv: false });
    return res.status(405).end();
  }

  try {
    if (req.method === 'GET') {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
      const raw = (await kv.zrange(KEY, 0, limit - 1, { rev: true })) as string[];
      const scores: ScoreEntry[] = raw
        .map((entry) => {
          try {
            return JSON.parse(entry) as ScoreEntry;
          } catch {
            return null;
          }
        })
        .filter((s): s is ScoreEntry => s !== null);
      return res.status(200).json({ scores, kv: true });
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as Partial<ScoreEntry>;
      const name = (body.name ?? '').toString().trim().slice(0, MAX_NAME).toUpperCase();
      const score = Math.floor(Number(body.score));
      const level = Math.floor(Number(body.level ?? 0));
      if (!name || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ error: 'invalid payload' });
      }
      const member = JSON.stringify({ name, score, level, ts: Date.now() } satisfies ScoreEntry);
      await kv.zadd(KEY, { score, member });
      // Trim to top 100 to keep the set bounded.
      const size = (await kv.zcard(KEY)) ?? 0;
      if (size > 100) {
        await kv.zremrangebyrank(KEY, 0, size - 101);
      }
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    return res.status(500).json({ error: 'kv error', detail: String(err) });
  }

  return res.status(405).end();
}
