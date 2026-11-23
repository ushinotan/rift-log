# backend（`src/server/`、`src/cli/`）

Node.js 22 + TypeScript（strict）、ES Modules。CLI は `tsx` で実行し、API は Vite 開発サーバーの中で動く。

## ディレクトリ構成

| 場所 | 置くもの |
| --- | --- |
| `src/server/db/` | Drizzle のスキーマ（`schema.ts`）と接続（`index.ts`） |
| `src/server/*.ts` | 外部 API のクライアント、取り込み、集計、JSON API（`api.ts`） |
| `src/cli/*.ts` | `npm run` のコマンド。引数の解釈と出力だけを書き、処理は `src/server/` の関数を呼ぶ |

- **必須**: `src/server/map.ts` のように画面からも import するモジュールは、DB・`node:*`・`config.ts` に依存させない。

## 命名と書式

- ファイル名は小文字の `kebab-case`（`review-data.ts`、`review-add.ts`）。
- 関数と変数は `camelCase`、型とクラスは `PascalCase`、モジュール定数は `UPPER_SNAKE_CASE`（`MAX_RETRIES`、`MAP_BOUNDS`）。
- 文字列はシングルクォート、文末にセミコロン、インデント 2 スペース、末尾カンマあり。
- **必須**: 相対 import には拡張子 `.ts` を付ける（`import { openDb } from './db/index.ts'`）。
- **必須**: 型だけの import は `import type` か `type` 修飾子にする（`import { saveReview, type ReviewInput } from ...`）。
- **推奨**: ファイルの先頭に、そのモジュールが何をするかを JSDoc で 1〜3 行書く。CLI は使い方（`npm run ...`）を書く。

## TypeScript

- **推奨**: `any` は Riot API の生レスポンス（`match`、`timeline`）を読むところだけにする。自分で組み立てる値には型を付ける。
- **推奨**: 戻り値の型は推論に任せ、画面と共有する型は `Awaited<ReturnType<typeof fn>>` で export する（`MatchListRow`）。
- **推奨**: 列挙は `as const` の配列と、そこから作った型で表す（`REVIEW_CATEGORIES` / `ReviewCategory`、`ZONES` / `Zone`）。

## 外部 API

- **必須**: Riot API は `RiotClient` を通して呼ぶ。直接 `fetch` しない（レート制限と再試行がそこにある）。
- **必須**: 取った試合詳細とタイムラインは、先に `raw_matches` に保存してから展開する。同じ試合を API から取り直さない。
- **必須**: Data Dragon の取得結果は `data/ddragon/` にキャッシュする。オフラインでもキャッシュがあれば動くようにする。
- **必須**: 名前の解決は `Resolver` を使う。最新版に無い ID は試合当時のパッチ版で補う。

## 取り込み（`ingest.ts`）

- **必須**: `ingestMatch` は同じ試合を何度流しても同じ結果になるようにする（既存行を消してから入れ直す）。
- **必須**: `reviews` は取り込み直しで消さない。
- **必須**: 集計方法を変えたときは、API を使わずに `npm run sync -- --rebuild` で既存の試合に反映できるようにする。

## JSON API（`api.ts`）

- **必須**: クエリ文字列は検証してから使う（数値は `Number.isInteger` で確かめる、列挙は許可した値だけ通す）。不正なら既定値に倒す。
- **必須**: 見つからないときは 404 と `{ error: "<日本語>" }`。例外は `handle` の `catch` が 500 にするので、ルートの中で握りつぶさない。
- 書き込み系の API は作らない。DB への書き込みは CLI から行う（ローカルで認証が無いため）。

## CLI

- **必須**: 機械が読む出力（matchId、JSON）は標準出力、進捗とエラーは標準エラーに出す。`npm run -s` で呼ばれる前提。
- **必須**: 終了コードは 引数エラー 2、処理の失敗 1、成功 0。
- **必須**: 使い方を変えたら、`README.md` の「コマンド」と `.claude/skills/lol-review/SKILL.md` も直す。
- エラーメッセージは長いと切り詰めて出す（`cli/sync.ts` の 600 文字）。

## ログ

- 進捗は `process.stderr.write` か `console.error` で日本語。値は `取り込み: ${id}  ${row.startJst}` のように後ろに並べる。
