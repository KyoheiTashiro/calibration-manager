import { fileURLToPath, URL } from "node:url";

import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

// なぜ: vite.config.tsのbaseとPWAプラグインは本番ビルド専用の関心事でStorybook自体のアセットパスを
// 壊すため、main.tsではStorybookに必要な最小限（@/エイリアスとTailwind）だけを再構築し、
// vite.config.tsをインポート/拡張しない。base: "/" で上書きしないとGitHub Pages用の
// サブパスがStorybookの静的アセット参照にそのまま残ってしまう。
// なお@storybook/builder-viteはviteConfigPath未指定だとルートのvite.config.tsを自動検出して
// しまうため、下記framework.options.builderで空のviteConfig.stub.tsを明示的に指定し回避する。

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: ".storybook/viteConfig.stub.ts",
      },
    },
  },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      base: "/",
      resolve: {
        alias: {
          "@": fileURLToPath(new URL("../src", import.meta.url)),
        },
      },
      plugins: [tailwindcss()],
    }),
};

export default config;
