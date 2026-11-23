# CodeBase マップ

League of Legends のランク戦（JP サーバー）を取り込んで振り返るローカルアプリのコード地図です。
factory プラグイン（PO / DEV / CR）がコードを開く前に読み、DEV の doc-sync が変更に合わせて更新します。

- [overview.md](overview.md): スタック、構成、共通の約束事
- backend（`src/server/`、`src/cli/`）
  - [entities.md](backend/entities.md): テーブル
  - [routes-map.md](backend/routes-map.md): JSON API（`/api/*`）と `npm run` コマンド
  - [services-map.md](backend/services-map.md): 取り込み、集計、Riot API・Data Dragon クライアント
- frontend（`src/web/`）
  - [pages.md](frontend/pages.md): 画面
  - [components-map.md](frontend/components-map.md): 共通部品とフック
