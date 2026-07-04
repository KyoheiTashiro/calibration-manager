# calibration-manager

機器点検・校正期限管理アプリ。機器の点検・校正の期限を管理し、担当者へ通知する。

バックエンドなし・LocalStorage永続化・CSVバックアップ。PWA として完全オフライン動作。

React 19 + TypeScript + Vite / Zustand / Tailwind CSS 4

## セットアップ

要件: Node.js >= 24

```bash
npm install
npm run dev
```

ビルドは `npm run build`、テストは `npm test`。その他のスクリプトは [package.json](package.json) 参照。

## ドキュメント

仕様・設計・規約の詳細は [`docs/`](docs/README.md) 参照。

## ライセンス

[MIT](LICENSE)
