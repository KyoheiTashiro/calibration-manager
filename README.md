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

その他のスクリプトは [package.json](package.json) 参照。

## ドキュメント

仕様・設計・規約の詳細は [`docs/`](docs/README.md) 参照。

## ライセンス

[MIT](LICENSE)

本アプリは単一端末・LocalStorage 保存を前提としており、ログイン機能・アカウントごとの権限管理・DB サーバーによる複数人でのデータ共有などは提供しない。必要な場合は MIT ライセンスの範囲で自由に改変・拡張してよい。
