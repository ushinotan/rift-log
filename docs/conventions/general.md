# 全体共通

## 言語

- **必須**: ドキュメント、コメント、JSDoc、コミットメッセージ、PR、Issue は日本語で書く。
- **必須**: 画面と CLI の出力（エラーメッセージ、進捗ログ）は日本語。
- **必須**: チャンピオン・アイテム・ルーン・スペル・スキルの名前は Data Dragon の ja_JP で表示する。英語名を直書きしない。
- **必須**: 識別子（関数名、変数名、型名、ファイル名）は英語。ただし振り返り JSON のキー（`良かった点`、`項目` など）と、DB に入れる日本語の値（`勝利`、`改善点` など）は既存の形に合わせる。

## ブランチ

- `master` が基点。PR は `master` 向けに出す。前の PR に積む場合は、その PR のブランチ向けでよい（例: #7 → `feature/design-tokens`）。
- **必須**: `master` に直接 push しない。
- **推奨**: ブランチ名は機能なら `feature/<短い説明>`、バグ修正なら `bugfix/<短い説明>`。AI エージェントのブランチは `claude/*` のままでよい。

## コミットメッセージ

形式は `<type><gitmoji>(<scope>): <日本語の要約>` です。Issue があれば末尾に `（#番号）` を付けます。

```
feat✨(web): デスマップを追加（#3）
fix🐛(server): レッド側の座標を川の対角線で反転する
refactor♻️(web): 数値の書式を lib.tsx にまとめる
docs📝: factory プラグイン用の CodeBase マップ docs/codebase を追加
```

| type | gitmoji | 用途 |
| --- | --- | --- |
| `feat` | ✨ | 機能追加 |
| `fix` | 🐛 | バグ修正 |
| `refactor` | ♻️ | 振る舞いを変えない整理 |
| `style` | 💄 | 見た目（CSS、レイアウト）だけの変更 |
| `test` | ✅ | テストの追加・修正 |
| `docs` | 📝 | ドキュメント |
| `chore` | 🔧 / 🔒 / ⬆️ | 設定、セキュリティ、依存更新など |

- scope は `server` / `cli` / `web` / `db` / `skill`（`.claude/skills/`）/ `conventions` など変更した場所。複数にまたがるなら省略してよい。
- **必須**: 要約は「何をしたか」が分かる一文にする。末尾に句点は付けない。
- **推奨**: 1 コミットには 1 つの目的だけを入れる。
- この規約より前のコミットは日本語の要約だけの形式（例: `デスマップを追加（#3）`）。直さなくてよい。

## PR

- **必須**: 本文は `.github/pull_request_template.md`（機能は `PULL_REQUEST_TEMPLATE/feature.md`、バグ修正は `bugfix.md`）を埋める。先頭の `Closes #番号` は消さない（factory の github ドライバーが PR と issue を結び付けるのに使う）。
- **必須**: 当てはまらない節は消さずに「なし」と書く。
- **必須**: `## 確認` は「CI（PR で自動で回る）」と「手で確かめたこと」に分かれている。CI の欄には `typecheck` の結果（手元でも `npm run typecheck` を通したこと）を、手で確かめたことの欄には、画面を変えたなら確認した試合（matchId）とライト / ダークモードの両方を見たことを書く。
- **必須**: CI（`.github/workflows/pr-test.yml`）が通ってからマージする。
- **必須**: DB スキーマ、`npm run match` の出力の形、振り返り JSON の形を変えたら、PR に書き、`README.md` と `.claude/skills/lol-review/SKILL.md` も同じ PR で直す。
- **必須**: `docs/codebase/` の地図と食い違う変更をしたら、同じ PR で地図も直す。
- **推奨**: 画面を変えたらスクリーンショットを付ける。

## 秘密情報と設定

- **必須**: Riot API キーをコード・ログ・PR・Issue に書かない。`.env` はコミットしない。キーを推測・入力しない（失効したら人間に再発行してもらう）。
- **必須**: 新しい環境変数を足したら `.env.example` にコメント付きで追記し、`config.ts` で既定値を決める。
- **必須**: `data/`（DB、Data Dragon のキャッシュ）はコミットしない。

## 時刻

- **必須**: 試合の時刻は UNIX ミリ秒（`gameStartMs`）を正とし、表示用の JST 文字列は `labels.ts` の `toJst` で作る。
- **必須**: 試合内の時刻は秒（`timeSec`）で持ち、表示は `mmss` で `分:秒` にする。
- 保存日時（`importedAt`、`createdAt`、`fetchedAt`）は `new Date().toISOString()`。

## レビュー

- レビューは観点ごとのレビュアー（TypeScript / React / DB / セキュリティ）に分けて行い、指摘は `[MUST]`（直さないとマージしない）→ `[SHOULD]`（基本は直す）→ `[IMO]`（任意）のラベルを付ける。
- **必須**: PR への投稿は、まとめコメントではなくインラインコメント（1 件のレビューに各指摘を `comments[]` で入れる）にする。総評・良かった点・差分外の行への指摘はレビュー本文に書く。
- factory の `/factory:cr` を使うときは、issue に `ready-for-review` ラベルを付けてから実行する（`docs/factory.config.md` の Project notes）。
