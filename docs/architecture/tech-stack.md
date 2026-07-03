# 技術スタック

関連: [domain-model.md](../domain-model.md)

本書は calibration-manager（機器点検・校正期限管理アプリ）で採用を想定する技術スタックをまとめる。calibration-manager は設計フェーズでありコードは未実装のため、以下は「採用方針」であって実績ではない。calibration-manager 固有の事情（CSVバックアップ、機器点検という利用シーンでのPWA活用など）を踏まえて構成する。

| 項目            | 採用                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| フロント        | React 19 + TypeScript                                                                                                                                                  |
| ビルド          | Vite                                                                                                                                                                   |
| ルーティング    | react-router-dom（`HashRouter` — GH Pages対応）                                                                                                                        |
| 状態管理        | Zustand + `immer` ミドルウェア + `persist`（LocalStorage永続化）                                                                                                       |
| フォーム        | React Hook Form + Zod（`@hookform/resolvers/zod`）                                                                                                                     |
| スタイル        | Tailwind CSS 4                                                                                                                                                         |
| CSVバックアップ | 追加ライブラリを導入せず、Web標準（Blob/File API）で入出力し、`store/schema.ts` のzodスキーマを再利用して検証する方針。文字コードはUTF-8 BOM付き（domain-model.md §5） |
| 永続化          | LocalStorage（zustand persist・キー `calibration-manager:v1`・version 1）                                                                                              |
| ホスティング    | GitHub Pages（base path `/calibration-manager/` を想定）                                                                                                               |
| CI              | GitHub Actions 3ワークフローを想定: test（test/coverage/build）・lint（oxlint typed + oxfmt check）・deploy（GitHub Pages deploy）                                     |
| PWA             | `vite-plugin-pwa`（Workbox ベース・自動SW生成・manifest生成・`autoUpdate`を想定）                                                                                      |
| Lint/Format     | oxlint + oxfmt                                                                                                                                                         |
| テスト          | Vitest + Testing Library（component）+ fast-check（domain の property test）                                                                                           |
| UIカタログ      | Storybook                                                                                                                                                              |

## HashRouter採用理由

GitHub Pagesは任意パスへのフォールバック設定ができない。`BrowserRouter` で `/equipment/:id` のような深いパスへ直接アクセス・リロードすると404となり、SPAとして復帰できない。calibration-manager は GitHub Pages でのホスティングを想定するため、SPAルーティングは `HashRouter` によるhashベースの方式を採用する方針とする。ルート定義は `App.tsx` に置く想定（画面・ルーティングの一覧は screen-design/README.md §0.2 を参照）。

## 状態管理・永続化の方針

Zustand を単一ストアとして採用し、`persist(immer(...))` の順でミドルウェアを重ねる想定とする（詳細は [store.md](./store.md) を参照）。`immer` により各スライスの `set` 内でミュータブルな記法を使え、`persist` によりLocalStorageへの永続化を透過的に扱える。calibration-manager は初回スキーマのため `version: 1` からのスタートとなるが、将来のスキーマ変更に備え migrate の仕組みは当初から用意する方針とする。

## CSVバックアップの方針

calibration-manager はバックエンドを持たず、機器台帳という性質上、他システムへの移行・監査提出用のエクスポートが必要になる想定である。専用ライブラリは導入せず、Blob/File APIというWeb標準のみで入出力する方針とする。インポート時のバリデーションはストアの検証スキーマ（`store/schema.ts`）をそのまま再利用することで、フォーム入力・永続化・CSV取り込みの3経路でバリデーションロジックを一本化する。文字コードはExcelでの開き直しを想定しUTF-8 BOM付きとする（domain-model.md §5）。

## CI構成の方針

GitHub Actions を3ワークフローに分割する方針を想定する。`test`（Vitestによるテスト・カバレッジ・ビルド確認）、`lint`（oxlint typed モード + oxfmt のフォーマットチェック）、`deploy`（GitHub Pagesへのデプロイ）をそれぞれ独立させることで、lintの失敗がデプロイをブロックしない・逆にデプロイの失敗原因を切り分けやすい、といった構成上のメリットを得る。

## テスト戦略の方針

Vitest + Testing Library を基本とし、`domain/` 配下の純粋関数群に対しては fast-check による property test を組み合わせる方針とする。特に `addCycle`（暦月ベースの次回期限計算。domain-model.md §4.1）の月末補正や、`deriveInspectionItemStatus`（優先度付きステータス判定。domain-model.md §4.3）のような「境界値・優先順位が絡む純粋ロジック」は例示ベースのテストだけでは見落としが生じやすいため、property testとの相性が良いと考える。詳細な対象ファイルは [store.md](./store.md) のテスト節を参照。

## PWA方針

calibration-manager は現場での機器点検作業中に利用される想定であり、通信が不安定な環境でもアプリ自体は起動できることが望ましい。`vite-plugin-pwa` によりWorkboxベースの自動SW生成・manifest生成を行い、更新方式は `autoUpdate` として利用者に手動更新を意識させない方針とする。データはLocalStorageに閉じているため、オフライン時もCSVバックアップまでを含めて操作可能にすることを目標とする。

## フロント・ビルドの方針

フロントは React 19 + TypeScript、ビルドは Vite を採用する方針とする。バックエンドを持たない完全なクライアントサイドSPAであるため、SSR/SSGは不要と判断し、Vite標準のクライアントビルドのみを想定する。スタイルはTailwind CSS 4を採用し、`statusBadgeClass` のようなドメイン発のクラス名マッピング（screen-design §0.3）を通じてユーティリティクラスを一箇所に集約する方針とする。

## フォームバリデーションの一体化

React Hook Form + Zod（`@hookform/resolvers/zod`）をフォーム層のバリデーションとして採用する方針とする。前述の通り、CSVインポートのバリデーションは `store/schema.ts` のzodスキーマを再利用する想定であり、フォーム側のスキーマ（`features/*/schema.ts`）とストア側のスキーマは別ファイルに分離しつつも、いずれもzodという単一のバリデーション基盤に乗せることで検証ロジックの分裂を避ける方針とする。

## Lint/Format・UIカタログの方針

oxlint + oxfmt を採用し、高速なLint/Formatパイプラインを想定する。UIカタログとしてStorybookを採用し、`components/ui/` `components/domain/` 配下の各コンポーネントを個別に確認できるようにする方針とする。story配置の詳細は [directory-structure.md](./directory-structure.md) を参照。

## calibration-manager固有の方針

| 項目            | 内容                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| CSVバックアップ | 機器台帳のバックアップ・移行のために設ける                                                                       |
| ストア構成      | 画面専用の `uiSlice` は設けず、7エンティティに対応する7スライスのみとする（詳細は [store.md](./store.md)）       |
| PWAの用途       | 現場点検作業中のオフライン起動を主目的と位置づける                                                               |

## バージョン表記について

domain-model.md §6の技術スタック表はライブラリのメジャーバージョンまで固定していない（例: Vite、Zustand、Storybookのバージョン番号は未指定）。本書もこれに合わせ、具体的なバージョン選定はpackage.json整備時（実装着手時）に確定させるものとし、ここでは断定しない。

## 参照

- [store.md](./store.md) — Zustandストアの詳細設計（スライス構成・永続化・カスケード仕様）
- [directory-structure.md](./directory-structure.md) — 上記スタックを踏まえたディレクトリ構成
- [../domain-model.md](../domain-model.md) — ドメインモデル（§6に技術スタックの正、§5に永続化・CSVバックアップの仕様）
- [../screen-design/README.md](../screen-design/README.md) — 画面設計書（共通仕様・ルーティング一覧）
