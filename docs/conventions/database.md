# データベース（`src/server/db/schema.ts` / `drizzle/`）

SQLite（libSQL、`data/rift-log.db`）+ Drizzle ORM。

## スキーマの正とマイグレーション

- **必須**: スキーマの正は `src/server/db/schema.ts`。変えたら `npm run db:generate` で `drizzle/` にマイグレーションを作り、同じ PR に入れる。
- **必須**: 生成された SQL と `drizzle/meta/` は手で書き換えない。間違えたら生成し直す。
- マイグレーションは `openDb()` が起動時に自動で適用する。
- **必須**: 追加するカラムは NULL を許すか既定値を付ける（既存の DB に行があるため）。
- **推奨**: 派生テーブル（`matches`、`participants`、`events` など）の形を大きく変えるときは、マイグレーションで変換するより、テーブルを作り直して `npm run sync -- --rebuild` で埋め直す。`raw_matches` と `reviews` は作り直せないので、消したり形を壊したりしない。

## 命名と型

- テーブル名は複数形の `snake_case`（`item_events`）、カラム名も `snake_case`。TypeScript 側のプロパティは `camelCase`（`matchId: text('match_id')`）。
- 試合系のテーブルは `match_id` で `matches` を参照し、`onDelete: 'cascade'` を付ける。
- 真偽値は `integer(..., { mode: 'boolean' })`、配列やオブジェクトは `text(..., { mode: 'json' })`。JSON カラムには中身の形をコメントで書く。
- 時刻は試合の開始が UNIX ミリ秒の `integer`、試合内が秒の `integer`（`time_sec`）、保存日時が ISO 8601 の `text`。
- **必須**: 日本語の値を入れるカラム（`result`、`type`、`category` など）には、取りうる値をコメントで書く。
- 検索に使う列にはインデックスを張る（`index('events_match_idx').on(t.matchId, t.timeSec)`）。

## クエリ

- **必須**: SQL を文字列で組み立てない。Drizzle のクエリビルダー（`db.select()`、`db.query.*`、`eq` / `inArray` など）を使う。
- **推奨**: `inArray` に空配列を渡さない（`ids.length ? ... : []` で分ける）。
- **必須**: スキーマを変えたら `docs/codebase/backend/entities.md` も同じ PR で直す。
