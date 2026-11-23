# ルート（backend）

## JSON API
`src/server/api.ts` の `handle`。`vite.config.ts` の `riftLogApi` が `/api/` で始まるリクエストを `ssrLoadModule` 経由で渡す（`npm run dev` のときだけ動く。本番ビルドは無い）。
認証は無い（ローカル専用）。エラーは `{ error: "<日本語のメッセージ>" }`、例外は 500。

| メソッド | ルート | 処理 |
|---|---|---|
| GET | `/api/matches?result=&champion=&role=` | `listMatches` → `{ rows, summary: summarize(rows), options: getFilterOptions() }` |
| GET | `/api/matches/{matchId}` | `getMatchDetail`（無ければ 404） |
| GET | `/api/trends` | `getTrends` |
| GET | `/api/filter-options` | `getFilterOptions`（チャンピオン・ロールの一覧） |
| GET | `/api/deaths?champion=&role=&limit=&kind=death\|kill\|both&matchId=` | `getDeathMap`（`kind` の既定は `death`） |
| GET | `/api/ddragon/map11.png` | `getMapImage`（PNG、`Cache-Control: max-age=86400`） |
| GET | `/api/ddragon` | `{ version: getLatestVersion() }`（取れなければ `null`） |

- メソッドは見ていない（すべて GET 扱い）。書き込み系 API は無い。振り返りの保存は CLI（`review:add`）だけ。

## CLI（`npm run`）
`src/cli/` を `tsx` で実行する。`lol-review` スキルは `npm run -s` で呼ぶ。

| コマンド | ファイル | 処理 |
|---|---|---|
| `npm run sync [-- --days N] [-- --at <UNIXミリ秒>]` | `cli/sync.ts` | `sync()`。取り込んだ matchId を標準出力に 1 行ずつ |
| `npm run sync -- --rebuild` | 同上 | `rebuild()`。`raw_matches` から全試合を作り直す（API 不使用） |
| `npm run -s pending` | `cli/pending.ts` | `pendingReviews()`。振り返りが無い試合（リメイク除く）を古い順に |
| `npm run -s match -- <matchId>` | `cli/match.ts` | `buildReviewData()` を JSON で出力 |
| `npm run review:add -- <matchId> <file.json>` | `cli/review-add.ts` | JSON（日本語キー / 英語キー）を読んで `saveReview()`。同じ試合の振り返りは置き換え |
| `npm run db:generate` | — | `drizzle-kit generate`（`drizzle.config.ts`） |
| `npm run typecheck` | — | `tsc --noEmit` |

- 終了コード: 引数エラーは 2、処理の失敗は 1。
