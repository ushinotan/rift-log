# Rift Log

League of Legends（JP サーバー）の **ランク ソロ/デュオ** の試合を Riot API から取り込んで SQLite に貯め、
試合ごとの振り返りと、試合をまたいだ傾向分析をするローカルアプリです。

- 対象サモナー: **牛乃タン#SION**（JP1 / asia）
- 対象: ランク ソロ/デュオ（queueId 420）のみ。ノーマル戦などは取り込みません
- チャンピオン・アイテム・ルーン・サモナースペル・スキル名は Data Dragon の **ja_JP（日本語版の正式名称）** で保存・表示します

## 日々の使い方

試合が終わったら、このフォルダで Claude Code を開いて

> ランク戦を振り返って

と言うだけです。Claude Code が次の流れで動きます（`.claude/skills/lol-review/SKILL.md`）。

1. `npm run sync` で新しいランク戦を取り込む
2. 振り返りがまだない試合ごとに `npm run match` でデータを読む
3. データの数字を引用して「良かった点」「改善点」（3〜5個ずつ）と「次の目標」（1つ）を書く。過去の試合で同じ改善点が続いていれば指摘する
4. `npm run review:add` で保存し、要点をチャットで報告する

結果はアプリで見られます。

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

> 開発用 API キーは **24時間で失効** します。「API キーが無効か期限切れです」と出たら、下の手順で再発行して `.env` を書き換えてください。

## セットアップ

必要なもの: Node.js 22 以上

### 1. Riot API キーを取得する

1. https://developer.riotgames.com/ に Riot アカウントでログインする
2. ダッシュボードの **DEVELOPMENT API KEY** の「REGENERATE API KEY」を押す（reCAPTCHA があれば通す）
3. 表示された `RGAPI-...` のキーをコピーする

開発キーの制限は 20リクエスト/秒・100リクエスト/2分 で、24時間ごとに再発行が必要です。
毎回の再発行が面倒なら、同じページから Personal API Key を申請できます（審査あり・失効しない）。

### 2. インストールとキーの設定

```bash
npm install
```

`.env.example` を `.env` にコピーし、`RIOT_API_KEY=` の後ろにキーを貼ります。`.env` は `.gitignore` 済みなのでコミットされません。

```bash
cp .env.example .env
```

### 3. 最初の取り込み

```bash
npm run sync
```

初回は直近14日分のランク戦を取り込みます（2回目以降は前回の最新試合以降だけ）。
取り込み済みの試合はスキップするので、何回実行しても重複しません。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | アプリを起動（http://localhost:5173） |
| `npm run sync` | 新しいランク戦を取り込み、取り込んだ matchId を出力 |
| `npm run sync -- --days 60` | 60日前まで遡って取り込む |
| `npm run sync -- --at 1794831057000` | OP.GG の試合 URL の末尾の数字（UNIX ミリ秒。実際は試合終了時刻に近い）から試合を特定して取り込む |
| `npm run sync -- --rebuild` | 保存済みの生データから全試合を作り直す（API は使わない。Data Dragon 更新時など） |
| `npm run -s pending` | 振り返りがまだない試合の matchId を古い順に出力 |
| `npm run -s match -- <matchId>` | 振り返りを書くための試合データを JSON で出力 |
| `npm run review:add -- <matchId> <file.json>` | 振り返りを保存（同じ試合の分は上書き） |

`-s` を付けると npm のヘッダー行が出ないので、JSON をそのまま他のツールに渡せます。

振り返り JSON の形式:

```json
{
  "良かった点": [{ "項目": "レーン戦でCS差", "詳細": "CSは対面に65差で勝ち（245 vs 180）" }],
  "改善点": [{ "項目": "ヴォイドグラブを取られた", "詳細": "0-6。3試合連続で取られている" }],
  "次の目標": [{ "項目": "15分までのデス0", "詳細": "..." }]
}
```

## 画面

- **試合一覧**: 日時・結果・チャンピオン・ロール・対面・KDA・CS/分・キル関与。上部に通算の試合数・勝率・KDA・平均デス・CS/分・キル関与。結果・チャンピオン・ロールで絞り込み
- **試合詳細**: 概要（結果・時間・KDA・ルーン・スペル・スキル順）、対面との比較、ゴールド差の推移、オブジェクト、10人分のスタッツ（自分の行を強調）、タイムライン（味方/敵で色分け、自分の関与に★）、ビルド順、振り返り
- **傾向**: チャンピオン別・ロール別・対面別の勝率と KDA、CS/分・デス数・キル関与の推移、オブジェクト獲得率、よく出る改善点

## 構成

```
src/
  server/
    db/schema.ts    Drizzle のテーブル定義（matches, participants, team_stats, events,
                    item_events, skill_order, frames, reviews, raw_matches）
    riot.ts         Riot API クライアント（レート制限・429 の Retry-After 対応）
    ddragon.ts      Data Dragon ja_JP の取得とキャッシュ（data/ddragon/）
    ingest.ts       試合詳細＋タイムライン → 各テーブル
    sync.ts         取り込み処理
    queries.ts      一覧・詳細・傾向の集計、振り返りの保存
    review-data.ts  npm run match の出力
    api.ts          アプリ用 JSON API（Vite 開発サーバー上で動く）
  cli/              npm run の各コマンド
  web/              React の画面
drizzle/            マイグレーション（起動時に自動適用）
data/               SQLite DB と Data Dragon キャッシュ（.gitignore 済み）
```

- DB は `data/rift-log.db`（SQLite / libSQL + Drizzle ORM）。
- API の生レスポンスを `raw_matches` に保存しているので、集計方法を変えても `npm run sync -- --rebuild` で API を叩かずに作り直せます。
- スキーマを変えたら `npm run db:generate` でマイグレーションを作成します（次回起動時に自動適用）。
- 名前は Data Dragon の最新版 ja_JP で解決し、最新版で削除されたアイテムなどは試合当時のパッチ版で補います。ルーンのステータスシャードは Data Dragon に日本語名がないため扱っていません。
