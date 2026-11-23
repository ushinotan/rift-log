# 概要

## スタック
- 1 つの npm パッケージ（`package.json`）。Node.js 22 以上、TypeScript（strict、`tsc --noEmit` で型検査のみ）、ES Modules。
- backend（`src/server/`）: Riot API・Data Dragon の取得、SQLite（libSQL）+ Drizzle ORM、JSON API。API は Vite 開発サーバーのミドルウェアとして動く（`vite.config.ts` の `riftLogApi`）。
- CLI（`src/cli/`）: `tsx` で直接実行する `npm run` コマンド。`lol-review` スキル（`.claude/skills/lol-review/SKILL.md`）から使う。
- frontend（`src/web/`）: React 19 + Vite 8。ルーターは使わず `location.hash` で切り替える。グラフは Recharts 3、スタイルは素の CSS（`styles.css`）。
- テスト、リンター、E2E はまだ無い。確認は `npm run typecheck` と、`npm run dev`（http://localhost:5173）での目視。

## 構成
```
Riot API ─(riot.ts)─> sync.ts ─> raw_matches（生データ）
                                   └─ ingest.ts ─> matches / participants / events / ... （Data Dragon ja_JP で名前解決: ddragon.ts）
ブラウザ ─> Vite 開発サーバー ─/api/*─> api.ts ─> queries.ts / deathmap.ts ─> SQLite（data/rift-log.db）
Claude Code（lol-review）─> npm run sync / pending / match / review:add ─> 同上
```

## 共通の約束事
- 対象はランク ソロ/デュオ（`queueId 420`）だけ。サモナーは `config.ts`（既定 牛乃タン#SION、jp1 / asia）。
- API の生レスポンスを `raw_matches` に残し、派生テーブルは `ingest.ts` で何度でも作り直せる（`npm run sync -- --rebuild`）。`ingestMatch` は既存行を消して入れ直すが、`reviews` は消さない。
- 名前（チャンピオン・アイテム・ルーン・スペル・スキル）は Data Dragon の最新版 ja_JP で解決し、最新版で消えた ID は試合当時のパッチ版で補う（`Resolver`）。
- 時刻: 試合開始は UNIX ミリ秒（`gameStartMs`）と JST の文字列（`startJst`、`toJst`）の両方で持つ。保存日時は ISO 8601（UTC）。
- マップ座標は `map.ts` にまとめ、サーバーと画面の両方から import する（`map.ts` は DB などに依存させない）。レッド側の正規化は 180° 回転ではなく川の対角線での鏡映。
- 進捗ログは標準エラー、機械が読む出力（matchId、JSON）は標準出力。CLI は `npm run -s` で呼ぶ前提。
- 秘密情報は `.env` の `RIOT_API_KEY` だけ。`data/` と `.env` は git 管理外。
- スキーマは `src/server/db/schema.ts` が正。`npm run db:generate` で `drizzle/` にマイグレーションを作り、`openDb()` が起動時に適用する。
