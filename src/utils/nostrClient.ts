import { SimplePool, type Event, type Filter, type UnsignedEvent } from 'nostr-tools';
import { nip19 } from 'nostr-tools';

/**
 * Pac-Toshi scoreboard via Nostr.
 *
 * - Each score is a kind:1 note tagged ["t", "pactoshi"] (queryable hashtag)
 *   plus ["score", "1234"], ["level", "3"], ["alias", "TESTOSHI"].
 * - Signed via NIP-07 (window.nostr) so the user's existing identity owns
 *   the entry. No private key ever touches the client code.
 * - Leaderboard query: pull all pactoshi-tagged notes from the relays,
 *   take each pubkey's best score, return the top N.
 * - Fallback: if no NIP-07 extension is available, the overlay can degrade
 *   to localStorage via scoreClient (kept for the offline case).
 */

const TAG = 'pactoshi';
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.wine',
  'wss://relay.snort.social',
];

export interface NostrScoreEntry {
  pubkey: string;
  npubShort: string;
  alias: string;
  score: number;
  level: number;
  ts: number;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: UnsignedEvent): Promise<Event>;
      nip04?: unknown;
    };
  }
}

const pool = new SimplePool();

export function hasNostr(): boolean {
  return typeof window !== 'undefined' && Boolean(window.nostr);
}

function shortNpub(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return npub.slice(0, 12) + '…' + npub.slice(-4);
  } catch {
    return pubkey.slice(0, 8) + '…' + pubkey.slice(-4);
  }
}

function parseEvent(ev: Event): NostrScoreEntry | null {
  const tagMap = new Map<string, string>();
  for (const t of ev.tags) {
    if (t.length >= 2 && typeof t[0] === 'string' && typeof t[1] === 'string') {
      // Take first value per tag name.
      if (!tagMap.has(t[0])) tagMap.set(t[0], t[1]);
    }
  }
  const score = Number(tagMap.get('score'));
  if (!Number.isFinite(score) || score < 0) return null;
  const level = Number(tagMap.get('level') ?? 0) || 0;
  const alias = (tagMap.get('alias') ?? '').slice(0, 12).toUpperCase() || 'ANON';
  return {
    pubkey: ev.pubkey,
    npubShort: shortNpub(ev.pubkey),
    alias,
    score: Math.floor(score),
    level: Math.floor(level),
    ts: ev.created_at * 1000,
  };
}

export async function signAndPublishScore(input: {
  score: number;
  level: number;
  alias: string;
}): Promise<NostrScoreEntry> {
  if (!hasNostr()) {
    throw new Error('No Nostr extension detected (NIP-07).');
  }
  const nostr = window.nostr!;
  const pubkey = await nostr.getPublicKey();
  const alias = (input.alias ?? '').trim().slice(0, 12).toUpperCase() || 'ANON';
  const score = Math.max(0, Math.floor(input.score));
  const level = Math.max(0, Math.floor(input.level));

  const unsigned: UnsignedEvent = {
    kind: 1,
    pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['t', TAG],
      ['score', String(score)],
      ['level', String(level)],
      ['alias', alias],
      ['client', 'pac-toshi'],
    ],
    content: `💥 Acabo de hacer ${score} pts en Pac-Toshi (nivel ${level}) 🍕⚡ — pactoshi.vercel.app #${TAG} #bitcoin`,
  };

  const signed = await nostr.signEvent(unsigned);

  // Fire-and-forget to every relay; whichever ack first is fine.
  const promises = pool.publish(RELAYS, signed);
  // Wait at most ~3s for any relay to accept it.
  await Promise.race([
    Promise.any(promises).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);

  return {
    pubkey,
    npubShort: shortNpub(pubkey),
    alias,
    score,
    level,
    ts: Date.now(),
  };
}

export async function queryTopScores(limit = 10, timeoutMs = 4000): Promise<NostrScoreEntry[]> {
  const bestByPubkey = new Map<string, NostrScoreEntry>();
  await new Promise<void>((resolve) => {
    const filter: Filter = { kinds: [1], '#t': [TAG], limit: 500 };
    const sub = pool.subscribeMany(
      RELAYS,
      filter,
      {
        onevent(ev) {
          const parsed = parseEvent(ev);
          if (!parsed) return;
          const prev = bestByPubkey.get(parsed.pubkey);
          if (!prev || parsed.score > prev.score) {
            bestByPubkey.set(parsed.pubkey, parsed);
          }
        },
        oneose() {
          sub.close();
          resolve();
        },
      },
    );
    setTimeout(() => {
      sub.close();
      resolve();
    }, timeoutMs);
  });

  return [...bestByPubkey.values()]
    .sort((a, b) => b.score - a.score || a.ts - b.ts)
    .slice(0, limit);
}
