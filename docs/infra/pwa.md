# PWA設計

本書は [domain-model.md](../domain-model.md) §5・§6 に基づくインフラ設計書である。

## 1. 構成

- `vite-plugin-pwa` 使用。`registerType: 'autoUpdate'`
- `dev` 環境でも `devOptions.enabled: true` で SW デバッグ可

## 2. manifest

`vite.config.ts` の定義（正）:

```json
{
  "name": "機器点検・校正管理",
  "short_name": "機器点検・校正管理",
  "description": "機器の点検・校正の期限を管理し、担当者へ通知する",
  "start_url": "/calibration-manager/",
  "scope": "/calibration-manager/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#1d4ed8",
  "lang": "ja",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## 3. Service Worker キャッシュ戦略

- アプリシェル（JS/CSS/HTML/SVG/PNG/webmanifest）: **precache**（Workbox `precacheAndRoute`）→ 完全オフライン動作
  - `workbox.globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"]` で対象ファイルを指定
- 外部API: 無し（全データLocalStorage）→ ネットワークキャッシュ戦略 不要

## 4. 更新フロー

- `autoUpdate`: 新 SW 検出時に自動でアクティベートし、ページを自動リロードする

## 5. オフライン制約

- 全機能オフライン動作（永続層がLocalStorageのみのため）
- 初回アクセスのみオンライン必須

## 6. 通知とオフライン動作

- 通知はアプリ内通知のみ（`Notification` エンティティ、domain-model.md §3.7）。バックエンドが無いため Push 通知・メール実送信は行わない
- 通知の生成はアプリ起動時・日付変更時に全項目をスキャンして行う（domain-model.md §3.7）
- このスキャンは Service Worker の Push とは無関係で、今日の日付と LocalStorage 上のデータを突き合わせるだけのアプリ内ロジック（JS）である。そのためオフラインでも常に正常に動作する

## 7. GH Pages との注意点

- `start_url` / `scope` はサブパス `/calibration-manager/` を含める
- `vite.config.ts` の `base` と一致必須
- アイコンパスは相対 (`icons/...`) で manifest 内記述
