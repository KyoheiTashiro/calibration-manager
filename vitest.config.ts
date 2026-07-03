import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// なぜ: vite.config.ts とtest設定を混ぜず本ファイルに分離する（タスク指示・coding-standards方針）。
// PWAプラグイン・Tailwindプラグインはビルド専用であり、テスト実行には不要なため含めない。
export default defineConfig({
  plugins: [
    // なぜ: Testing Libraryでコンポーネントをrenderする際にJSXを変換するために必要
    // （vite.config.tsと同じプラグインをテストでも使い、本番ビルドとの差異を減らす）。
    react(),
  ],
  resolve: {
    alias: {
      // なぜ: vite.config.ts と同じ `@/` エイリアスをテスト実行時にも解決できるようにする
      // （エイリアスがビルドとテストで食い違うと import 解決が壊れるため一致させる）。
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    // なぜ: zustand persist が localStorage を参照するため node 環境では警告が出る。
    // コンポーネントテストにも必須のため jsdom に環境を統一する（docs/testing.md）。
    environment: "jsdom",
    // なぜ: jest-dom matcher 読み込み・dialog polyfill などテスト前共通処理をまとめる。
    setupFiles: "./vitest.setup.ts",
    // なぜ: Phase 0時点ではsrc配下の実装がsmokeテスト以外に存在しないため、
    // テスト0件でもCIを失敗させないようにする（後続フェーズで実装が増えれば自然に意味を持つ）。
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      // なぜ: docs/testing.md のラチェット方式に基づく最終確定値（Phase 11）。
      // 実測（domain/utils 100%、store 99.5/98.7/95.8/99.2）に対し数%の余白を残しつつ、
      // testing.md の暫定目標値を下回らない値で固定する。引き下げ禁止（CLAUDE.md）。
      thresholds: {
        "src/domain/**": { lines: 98, functions: 100, branches: 98, statements: 98 },
        "src/store/**": { lines: 97, functions: 96, branches: 92, statements: 97 },
        "src/utils/id.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "src/utils/csv.ts": { lines: 97, functions: 95, branches: 90, statements: 97 },
      },
    },
  },
});
