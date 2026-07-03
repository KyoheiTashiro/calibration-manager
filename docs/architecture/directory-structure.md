# ディレクトリ構成

関連: [domain-model.md](../domain-model.md) ／ [tech-stack.md](./tech-stack.md) ／ [store.md](./store.md)

calibration-manager は設計フェーズであり、以下は実装時に想定するディレクトリ構成である。姉妹プロジェクト pinpon-match-manage の構成をベースに、calibration-managerのドメイン（7エンティティ・11画面）に合わせて調整する方針とする。

```
src/
├── App.tsx                          // ルート定義（Routes/Route）。ルーティング一覧はscreen-design/README.md §0.2参照
├── main.tsx                         // エントリ。HashRouter + ErrorBoundary + SW登録（virtual:pwa-register）
├── components/
│   ├── icons/index.ts              // SVGアイコン群（barrel export）
│   ├── system/
│   │   └── ErrorBoundary.tsx       // 例外捕捉境界
│   ├── layout/                     // 共通レイアウト（screen-design §0.1）
│   │   ├── AppLayout.tsx           // サイドバー+ヘッダーの外枠。モバイル幅ではハンバーガーに畳む
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx              // 通知ベル + 未読バッジ
│   ├── domain/                     // ドメイン固有の複合UIコンポーネント（各コンポーネントはサブディレクトリ + barrel）
│   │   ├── StatusBadge/            // deriveItemStatus + statusBadgeClass によるステータスバッジ（screen-design §0.3）
│   │   ├── ItemModal/              // 点検校正項目 登録・編集モーダル（screen-design §6）。equipment/detail と items 双方から起動するため共通配置
│   │   ├── RecordModal/            // 実施記録登録モーダル（screen-design §7）。equipment/detail・items・orders から起動
│   │   ├── OrderModal/             // 外部校正案件 作成・状態更新モーダル（screen-design §8）
│   │   ├── VendorModal/            // メーカー/取引先 追加・編集モーダル（screen-design §9）
│   │   ├── PersonModal/            // 担当者 追加・編集モーダル（screen-design §9）
│   │   └── index.ts
│   └── ui/                         // 汎用UIコンポーネント（各コンポーネントはサブディレクトリ + barrel）
│       ├── Badge/ Button/ Modal/ ConfirmModal/ EmptyState/ Select/ DateField/ Table/ Tabs/
│       ├── hooks/
│       │   ├── useDialog.ts        // <dialog> showModal/close を open prop に同期
│       │   └── useOutsideClick.ts  // 外側クリック購読
│       └── index.ts
├── constants/
│   ├── routes.ts                   // ルートパス定数（ROUTES）。screen-design §0.2のルーティング一覧に対応
│   └── storage.ts                  // localStorageキー・スキーマバージョン定数（calibration-manager:v1 / STORAGE_VERSION=1）
├── domain/                         // ビジネスロジック（純粋関数。各 *.test.ts / 一部 *.proptest.test.ts）
│   ├── dateCycle.ts                // addCycle: 暦月ベースの次回期限計算（domain-model §4.1）
│   ├── itemStatus.ts               // deriveItemStatus: 項目ステータス導出（domain-model §4.3）
│   ├── leadTime.ts                 // resolveLeadTime / recommendedOrderDate（domain-model §4.2）
│   ├── notificationRules.ts        // computeExpectedNotifications: 通知5種別の発生条件判定（domain-model §3.7）
│   ├── orderStatus.ts              // CalibrationOrderの許可される状態遷移テーブル（domain-model §3.6）
│   └── statusBadge.ts              // statusBadgeClass: ステータス→Tailwindクラスの単一マッピング（screen-design §0.3）
├── features/
│   ├── dashboard/                  // '/'（screen-design §1）
│   │   └── index.tsx
│   ├── equipment/
│   │   ├── list/                   // '/equipment'（screen-design §2）
│   │   ├── form/                   // '/equipment/new', '/equipment/:id/edit'（screen-design §3）
│   │   │   └── schema.ts           // 機器登録・編集フォームのzodスキーマ
│   │   └── detail/                 // '/equipment/:id'（screen-design §4。項目・履歴を含む）
│   ├── items/                      // '/items'（中核画面。screen-design §5）
│   │   └── index.tsx
│   ├── orders/                     // '/orders'（かんばん。screen-design §8）
│   │   └── index.tsx
│   ├── vendors/                    // '/vendors'（screen-design §9）
│   │   └── index.tsx
│   ├── persons/                    // '/persons'（screen-design §9）
│   │   └── index.tsx
│   ├── notifications/              // '/notifications'（screen-design §10）
│   │   ├── index.tsx
│   │   └── useNotificationScan.ts  // アプリ起動時・タブ復帰時の日付変更検知でgenerateNotificationsを呼ぶフック
│   └── settings/                   // '/settings'（screen-design §11。CSVエクスポート/インポート・データ全削除）
│       ├── index.tsx
│       ├── entityCsv.ts            // エンティティ⇔CSV列仕様レジストリ（buildEntityCsv。utils/csv.tsの低水準処理を利用）
│       └── importValidation.ts     // CSVインポートの行単位検証（schema.tsのzodで行単位バリデーション）
├── store/
│   ├── useAppStore.ts              // Zustand + persist + immer（migrate / merge 含む）
│   ├── schema.ts                   // zodスキーマ（7エンティティ）。CSVインポート検証にも再利用
│   ├── selectors.ts                // 導出セレクタ（itemsOf / ordersOf / recordsOf / unreadNotificationCount）
│   ├── types.ts
│   └── slices/                     // Zustandスライス（7エンティティに1:1対応）
│       ├── vendorSlice.ts
│       ├── personSlice.ts
│       ├── equipmentSlice.ts
│       ├── inspectionItemSlice.ts
│       ├── inspectionRecordSlice.ts
│       ├── calibrationOrderSlice.ts
│       └── notificationSlice.ts
├── utils/                          // 汎用ユーティリティ
│   ├── id.ts                       // UUID生成（crypto.randomUUID ラッパー）
│   ├── time.ts                     // 日付整形（YYYY-MM-DD固定。screen-design §0.4）
│   └── csv.ts                      // CSV低水準処理（RFC4180 serialize/parse、UTF-8 BOM付き）
└── styles/index.css
```

## 補足

- ルーターは `main.tsx` の `HashRouter`。ルート定義は `App.tsx` に置く想定とする。11画面のルーティング対応表は screen-design/README.md §0.2 を参照し、本書では再掲しない。
- モーダル群（ItemModal/RecordModal/OrderModal/VendorModal/PersonModal）は特定の1画面に属さず複数画面から起動されるため `components/domain/` に配置する方針とする（screen-design §0.2「モーダルで行う操作」）。pinpon（`domain/` には `WinnerBadge` のみ）と比べて `components/domain/` の役割が広いのは、calibration-managerの画面設計上モーダル起動元が多い（機器詳細・項目一覧・案件一覧など）ことによる calibration-manager 特有の設計判断である。
- `features/*/schema.ts` はReact Hook Form + Zod用のフォームスキーマを想定する（機器登録編集、Vendor/Person等）。
- `store/schema.ts` はCSVインポートの行バリデーションにも再利用する方針とする（[tech-stack.md](./tech-stack.md) 参照）。
- Storybookのstoryはコンポーネント隣に `*.stories.tsx` で配置する（colocation）想定とする。上記ツリーでは省略している。
- `src/test/` はテスト支援ユーティリティを置く想定とする（pinpon踏襲。詳細は省略）。
