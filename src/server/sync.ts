import { desc, eq, inArray } from 'drizzle-orm';
import { config } from './config.ts';
import { openDb, schema } from './db/index.ts';
import { ingestMatch } from './ingest.ts';
import { RiotClient } from './riot.ts';

const log = (msg: string) => process.stderr.write(msg + '\n');
const DAY = 86400;

export type SyncOptions = {
  /** 何日前まで遡るか（省略時: DB が空なら14日、あれば最新試合の1日前から） */
  days?: number;
  /** OP.GG の URL 末尾など、試合開始時刻（UNIX ミリ秒）から試合を特定して取り込む */
  at?: number[];
};

async function getPuuid(riot: RiotClient): Promise<string> {
  const db = await openDb();
  const key = `puuid:${config.gameName}#${config.tagLine}`;
  const row = await db.query.meta.findFirst({ where: eq(schema.meta.key, key) });
  if (row) return row.value;
  const acc = await riot.getAccount(config.gameName, config.tagLine);
  await db.insert(schema.meta).values({ key, value: acc.puuid }).onConflictDoUpdate({ target: schema.meta.key, set: { value: acc.puuid } });
  return acc.puuid;
}

export async function sync(opts: SyncOptions = {}): Promise<string[]> {
  const db = await openDb();
  const riot = new RiotClient();
  const puuid = await getPuuid(riot);
  log(`サモナー: ${config.gameName}#${config.tagLine}`);

  const candidates = new Set<string>();

  // 1) 期間指定で直近のランク戦IDを集める
  const latest = await db.query.matches.findFirst({ orderBy: desc(schema.matches.gameStartMs) });
  const nowSec = Math.floor(Date.now() / 1000);
  const startTime =
    opts.days !== undefined
      ? nowSec - opts.days * DAY
      : latest
        ? Math.floor(latest.gameStartMs / 1000) - DAY
        : nowSec - 14 * DAY;
  for (let start = 0; ; start += 100) {
    const ids = await riot.getMatchIds(puuid, { start, count: 100, startTime });
    ids.forEach((id) => candidates.add(id));
    if (ids.length < 100) break;
  }

  // 2) 時刻（UNIX ミリ秒）から特定する試合。OP.GG の URL の数字は試合「終了」時刻に近いので、
  //    前後の試合を取得して「開始 − 5分 ≦ 時刻 ≦ 終了 + 5分」に入る試合を選ぶ
  const loadRaw = async (id: string) => {
    let raw = await db.query.rawMatches.findFirst({ where: eq(schema.rawMatches.matchId, id) });
    if (!raw) {
      log(`  取得中: ${id}`);
      const match = await riot.getMatch(id);
      const timeline = await riot.getTimeline(id);
      raw = { matchId: id, match, timeline, fetchedAt: new Date().toISOString() };
      await db.insert(schema.rawMatches).values(raw).onConflictDoNothing();
    }
    return raw;
  };
  for (const ms of opts.at ?? []) {
    const t = Math.floor(ms / 1000);
    const ids = await riot.getMatchIds(puuid, { startTime: t - 2 * 3600, endTime: t + 600, count: 20 });
    let found = false;
    for (const id of ids) {
      const info = ((await loadRaw(id)).match as any).info;
      const end = info.gameEndTimestamp ?? info.gameStartTimestamp + info.gameDuration * 1000;
      if (info.gameStartTimestamp - 300_000 <= ms && ms <= end + 300_000) {
        candidates.add(id);
        found = true;
      }
    }
    if (!found) log(`  時刻 ${ms} に該当するランク戦が見つかりませんでした`);
  }

  // 3) 取り込み済みを除外
  const all = [...candidates];
  const existing = all.length
    ? await db.select({ id: schema.matches.matchId }).from(schema.matches).where(inArray(schema.matches.matchId, all))
    : [];
  const done = new Set(existing.map((r) => r.id));
  const todo = all.filter((id) => !done.has(id)).sort(); // matchId は時系列順に増える
  log(`ランク戦 ${all.length} 件中、新規 ${todo.length} 件`);

  const imported: string[] = [];
  for (const id of todo) {
    const raw = await loadRaw(id);
    const m = raw.match as any;
    if (m.info.queueId !== config.queueId) {
      log(`  スキップ（ランク ソロ/デュオ以外）: ${id}`);
      continue;
    }
    const row = await ingestMatch(db, puuid, m, raw.timeline);
    log(`  取り込み: ${id}  ${row.startJst}  ${row.myChampion} vs ${row.opponentChampion ?? '-'}  ${row.result}`);
    imported.push(id);
  }
  return imported;
}

/** 保存済みの生データから全試合を作り直す（Data Dragon 更新後など。API は叩かない） */
export async function rebuild(): Promise<string[]> {
  const db = await openDb();
  const raws = await db.query.rawMatches.findMany();
  const puuidRow = await db.query.meta.findFirst({ where: eq(schema.meta.key, `puuid:${config.gameName}#${config.tagLine}`) });
  if (!puuidRow) throw new Error('PUUID が未取得です。先に npm run sync を実行してください。');
  const ids: string[] = [];
  for (const raw of raws) {
    await ingestMatch(db, puuidRow.value, raw.match, raw.timeline);
    ids.push(raw.matchId);
  }
  return ids;
}
