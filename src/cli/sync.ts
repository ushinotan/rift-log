/**
 * npm run sync                       … 新しいランク戦を取り込む（取り込んだ matchId を1行ずつ標準出力へ）
 * npm run sync -- --days 30          … 30日前まで遡る
 * npm run sync -- --at 1794831057000 … 試合開始時刻（UNIX ミリ秒, OP.GG の URL 末尾。試合中〜終了直後の時刻なら一致）から特定して取り込む
 * npm run sync -- --rebuild          … 保存済みの生データから全試合を作り直す（API 不使用）
 */
import { rebuild, sync } from '../server/sync.ts';

const args = process.argv.slice(2);
const opts: { days?: number; at: number[] } = { at: [] };
let doRebuild = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--days') opts.days = Number(args[++i]);
  else if (a === '--at') opts.at.push(Number(args[++i]));
  else if (a === '--rebuild') doRebuild = true;
  else {
    console.error(`不明な引数: ${a}`);
    process.exit(2);
  }
}

try {
  const ids = doRebuild ? await rebuild() : await sync(opts);
  for (const id of ids) console.log(id);
  if (ids.length === 0) console.error('新しい試合はありませんでした');
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(msg.length > 600 ? msg.slice(0, 600) + ' …' : msg);
  if (e instanceof Error && e.cause) console.error('原因:', String((e.cause as Error).message ?? e.cause).slice(0, 600));
  process.exit(1);
}
