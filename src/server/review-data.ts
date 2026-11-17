/**
 * `npm run match` が出力する「振り返りを書くためのデータ」を組み立てる。
 */
import { and, asc, desc, eq, inArray, lt } from 'drizzle-orm';
import { openDb, schema } from './db/index.ts';
import { getMatchDetail } from './queries.ts';
import { mmss, roleLabel } from './labels.ts';

const { matches, participants, teamStats, reviews } = schema;
const HISTORY = 5;

export async function buildReviewData(matchId: string) {
  const d = await getMatchDetail(matchId);
  if (!d) return null;
  const db = await openDb();
  const { match: m, me, opponent: opp } = d;
  const min = m.durationSec / 60;

  const stat = (p: typeof me | null) =>
    p && {
      champion: p.champion,
      player: p.playerName,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      kda: Math.round(((p.kills + p.assists) / Math.max(1, p.deaths)) * 100) / 100,
      killParticipationPct: Math.round(p.killParticipation * 100),
      cs: p.cs,
      csPerMin: Math.round((p.cs / min) * 10) / 10,
      gold: p.gold,
      damageDealt: p.damageDealt,
      damageTaken: p.damageTaken,
      visionScore: p.visionScore,
      wardsPlaced: p.wardsPlaced,
      wardsKilled: p.wardsKilled,
      controlWardsBought: p.controlWardsBought,
      level: p.level,
      runes: p.runes,
      summonerSpells: (p.summonerSpells as any[]).map((s) => s.name),
      finalItems: (p.items as any[]).map((i) => i.name),
    };
  const meStat = stat(me)!;
  const oppStat = stat(opp);
  const diff = oppStat
    ? Object.fromEntries(
        (['kills', 'deaths', 'assists', 'cs', 'gold', 'damageDealt', 'damageTaken', 'visionScore', 'wardsPlaced', 'wardsKilled', 'controlWardsBought', 'level'] as const).map(
          (k) => [k, (meStat[k] as number) - (oppStat[k] as number)],
        ),
      )
    : null;

  const at = (minute: number) => d.goldGraph.find((g) => g.minute === minute) ?? null;
  const laningDiffs = [5, 10, 15, 20].map((minute) => {
    const g = at(minute);
    return g && { minute, goldDiff: g.laneGoldDiff, csDiff: g.laneCsDiff, teamGoldDiff: g.teamGoldDiff };
  }).filter(Boolean);

  const myTeam = d.teams.find((t) => t.isMyTeam)!;
  const enemyTeam = d.teams.find((t) => !t.isMyTeam)!;
  const objKeys = ['towers', 'inhibitors', 'dragons', 'voidGrubs', 'heralds', 'barons', 'atakhans'] as const;
  const objectives = {
    ally: Object.fromEntries(objKeys.map((k) => [k, myTeam[k]])),
    enemy: Object.fromEntries(objKeys.map((k) => [k, enemyTeam[k]])),
    firstBlood: myTeam.firstBlood ? '味方' : enemyTeam.firstBlood ? '敵' : 'なし',
    firstTower: myTeam.firstTower ? '味方' : enemyTeam.firstTower ? '敵' : 'なし',
    firstDragon: myTeam.firstDragon ? '味方' : enemyTeam.firstDragon ? '敵' : 'なし',
  };

  const ev = (e: (typeof d.events)[number]) => ({
    time: e.time,
    type: e.type,
    detail: e.detail,
    side: e.isAlly ? '味方' : '敵',
    killer: e.killer,
    victim: e.victim,
    assists: e.assists,
    me: e.myInvolvement,
  });

  // 直近の過去試合（傾向・連続する改善点の指摘用）
  const prev = await db
    .select({ m: matches, p: participants })
    .from(matches)
    .innerJoin(participants, and(eq(participants.matchId, matches.matchId), eq(participants.isMe, true)))
    .where(and(lt(matches.gameStartMs, m.gameStartMs), eq(matches.remake, false)))
    .orderBy(desc(matches.gameStartMs))
    .limit(HISTORY);
  const prevIds = prev.map((r) => r.m.matchId);
  const prevTeams = prevIds.length ? await db.select().from(teamStats).where(inArray(teamStats.matchId, prevIds)) : [];
  const prevReviews = prevIds.length
    ? await db.select().from(reviews).where(inArray(reviews.matchId, prevIds)).orderBy(asc(reviews.position))
    : [];
  const recentHistory = prev.map(({ m: pm, p }) => {
    const t = prevTeams.filter((x) => x.matchId === pm.matchId);
    const a = t.find((x) => x.isMyTeam);
    const e = t.find((x) => !x.isMyTeam);
    const rv = prevReviews.filter((r) => r.matchId === pm.matchId);
    return {
      matchId: pm.matchId,
      date: pm.startJst,
      result: pm.result,
      champion: pm.myChampion,
      role: roleLabel(pm.myRole),
      opponent: pm.opponentChampion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`,
      deaths: p.deaths,
      csPerMin: Math.round((p.cs / (pm.durationSec / 60)) * 10) / 10,
      killParticipationPct: Math.round(p.killParticipation * 100),
      objectives: a && e && {
        dragons: `${a.dragons}-${e.dragons}`,
        voidGrubs: `${a.voidGrubs}-${e.voidGrubs}`,
        heralds: `${a.heralds}-${e.heralds}`,
        barons: `${a.barons}-${e.barons}`,
        firstTower: a.firstTower ? '味方' : e.firstTower ? '敵' : 'なし',
      },
      improvements: rv.filter((r) => r.category === '改善点').map((r) => r.item),
      goal: rv.find((r) => r.category === '次の目標')?.item ?? null,
    };
  });

  // これまでに使った「改善点」の項目名（表記を揃えて集計できるように再利用する）
  const usedItems = await db.selectDistinct({ item: reviews.item, category: reviews.category }).from(reviews);

  return {
    matchId,
    summary: {
      date: m.startJst + ' (JST)',
      result: m.result,
      duration: m.duration,
      patch: m.patch,
      champion: m.myChampion,
      role: m.roleLabel,
      opponent: m.opponentChampion,
    },
    me: meStat,
    opponent: oppStat,
    diffVsOpponent: diff,
    laningDiffs,
    skillOrder: d.skills.map((s) => s.slot).join(''),
    skillOrderDetail: d.skills.map((s) => ({ level: s.level, slot: s.slot, skill: s.skill, time: mmss(s.timeSec) })),
    build: d.items.map((i) => ({ time: i.time, action: i.action, item: i.item })),
    objectives,
    myDeaths: d.events.filter((e) => e.myInvolvement === 'デス').map(ev),
    objectiveTimeline: d.events.filter((e) => e.type !== 'キル').map(ev),
    killTimeline: d.events.filter((e) => e.type === 'キル').map(ev),
    allParticipants: d.participants.map((p) => ({
      side: p.teamId === m.myTeamId ? '味方' : '敵',
      role: p.roleLabel,
      champion: p.champion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`,
      cs: p.cs,
      gold: p.gold,
      damageDealt: p.damageDealt,
      visionScore: p.visionScore,
      isMe: p.isMe,
    })),
    recentHistory,
    existingReviewItems: {
      改善点: usedItems.filter((r) => r.category === '改善点').map((r) => r.item),
      良かった点: usedItems.filter((r) => r.category === '良かった点').map((r) => r.item),
    },
    currentReview: d.reviews,
  };
}
