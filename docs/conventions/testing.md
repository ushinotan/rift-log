# テストと確認

テストランナー、リンター、E2E はまだ入っていません。入れるときはこのファイルと `docs/factory.config.md` の `stack.*.test` / `tests.*` / `docker.run` を同じ PR で埋めます。

## 今の確認方法

- **必須**: PR を出す前に型検査を通す。

  ```bash
  npm run typecheck
  ```

- **必須**: 画面や API を変えたら、開発サーバーで実際に確かめる。

  ```bash
  npm run dev
  ```

  http://localhost:5173 を開き、変えた画面（または `/api/*`）を見る。ブルー側とレッド側の試合の両方、ライト / ダークモードの両方を確かめ、使った matchId を PR の `## 確認` に書く。
- **必須**: 取り込み（`ingest.ts`、`sync.ts`）や集計を変えたら、`npm run sync -- --rebuild` が通り、既存の振り返りが消えていないことを確かめる。
- **必須**: CLI の出力を変えたら、`npm run -s match -- <matchId>` などを実際に流し、`lol-review` スキルの手順どおりに使えることを確かめる。
- Riot API キーが失効していたら、API を使う確認は飛ばして PR にそう書く（キーは人間が再発行する）。

## テストを入れるとき

- **推奨**: 最初は DB や API に依存しない純粋関数から（`map.ts` の `normalizePos` / `zoneOf`、`labels.ts` の `toJst` / `mmss`、`DeathMap.tsx` の `isSolo` / `isExecution`、`summarize`）。
- **推奨**: 取り込みのテストは、`raw_matches` に保存された生データを小さく切り出したフィクスチャで行い、Riot API を呼ばない。
- **必須**: テストで Riot API キーを使わない。ネットワークに出ない。
