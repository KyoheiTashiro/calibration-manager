/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * 非標準 API `beforeinstallprompt`(Chromium系のみ)の型宣言。
 * lib.dom.d.ts に収録されていないため自前で宣言する。
 */
type BeforeInstallPromptEvent = Event & {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

// oxlint-disable-next-line typescript/consistent-type-definitions -- lib.dom.d.ts の WindowEventMap への型合成(宣言マージ)は interface でしか行えないため。
interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}
