# コンポーネント（frontend）

`src/web/`。コンポーネントライブラリは使わない。

| ファイル | export | 内容 |
|---|---|---|
| `lib.tsx` | `useApi` | `fetch` + 読み込み中 / エラー / データの状態。アンマウント後は state を更新しない |
| `lib.tsx` | `useDdragonVersion` | 起動時に 1 回 `/api/ddragon` を取り、画像 URL 用のバージョンを配る |
| `lib.tsx` | `ChampIcon`、`ItemIcon`、`ResultBadge`、`ChartTooltip` | アイコン（Data Dragon の CDN 画像、失敗したら非表示）、勝敗バッジ、Recharts のツールチップ |
| `lib.tsx` | `fmt`、`mmss`、`navigate` | 数値の書式（`ja-JP`）、分:秒、ハッシュ遷移 |
| `DeathMap.tsx` | `DeathMap`、`DeathMapLegend`、`TIME_BANDS`、`bandOf`、`isExecution`、`isSolo`、`describePoint`、`Bounds` | デスマップの SVG。色 = 時間帯、形 = 人数、塗り = デス / 輪 = キル |
| `styles.css` | — | すべてのスタイル。色は `:root` の CSS 変数（`--bg`、`--surface`、`--ally`、`--enemy`、`--dm-*` など）で、`prefers-color-scheme: dark` で切り替え |

- 座標まわりは `src/server/map.ts` を import して使う（サーバーと同じ定義）。
