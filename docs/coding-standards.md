# コーディング規約

calibration-managerのコード慣習。**実装・レビュー時はこれに従う**。「実際に守られている慣習」として明文化する。各ルールに根拠を添える（このコードベースは設定ファイルにまで「なぜ」を日本語コメントで残す文化のため）。

設計の真実源は `docs/`（特に [`domain-model.md`](./domain-model.md)、[`screen-design/README.md`](./screen-design/README.md)）、エントリポイントは `CLAUDE.md`。本書は「どう書くか」を扱い、「何を作るか/なぜその設計か」は各 `docs/` を参照。

Lint/Format は **oxlint + oxfmt**（ESLint/Prettier ではない）。多くは自動強制されるため、本書は機械検出しづらい慣習を中心に明文化する。CI 相当: `npm run lint:typed && npm run format:check && npm test`。

---

## 1. 命名規則

- **ファイル名**:
  - コンポーネント/アイコン → `PascalCase.tsx`（`Button.tsx`, `BellIcon.tsx`）
  - ロジック/設定/ストア → `camelCase.ts`（`useAppStore.ts`, `equipmentSlice.ts`, `selectors.ts`, `dateCycle.ts`）
  - feature 定型は固定名 → `index.tsx` / `hooks.ts` / `schema.ts` / `types.ts`
- **コンポーネント名**: PascalCase。タブ公開は `XxxTab`、その実体は `XxxView`（ラッパ→実体分離のときのみ `View` を付ける）。
- **hooks 名**: `useXxx`。1 feature = `hooks.ts` 内に 1 メインフック。
- **型名**: PascalCase。`type` を使う（後述 §3）。
- **定数**: モジュール定数は `UPPER_SNAKE_CASE`。
- **「as const オブジェクト + 派生 union 型」イディオムを徹底**（列挙はこの形で書く）:
  ```ts
  export const CYCLE = {
    M1: "1M",
    M3: "3M",
    M6: "6M",
    Y1: "1Y",
    Y2: "2Y",
    Y3: "3Y",
    Y5: "5Y",
    Y10: "10Y",
  } as const;
  export type Cycle = (typeof CYCLE)[keyof typeof CYCLE];
  export const INSPECTION_ITEM_STATUS = {
    OVERDUE: "overdue",
    ORDER_NOW: "orderNow",
    IN_PROGRESS: "inProgress",
    DUE_SOON: "dueSoon",
    OK: "ok",
  } as const;
  export type InspectionItemStatus = (typeof INSPECTION_ITEM_STATUS)[keyof typeof INSPECTION_ITEM_STATUS];
  ```
  根拠: 値と型を 1 箇所で同期。`NOTIFICATION_TYPE`/`ORDER_STATUS`/`EQUIPMENT_STATUS`/`ROUTES` 等で一貫。
- **zustand スライス**: 型 `XxxSlice` + ファクトリ `createXxxSlice` + 初期値 `xxxInitial`（例: `EquipmentSlice` / `createEquipmentSlice` / `equipmentInitial`）。
- **selector 関数**: `xxxOf` 形（`inspectionItemsOf`, `ordersOf`, `recordsOf`）。件数系は `unreadNotificationCount` のように用途を綴る。`src/store/selectors.ts`。
- **省略形を使わない**: 識別子（変数・引数・関数・プロパティ・型）は完全な英単語で綴る。短縮形・頭文字省略・単文字いずれも不可。
  - 多文字省略形: `idx`→`index` / `eid`→`equipmentId` / `cfg`→`config` / `prev`→`previous` / `msg`→`message` / `btn`→`button` / `el`→`element` / `info`→説明的な完全名（`errorInfo` 等）。
  - **単文字のコールバック/selector 引数も不可**。`.map((i) => ...)` ではなく `.map((inspectionItem) => ...)`、zustand は `(s) => s.inspectionItems` ではなく `(state) => state.inspectionItems`、イベントは `(e) => ...` ではなく `(event) => ...`、ループ index は `i` ではなく `index`。
    ```ts
    // 不可
    const inspectionItems = useAppStore((s) => s.inspectionItems);
    options.find((o) => o.value === value);
    // 可
    const inspectionItems = useAppStore((state) => state.inspectionItems);
    options.find((option) => option.value === value);
    ```
  - 根拠: 現場担当者中心の小規模アプリで保守者が限られる→可読性最優先。`docs/` も含め「なぜ」を綴る文化と整合（タイプ数より明瞭さ）。
  - **例外**: 確立した頭字語・標準語（`id` / `url` / `html` / `db` / `pwa` / `rhf` / `csv`）はそのまま。`next` / `base` / `rows` / `row` / `view` 等の完全語は省略形ではないので対象外。React の `ref` / `props` / `rest` も慣習名として可。

## 2. ディレクトリ/ファイル構成

- `src/features/**/` の基本: `index.tsx`（薄いビュー本体）+ `hooks.ts`（ロジック）+ `schema.ts`（RHF 用 zod）+ `components/`。
  - feature 例: `dashboard`（ダッシュボード） / `equipment`（機器一覧・詳細） / `inspectionItems`（点検校正項目一覧）/ `orders`（点検校正外部案件） / `vendors`・`persons`（メーカー/取引先・担当者マスタ） / `notifications`（通知センター） / `settings`（設定・バックアップ）。
- **`index.tsx` は barrel ではなく公開コンポーネント本体**。`App.tsx` は `import { Dashboard } from "@/features/dashboard"` のように named export を直接参照。feature にバレル専用ファイルは作らない。
- **`schema.ts` は RHF フォームを持つ feature にだけ置く**（`equipment`、`inspectionItems` の項目編集モーダルなど。必須ではない）。
- **`hooks.ts` は全 feature に置く**（ロジックは hooks に寄せ index.tsx を薄く保つ）。
- サブコンポーネントが 1 個だけなら feature 直下に置いてよい（複数になったら `components/` へ）。
- **共通 UI `src/components/ui/<Name>/`**: 1 コンポーネント = 1 サブディレクトリ + バレル。`Name.tsx` / `index.ts`（`export { Name } from "./Name"`）/ `Name.test.tsx` / `Name.stories.tsx` を colocate。親バレル `src/components/ui/index.ts` で一括 re-export し `@/components/ui` 経由で import。
- アイコンは `src/components/icons/` に `XxxIcon.tsx` + 共有 `base.ts` + バレル。

## 3. 型

- **`type` を使う。`interface` は使わない**（例外: `*.d.ts` のモジュール拡張のみ）。
- **ドメイン型の真実源は `src/store/types.ts`**。zod は `src/store/schema.ts` に分離し、**`AssertEqual` でビルド時に構造一致を強制**する。schema 変更時は types.ts と必ず一致させる（`z.infer` を型の源にしない）。
  ```ts
  type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
  const schemaMatchesAppState: AssertEqual<SchemaAppState, AppState> = true;
  ```
- **React props 型はコンポーネント内ローカルに `type Props = { ... }`**。HTML 要素拡張は交差型（`ButtonHTMLAttributes<HTMLButtonElement> & { ... }`）。
- **React 19 流儀**: `forwardRef` を使わず `ref?: Ref<T>` を props に含める。
- 単一 prop の `View` はインライン注釈可（`({ equipmentId }: { equipmentId: string })`）。複数 prop は `type Props`。
- **型のみ import は必ず `type` 修飾**（`import { INSPECTION_ITEM_STATUS, type InspectionItem } from ...` の混在形も可）。

## 4. React / コンポーネント

- **アロー関数コンポーネントが原則**（`export const Xxx = (props) => (...)`）。`function` 宣言コンポーネントは使わない（例外: `App.tsx` のみ）。
- **named export が原則**。`export default` はアプリ全体で `App.tsx` の 1 箇所のみ（例外: `*.stories.tsx` の CSF `export default meta` は Storybook の要件のため可。実態10ファイル）。
- **props はシグネチャで分割代入し、デフォルト値もそこで設定**。残りは `...rest` で DOM へ spread。
- **event handler 命名**:
  - props で受け取るコールバック → `onXxx`（`onConfirm`, `onClose`）
  - コンポーネント内部で定義 → `handleXxx`（`handleClick`）
  - **例外**: react-hook-form の `handleSubmit` に渡す検証成功時コールバックは、内部定義でも `onSubmit` と命名する（`handleSubmit(onSubmit)`。RHF 公式ドキュメントの慣習名に合わせ、`handleSubmit` との対応を読み取りやすくするため）
  - ロジックを hooks に寄せる feature では hooks が動詞アクション（`registerRecord`, `createOrder`）を返し、JSX が `onClick={() => registerRecord(...)}` で繋ぐ
- **条件レンダリング**: 短絡 `{cond && ...}` / 三項を併用。早期 return（`if (!equipmentId) return null;`）を多用。
- **key**: エンティティは `key={entity.id}`。index key は append-only な時系列など正当な箇所に限り、`.oxlintrc.json` の override で off にしたファイル内のみ + 理由コメント必須。

## 5. 状態管理

- 単一 zustand ストア。ミドルウェア順は **`persist(immer(...))`**。Context Provider なし。
- **購読は細粒度 `useAppStore(selector)`**。1 値 1 呼び出しで分割購読する（まとめて返す selector は避ける）。
- **Immer ドラフトを直接破壊的変更**（spread で新オブジェクトを返さない）:
  ```ts
  set((state) => {
    state.inspectionItems[id] = inspectionItem;
  }); // delete state.inspectionItems[id] / Object.assign(...) も
  ```
- **action 内ガードは early-return**（`const inspectionItem = state.inspectionItems[id]; if (!inspectionItem) return;`）。
- **横断 selector（複数エンティティ導出）は `src/store/selectors.ts` に純関数で**（store を引数に取りテスト可能に）。
- **ローカル state vs store**: 永続化対象（equipment/inspection-items/records/orders/vendors/persons/notifications 等、`partialize` で限定）は store。UI 一時状態（編集中 id・モーダル開閉・選択 Set）は `useState`。項目ステータス（`deriveInspectionItemStatus`）・発注推奨日は**永続化せず純関数で派生**（ドメインモデル §4）。

## 6. import

- **oxfmt の `sortImports` で自動整列**（手動グルーピング不要）。`internalPattern: ["^@/.*"]`。
- **絶対パス `@/` エイリアスが原則**（`@/*` → `./src/*`）。相対 import はバレル `index.ts` 内の `./Component` のみ。それ以外で `../` を使わない。
  - 例外: stories は対象コンポーネントを相対 import してよい。テスト本体は `@/` を使う。
- **副作用 import は allow リスト内に限定**（CSS / jest-dom / seed 注入）。`import/no-cycle` は error、依存数上限 20。

## 7. テスト

詳細 → `docs/testing.md`。

- **命名**: `*.test.ts(x)` / ドメイン property-based は `*.proptest.test.ts` / Storybook は `*.stories.tsx`。すべて対象と **colocate**。
- **domain 層は proptest 必須**（fast-check）。生成器は `src/test/arbitraries.ts` に集約。component は Testing Library + user-event。
- **test helper は `src/test/`**: `renderWithStore` / `seedStore` / `setupStoreIsolation`（各ファイル `beforeEach`）/ `arbitraries.ts`。helper は `function` 宣言（helper のみの例外）。
- **describe/it は日本語**（`it("休止機器は期限接近通知の対象にならない")`）。
- 環境は **jsdom 単一**。カバレッジは**ラチェット方式**（domain/store/utils のみ厳格ゲート、`.tsx` は全体ゲートしない）。

## 8. ドメインロジック

- `src/domain/` は**純粋関数のみ**（`export const fn = (args): RetType => ...`、明示戻り値型）。副作用・this・I/O なし。
  - 例: `dateCycle.ts`（`addCycle`: 次回期限計算）、`leadTime.ts`（発注推奨日逆算）、`inspectionItemStatus.ts`（`deriveInspectionItemStatus`）、`notificationRules.ts`（通知生成判定）、`orderStatus.ts`（状態遷移テーブル）、`statusBadge.ts`（バッジ色マッピング）。
- **不変スタイル**: 入力を変更せず `{ ...inspectionItem, ... }` で新値を返す。
- **マジックナンバーは `src/domain/constants.ts` に JSDoc 付き定数で集約**（`DEFAULT_BUFFER_DAYS`（発注余裕日数デフォルト14）、`DEFAULT_NOTICE_DAYS_BEFORE`（通知開始日数デフォルト30）等）。
- **例外を投げない**: 失敗・不在は `null` 返却 or early-return ガードで表現。zod は `parse` でなく `safeParse`。store の堅牢化も例外でなく「サルベージ → 空状態フォールバック」+ `console.warn`。CSVインポートも同様に、不正行は例外にせずエラー表示用の結果値として返す（例外: `src/main.tsx` のルート要素不在ガードのみ throw 可。復帰不能なブートストラップ失敗の fail-fast のため）。

## 9. コメント / 言語

- **コード内コメント・テスト名・UI 文言・docs はすべて日本語**。
- **「なぜ」を日本語コメントで残す**（設定ファイルにも徹底）。`no-inline-comments` は意図的に off。
- **JSDoc を積極使用**（純関数・selector・型・slice）。`@see {@link ...}` も使う。
- **lint 抑制は理由付き**: `// oxlint-disable-next-line <rule> -- <理由（日本語）>`。
- **コミットメッセージのみ英語**・小文字・簡潔（`fix due date calc`, `refactor notification slice`）。Conventional Commits 風 prefix（`fix`/`refactor`/`add`/`remove`）だが厳格でない。

## 10. ツール設定（要点）

- **tsconfig**: `strict` + `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch`。`target: ES2022`, `moduleResolution: bundler`, `jsx: react-jsx`。`noUncheckedIndexedAccess` は**意図的に無効**（有効化は未対応点）。
- **oxlint**: plugins = typescript/unicorn/oxc/react/jsx-a11y/import（test override で vitest）。categories 全 error。ファイル/ルール単位の off は **override + 理由コメント**で行う。
- **oxfmt**: 明示設定は `sortImports` / `sortTailwindcss` のみ。インデント/quote/semicolon/行幅はデフォルト（実態: 2スペース・ダブルクオート・セミコロンあり・末尾カンマあり）。手で整形せず `npm run format` に任せる。
- 終了時に `.claude/hooks/stop-ci-check.sh` が `lint:typed → format:check → test` を回す。**これが通る状態で終える**。
