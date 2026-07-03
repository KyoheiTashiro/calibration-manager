// なぜ: tsconfig.node.jsonはNode向け設定ファイル用でありsrc/vite-env.d.tsの型参照
// （vite/client）が及ばず、CSSの副作用importにアンビエント型宣言が必要になる。
// このファイル単体で完結させるため参照をここに明示する。
/// <reference types="vite/client" />

import type { Preview } from "@storybook/react-vite";

// なぜ副作用importとして許可するか: Tailwindのグローバルスタイル・トークン定義（@theme）を
// Storybookのプレビュー全体に適用するため（src/main.tsxと同じCSSエントリを読み込む）。
import "../src/styles/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        light: { name: "Light", value: "#ffffff" },
        dark: { name: "Dark", value: "#0f172a" },
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
