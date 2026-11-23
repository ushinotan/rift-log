# 画面（frontend）

入口は `index.html` → `src/web/main.tsx`。ルーターは使わず、`location.hash` を `useHash` で読んで切り替える。
データは `useApi`（`lib.tsx`）で `/api/*` を `fetch` して取る。

| ハッシュ | コンポーネント | 内容 |
|---|---|---|
| `#/`（`?result=&champion=&role=`） | `pages/MatchList.tsx` の `MatchList` | 通算サマリのタイル、絞り込み、試合一覧（`/api/matches`）。行クリックで詳細へ |
| `#/match/{matchId}` | `pages/MatchDetail.tsx` の `MatchDetail` | 概要（ルーン・スペル・スキル順）、対面との比較、ゴールド差の推移、オブジェクト、全員のスタッツ、タイムライン + ミニマップ（`/api/deaths?kind=both&matchId=`）、ビルド、振り返り（`/api/matches/{id}`） |
| `#/trends` | `pages/Trends.tsx` の `Trends` | 勝率・KDA（チャンピオン / ロール / 対面別）、推移グラフ、デスマップ（`DeathMapSection`）、オブジェクト獲得率、よく出る改善点（`/api/trends`） |

- `pages/DeathMapSection.tsx`: 傾向ページのデスマップ。フィルタ（チャンピオン・ロール・直近 N 試合・キル表示・自陣を左下に揃える）と時間帯別・エリア別の表（`/api/deaths`、`/api/filter-options`）。
- ヘッダーとナビは `main.tsx` の `App`。対象サモナー名はここに直書き。
