# サービス（backend）

`src/server/`。クラスより関数が中心で、DB は各関数の中で `await openDb()` して取る。

| ファイル | 主な export | 内容 |
|---|---|---|
| `config.ts` | `ROOT`、`DATA_DIR`、`config`、`requireApiKey` | `.env` の読み込み（`process.loadEnvFile`）、サモナー・地域・キュー・DB パス（`RIFT_LOG_DB` で上書き可） |
| `riot.ts` | `RiotClient`、`RiotApiError` | Riot API。開発キーの制限（20req/1秒・100req/2分）を守る `throttle`、429 / 5xx は `Retry-After` か指数バックオフで最大 5 回再試行。401/403 は「API キーが無効か期限切れ」 |
| `ddragon.ts` | `getVersions`、`getLatestVersion`、`Resolver`、`getMapImage` | Data Dragon ja_JP の取得と `data/ddragon/<version>/` へのキャッシュ。`Resolver` は最新版で引き、無い ID は試合当時の版で補う |
| `sync.ts` | `sync`、`rebuild`、`SyncOptions` | 試合 ID の収集（期間 / `--at` の時刻）→ `raw_matches` に保存 → キューが 420 のものだけ `ingestMatch` |
| `ingest.ts` | `ingestMatch` | 生データ → `matches` / `participants` / `team_stats` / `events` / `item_events` / `skill_order` / `frames`。対面の特定、イベントの日本語化、自分の関与の判定 |
| `queries.ts` | `listMatches`、`summarize`、`getFilterOptions`、`getMatchDetail`、`getTrends`、`pendingReviews`、`saveReview`、`MatchListRow`、`ReviewInput` | 画面と CLI 用の集計。`getMatchDetail` はゴールド差の推移・タイムライン・ビルド・振り返りまで返す |
| `deathmap.ts` | `getDeathPoints`、`getDeathMap`、`DeathPoint`、`DeathFilter` | 自分のデス・キルの座標（`getDeathMap` はマップ画像の URL と座標範囲も付ける）。時間帯別・エリア別の集計は画面側（`DeathMapSection.tsx`） |
| `map.ts` | `MAP_BOUNDS`、`sideOf`、`RIVER_C`、`normalizePos`、`ZONES`、`zoneOf` | 座標の正規化とエリア判定。画面（`DeathMap.tsx`）とも共用するので DB や Node API に依存させない |
| `review-data.ts` | `buildReviewData` | `npm run match` の出力。自分と対面のスタッツ、デス（エリア付き）、直近 5 試合の振り返り（`recentHistory`）など |
| `labels.ts` | `ROLE_LABEL`、`roleLabel`、`REVIEW_CATEGORIES`、`ReviewCategory`、`toJst`、`mmss` ほか | 日本語ラベルと時刻の書式 |

## エラー
- 例外は `Error`（Riot API は `RiotApiError`）を投げ、メッセージは日本語。`api.ts` が 500 に、CLI が終了コード 1 に変える。
