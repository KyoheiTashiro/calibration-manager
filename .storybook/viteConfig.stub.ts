import { defineConfig } from "vite";

// なぜ: @storybook/builder-vite はviteConfigPathを明示しない場合、
// プロジェクトルートのvite.config.tsを自動検出してベース設定として読み込んでしまう
// （main.tsでvite.config.tsをimportしていなくても発生するbuilder-vite側の暗黙動作）。
// ルートのvite.config.tsはGitHub Pages用のbase設定とPWAプラグイン（本番ビルド専用）を
// 含み、Storybookのアセットパス・ビルドを壊すため、意図的に空の設定をここに用意し
// main.tsのframework.options.builder.viteConfigPathでこのファイルを指すことで、
// ルートvite.config.tsの自動読み込みを回避する。
export default defineConfig({});
