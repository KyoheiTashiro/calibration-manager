# 技術スタック

関連: [domain-model.md](../../spec/domain-model.md)

本書は calibration-manager（機器点検・校正期限管理アプリ）で採用している技術スタックをまとめる。calibration-manager 固有の事情（CSVバックアップ、機器点検という利用シーンでのPWA活用など）を踏まえて構成している。

| 項目            | 採用                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| フロント        | React 19 + TypeScript                                                                                                                                                  |
| ビルド          | Vite                                                                                                                                                                   |
| ルーティング    | react-router-dom（`HashRouter` — GH Pages対応）                                                                                                                        |
| 状態管理        | Zustand + `immer` ミドルウェア + `persist`（LocalStorage永続化）                                                                                                       |
| フォーム        | React Hook Form + Zod（`@hookform/resolvers/zod`）                                                                                                                     |
| スタイル        | Tailwind CSS 4                                                                                                                                                         |
| CSVバックアップ | 追加ライブラリを導入せず、Web標準（Blob/File API）で入出力し、`store/schema.ts` のzodスキーマを再利用して検証する。文字コードはUTF-8 BOM付き（domain-model.md §5） |
| 永続化          | LocalStorage（zustand persist・キー `calibration-manager:v1`・version 2）                                                                                              |
| ホスティング    | GitHub Pages（base path `/calibration-manager/`）                                                                                                               |
| CI              | GitHub Actions 3ワークフロー: test（test/coverage/build）・lint（oxlint typed + oxfmt check）・deploy（GitHub Pages deploy）                                     |
| PWA             | `vite-plugin-pwa`（Workbox ベース・自動SW生成・manifest生成・`autoUpdate`）                                                                                      |
| Lint/Format     | oxlint + oxfmt                                                                                                                                                         |
| テスト          | Vitest + Testing Library（component）+ fast-check（domain の property test）                                                                                           |
| UIカタログ      | Storybook                                                                                                                                                              |

## HashRouter採用理由

GitHub Pagesは任意パスへのフォールバック設定ができない。`BrowserRouter` で `/equipment/:id` のような深いパスへ直接アクセス・リロードすると404となり、SPAとして復帰できない。calibration-manager は GitHub Pages でホスティングするため、SPAルーティングは `HashRouter` によるhashベースの方式を採用する。ルート定義は `App.tsx` に置く（画面・ルーティングの一覧は screen-design/README.md §0.2 を参照）。

## 状態管理・永続化の方針

Zustand を単一ストアとして採用し、`persist(immer(...))` の順でミドルウェアを重ねている（詳細は [store.md](./store.md) を参照）。`immer` により各スライスの `set` 内でミュータブルな記法を使え、`persist` によりLocalStorageへの永続化を透過的に扱える。calibration-manager は初回スキーマ `version: 1` から `version: 2`（item→inspectionItem 全域リネーム、D-036）へ移行済みで、`migrateV1ToV2` が `MIGRATIONS` に登録されている。将来のスキーマ変更でも同じ migrate の仕組みで対応する。

## CSVバックアップの方針

calibration-manager はバックエンドを持たず、機器台帳という性質上、他システムへの移行・監査提出用のエクスポートが必要になる。専用ライブラリは導入せず、Blob/File APIというWeb標準のみで入出力する。インポート時のバリデーションはストアの検証スキーマ（`store/schema.ts`）をそのまま再利用することで、フォーム入力・永続化・CSV取り込みの3経路でバリデーションロジックを一本化する。文字コードはExcelでの開き直しを踏まえUTF-8 BOM付きとしている（domain-model.md §5）。

## CI構成の方針

GitHub Actions を3ワークフローに分割している。`test`（Vitestによるテスト・カバレッジ・ビルド確認）、`lint`（oxlint typed モード + oxfmt のフォーマットチェック）、`deploy`（GitHub Pagesへのデプロイ）をそれぞれ独立させることで、lintの失敗がデプロイをブロックしない・逆にデプロイの失敗原因を切り分けやすい、といった構成上のメリットを得ている。

## テスト戦略の方針

Vitest + Testing Library を基本とし、`domain/` 配下の純粋関数群に対しては fast-check による property test を組み合わせている。特に `addCycle`（暦月ベースの次回期限計算。domain-model.md §4.1）の月末補正や、`deriveInspectionItemStatus`（優先度付きステータス判定。domain-model.md §4.3）のような「境界値・優先順位が絡む純粋ロジック」は例示ベースのテストだけでは見落としが生じやすいため、property testとの相性が良い。詳細な対象ファイルは [store.md](./store.md) のテスト節を参照。

## PWA方針

calibration-manager は現場での機器点検作業中に利用されるため、通信が不安定な環境でもアプリ自体は起動できることが望ましい。`vite-plugin-pwa` によりWorkboxベースの自動SW生成・manifest生成を行い、更新方式は `autoUpdate` として利用者に手動更新を意識させない。データはLocalStorageに閉じているため、オフライン時もCSVバックアップまでを含めて操作可能にしている。

## フロント・ビルドの方針

フロントは React 19 + TypeScript、ビルドは Vite を採用している。バックエンドを持たない完全なクライアントサイドSPAであるため、SSR/SSGは不要と判断し、Vite標準のクライアントビルドのみを用いる。スタイルはTailwind CSS 4を採用し、`statusBadgeClass` のようなドメイン発のクラス名マッピング（screen-design §0.3）を通じてユーティリティクラスを一箇所に集約している。

## フォームバリデーションの一体化

React Hook Form + Zod（`@hookform/resolvers/zod`）をフォーム層のバリデーションとして採用している。前述の通り、CSVインポートのバリデーションは `store/schema.ts` のzodスキーマを再利用しており、フォーム側のスキーマ（`features/*/schema.ts`）とストア側のスキーマは別ファイルに分離しつつも、いずれもzodという単一のバリデーション基盤に乗せることで検証ロジックの分裂を避けている。

## Lint/Format・UIカタログの方針

oxlint + oxfmt を採用し、高速なLint/Formatパイプラインを実現している。UIカタログとしてStorybookを採用し、`components/ui/` `components/domain/` 配下の各コンポーネントを個別に確認できるようにしている。story配置の詳細は [directory-structure.md](./directory-structure.md) を参照。

## calibration-manager固有の方針

| 項目            | 内容                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| CSVバックアップ | 機器台帳のバックアップ・移行のために設ける                                                                       |
| ストア構成      | 画面専用の `uiSlice` は設けず、7エンティティに対応する7スライスのみとする（詳細は [store.md](./store.md)）       |
| PWAの用途       | 現場点検作業中のオフライン起動を主目的と位置づける                                                               |

## バージョン表記について

本書の技術スタック表はライブラリのメジャーバージョンまでは固定しない（例: Vite、Zustand、Storybookのバージョン番号は未指定）。具体的なバージョンは `package.json` を正とする。

## 参照

- [store.md](./store.md) — Zustandストアの詳細設計（スライス構成・永続化・カスケード仕様）
- [directory-structure.md](./directory-structure.md) — 上記スタックを踏まえたディレクトリ構成
- [../domain-model.md](../../spec/domain-model.md) — ドメインモデル（§5に永続化・CSVバックアップの仕様）
- [../screen-design/README.md](../../spec/screen-design/README.md) — 画面設計書（共通仕様・ルーティング一覧）
