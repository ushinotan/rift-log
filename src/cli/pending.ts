/**
 * npm run -s pending
 * 振り返りがまだない試合の matchId を古い順に1行ずつ出力（リメイクは除く）。
 */
import { pendingReviews } from '../server/queries.ts';

const rows = await pendingReviews();
for (const r of rows) console.log(r.matchId);
for (const r of rows) console.error(`  ${r.matchId}  ${r.startJst}  ${r.champion} vs ${r.opponent ?? '-'}  ${r.result}`);
if (rows.length === 0) console.error('振り返り待ちの試合はありません');
