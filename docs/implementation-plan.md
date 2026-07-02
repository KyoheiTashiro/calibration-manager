# 実装計画(フェーズ管理)

実装フェーズの真実源。フェーズ完了 = 完了条件クリア + メイン監査通過 + 本ファイルのチェック更新 + git コミット。

仕様の真実源は [domain-model.md](domain-model.md) と [screen-design/](screen-design/)。本ファイルと矛盾したらそちらが勝つ。判断の記録は [decisions.md](decisions.md)。

## 完了条件(全フェーズ共通)

- `npx tsc -b --noEmit` エラー0
- `npm run lint`(oxlint)エラー0
- `npx vitest run` 全緑
- カバレッジラチェット維持(domain 98/100/95、store 95/95/88、id.ts 100)
- メインセッションによる `git diff` 監査通過

---

## Phase 0: プロジェクト基盤 ✅ 完了(2026-07-03)

- [x] Vite + React 19 + TS、package.json でライブラリ版確定
- [x] `base: '/calibration-manager/'` + vite-plugin-pwa manifest(start_url/scope 同値)+ HashRouter 三者一致
- [x] Tailwind 4(トークン: primary/danger/line/subBg、rowSm/rowMd)、Noto Sans JP
- [x] oxlint + oxfmt、Vitest(jsdom単一環境)+ vitest.setup.ts(jest-dom / cleanup / HTMLDialogElement polyfill)
- [x] GitHub Actions 3本(test / lint / deploy)。deploy は build/deploy ジョブ分離 + concurrency pages
- [x] main.tsx(HashRouter + ErrorBoundary + SW登録)、App.tsx 空ルート

## Phase 1: 型・定数・ドメイン純関数 ✅ 完了(2026-07-03)

- [x] constants/: ROUTES、storage(`calibration-manager:v1`, STORAGE_VERSION=1)
- [x] 列挙 as const + 派生union(CYCLE / ITEM_STATUS / ORDER_STATUS / NOTIFICATION_TYPE / EQUIPMENT_STATUS)
- [x] store/types.ts(型の真実源)+ store/schema.ts(Zod、AssertEqual 構造一致強制)
- [x] utils/: id.ts、time.ts(YYYY-MM-DD)、record.ts
- [x] domain/dateCycle.ts 暦月加算・月末補正 + proptest
- [x] domain/leadTime.ts 発注推奨日計算 + フォールバック + proptest
- [x] domain/itemStatus.ts 5段階優先度(overdue > orderNow > inProgress > dueSoon > ok)+ proptest
- [x] domain/orderStatus.ts 遷移許可テーブル
- [x] domain/notificationRules.ts 5種別発生条件
- [x] domain/statusBadge.ts クラス/ラベル単一ヘルパ
- [x] テスト126件 全緑

## Phase 2: ストア ✅ 完了(2026-07-03)

担当実績: メイン = 全スライス実装・persistence(merge/migrate/sanitize)・カスケードテスト、Sonnet委譲 = 単純CRUDスライステスト + selectorsテスト

- [x] 7スライス(uiSliceなし)、persist(immer(...))、partialize=エンティティRecordのみ、resetAll(全削除・テスト分離用)
- [x] migrate 仕組み(MIGRATIONSステップテーブル、テスト用に注入可能)
- [x] merge 3段サルベージ(全体safeParse → レコード単位救済 → 初期状態)+ sanitizeAppState(D-003: 通知のみ除去)
- [x] カスケード: addRecord(期限更新 + Order completed連鎖、D-005原子性)、removeVendor(参照時no-op)、updateOrderStatus(遷移テーブル検証 + completed直接遷移拒否)、addOrder(D-006: 1項目1有効案件)
- [x] selectors.ts(itemsOf / ordersOf / recordsOf / unreadNotificationCount)
- [x] テストヘルパ(renderWithStore / seedStore / setupStoreIsolation)+ ストアテスト96件(計222件全緑)
- カバレッジ実測: store 98.8/100/95.7、slices 96.7/93.8/96.2(目標 95/95/88 超過)

## Phase 3: 共通UI + レイアウト

担当: 委譲(Sonnet/Opus)、メイン監査

- [ ] components/ui/: Badge / Button / Modal(Esc・オーバーレイ・編集中破棄確認)/ ConfirmModal(既定フォーカス=キャンセル)/ EmptyState / Select / DateField / Table / Tabs
- [ ] hooks: useDialog / useOutsideClick
- [ ] components/domain/StatusBadge(色 + 日本語ラベル併記必須)
- [ ] components/layout/: AppLayout / Sidebar(w-60、md未満ハンバーガー)/ Header(通知ベル + 未読バッジ)
- [ ] App.tsx 全ルート + プレースホルダページ
- [ ] Storybook 起動 + 共通UIストーリー(addon-a11y)

## Phase 4: マスタ(§9 /vendors, /persons)

担当: 委譲

- [ ] Vendor CRUD、削除ガード(項目参照時)
- [ ] Person CRUD、無効化(削除でなく inactive)
- [ ] 他フォームへのセレクト供給元として完成

## Phase 5: 機器(§3 フォーム → §2 一覧)

担当: 委譲

- [ ] 機器フォーム: 管理番号ユニーク検証、メーカーセレクト
- [ ] 機器一覧: 廃棄確認(2段階)

## Phase 6: 項目編集モーダル(§6)+ 機器詳細(§4)

担当: 委譲、メイン監査重点

- [ ] external 時のみ条件表示(vendor / leadTime)、internal 切替でクリア
- [ ] 機器詳細: 項目一覧内包、モーダル起動

**着手前ゲート: decisions.md の未決事項(D-001〜D-003)確定必須**

## Phase 7: 記録モーダル(§7)+ 案件かんばん(§8)相互依存

担当: **メイン直担当 or 重点レビュー**(ドメイン心臓部)

- [ ] 先に結合シナリオテストをメインが作成(record pass → 期限再計算 → Order completed 連鎖)
- [ ] 記録モーダル: result分岐(pass/adjusted → 期限再計算、fail → 据え置き)
- [ ] returned 起動 → orderId 紐付け + completed 遷移
- [ ] かんばん: 隣接遷移のみ + 遷移毎入力ダイアログ + 1項目1有効案件制約

## Phase 8: 項目一覧(§5、中核・最大工数)

担当: フィルタロジック(純関数+テスト)= メイン監査重点、UI = 委譲。分割委譲

- [ ] クエリ受付(`?status=&type=&execution=&personId=`)
- [ ] 4フィルタ
- [ ] 3モーダル(項目編集・記録・案件)起動結節点

## Phase 9: ダッシュボード(§1)+ 通知(§10)

担当: 委譲、useNotificationScan はメイン監査重点

- [ ] サマリーカード → `/items?status=` 導線
- [ ] useNotificationScan: 起動時 + 日付変更検知
- [ ] 未読同一(targetType, targetId, type)重複抑止
- [ ] Order 宛先は item 経由解決

## Phase 10: 設定/CSV(§11)

担当: CSV UI = 委譲、インポート検証ロジック = メイン

- [ ] BOM付きエクスポート
- [ ] 行単位 safeParse 検証 + エラー行プレビュー
- [ ] 全削除2段階確認

## Phase 11: 仕上げ

- [ ] PWA 完全オフライン実機検証(precache、autoUpdate、初回のみオンライン)
- [ ] a11y: axe 重大違反0、Lighthouse 95+、dueSoon 黄コントラスト検証
- [ ] カバレッジラチェット最終確定

---

## 運用ループ(フェーズ毎)

1. **仕様固定**(メイン): 委譲前にファイル単位契約を明文化(作るファイル / export シグネチャ / 参照可能モジュール / 対応する docs 節)
2. **委譲**: サブエージェントは本ファイルの該当フェーズ節 + docs の該当節を参照して実装
3. **機械ゲート**: 完了条件(冒頭)を全部緑に
4. **監査**(メイン): `git diff` で domain-model.md 突合・カスケード副作用・既存テスト改変有無を確認
5. **記録**: 本ファイルのチェック更新 + decisions.md 追記 + git コミット(フェーズ毎1コミット)
