import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // なぜ: GitHub Pagesはリポジトリ名がサブパスになるため、
  // 本番アセットの参照パスをすべて `/calibration-manager/` 起点にする必要がある
  // （docs/infra/deploy.md「Vite設定」）。manifestの start_url/scope とも一致させる。
  base: "/calibration-manager/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
      manifest: {
        name: "機器点検校正管理",
        short_name: "機器点検校正管理",
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
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      },
    }),
  ],
});
