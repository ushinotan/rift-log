/**
 * match-v5 の生データ（試合詳細＋タイムライン）を DB の各テーブルに展開する。
 * 同じ試合を何度処理しても結果が変わらないよう、既存行を消してから入れ直す。
 */
import { eq } from 'drizzle-orm';
import type { DB } from './db/index.ts';
import { schema } from './db/index.ts';
import { Resolver } from './ddragon.ts';
import { DRAGON_SUBTYPE, LANE, MONSTER_TYPE, TOWER_TYPE, toJst } from './labels.ts';

const SLOT = ['', 'Q', 'W', 'E', 'R'] as const;

export async function ingestMatch(db: DB, puuid: string, match: any, timeline: any | null) {
  const info = match.info;
  const matchId: string = match.metadata.matchId;
  const ps: any[] = info.participants;
  const me = ps.find((p) => p.puuid === puuid);
  if (!me) throw new Error(`${matchId}: 自分の参加データが見つかりません`);

  const patch = String(info.gameVersion).split('.').slice(0, 2).join('.');
  const rs = await Resolver.create(patch);

  const roleOf = (p: any): string => {
    const r = p.teamPosition || p.individualPosition;
    return r && r !== 'Invalid' ? r : 'UNKNOWN';
  };
  const myRole = roleOf(me);
  const opponent = ps.find((p) => p.teamId !== me.teamId && roleOf(p) === myRole && myRole !== 'UNKNOWN') ?? null;
  const remake = ps.some((p) => p.gameEndedInEarlySurrender);
  const byPid = new Map<number, any>(ps.map((p) => [p.participantId, p]));
  const champName = (pid: number) => (byPid.has(pid) ? rs.champion(byPid.get(pid).championId).name : null);

  const teamKills = new Map<number, number>();
  for (const p of ps) teamKills.set(p.teamId, (teamKills.get(p.teamId) ?? 0) + p.kills);

  const matchRow = {
    matchId,
    gameStartMs: info.gameStartTimestamp,
    startJst: toJst(info.gameStartTimestamp),
    durationSec: info.gameDuration,
    result: remake ? 'リメイク' : me.win ? '勝利' : '敗北',
    win: !!me.win,
    remake,
    myTeamId: me.teamId,
    myParticipantId: me.participantId,
    myChampionId: me.championId,
    myChampion: rs.champion(me.championId).name,
    myRole,
    opponentParticipantId: opponent?.participantId ?? null,
    opponentChampionId: opponent?.championId ?? null,
    opponentChampion: opponent ? rs.champion(opponent.championId).name : null,
    patch,
    gameVersion: info.gameVersion,
    ddragonVersion: rs.version,
    importedAt: new Date().toISOString(),
  };

  const participantRows = ps.map((p) => {
    const styles = p.perks?.styles ?? [];
    const primary = styles.find((s: any) => s.description === 'primaryStyle') ?? styles[0];
    const sub = styles.find((s: any) => s.description === 'subStyle') ?? styles[1];
    const primaryRunes = (primary?.selections ?? []).map((s: any) => rs.rune(s.perk));
    const champ = rs.champion(p.championId);
    return {
      matchId,
      participantId: p.participantId,
      puuid: p.puuid,
      isMe: p.puuid === puuid,
      teamId: p.teamId,
      win: !!p.win,
      role: roleOf(p),
      championId: p.championId,
      championKey: champ.key,
      champion: champ.name,
      playerName: p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline}` : (p.summonerName ?? ''),
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      killParticipation: (teamKills.get(p.teamId) ?? 0) > 0 ? (p.kills + p.assists) / teamKills.get(p.teamId)! : 0,
      damageDealt: p.totalDamageDealtToChampions,
      damageTaken: p.totalDamageTaken,
      gold: p.goldEarned,
      cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
      level: p.champLevel,
      visionScore: p.visionScore ?? 0,
      wardsPlaced: p.wardsPlaced ?? 0,
      wardsKilled: p.wardsKilled ?? 0,
      controlWardsBought: p.visionWardsBoughtInGame ?? 0,
      runes: {
        primaryStyle: primary ? rs.style(primary.style) : null,
        subStyle: sub ? rs.style(sub.style) : null,
        keystone: primaryRunes[0] ?? null,
        primary: primaryRunes,
        secondary: (sub?.selections ?? []).map((s: any) => rs.rune(s.perk)),
      },
      summonerSpells: [p.summoner1Id, p.summoner2Id].map((id: number) => rs.spell(id)),
      items: [0, 1, 2, 3, 4, 5, 6]
        .map((slot) => ({ slot, id: p[`item${slot}`] as number }))
        .filter((x) => x.id)
        .map((x) => ({ ...x, name: rs.item(x.id) })),
    };
  });

  const teamRows = (info.teams as any[]).map((t) => {
    const o = t.objectives ?? {};
    return {
      matchId,
      teamId: t.teamId,
      isMyTeam: t.teamId === me.teamId,
      win: !!t.win,
      kills: o.champion?.kills ?? teamKills.get(t.teamId) ?? 0,
      towers: o.tower?.kills ?? 0,
      inhibitors: o.inhibitor?.kills ?? 0,
      dragons: o.dragon?.kills ?? 0,
      barons: o.baron?.kills ?? 0,
      heralds: o.riftHerald?.kills ?? 0,
      voidGrubs: o.horde?.kills ?? 0,
      atakhans: o.atakhan?.kills ?? 0,
      firstBlood: !!o.champion?.first,
      firstTower: !!o.tower?.first,
      firstDragon: !!o.dragon?.first,
    };
  });

  const eventRows: (typeof schema.events.$inferInsert)[] = [];
  const itemRows: (typeof schema.itemEvents.$inferInsert)[] = [];
  const skillRows: (typeof schema.skillOrder.$inferInsert)[] = [];
  const frameRows: (typeof schema.frames.$inferInsert)[] = [];

  if (timeline) {
    const myPid = me.participantId;
    let firstBloodDone = false;
    let firstTowerDone = false;
    let skillCount = 0;
    const skillNames = await rs.skills(rs.champion(me.championId).key).catch(() => null);

    const involvement = (e: any): string | null => {
      if (e.victimId === myPid) return 'デス';
      if (e.killerId === myPid) return e.type === 'CHAMPION_KILL' ? 'キル' : 'ラストヒット';
      if ((e.assistingParticipantIds ?? []).includes(myPid)) return 'アシスト';
      return null;
    };
    const base = (e: any, type: string, teamId: number, detail: string | null) => {
      const inv = involvement(e);
      return {
        matchId,
        timeSec: Math.round(e.timestamp / 1000),
        type,
        detail,
        teamId,
        isAlly: teamId === me.teamId,
        killer: e.killerId ? champName(e.killerId) : null,
        victim: e.victimId ? champName(e.victimId) : null,
        assists: (e.assistingParticipantIds ?? []).map((id: number) => champName(id)).filter(Boolean),
        involvesMe: inv !== null,
        myInvolvement: inv,
        x: e.position?.x ?? null,
        y: e.position?.y ?? null,
      };
    };

    const seenMinutes = new Set<number>();
    for (const frame of timeline.info.frames as any[]) {
      // フレームはほぼ毎分ちょうど。試合終了時の最終フレームが同じ分に入る場合はスナップショットを取らない
      const minute = Math.floor(frame.timestamp / 60000);
      const takeSnapshot = !seenMinutes.has(minute);
      seenMinutes.add(minute);
      for (const [pidStr, pf] of takeSnapshot ? Object.entries<any>(frame.participantFrames ?? {}) : []) {
        frameRows.push({
          matchId,
          minute,
          participantId: Number(pidStr),
          gold: pf.totalGold ?? 0,
          cs: (pf.minionsKilled ?? 0) + (pf.jungleMinionsKilled ?? 0),
          xp: pf.xp ?? 0,
          level: pf.level ?? 1,
        });
      }

      for (const e of frame.events as any[]) {
        const t = Math.round(e.timestamp / 1000);
        switch (e.type) {
          case 'CHAMPION_KILL': {
            const victimTeam = byPid.get(e.victimId)?.teamId;
            const team = e.killerId ? byPid.get(e.killerId)?.teamId : 300 - victimTeam;
            eventRows.push(base(e, 'キル', team, firstBloodDone ? null : 'ファーストブラッド'));
            firstBloodDone = true;
            break;
          }
          case 'BUILDING_KILL': {
            const team = 300 - e.teamId; // teamId は壊された側
            const lane = LANE[e.laneType] ?? '';
            if (e.buildingType === 'TOWER_BUILDING') {
              let detail = `${lane} ${TOWER_TYPE[e.towerType] ?? 'タワー'}`.trim();
              if (!firstTowerDone) detail = `ファーストタワー（${detail}）`;
              firstTowerDone = true;
              eventRows.push(base(e, 'タワー', team, detail));
            } else {
              eventRows.push(base(e, 'インヒビター', team, `${lane} インヒビター`.trim()));
            }
            break;
          }
          case 'ELITE_MONSTER_KILL': {
            const type = MONSTER_TYPE[e.monsterType] ?? e.monsterType;
            const detail = e.monsterType === 'DRAGON' ? (DRAGON_SUBTYPE[e.monsterSubType] ?? e.monsterSubType ?? null) : null;
            const team = e.killerTeamId ?? byPid.get(e.killerId)?.teamId;
            eventRows.push(base(e, type, team, detail));
            break;
          }
          case 'ITEM_PURCHASED':
          case 'ITEM_SOLD':
          case 'ITEM_UNDO': {
            if (e.participantId !== myPid) break;
            const id = e.type === 'ITEM_UNDO' ? e.beforeId || e.afterId : e.itemId;
            if (!id) break;
            const action = e.type === 'ITEM_PURCHASED' ? '購入' : e.type === 'ITEM_SOLD' ? '売却' : '取り消し';
            itemRows.push({ matchId, timeSec: t, action, itemId: id, item: rs.item(id) });
            break;
          }
          case 'SKILL_LEVEL_UP': {
            if (e.participantId !== myPid || e.levelUpType !== 'NORMAL') break;
            const slot = SLOT[e.skillSlot];
            if (!slot) break;
            skillCount++;
            skillRows.push({ matchId, level: skillCount, timeSec: t, slot, skill: skillNames?.[slot] ?? slot });
            break;
          }
        }
      }
    }
  }

  // 振り返り（reviews）は取り込み直しても消さない
  const { events, itemEvents, skillOrder, frames, teamStats, participants, matches } = schema;
  await db.transaction(async (tx) => {
    await tx.delete(events).where(eq(events.matchId, matchId));
    await tx.delete(itemEvents).where(eq(itemEvents.matchId, matchId));
    await tx.delete(skillOrder).where(eq(skillOrder.matchId, matchId));
    await tx.delete(frames).where(eq(frames.matchId, matchId));
    await tx.delete(teamStats).where(eq(teamStats.matchId, matchId));
    await tx.delete(participants).where(eq(participants.matchId, matchId));
    await tx.insert(matches).values(matchRow).onConflictDoUpdate({ target: matches.matchId, set: matchRow });
    await tx.insert(participants).values(participantRows);
    await tx.insert(teamStats).values(teamRows);
    if (eventRows.length) await tx.insert(events).values(eventRows);
    if (itemRows.length) await tx.insert(itemEvents).values(itemRows);
    if (skillRows.length) await tx.insert(skillOrder).values(skillRows);
    for (let i = 0; i < frameRows.length; i += 500) await tx.insert(frames).values(frameRows.slice(i, i + 500));
  });

  return matchRow;
}
