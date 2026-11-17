/**
 * デスマップ用のデータ（自分のデス・キルの座標）と、座標からのエリア判定。
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { openDb, schema } from './db/index.ts';
import { getFilterOptions } from './queries.ts';
import { roleLabel } from './labels.ts';

const { matches, events } = schema;

import { MAP_BOUNDS, normalizePos, zoneOf, type Side, type Zone } from './map.ts';

export { MAP_BOUNDS, normalizePos, zoneOf, ZONES, type Side, type Zone } from './map.ts';

export const sideOf = (teamId: number): Side => (teamId === 200 ? 'red' : 'blue');

export type DeathPoint = {
  matchId: string;
  timeSec: number;
  /** 生の座標（正規化はクライアントで切り替える） */
  x: number;
  y: number;
  kind: 'death' | 'kill';
  /** デス: 倒した敵 / キル: 倒した敵。処刑（タワー・ミニオン）は null */
  enemy: string | null;
  /** デスに関与した敵の人数（killer + assists）。キルは 1 */
  enemyCount: number;
  /** キルに関与した味方の人数（自分 + assists）。デスは 0 */
  allyCount: number;
  result: string;
  side: Side;
  champion: string;
  role: string;
  /** 自陣基準のエリア */
  zone: Zone;
};

export type DeathFilter = {
  champion?: string;
  role?: string;
  /** 直近 N 試合 */
  limit?: number;
  kind?: 'death' | 'kill' | 'both';
  matchId?: string;
};

export async function getDeathPoints(f: DeathFilter = {}): Promise<{ points: DeathPoint[]; matchCount: number }> {
  const db = await openDb();
  const conds = [eq(matches.remake, false)];
  if (f.matchId) conds.push(eq(matches.matchId, f.matchId));
  if (f.champion) conds.push(eq(matches.myChampion, f.champion));
  if (f.role) conds.push(eq(matches.myRole, f.role));
  let q = db.select().from(matches).where(and(...conds)).orderBy(desc(matches.gameStartMs)).$dynamic();
  if (f.limit && f.limit > 0) q = q.limit(f.limit);
  const ms = await q;
  if (!ms.length) return { points: [], matchCount: 0 };
  const byId = new Map(ms.map((m) => [m.matchId, m]));

  const kind = f.kind ?? 'death';
  const inv = kind === 'both' ? ['デス', 'キル'] : [kind === 'kill' ? 'キル' : 'デス'];
  const evs = await db
    .select()
    .from(events)
    .where(and(inArray(events.matchId, [...byId.keys()]), eq(events.type, 'キル'), inArray(events.myInvolvement, inv)));

  const points: DeathPoint[] = [];
  for (const e of evs) {
    if (e.x === null || e.y === null) continue;
    const m = byId.get(e.matchId)!;
    const side = sideOf(m.myTeamId);
    const assists = ((e.assists as string[] | null) ?? []).length;
    const isDeath = e.myInvolvement === 'デス';
    const n = normalizePos(e.x, e.y, side);
    points.push({
      matchId: e.matchId,
      timeSec: e.timeSec,
      x: e.x,
      y: e.y,
      kind: isDeath ? 'death' : 'kill',
      enemy: isDeath ? e.killer : e.victim,
      enemyCount: isDeath ? (e.killer ? 1 : 0) + assists : 1,
      allyCount: isDeath ? 0 : 1 + assists,
      result: m.result,
      side,
      champion: m.myChampion,
      role: roleLabel(m.myRole),
      zone: zoneOf(n.x, n.y),
    });
  }
  // 新しい試合 → 試合内は時刻順
  const order = new Map(ms.map((m, i) => [m.matchId, i]));
  points.sort((a, b) => order.get(a.matchId)! - order.get(b.matchId)! || a.timeSec - b.timeSec);
  return { points, matchCount: ms.length };
}

export async function getDeathMap(f: DeathFilter) {
  const [{ points, matchCount }, options] = await Promise.all([getDeathPoints(f), f.matchId ? null : getFilterOptions()]);
  return { mapImage: '/api/ddragon/map11.png', bounds: MAP_BOUNDS, matchCount, points, options };
}
