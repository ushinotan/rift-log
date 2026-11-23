Closes #

## 概要
<!-- この PR で何をしたかを 2〜5 行で -->

## 変更内容
1. 
2. 

## 影響範囲
- [ ] DB スキーマ（`src/server/db/schema.ts`、`drizzle/` にマイグレーションを追加）
- [ ] 取り込み・集計（`ingest.ts` / `queries.ts` など。`npm run sync -- --rebuild` で既存の試合に反映が必要）
- [ ] `npm run` コマンドの引数・出力（`README.md` と `.claude/skills/lol-review/SKILL.md` も直した）
- [ ] JSON API（`/api/*`）
- [ ] 画面
- [ ] 環境変数（`.env.example` も直した）
- [ ] なし

補足:
- 

## issue の仕様から変えた点
<!-- 無ければ「なし」 -->
- 

## 確認
### CI（PR で自動で回る）
- [ ] `typecheck`（手元でも `npm run typecheck` を通した）

### 手で確かめたこと
- [ ] `npm run dev` で画面 / API を確認（確認した matchId: ）
- [ ] ブルー側・レッド側の試合の両方
- [ ] ライト / ダークモードの両方
- [ ] `docs/codebase/` の地図を直した（食い違いが出る変更のとき）

## 既知の制限
<!-- 無ければ「なし」 -->
- 
