import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { openDb, schema } from './db/index.ts';
import { REVIEW_CATEGORIES, mmss, roleLabel, type ReviewCategory } from './labels.ts';

const { matches, participants, teamStats, events, itemEvents, skillOrder, frames, reviews } = schema;

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const kda = (k: number, d: number, a: number) => round((k + a) / Math.max(1, d), 2);

export type MatchListRow = Awaited<ReturnType<typeof listMatches>>[number];

/** 試合一覧（新しい順）。自分のスタッツ付き */
export async function listMatches(filter: { result?: string; champion?: string; role?: string } = {}) {
  const db = await openDb();
  const conds = [eq(participants.isMe, true)];
  if (filter.result) conds.push(eq(matches.result, filter.result));
  if (filter.champion) conds.push(eq(matches.myChampion, filter.champion));
  if (filter.role) conds.push(eq(matches.myRole, filter.role));
  const rows = await db
    .select({ m: matches, p: participants })
    .from(matches)
    .innerJoin(participants, and(eq(participants.matchId, matches.matchId), eq(participants.isMe, true)))
    .where(and(...conds))
    .orderBy(desc(matches.gameStartMs));
  const reviewed = new Set(
    (await db.selectDistinct({ id: reviews.matchId }).from(reviews)).map((r) => r.id),
  );
  return rows.map(({ m, p }) => ({
    matchId: m.matchId,
    startJst: m.startJst,
    gameStartMs: m.gameStartMs,
    durationSec: m.durationSec,
    result: m.result,
    win: m.win,
    remake: m.remake,
    champion: m.myChampion,
    championKey: p.championKey,
    role: m.myRole,
    roleLabel: roleLabel(m.myRole),
    opponent: m.opponentChampion,
    patch: m.patch,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    kda: kda(p.kills, p.deaths, p.assists),
    cs: p.cs,
    csPerMin: round(p.cs / (m.durationSec / 60)),
    killParticipation: round(p.killParticipation * 100, 0),
    visionScore: p.visionScore,
    damageDealt: p.damageDealt,
    reviewed: reviewed.has(m.matchId),
  }));
}

export function summarize(rows: MatchListRow[]) {
  const games = rows.filter((r) => !r.remake);
  const n = games.length;
  const sum = (f: (r: MatchListRow) => number) => games.reduce((s, r) => s + f(r), 0);
  const wins = games.filter((r) => r.win).length;
  return {
    games: n,
    wins,
    losses: n - wins,
    winRate: n ? round((wins / n) * 100) : 0,
    kda: kda(sum((r) => r.kills), sum((r) => r.deaths), sum((r) => r.assists)),
    avgKills: n ? round(sum((r) => r.kills) / n) : 0,
    avgDeaths: n ? round(sum((r) => r.deaths) / n) : 0,
    avgAssists: n ? round(sum((r) => r.assists) / n) : 0,
    csPerMin: n ? round(sum((r) => r.cs) / (sum((r) => r.durationSec) / 60)) : 0,
    killParticipation: n ? round(sum((r) => r.killParticipation) / n) : 0,
  };
}

export async function getFilterOptions() {
  const rows = await listMatches();
  return {
    champions: [...new Set(rows.map((r) => r.champion))].sort((a, b) => a.localeCompare(b, 'ja')),
    roles: [...new Set(rows.map((r) => r.role))].map((r) => ({ value: r, label: roleLabel(r) })),
  };
}

/** 試合詳細（画面用） */
export async function getMatchDetail(matchId: string) {
  const db = await openDb();
  const m = await db.query.matches.findFirst({ where: eq(matches.matchId, matchId) });
  if (!m) return null;
  const [ps, teams, evs, items, skills, fr, rv] = await Promise.all([
    db.select().from(participants).where(eq(participants.matchId, matchId)).orderBy(asc(participants.participantId)),
    db.select().from(teamStats).where(eq(teamStats.matchId, matchId)),
    db.select().from(events).where(eq(events.matchId, matchId)).orderBy(asc(events.timeSec), asc(events.id)),
    db.select().from(itemEvents).where(eq(itemEvents.matchId, matchId)).orderBy(asc(itemEvents.timeSec), asc(itemEvents.id)),
    db.select().from(skillOrder).where(eq(skillOrder.matchId, matchId)).orderBy(asc(skillOrder.level)),
    db.select().from(frames).where(eq(frames.matchId, matchId)).orderBy(asc(frames.minute)),
    db.select().from(reviews).where(eq(reviews.matchId, matchId)).orderBy(asc(reviews.category), asc(reviews.position)),
  ]);
  const me = ps.find((p) => p.isMe)!;
  const opp = ps.find((p) => p.participantId === m.opponentParticipantId) ?? null;

  // 1分ごとのゴールド差・CS差（対面）とチームゴールド差
  const byMinute = new Map<number, typeof fr>();
  for (const f of fr) byMinute.set(f.minute, [...(byMinute.get(f.minute) ?? []), f]);
  const teamOf = new Map(ps.map((p) => [p.participantId, p.teamId]));
  const goldGraph = [...byMinute.entries()].map(([minute, fs]) => {
    const mine = fs.find((f) => f.participantId === me.participantId);
    const theirs = opp ? fs.find((f) => f.participantId === opp.participantId) : undefined;
    const teamGold = (team: number) => fs.filter((f) => teamOf.get(f.participantId) === team).reduce((s, f) => s + f.gold, 0);
    return {
      minute,
      laneGoldDiff: mine && theirs ? mine.gold - theirs.gold : null,
      laneCsDiff: mine && theirs ? mine.cs - theirs.cs : null,
      teamGoldDiff: teamGold(m.myTeamId) - teamGold(300 - m.myTeamId),
    };
  });

  return {
    match: { ...m, roleLabel: roleLabel(m.myRole), duration: mmss(m.durationSec) },
    me,
    opponent: opp,
    participants: ps.map((p) => ({ ...p, roleLabel: roleLabel(p.role) })),
    teams,
    events: evs.map((e) => ({ ...e, time: mmss(e.timeSec) })),
    items: items.map((e) => ({ ...e, time: mmss(e.timeSec) })),
    skills,
    goldGraph,
    reviews: groupReviews(rv),
  };
}

function groupReviews(rv: (typeof reviews.$inferSelect)[]) {
  return REVIEW_CATEGORIES.map((category) => ({
    category,
    items: rv.filter((r) => r.category === category).map((r) => ({ item: r.item, detail: r.detail, createdAt: r.createdAt })),
  })).filter((g) => g.items.length > 0);
}

/** 傾向画面 */
export async function getTrends() {
  const db = await openDb();
  const rows = (await listMatches()).filter((r) => !r.remake);
  const group = (key: (r: MatchListRow) => string | null) => {
    const map = new Map<string, MatchListRow[]>();
    for (const r of rows) {
      const k = key(r);
      if (k) map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()]
      .map(([name, rs]) => ({ name, ...summarize(rs) }))
      .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
  };

  const series = [...rows].reverse().map((r, i) => ({
    index: i + 1,
    label: r.startJst.slice(5, 10),
    matchId: r.matchId,
    champion: r.champion,
    win: r.win,
    csPerMin: r.csPerMin,
    deaths: r.deaths,
    killParticipation: r.killParticipation,
  }));

  const ids = rows.map((r) => r.matchId);
  const ts = ids.length ? await db.select().from(teamStats).where(inArray(teamStats.matchId, ids)) : [];
  const byMatch = new Map<string, { mine?: typeof ts[number]; enemy?: typeof ts[number] }>();
  for (const t of ts) {
    const e = byMatch.get(t.matchId) ?? {};
    if (t.isMyTeam) e.mine = t;
    else e.enemy = t;
    byMatch.set(t.matchId, e);
  }
  const objectiveDefs = [
    { key: 'dragons', label: 'ドラゴン' },
    { key: 'voidGrubs', label: 'ヴォイドグラブ' },
    { key: 'heralds', label: 'ヘラルド' },
    { key: 'barons', label: 'バロン' },
  ] as const;
  const pairs = [...byMatch.values()].filter((p) => p.mine && p.enemy) as { mine: typeof ts[number]; enemy: typeof ts[number] }[];
  const objectives = [
    ...objectiveDefs.map(({ key, label }) => {
      const mine = pairs.reduce((s, p) => s + p.mine[key], 0);
      const enemy = pairs.reduce((s, p) => s + p.enemy[key], 0);
      return { label, mine, enemy, rate: mine + enemy ? round((mine / (mine + enemy)) * 100) : null, unit: '体' };
    }),
    {
      label: 'ファーストタワー',
      mine: pairs.filter((p) => p.mine.firstTower).length,
      enemy: pairs.filter((p) => p.enemy.firstTower).length,
      rate: pairs.length ? round((pairs.filter((p) => p.mine.firstTower).length / pairs.length) * 100) : null,
      unit: '試合',
    },
  ];

  const rv = await db.select().from(reviews).where(eq(reviews.category, '改善点'));
  const counts = new Map<string, { item: string; count: number; matchIds: string[] }>();
  for (const r of rv) {
    const c = counts.get(r.item) ?? { item: r.item, count: 0, matchIds: [] };
    c.count++;
    c.matchIds.push(r.matchId);
    counts.set(r.item, c);
  }

  return {
    summary: summarize(rows),
    byChampion: group((r) => r.champion),
    byRole: group((r) => r.roleLabel),
    byOpponent: group((r) => r.opponent),
    series,
    objectives,
    frequentImprovements: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 15),
  };
}

/** 振り返りがまだない試合（古い順） */
export async function pendingReviews() {
  const rows = await listMatches();
  return rows.filter((r) => !r.reviewed && !r.remake).reverse();
}

export type ReviewInput = { category: ReviewCategory; item: string; detail: string }[];

/** 振り返りを保存（同じ試合の分は置き換え） */
export async function saveReview(matchId: string, input: ReviewInput) {
  const db = await openDb();
  const m = await db.query.matches.findFirst({ where: eq(matches.matchId, matchId) });
  if (!m) throw new Error(`試合 ${matchId} は取り込まれていません`);
  const now = new Date().toISOString();
  const pos = new Map<string, number>();
  const rows = input.map((r) => {
    const p = (pos.get(r.category) ?? 0) + 1;
    pos.set(r.category, p);
    return { matchId, category: r.category, position: p, item: r.item, detail: r.detail, createdAt: now };
  });
  await db.transaction(async (tx) => {
    await tx.delete(reviews).where(eq(reviews.matchId, matchId));
    if (rows.length) await tx.insert(reviews).values(rows);
  });
  return rows.length;
}
