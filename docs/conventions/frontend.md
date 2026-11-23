# frontend（`src/web/`）

React 19 + TypeScript（strict）+ Vite 8。ルーターと UI ライブラリは使わない。グラフは Recharts 3。

## ディレクトリ構成

| 場所 | 置くもの |
| --- | --- |
| `main.tsx` | 入口、ヘッダー、`location.hash` による画面の切り替え |
| `pages/*.tsx` | 画面と、その画面だけで使う部品（同じファイル内の関数コンポーネント） |
| `lib.tsx` | 画面をまたいで使うフック、アイコン、書式の関数 |
| `DeathMap.tsx` など | 複数の画面で使う大きめの部品 |
| `styles.css` | すべてのスタイル |

- **必須**: データは `/api/*` から取る。`src/server/` の DB に触るモジュールを import しない。共有してよいのは `map.ts` のような依存の無いモジュールと、`import type` での型だけ。

## 命名と書式

- コンポーネントのファイル名は `PascalCase.tsx`（`MatchDetail.tsx`）、それ以外は小文字（`lib.tsx`）。
- コンポーネントは `PascalCase` の名前付き export（`export function MatchList`）。`export default` は使わない。
- 文字列はシングルクォート、文末にセミコロン、インデント 2 スペース。JSX の属性はダブルクォート。
- **必須**: 相対 import には拡張子（`.tsx` / `.ts`）を付ける。

## データの取得と状態

- **必須**: API は `useApi` で取る。自前で `useEffect` + `fetch` を書くときは、アンマウント後に state を更新しないようにする（`let alive = true` とクリーンアップ関数）。
- **必須**: 読み込み中・エラー・データなしの 3 状態をそれぞれ表示する（`<div className="card empty">` / `card muted` と日本語の文言）。データなしのときは次にすること（`npm run sync` など）を書く。
- **推奨**: 絞り込みなどの状態は URL のハッシュのクエリ（`#/?result=勝利`）に持たせ、リロードやリンクで再現できるようにする。

## スタイル

- **必須**: 色は `styles.css` の `:root` の CSS 変数（`--text`、`--surface`、`--ally`、`--enemy` など）を使い、コンポーネントに色コードを直接書かない。新しい色は変数を足し、`prefers-color-scheme: dark` 側にも値を書く。
- **必須**: 味方は `--ally`（青）、敵は `--enemy`（赤）、自分の行は `--me-bg` で表す。
- **必須**: ライトとダークの両方で見えることを確かめる。
- **推奨**: インライン `style` は計算が必要な値（グラフの高さ、`maxWidth` など）に限る。
- **推奨**: 数値は `fmt`（`ja-JP` の桁区切り）、時刻は `mmss` で表示する。

## アクセシビリティ

- **必須**: アイコン画像には `alt` と `title` にチャンピオン名・アイテム名を入れる。
- **推奨**: 色だけで意味を伝えない（デスマップは色に加えて形・塗りで区別している）。
