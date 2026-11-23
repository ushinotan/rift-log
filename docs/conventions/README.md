# コーディング規約

このリポジトリでコードを書くときのルールです。人間も AI エージェントも同じものに従います。
既存のコードから読み取れる書き方をもとにしており、コードと規約が食い違ったら規約に合わせて直します（直すのは触ったついでで構いません）。

- [general.md](general.md): 全体共通（言語、ブランチ、コミット、PR、秘密情報）
- [backend.md](backend.md): `src/server/` と `src/cli/`（Node.js + TypeScript）
- [frontend.md](frontend.md): `src/web/`（React 19 + Vite）
- [database.md](database.md): `src/server/db/schema.ts` と `drizzle/`
- [testing.md](testing.md): 確認のしかた（テストはまだ無い）

## 用語

- **必須**: 守らないとレビューで差し戻す。
- **推奨**: 理由があれば外れてよい。外れるときは PR かコメントに理由を書く。

## 規約を変えるとき

規約の変更は単独の PR（`docs📝(conventions): ...`）で出します。既存コードの一括書き換えが必要なら、規約の PR とは分けます。
