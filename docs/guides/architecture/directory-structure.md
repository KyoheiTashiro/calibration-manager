# ディレクトリ構成

関連: [domain-model.md](../../spec/domain-model.md) ／ [tech-stack.md](./tech-stack.md) ／ [store.md](./store.md)

以下は calibration-manager のディレクトリ構成である。calibration-managerのドメイン（7エンティティ・12画面）に合わせて構成している。

```
src/
├── App.tsx                          // ルート定義（Routes/Route）。ルーティング一覧はscreen-design/README.md §0.2参照
├── main.tsx                         // エントリ。HashRouter + ErrorBoundary + SW登録（virtual:pwa-register）+ DEV限定シーダー起動（import.meta.env.DEV ガード + `dev/seed.ts` の動的import。D-034）
├── components/
│   ├── icons/index.ts              // SVGアイコン群（barrel export）
│   ├── system/                     // アプリ基盤コンポーネント
│   │   ├── ErrorBoundary.tsx       // 例外捕捉境界
│   │   ├── AppLayout.tsx           // 共通レイアウト外枠（screen-design §0.1）。サイドバー+ヘッダー、モバイル幅ではハンバーガーに畳む
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx              // 通知ベル + 未読バッジ
│   │   └── index.ts                // barrel export（ErrorBoundary / AppLayout）
│   ├── domain/                     // ドメイン固有の複合UIコンポーネント（各コンポーネントはサブディレクトリ + barrel）
│   │   ├── StatusBadge/            // deriveServiceItemStatus + statusBadgeClass によるステータスバッジ（screen-design §0.3）
│   │   ├── ServiceItemModal/              // 点検校正項目 登録・編集モーダル（screen-design §6）。equipment/detail と serviceItems 双方から起動するため共通配置
│   │   ├── ServiceRecordModal/     // 実施記録登録モーダル（screen-design §7）。equipment/detail・serviceItems・serviceOrder から起動
│   │   ├── ServiceOrderModal/             // 点検校正外部案件 作成・状態更新モーダル（screen-design §8）
│   │   ├── VendorModal/            // メーカー/取引先 追加・編集モーダル（screen-design §9）
│   │   ├── PersonModal/            // 担当者 追加・編集モーダル（screen-design §9）
│   │   └── index.ts
│   └── ui/                         // 汎用UIコンポーネント（各コンポーネントはサブディレクトリ + barrel）
│       ├── Badge/ Button/ Checkbox/ ConfirmModal/ DateField/ EmptyState/ Modal/ RadioGroup/ Select/ Table/ Tabs/ TextField/ Textarea/
│       ├── hooks/
│       │   └── useDialog.ts        // <dialog> showModal/close を open prop に同期
│       └── index.ts
├── constants/
│   ├── routes.ts                   // ルートパス定数（ROUTES）。screen-design §0.2のルーティング一覧に対応
│   └── storage.ts                  // localStorageキー・スキーマバージョン定数（calibration-manager:v1 / STORAGE_VERSION=2）
├── domain/                         // ビジネスロジック（純粋関数。各 *.test.ts / 一部 *.proptest.test.ts）
│   ├── constants.ts                // ドメイン定数（DEFAULT_BUFFER_DAYS / DEFAULT_NOTICE_DAYS_BEFORE / DELIVERY_DUE_SOON_NOTICE_DAYS）
│   ├── dateCycle.ts                // addCycle: 暦月ベースの次回期限計算（domain-model §4.1）
│   ├── serviceItemStatus.ts               // deriveServiceItemStatus: 項目ステータス導出（domain-model §4.3）
│   ├── leadTime.ts                 // resolveLeadTime / recommendedOrderDate（domain-model §4.2）
│   ├── notificationRules.ts        // computeExpectedNotifications: 通知5種別の発生条件判定（domain-model §3.7）
│   ├── orderStatus.ts              // ServiceOrderの許可される状態遷移テーブル（domain-model §3.6）
│   └── statusBadge.ts              // statusBadgeClass: ステータス→Tailwindクラスの単一マッピング（screen-design §0.3）
├── features/
│   ├── dashboard/                  // '/'（screen-design §1）
│   │   ├── index.tsx
│   │   ├── hooks.ts                // 集計・選定の純関数（countByStatus / actionRequiredRows / latestNotifications）
│   │   └── components/             // SummaryCards / ActionRequiredList / NotificationList
│   ├── equipment/
│   │   ├── list/                   // '/equipment'（screen-design §2）
│   │   ├── form/                   // '/equipment/create', '/equipment/:id/edit'（screen-design §3）
│   │   │   ├── create/ edit/       // 登録・編集それぞれのエントリ（index.tsx + hooks.ts）
│   │   │   └── shared/             // FormFields / mapping / useFormCore / schema.ts（機器登録・編集フォームのzodスキーマ）
│   │   └── detail/                 // '/equipment/:id'（screen-design §4。項目・履歴を含む）
│   ├── serviceItems/            // '/service-items'（中核画面。screen-design §5）
│   │   ├── constants.ts            // 種別・実施区分等の日本語ラベル定数（機器詳細・項目一覧・モーダルで共用）
│   │   └── list/                   // index.tsx + hooks.ts + components/（FilterBar / ServiceItemTable）
│   ├── manual/                      // '/manual'（利用マニュアル。静的コンテンツ・store参照なし。screen-design §12。D-035）
│   │   └── index.tsx
│   ├── serviceOrder/            // '/service-orders'（かんばん。screen-design §8）
│   │   ├── index.tsx
│   │   ├── hooks.ts                // useOrderKanban（store購読・表示列導出・ダイアログ状態・状態遷移アクション）
│   │   ├── constants.ts            // 状態ラベル・かんばん列順
│   │   ├── schema.ts               // 遷移ダイアログ（発注/返却）のRHF+zodフォームスキーマ
│   │   └── components/             // ServiceOrderCard / TransitionDialogs
│   ├── vendors/                    // '/vendors'（screen-design §9）
│   │   ├── index.tsx
│   │   └── hooks.ts                // 一覧購読・モーダル開閉・削除フロー（参照ガード付き）
│   ├── persons/                    // '/persons'（screen-design §9）
│   │   ├── index.tsx
│   │   └── hooks.ts                // 一覧購読・モーダル開閉（物理削除なし・無効化トグルのみ）
│   ├── notifications/              // '/notifications'（screen-design §10）
│   │   ├── index.tsx
│   │   ├── hooks.ts                // タブ絞り込み・並び替え・遷移先解決の純関数
│   │   ├── constants.ts            // 通知種別のラベル/バッジ色/アイコン（ダッシュボードと共用）
│   │   └── scan/useNotificationScan.ts  // アプリ起動時・タブ復帰時の日付変更検知でgenerateNotificationsを呼ぶフック
│   └── settings/                   // '/settings'（screen-design §11。CSVエクスポート/インポート・データ全削除）
│       ├── index.tsx
│       └── components/
│           ├── csv/                // ExportSection / ImportSection / entityCsv.ts（エンティティ⇔CSV列仕様レジストリ。utils/csv の低水準処理を利用）/ importValidation.ts（行単位検証）
│           ├── pwa/                // PwaInstallSection / usePwaInstall（D-037）
│           └── reset/              // ResetSection（データ全削除。D-031）
├── store/
│   ├── useAppStore.ts              // Zustand + persist + immer（7スライス合成・persist設定）
│   ├── persistence.ts              // migrate（migrateV1ToV2等をMIGRATIONSへ登録）/ merge（3段サルベージ）/ sanitizeAppState
│   ├── storeState.ts               // StoreState型（7スライス + resetAll / replaceEntities の合成型）
│   ├── schema.ts                   // zodスキーマ（7エンティティ）。CSVインポート検証にも再利用
│   ├── selectors.ts                // 導出セレクタ（serviceItemsOf / serviceOrdersOf / serviceRecordsOf / personLabelOf（D-024）/ serviceItemRowsOf / unreadNotificationCount）
│   ├── types.ts
│   └── slices/                     // Zustandスライス（7エンティティに1:1対応）
│       ├── vendorSlice.ts
│       ├── personSlice.ts
│       ├── equipmentSlice.ts
│       ├── serviceItemSlice.ts
│       ├── serviceRecordSlice.ts
│       ├── serviceOrderSlice.ts
│       └── notificationSlice.ts
├── utils/                          // 汎用ユーティリティ（各ユーティリティは サブディレクトリ/index.ts + テスト colocate）
│   ├── id/index.ts                 // UUID生成（crypto.randomUUID ラッパー）
│   ├── time/index.ts               // 日付整形（YYYY-MM-DD固定。screen-design §0.4）
│   ├── csv/index.ts                // CSV低水準処理（RFC4180 serialize/parse、UTF-8 BOM付き）
│   ├── record/index.ts             // Record<string, T> の安全参照ヘルパ（recordValue / isRecord）
│   └── navigation/index.ts         // 複数featureで共有する遷移系フック。useSafeNavigate: navigate()の戻り値（void | Promise<void>）を無視して遷移する共通ラッパー（D-044）
├── dev/                            // DEV限定（本番バンドル非包含）。D-034
│   ├── seed.ts                     // buildSeedState(today) / seedIfEmpty()。空ストア時のみ投入する開発用シーダー
│   ├── seedMasterData.ts           // マスタ（vendors/persons/equipment等）のシードデータ
│   └── seedTransactionData.ts      // 記録・案件・通知等トランザクションデータのシードデータ
└── styles/index.css
```

## 補足

- ルーターは `main.tsx` の `HashRouter`。ルート定義は `App.tsx` に置く。12画面のルーティング対応表は screen-design/README.md §0.2 を参照し、本書では再掲しない。
- モーダル群（ServiceItemModal/ServiceRecordModal/ServiceOrderModal/VendorModal/PersonModal）は特定の1画面に属さず複数画面から起動されるため `components/domain/` に配置している（screen-design §0.2「モーダルで行う操作」）。`components/domain/` の役割が広いのは、calibration-managerの画面設計上モーダル起動元が多い（機器詳細・点検校正項目一覧・案件一覧など）ことによる設計判断である。
- React Hook Form + Zod用のフォームスキーマは**フォームを持つ画面/コンポーネントの直近に colocate する**（D-043）。feature 内のフォーム（機器登録編集の `equipment/form/shared/schema.ts`、かんばん遷移ダイアログの `serviceOrder/schema.ts`）は features 側、`components/domain/` のモーダル（ServiceItemModal / ServiceOrderModal / ServiceRecordModal / VendorModal / PersonModal）は各モーダルディレクトリ内の `schema.ts` に置く。永続化データの構造検証（`store/schema.ts`）とは別物。
- `store/schema.ts` はCSVインポートの行バリデーションにも再利用している（[tech-stack.md](./tech-stack.md) 参照）。
- Storybookのstoryはコンポーネント隣に `*.stories.tsx` で配置する（colocation）。上記ツリーでは省略している。
- `src/test/` にテスト支援ユーティリティを置く（詳細は省略）。
