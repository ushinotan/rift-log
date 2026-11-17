/**
 * npm run review:add -- <matchId> <JSONファイル>
 *
 * JSON の形式:
 * {
 *   "良かった点": [{ "項目": "短い見出し", "詳細": "データに基づく説明" }, ...],
 *   "改善点":     [{ "項目": "...", "詳細": "..." }, ...],
 *   "次の目標":   [{ "項目": "...", "詳細": "..." }]
 * }
 * （英語キー good / improve / goal・item / detail も可）
 * 同じ試合の既存の振り返りは置き換える。
 */
import fs from 'node:fs';
import { saveReview, type ReviewInput } from '../server/queries.ts';
import type { ReviewCategory } from '../server/labels.ts';

const [matchId, file] = process.argv.slice(2);
if (!matchId || !file) {
  console.error('使い方: npm run review:add -- <matchId> <JSONファイル>');
  process.exit(2);
}

const KEYS: Record<ReviewCategory, string[]> = {
  良かった点: ['良かった点', 'good'],
  改善点: ['改善点', 'improve', 'improvements'],
  次の目標: ['次の目標', 'goal', 'goals'],
};

try {
  const json = JSON.parse(fs.readFileSync(file, 'utf8').trimStart()); // trimStart は BOM も除去する
  const input: ReviewInput = [];
  for (const [category, keys] of Object.entries(KEYS) as [ReviewCategory, string[]][]) {
    let list = keys.map((k) => json[k]).find((v) => v !== undefined) ?? [];
    if (!Array.isArray(list)) list = [list];
    for (const x of list) {
      const item = typeof x === 'string' ? x : (x['項目'] ?? x.item ?? x.title);
      const detail = typeof x === 'string' ? '' : (x['詳細'] ?? x.detail ?? '');
      if (!item) throw new Error(`${category} に「項目」がない要素があります`);
      input.push({ category, item: String(item).trim(), detail: String(detail).trim() });
    }
  }
  const count = (c: ReviewCategory) => input.filter((r) => r.category === c).length;
  if (count('良かった点') < 3 || count('改善点') < 3 || count('次の目標') < 1) {
    console.error(`注意: 良かった点 ${count('良かった点')}件 / 改善点 ${count('改善点')}件 / 次の目標 ${count('次の目標')}件（目安は 3〜5 / 3〜5 / 1）`);
  }
  const n = await saveReview(matchId, input);
  console.log(`${matchId}: 振り返り ${n} 件を保存しました`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
