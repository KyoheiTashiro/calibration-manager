import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// なぜ: vitestのtest設定はこのファイルに混ぜず vitest.config.ts に分離する
// （coding-standards.md の設定分離方針・タスク指示に基づく）。
// このファイルはビルド・開発サーバー・PWA生成のみを担う。
export default defineConfig({
  // なぜ: GitHub Pagesはリポジトリ名がサブパスになるため、
  // 本番アセットの参照パスをすべて `/calibration-manager/` 起点にする必要がある
  // （docs/infra/deploy.md「Vite設定」）。manifestの start_url/scope とも一致させる。
  base: "/calibration-manager/",
  resolve: {
    alias: {
      // なぜ: `../../` のような相対パスの深いネストを避け可読性を保つため、
      // `@/` を `./src` に解決する（directory-structure.md・coding-standards.md §6）。
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  plugins: [
    // なぜ: React 19のJSX変換・Fast Refreshを有効化する標準プラグイン。
    react(),
    // なぜ: Tailwind CSS 4はPostCSS設定ファイルを介さずVite専用プラグインで動作させる方式を採用する
    // （tailwindcss@4のこのバージョンから推奨される構成。docs/design/ui-guidelines.md §12参照）。
    tailwindcss(),
    // なぜ: 現場での機器点検作業中に通信が不安定でもアプリを起動できるようにするため、
    // Workboxベースの自動SW生成・manifest生成を行う（docs/infra/pwa.md §1・§5）。
    VitePWA({
      // なぜ: 新SW検出時に自動アクティベート・自動リロードし、
      // 利用者に手動更新を意識させない（docs/infra/pwa.md §4）。
      registerType: "autoUpdate",
      // なぜ: 開発環境でもSWの動作をデバッグできるようにする（docs/infra/pwa.md §1）。
      devOptions: {
        enabled: true,
      },
      // なぜ: docs/infra/pwa.md §2 のmanifest定義（正）と一言一句一致させる。
      // GH Pages対応のため `start_url`/`scope` は base と同じ `/calibration-manager/` を指す。
      manifest: {
        name: "機器点検・校正管理",
        short_name: "機器点検・校正管理",
        description: "機器の点検・校正の期限を管理し、担当者へ通知する",
        start_url: "/calibration-manager/",
        scope: "/calibration-manager/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#1d4ed8",
        lang: "ja",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // なぜ: アプリシェル一式をprecacheし完全オフライン動作を実現する。
        // 外部APIを持たないため（全データLocalStorage）ネットワークキャッシュ戦略は不要
        // （docs/infra/pwa.md §3）。
        // woff2 を含める理由: @fontsource/noto-sans-jp のサブセットフォントは CSS から
        // 遅延読み込みされるため、precache しないとオフライン時に未取得サブセットが
        // フォールバック表示になる（D-033）。woff は woff2 対応ブラウザ（=SW対応ブラウザ全て）
        // では使われないため precache 対象外とし容量を半減する。
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
      },
    }),
  ],
});
