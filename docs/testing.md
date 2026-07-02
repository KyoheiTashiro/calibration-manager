# テスト方針

親: [README.md](README.md)

## テストツール

- **Vitest** (`vitest run` / `vitest`)
- **Testing Library**（`@testing-library/react` / `@testing-library/user-event` / `@testing-library/jest-dom`）でコンポーネントテスト
- **fast-check** で domain 層の property-based testing
- 環境は jsdom 単一（component に必須・ロジックテストにも無害。node 環境だと zustand persist が localStorage 不在で警告を吐くため統一）
- `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`

### setup（`vitest.setup.ts`）

- `@testing-library/jest-dom/vitest` の matcher を読み込み
- `afterEach` で `cleanup()`（テスト間の DOM 汚染防止）
- jsdom は `HTMLDialogElement` のモーダル API（`showModal` / `close`）未実装のため polyfill

### テストヘルパー（`src/test/`）

- `renderWithStore.tsx`
  - `renderWithStore(ui, { initialEntries, routePath })`: RTL render を `MemoryRouter` で包む。`routePath` 指定で `<Routes><Route>` 囲み（`useParams` 解決用）
  - `seedStore(partial)`: zustand `setState` で state を部分上書き（persist 汚染なし）
  - `setupStoreIsolation()`: 各テストファイルの `beforeEach(setupStoreIsolation)` で呼ぶ。`resetAll()` + `localStorage.clear()`
- `arbitraries.ts`: fast-check の Arbitrary 定義（`equipmentArb` / `inspectionItemArb` / `inspectionRecordArb` / `calibrationOrderArb` / `vendorArb` など）

## domain層（必須）

`src/domain/` の純粋関数に property-based test（`*.proptest.test.ts`）必須。calibration-manager で特にテストすべき純ロジックは以下（すべて [`domain-model.md`](./domain-model.md) と一言一句矛盾しないこと）。

- **`dateCycle.ts`（`addCycle`: 次回期限計算、ドメインモデル §4.1）**
  - `nextDueDate = lastDoneDate + cycle`
  - 月単位の加算は暦月ベース。月末日の繰り上がり調整を検証する（例: 1/31 + 1M → 2/28）
  - `cycle` の全パターン（`1M` `3M` `6M` `1Y` `2Y` `3Y` `5Y` `10Y`）を境界値として網羅
- **`leadTime.ts`（`resolveLeadTime` / `recommendedOrderDate`: 発注推奨日の逆算、ドメインモデル §4.2）**
  - `leadTime = item.leadTimeDays ?? vendor.standardLeadTimeDays`
  - `発注推奨日 = nextDueDate − leadTime − bufferDays`
  - `item.leadTimeDays` 未設定時に `vendor.standardLeadTimeDays` へフォールバックするケースを検証
- **`itemStatus.ts`（`deriveItemStatus`、ドメインモデル §4.3）**
  - 優先度順（上が優先。5段階）で判定することを検証:
    1. `overdue`（期限切れ）: 今日 > nextDueDate
    2. `orderNow`（要発注）: 外部 かつ 今日 ≥ 発注推奨日 かつ 有効な案件なし
    3. `inProgress`（校正中）: 外部 かつ `ordered`/`inCalibration` の案件あり
    4. `dueSoon`（期限接近）: 今日 ≥ nextDueDate − noticeDaysBefore
    5. `ok`（正常）: 上記以外
  - 優先度の逆転がないこと（例: `overdue` かつ `orderNow` の条件を両方満たす場合に `overdue` が勝つ）を境界ケースで確認
- **`notificationRules.ts`（`computeExpectedNotifications`: 通知生成判定、ドメインモデル §3.7）**
  - 5種別すべての発生条件を検証:
    | type | 対象 | 発生条件 |
    |------|------|----------|
    | `dueSoon` | 内部・外部 | 今日 ≥ 期限 − noticeDaysBefore |
    | `overdue` | 内部・外部 | 今日 > 期限 |
    | `orderRecommended` | 外部のみ | 今日 ≥ 発注推奨日 かつ 未発注 |
    | `deliveryDueSoon` | 発注済案件 | 今日 ≥ 返却予定日 − 7日 かつ 未返却 |
    | `deliveryOverdue` | 発注済案件 | 今日 > 返却予定日 かつ 未返却 |
  - **重複抑止**: 同一対象・同一種別の未読通知は重複生成しないことをテストする（既存の未読通知がある状態で再スキャンしても件数が増えない）
- **CSVインポートのバリデーション**（`src/utils/csv/importCsv.ts`。zodスキーマは `src/store/schema.ts` を再利用）
  - zod スキーマによる行単位バリデーション。不正行はインポートを中断せずエラー表示すること（例外を投げない、[coding-standards.md](coding-standards.md) §8 の方針と一致）
  - 文字コードは UTF-8 BOM付きで読み書きできること（Excel互換）

**fast-check が特に適する対象**: 上記のうち `dateCycle.ts`（暦月加算の月末調整）と `leadTime.ts`（3項の減算逆算）は入力の組み合わせが多く境界条件を見落としやすいため、property-based testing での網羅が特に有効。例えば「`nextDueDate` は常に `lastDoneDate` 以降である」「`発注推奨日` は `leadTimeDays` を大きくするほど早まる（単調性）」といった不変条件を fast-check の Arbitrary で検証する。

## UI / component

- `@testing-library/react` でコンポーネント・feature 単位のテスト
  - 共通 UI（`src/components/ui/<ComponentName>/<ComponentName>.test.tsx`）: Badge / Button / Modal / ConfirmModal / EmptyState / Select / DateField / Table / Tabs
  - ドメイン固有 UI（`src/components/domain/<ComponentName>/<ComponentName>.test.tsx`）: StatusBadge（`deriveItemStatus` の表示）
  - feature（`src/features/**/*.test.tsx`）: dashboard / equipment（一覧・詳細・登録編集） / items（項目一覧・項目編集モーダル・実施記録モーダル） / orders（案件一覧） / vendors・persons（メーカー/取引先・担当者マスタ） / notifications（通知センター） / settings（CSVエクスポート/インポート）
- **Storybook** でコンポーネント単位の見た目・状態を確認
  - 起動: `npm run storybook`（dev・ポート6006） / ビルド: `npm run build-storybook`
  - story配置: 各コンポーネント隣に `*.stories.tsx`（`src/**/*.stories.@(tsx|mdx)`）
  - `@storybook/addon-a11y` で各storyのアクセシビリティ検査（現状 `a11y.test: "todo"`）
  - 背景: Light（`#ffffff`・アプリ実背景） / Dark（`#0f172a`）切替
  - PWAプラグインはStorybookビルドから除外（`.storybook/main.ts` の `viteFinal`・SW不要）

## カバレッジ（ラチェット方式）

`@vitest/coverage-v8`（provider `v8`）。`vitest.config.ts` の `thresholds` でロジック層のみ厳格ゲート。component（`.tsx`）は重要部のみ方針のため全体ゲートしない。

実測値がまだ存在しないため、以下は姉妹プロジェクト（pinpon-match-manage）と同水準の目標値を暫定値として据える。実装が進み次第、実測に対し数%の余白を残したラチェット値に後日調整する。

- `src/domain/**`（`dateCycle.ts` / `leadTime.ts` / `itemStatus.ts` / `notificationRules.ts` 等）: lines 98 / functions 100 / branches 95 / statements 98
- `src/store/**`: lines 95 / functions 95 / branches 88 / statements 95
- `src/utils/id.ts`: 100 / 100 / 100 / 100
- `src/utils/csv/**`: lines 95 / functions 90 / branches 75 / statements 95

除外: `*.test.{ts,tsx}` / `*.stories.tsx` / `src/test/**` / `src/main.tsx` / `**/types.ts` / `src/components/system/**`（PWA SW連携 glue。`virtual:pwa-register/react` 依存で未カバー走査時に JSX をパースできず除外）

## アクセシビリティ

- Lighthouse Accessibility 95点以上
- axe-core 重大違反0

## 現場端末での実機確認

- 想定利用端末（PC・タブレット双方）での表示・操作確認
- 通知ベル・ステータスバッジの色分けが一目で識別できるか、現場担当者数名によるユーザーテスト
