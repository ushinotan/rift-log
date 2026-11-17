/**
 * npm run -s match -- <matchId>
 * 振り返りを書くための試合データを JSON で標準出力へ。
 */
import { buildReviewData } from '../server/review-data.ts';

const id = process.argv[2];
if (!id) {
  console.error('使い方: npm run -s match -- <matchId>');
  process.exit(2);
}
const data = await buildReviewData(id);
if (!data) {
  console.error(`試合 ${id} は取り込まれていません（先に npm run sync）`);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 2));
