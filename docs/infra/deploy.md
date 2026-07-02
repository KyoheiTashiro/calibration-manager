# デプロイ

本書は [domain-model.md](../domain-model.md) §5・§6 に基づくインフラ設計書である。

## GitHub Actions ワークフロー

`.github/workflows/deploy.yml` の構成（設計値。pinpon-match-manage 踏襲。実装後は実装が正）:

- **trigger**: `main` ブランチへの push + `workflow_dispatch`（手動実行）
- **runner**: `ubuntu-slim`
- **Node**: 24
- **ジョブ分離**: `build` ジョブと `deploy` ジョブに分離
- **concurrency**: `group: pages`、`cancel-in-progress: true`（重複実行を自動キャンセル）

### build ジョブ

1. `actions/checkout@v7`
2. `actions/setup-node@v6` (Node 24、npm キャッシュ有効)
3. `npm ci`
4. `npm run build`
5. `actions/configure-pages@v6`
6. `actions/upload-pages-artifact@v5` (`path: dist`)

### deploy ジョブ

- `needs: build`
- `actions/deploy-pages@v5` で GitHub Pages へデプロイ
- environment: `github-pages`

## Vite 設定

- `vite.config.ts` に `base: '/calibration-manager/'` 設定（リポジトリ名）
- `vite-plugin-pwa` が `dist/sw.js` `dist/manifest.webmanifest` 自動生成
- HashRouter のため SW スコープと干渉なし

## バックエンドなしの静的サイトである点

- 本アプリはバックエンド・外部APIを一切持たない（domain-model.md 冒頭）
- ビルド成果物（`dist`）はすべて静的アセットであり、GitHub Pages 単体でホスティング完結する
- CSVバックアップ・LocalStorage永続化を含め、サーバー側の処理は存在しない
