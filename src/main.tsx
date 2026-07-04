import App from "@/App";
import { ErrorBoundary } from "@/components/system";
import { setupPwaInstallCapture } from "@/features/settings/components/pwa/usePwaInstall";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

// なぜ副作用importとして許可するか: Tailwindのグローバルスタイル・トークン定義（@theme）を
// アプリ全体に適用するためエントリポイントで一度だけ読み込む必要がある
// （.oxlintrc.json の overrides で本ファイルを許可リスト化済み）。
import "@/styles/index.css";

// なぜ: GitHub Pagesは任意パスへのフォールバックができず、`BrowserRouter` では
// 深いパスへの直接アクセス・リロードが404になるため `HashRouter` を採用する
// （docs/architecture/tech-stack.md「HashRouter採用理由」）。
// なぜmain.tsxで直接登録するか: Reactの再レンダーに左右されず、
// アプリ起動時に一度だけService Workerを登録すればよいため、
// フック化はせずエントリポイントで直接 `registerSW` を呼ぶ（docs/infra/pwa.md §1・§4 autoUpdate）。
registerSW({ immediate: true });

// なぜ main.tsx で登録するか: `beforeinstallprompt` はページロード直後に一度だけ発火する非標準イベントのため、
// 設定画面のコンポーネントがマウントされた時点では既に発火済みで手遅れになりうる。
// そのため起動時に捕捉して保持し、設定画面は保持済みの状態を購読するだけにする。
setupPwaInstallCapture();

// なぜ動的import + DEVガードか: シードデータを本番バンドルへ含めないため。
// import.meta.env.DEV が false のときは Rollup がデッドコード除去しチャンク自体を生成しない。
if (import.meta.env.DEV) {
  const { seedIfEmpty } = await import("@/dev/seed");
  seedIfEmpty();
}

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("root要素が見つかりません");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
