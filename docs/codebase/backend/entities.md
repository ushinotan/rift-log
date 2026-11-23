# エンティティ

テーブル定義の正は `src/server/db/schema.ts`（Drizzle、SQLite）。マイグレーションは `drizzle/`（`drizzle-kit generate` で生成）。
DB の接続とマイグレーション適用は `src/server/db/index.ts` の `openDb()`（WAL、`foreign_keys = ON`）。

| テーブル（export 名） | 主キー | 主なカラム | 備考 |
|---|---|---|---|
| `matches`（`matches`） | `match_id` | `game_start_ms`、`start_jst`、`duration_sec`、`result`（勝利 / 敗北 / リメイク）、`win`、`remake`、`my_team_id`、`my_participant_id`、`my_champion(_id)`、`my_role`、`opponent_participant_id?`、`opponent_champion(_id)?`、`patch`、`game_version`、`ddragon_version`、`imported_at` | 自分視点の試合サマリ。1 試合 1 行 |
| `participants` | (`match_id`, `participant_id`) | `puuid`、`is_me`、`team_id`、`win`、`role`、`champion_id`、`champion_key`、`champion`、`player_name`、KDA、`kill_participation`（0〜1）、ダメージ、`gold`、`cs`、`level`、視界系、`runes` / `summoner_spells` / `items`（JSON） | 10 人分 |
| `team_stats`（`teamStats`） | (`match_id`, `team_id`) | `is_my_team`、`win`、`kills`、`towers`、`inhibitors`、`dragons`、`barons`、`heralds`、`void_grubs`、`atakhans`、`first_blood` / `first_tower` / `first_dragon` | match-v5 の `teams[].objectives` |
| `events` | `id`（autoincrement） | `time_sec`、`type`（キル / タワー / ドラゴン など日本語）、`detail?`、`team_id`（取った側）、`is_ally`、`killer?`、`victim?`、`assists?`（JSON）、`involves_me`、`my_involvement?`、`x?`、`y?` | タイムライン。index `events_match_idx (match_id, time_sec)` |
| `item_events`（`itemEvents`） | `id` | `time_sec`、`action`（購入 / 売却 / 取り消し）、`item_id`、`item` | 自分のアイテム。index `item_events_match_idx` |
| `skill_order`（`skillOrder`） | (`match_id`, `level`) | `time_sec`、`slot`（Q/W/E/R）、`skill` | 自分のスキル上げ順 |
| `frames` | (`match_id`, `minute`, `participant_id`) | `gold`、`cs`、`xp`、`level` | 1 分ごとのスナップショット |
| `reviews` | `id` | `category`（良かった点 / 改善点 / 次の目標）、`position`、`item`、`detail`、`created_at` | 振り返り。取り込み直しても消えない。index `reviews_match_idx` |
| `raw_matches`（`rawMatches`） | `match_id` | `match`（JSON）、`timeline?`（JSON）、`fetched_at` | API の生レスポンス。`--rebuild` の元データ |
| `meta` | `key` | `value` | `puuid:<gameName>#<tagLine>` の PUUID キャッシュなど |

- `matches` 以外の試合系テーブルは `match_id → matches.match_id ON DELETE CASCADE`。`raw_matches` と `meta` には外部キーが無い。
- 真偽値は `integer(..., { mode: 'boolean' })`、JSON は `text(..., { mode: 'json' })`。
- 表示用の日本語ラベル（ロール、モンスター、タワー、振り返りカテゴリ）は `src/server/labels.ts`。
