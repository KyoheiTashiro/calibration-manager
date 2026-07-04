# 実装計画(フェーズ管理)

実装フェーズの真実源。フェーズ完了 = 完了条件クリア + メイン監査通過 + 本ファイルのチェック更新 + git コミット。

仕様の真実源は [domain-model.md](domain-model.md) と [screen-design/](screen-design/)。本ファイルと矛盾したらそちらが勝つ。判断の記録は [decisions.md](decisions.md)。

## 完了条件(全フェーズ共通)

- `npx tsc -b --noEmit` エラー0
- `npm run lint`(oxlint)エラー0
- `npx vitest run` 全緑
- カバレッジラチェット維持(domain 98/100/98/98、store 97/96/92/97、id.ts 100/100/100/100、csv.ts 97/95/90/97。decisions.md D-032)
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
- [x] 列挙 as const + 派生union(CYCLE / INSPECTION_ITEM_STATUS / ORDER_STATUS / NOTIFICATION_TYPE / EQUIPMENT_STATUS)
- [x] store/types.ts(型の真実源)+ store/schema.ts(Zod、AssertEqual 構造一致強制)
- [x] utils/: id.ts、time.ts(YYYY-MM-DD)、record.ts
- [x] domain/dateCycle.ts 暦月加算・月末補正 + proptest
- [x] domain/leadTime.ts 発注推奨日計算 + フォールバック + proptest
- [x] domain/inspectionItemStatus.ts 5段階優先度(overdue > orderNow > inProgress > dueSoon > ok)+ proptest
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
- [x] selectors.ts(inspectionItemsOf / ordersOf / recordsOf / unreadNotificationCount)
- [x] テストヘルパ(renderWithStore / seedStore / setupStoreIsolation)+ ストアテスト96件(計222件全緑)
- カバレッジ実測: store 98.8/100/95.7、slices 96.7/93.8/96.2(目標 95/95/88 超過)

## Phase 3: 共通UI + レイアウト ✅ 完了(2026-07-03)

担当実績: Sonnet 3並列(UI基本部品 / モーダル系 / レイアウト+ルート)+ Storybook 班。メイン = 監査・barrel作成・Modal残留state修正

- [x] components/ui/: Badge / Button / Modal(Esc・オーバーレイ・破棄確認、3経路を attemptClose に一本化)/ ConfirmModal(既定フォーカス=キャンセル)/ EmptyState / Select・DateField(RHF register 素通し + aria-describedby)/ Table / Tabs
- [x] hooks: useDialog(showModal/close 同期、InvalidStateError回避)/ useOutsideClick
- [x] components/domain/StatusBadge(statusBadgeClass/Label ヘルパ経由、色+日本語ラベル併記)
- [x] components/system/: AppLayout(モバイルオーバーレイ Esc/背景クリック閉)/ Sidebar(w-60、NavLink end)/ Header(通知ベル+未読バッジ、aria-live告知)
- [x] App.tsx 全11ルート + NotFound + プレースホルダページ(features/ 配置)
- [x] barrel: components/ui/index.ts / components/domain/index.ts(メイン作成)
- [x] Storybook 10.4.6 + addon-a11y、ストーリー10本。vite.config 自動検出を viteConfig.stub.ts で遮断(base/PWA干渉回避)
- [x] 監査修正: Modal の破棄確認オーバーレイ残留 → dialog close イベント購読でリセット
- ゲート実績: tsc 0 / oxlint 0 / テスト306件全緑(+84件増)/ npm run build / build-storybook 成功

## Phase 4: マスタ(§9 /vendors, /persons) ✅ 完了(2026-07-03)

担当実績: Sonnet 2並列(vendors班 / persons班)。メイン = TextField/Checkbox 先行追加(D-009)・vendors班残作業引き継ぎ(テスト曖昧クエリ修正・列挙リテラル修正)・監査・barrel追記

- [x] **vendors班**: `features/vendors/index.tsx`(テーブル: 名称/メーカー✓/校正業者✓/標準納期/窓口/連絡先 + 追加・編集・削除ボタン)+ `features/vendors/schema.ts`(RHF+zod: name必須、email形式、standardLeadTimeDays 0以上、両フラグfalseで警告表示)+ `components/domain/VendorModal/`(追加/編集、standardLeadTimeDays は isCalibrator=true 時のみ表示・切替時クリア)
- [x] Vendor削除: 押下時に UI 側参照判定 + `removeVendor` false フォールバックで「この取引先は参照されているため削除できません」表示(D-008)。未参照時は ConfirmModal(危険色)→削除
- [x] **persons班**: `features/persons/index.tsx`(テーブル: 氏名/部署/メール/状態バッジ + 編集)+ `features/persons/schema.ts`(name・email必須+email形式)+ `components/domain/PersonModal/`(新規時 isActive=true 既定、D-007)
- [x] Person無効化: ConfirmModal 付き。有効項目(isActive=true)に割当中なら「現役の点検校正項目 N 件に割り当てられています。通知が届かなくなる可能性があります」警告(N は inspectionItems から算出)
- [x] 両画面: 空状態(EmptyState + 「+ 追加」CTA)、`@/components/ui` barrel 経由で共通UI使用、モーダルの isDirty 破棄確認接続(RHF formState.isDirty)
- [x] `components/domain/index.ts` barrel へ VendorModal / PersonModal 追記(メイン実施)
- [x] テスト: 一覧表示・追加・編集プリフィル・削除ガード両分岐・無効化警告両分岐・バリデーションエラー表示
- [x] メイン追加: `components/ui/TextField` / `components/ui/Checkbox`(+テスト12件、D-009)
- ゲート実績: tsc 0 / oxlint 0 / テスト342件全緑(+36件増)/ カバレッジ閾値維持

## Phase 5: 機器(§3 フォーム → §2 一覧) ✅ 完了(2026-07-03)

担当実績: Sonnet 2並列(一覧班 / フォーム班)。メイン = `features/equipment/constants.ts` 先行作成(状態ラベル・バッジクラス一元化)・監査・ゲート再実行

- [x] **一覧班**: `features/equipment/list/index.tsx`(8列: 管理番号/機器名/型式/メーカー名解決/設置場所/状態バッジ/項目数/最寄り期限)+ テスト10件。検索(managementNo/name/model 部分一致・大文字小文字無視)、状態フィルタ(既定「稼働+休止」= retired 非表示、D-010)、managementNo 昇順、行クリック+Enter/Space で詳細遷移、空状態2種。非稼働機器・項目0件の期限は「—」。期限セルのバッジ色(仕様「任意」)は不実装
- [x] **フォーム班**: `features/equipment/form/index.tsx` + `schema.ts`(`createEquipmentFormSchema(existingManagementNumbers)` ファクトリ、自身除外ユニーク検証「この管理番号は既に使用されています」)+ テスト12件。useParams id 有無でモード判定、保存→詳細遷移、キャンセル→`navigate(-1)`、存在しない id →一覧へ Navigate replace。メーカーセレクトは isManufacturer=true のみ、0件時「メーカーが未登録です。マスタから登録してください」+ /vendors リンク
- [x] 廃棄: 編集時のみ「廃棄にする」→ ConfirmModal(危険色、§0.6)→ `setEquipmentStatus(retired)`(物理削除なし、D-011)
- [x] メイン追加: `components/ui/Textarea`(TextField と同パターン、+テスト6件)+ barrel 追記、`features/equipment/constants.ts`(EQUIPMENT_STATUS_LABELS / BADGE_CLASSES)
- ゲート実績: tsc 0 / oxlint 0 / テスト370件全緑(+28件増)/ カバレッジ閾値維持(--coverage exit 0)

## Phase 6: 項目編集モーダル(§6)+ 機器詳細(§4) ✅ 完了(2026-07-03)

担当実績: Sonnet 直列2班(InspectionItemModal班 / 機器詳細班。詳細はモーダル起動が InspectionItemModal に依存するため直列)。機器詳細班は途中でメインが引き継ぎ完遂(テスト作成・リテラル修正)。メイン = 着手前ゲート D-001/D-002 確定 + RadioGroup / `features/inspection-items/constants.ts` 先行作成(D-013)・監査

- [x] 着手前ゲート: D-001(通知宛先フォールバックなし・元 personId 保持)/ D-002(再稼働時 nextDueDate 据え置き)確定、domain-model.md へ反映済
- [x] **InspectionItemModal班**: `components/domain/InspectionItemModal/`(InspectionItemModal.tsx / schema.ts / index.ts + テスト16件)。external 時のみ条件表示(校正依頼先/納期/発注余裕日ブロック)、internal 切替で vendorId・leadTimeDays クリア(bufferDays は必須属性のため保持)。vendorId は external 時必須(superRefine)。数値系はフォーム上 string(vendors/schema.ts 方針)。既定値 bufferDays=14 / noticeDaysBefore=30(domain/constants.ts 参照)。担当者セレクトは isActive=true + 編集時のみ現担当の無効者を「(無効)」付きで含める(D-012)。空状態2種(校正業者0件 / 有効担当者0件 + マスタ導線)
- [x] **機器詳細班**: `features/equipment/detail/`(index.tsx + hooks.ts + テスト17件を4ファイル分割)。基本情報カード(メーカー名解決・状態バッジ)、項目一覧(isActive 優先→nextDueDate 昇順、無効項目は末尾+淡色)、実施記録(項目横断 doneDate 降順・同日 id 昇順)、InspectionItemModal 起動(追加/編集)、存在しない id →一覧へ Navigate replace、空状態2種。項目ステータスバッジは機器 active 時のみ導出、非稼働は「—」(D-014)。担当者無効は「(無効)」注記(D-001)
- [x] 各項目行の[記録]ボタンは disabled で先行設置(実施記録モーダルは Phase 7 で接続)
- [x] メイン追加: `components/ui/RadioGroup`(fieldset/legend + register 素通し、+テスト5件、D-013)+ barrel 追記、`features/inspection-items/constants.ts`(INSPECTION_ITEM_TYPE/EXECUTION/RECORD_RESULT の LABELS・OPTIONS、CYCLE_OPTIONS)
- ゲート実績: tsc 0 / oxlint 0 / テスト408件全緑(+38件増)/ カバレッジ閾値維持

## Phase 7: 記録モーダル(§7)+ 案件かんばん(§8)相互依存 ✅ 完了(2026-07-03)

担当実績: メイン = 仕様違反是正(D-015)・結合シナリオテスト・共有定数(orders/constants.ts、RECORD_RESULT_OPTIONS)先行作成・監査是正(submitFailed 残留・cost 整数統一 D-021)。委譲 = RecordModal班(Opus)∥ OrderModal班(Sonnet)→ かんばん班(Opus、RecordModal 依存のため後発)

- [x] メイン是正: addRecord が fail 時に lastDoneDate まで据え置いていた仕様違反を修正(07 副作用2 は無条件更新。既存テストも仕様準拠へ是正、D-015)
- [x] 結合シナリオテストをメインが先行作成: `features/inspectionOrder/integration.test.tsx`(returned→記録登録→pass 期限再計算+orderId 紐付け+completed 連鎖 / fail 据え置き+completed 連鎖 / planned→ordered→inCalibration→returned 遷移チェーン)。委譲班への UI 契約を兼ねる
- [x] **RecordModal班**: `components/domain/RecordModal/`(RHF+zod、実施日既定=今日、doneBy プリフィル3分岐 D-017、fail 注意書き、未来日警告 D-016、案件連携表示、addRecord null 時エラー維持)+ 機器詳細[記録]ボタン接続(Phase 6 先行設置の disabled 解除、recordLaunch.test.tsx)
- [x] **かんばん班**: `features/inspectionOrder/`(index.tsx / OrderCard.tsx / TransitionDialogs.tsx / schema.ts)。4列+「完了/中止も表示」トグルで終端2列追加(D-018、グレー調・アクションなし)、隣接遷移のみ(発注ダイアログ=発注日必須・整合警告 D-019 / 校正中へ即時 / 返却ダイアログ=実返却日 / 中止 ConfirmModal)、updateOrderStatus true 時のみ updateOrder patch、returned→RecordModal 起動、dangling「(参照先なし)」(D-003)、空状態2種、列内 dueDate 昇順→id 昇順
- [x] **OrderModal班**: `components/domain/OrderModal/`(planned 新規作成、依頼先既定=inspectionItem.vendorId・isCalibrator 限定、D-006 no-op 時「進行中の案件が既に存在します」)。起動元接続は Phase 8(D-020)
- [x] メイン監査是正: 両モーダルの submitFailed を閉時リセット(残留エラー防止)、発注ダイアログ cost を整数粒度へ統一(D-021)+ schema.test.ts 追加
- ゲート実績: tsc 0 / oxlint 0 / テスト452件全緑(+44件増)/ カバレッジ閾値維持

## Phase 8: 点検校正項目一覧(§5、中核・最大工数) ✅ 完了(2026-07-03)

担当実績: メイン = 着手前判断 D-022(URLクエリ=フィルタ真実源)/ D-023(無効・非稼働トグル不実装)/ D-024(personLabelOf を selectors へ昇格。リファクタもメイン実施)+ hooks 契約明文化・監査・lint 是正(D-024 起因の依存数超過を detail/hooks 再export で解消)。委譲 = ロジック班(Opus)→ UI班(Opus)直列

- [x] クエリ受付(`?status=&type=&execution=&personId=`): `features/inspection-items/hooks.ts` の `parseInspectionItemListFilters`(不正・未知値・存在しない personId は「全て」扱い、D-022)。フィルタ状態は useSearchParams のみで管理(ローカル state 二重管理なし)、変更・クリアは `setSearchParams(replace: true)`
- [x] 4フィルタ: 状態(§0.3 の5値、導出済み row.status に適用)/ 種別 / 内外 / 担当(name 昇順、無効者「(無効)」注記)。「クリア」は4パラメータのみ除去。`buildInspectionItemRows`(active機器×isActive項目のみ、dangling 機器除外、nextDueDate 昇順→id 昇順)+ `filterInspectionItemRows`(AND)を純関数で分離しテスト22件
- [x] 3モーダル起動結節点: UI 3分割(index.tsx / FilterBar.tsx / InspectionItemTable.tsx、依存数上限対策)。[記録]→RecordModal、[案件]→OrderModal(canCreateOrder=true の行のみ表示 = 外部かつ有効案件なし)、[編集]→InspectionItemModal。単一 modal state(kind)で同時1つ。空状態2種(対象0件 / 絞り込み0件+クリア)
- ゲート実績: tsc 0 / oxlint 0 / テスト489件全緑(+37件増)/ カバレッジ閾値維持(inspectionItems/hooks.ts 100/97/100)

## Phase 9: ダッシュボード(§1)+ 通知(§10) ✅ 完了(2026-07-03)

担当実績: メイン = 着手前判断 D-025(スキャン3経路・前回スキャン日は非永続)/ D-026(要対応行クリック→機器詳細)/ D-027(通知行クリック遷移解決・dangling は既読化のみ)+ 共有定数 `features/notifications/constants.ts`(通知5種別ラベル・バッジ色、deliveryOverdue のみ濃赤)先行作成・監査・キーボード遷移テスト補完。委譲 = 通知班(Opus)∥ ダッシュボード班(Opus)並列

- [x] サマリーカード → `/inspection-items?status=` 導線: `features/dashboard/`(index.tsx + hooks.ts + SummaryCards / ActionRequiredList / NotificationList の3分割、依存数上限対策)。カード4枚(overdue/orderNow/dueSoon/inProgress、色・ラベルは statusBadge ヘルパ)、要対応リスト(buildInspectionItemRows 再利用・優先度 overdue→orderNow→dueSoon の安定ソート・行クリック+Enter/Space→機器詳細 D-026)、最新の通知5件(未読優先→createdDate降順→id昇順)、空状態2種
- [x] useNotificationScan: 起動時 + 日付変更検知: `features/notifications/useNotificationScan.ts`(D-025: マウント時即時+60秒ポーリング+visibilitychange 可視復帰、useRef 比較で同日抑止、App.tsx で1箇所マウント)。fake timers テスト5件
- [x] 未読同一(targetType, targetId, type)重複抑止: Phase 2 実装済の notificationSlice.generateNotifications を変更なしで使用(スライス・domain 無変更)
- [x] Order 宛先は inspectionItem 経由解決: Phase 1 実装済の notificationRules.orderNotificationSeeds を使用。通知センター(タブ未読/既読・全て既読・行クリック=既読化→D-027 遷移・種別バッジ色+ラベル併記・空状態2種)実装
- ゲート実績: tsc 0 / oxlint 0 / テスト524件全緑(+35件増)/ カバレッジラチェット維持(domain 100/100/100、store 99.2/95.8/98.7、id.ts 100)

## Phase 10: 設定/CSV(§11) ✅ 完了(2026-07-03)

担当実績: メイン = 着手前判断 D-028(CSV列=types.ts宣言順・英語キー・RFC4180/CRLF)/ D-029(インポート=対象エンティティ全置換・参照は現在ストアと突合)/ D-030(エラー行スキップ不実装、エラーありは確定不可)/ D-031(全削除=モーダル内チェック→活性化、多重確認なし)+ CSV純関数・検証ロジック・`replaceEntities` 実装・監査是正(検証結果の世代ガード)。委譲 = UI班(Opus)

- [x] BOM付きエクスポート: `utils/csv.ts`(RFC4180 serialize/parse、CSV_BOM)+ `features/settings/entityCsv.ts`(7種別の列仕様レジストリ + `buildEntityCsv`、id昇順安定出力)+ `ExportSection`(7ボタン、`${kind}_YYYY-MM-DD.csv`、0件でもヘッダのみ出力)。ラウンドトリップ proptest 2本(セル二次元配列 / vendors・persons エクスポート→インポート)
- [x] 行単位 safeParse 検証 + エラー行プレビュー: `features/settings/importValidation.ts`(ヘッダ一致 → 列数 → セル変換 → zod(store/schema.ts流用・issue日本語整形)→ ファイル内ユニーク(id + equipment.managementNo)→ 外向き参照チェック(notifications は targetType 別)。行番号=ファイル行(ヘッダ=1))+ `ImportSection`(対象Select・プレビュー「✓N行 取り込み可/✗N行 エラー」・エラー0件のみ[確定]活性・ConfirmModal→`replaceEntities` 全置換・種別変更/キャンセルでクリア)。ストアへ `replaceEntities` 追加(storeState.ts / useAppStore.ts)
- [x] 全削除2段階確認: `DangerSection`([データを全削除]→モーダル: 警告文+同意チェックで[削除する]活性→`resetAll()`、閉時チェックリセット)
- [x] メイン監査是正: file.text() 解決前の種別変更で旧種別の検証結果が混入する競合を世代カウンタ(useRef)で破棄
- ゲート実績: tsc 0 / oxlint 0 / テスト576件全緑(+52件増)/ カバレッジラチェット維持(--coverage exit 0)

## Phase 11: 仕上げ

- [ ] PWA 完全オフライン実機検証(precache、autoUpdate、初回のみオンライン)
  - 済(2026-07-03): 本番ビルドの sw.js precache マニフェスト検証 → 134エントリ 3.3MB、woff2 124件(D-033)・index.html・webmanifest 包含を確認
  - 残: 実機でのオフライン動作確認(SW登録→機内モード→全画面遷移)
- [ ] a11y: axe 重大違反0、Lighthouse 95+、dueSoon 黄コントラスト検証
  - 済(2026-07-03): jsdom + axe-core 4.12 で全12ルートをシードデータ入りでスキャン → critical/serious 違反0(color-contrast はレイアウト非依存のため除外し数値検証で代替)。dueSoon 黄コントラスト = yellow-800 on yellow-100 実測 6.40:1(AA 4.5 クリア、ビルドCSSの oklch 実値から算出)
  - 残: 実ブラウザでの Lighthouse 95+(サンドボックスでローカルサーバ listen 不可のため未実施)
- [x] カバレッジラチェット最終確定(D-032: domain 98/100/98/98、store 97/96/92/97、id.ts 100、csv.ts 97/95/90/97。実測を下回らず引き下げなし、`--coverage` exit 0)
- [x] 利用マニュアル画面(/manual)追加: 静的コンテンツ・store参照なし、サイドバー最下部(docs/screen-design/12-manual.md、decisions.md D-035)

## Phase 12: docs 監査是正(2026-07-03 docs 横断監査で検出) ✅ 完了(2026-07-03)

docs 全ファイル + 実装の突合監査結果。「確定後は該当 docs にも反映してから閉じる」(decisions.md 冒頭)の反映漏れと、D-036 リネームの実装巻き添え1件。

### 実装修正

- [x] `src/components/system/Sidebar.tsx`: `NAV_ITEMS.map((inspectionItem) => ...)` の変数名が誤り。NavItem(ナビ項目)であってドメインの InspectionItem ではない。D-036 が明示的にリネーム対象外とした NavItem 文脈への一括置換の巻き添え。`navItem` へ改名(挙動変更なし)

### docs 是正(確定済み判断の反映漏れ。反映後 decisions.md の該当 D を「docs反映済」へ更新)

- [x] `architecture/store.md` / `architecture/tech-stack.md` / `architecture/directory-structure.md`: 「設計フェーズ・コード未実装」前提の記述、および `STORAGE_VERSION=1`・「migration ステップ未登録」の記述が D-036(v2、`migrateV1ToV2` 登録済み)と矛盾。実装済みの現状 + v2 へ更新(LocalStorage キー `calibration-manager:v1` は実装どおり変更なし。version のみ 2)
- [x] `screen-design/README.md`: §0.1 サイドバー図(8項目)に「利用マニュアル」追加(D-035、実装は9項目)。画面遷移図に `/manual` 追加。末尾「付記: 未決事項」表の D-001(通知宛先)・D-002(再稼働時リセット)が「※未決」のまま → 確定済みへ更新(domain-model.md §8 は反映済みで、本表とだけ矛盾)
- [x] `docs/README.md`: 画面別仕様の目次と「画面一覧」表に 12-manual(`/#/manual`)が欠落 → 追加
- [x] `screen-design/01-dashboard.md`: 要対応行クリック「機器詳細(または点検校正項目一覧の該当行)」→ D-026 で機器詳細に確定済み。択一記述を除去
- [x] `screen-design/10-notifications.md`: 行クリック遷移「`/inspection-items`(該当項目)または該当機器詳細」→ D-027 の確定内容(order→`/orders`、inspectionItem→機器詳細、dangling は既読化のみ)へ書き換え
- [x] `screen-design/02-equipment-list.md`: 状態フィルタ「全て/稼働/休止/廃棄」の4択とモック「稼働のみ」が D-010(「稼働+休止」既定の5択)と不一致 → 更新
- [x] `screen-design/08-orders.md`: 「1つの項目に対し `ordered`/`inCalibration` の有効案件は同時に1件まで」が D-006(planned〜returned の全有効状態で1件まで、ストア層強制)より弱く矛盾 → D-006 準拠へ是正
- [x] `screen-design/11-settings.md`: 「エラー行はスキップ、または全件中断のいずれか」→ D-030 で中断のみ確定。択一記述を除去
- [x] `screen-design/09-masters.md`: 無効化警告の「※通知の宛先フォールバック先は未決」→ D-001 で確定済み(フォールバックなし)。注記を更新
- [x] `design/ui-guidelines.md` §5: サイドバー「ルート一覧(§0.2の8項目)」→ 9項目(マニュアル追加後)
- [x] `architecture/directory-structure.md`: ツリーに `features/manual/`・`src/dev/`(D-034)欠落、selectors コメントに `personLabelOf`(D-024)/`inspectionItemRowsOf` 欠落 → 現状へ追随

### 対応不要(監査済み・矛盾なしと判定)

- 本ファイル Phase 1〜10 の `STORAGE_VERSION=1`・旧パス表記(`features/inspection-items/` 等)は当時の履歴ログのため原文維持(D-036 の decisions.md 過去エントリと同じ扱い)
- `domain-model.md` §7「画面構成(案)」にマニュアルなし → 「案」であり規範ではないため許容
- `vitest.config.ts` の thresholds は D-032 と完全一致を確認
- コード全域の D-036 リネーム整合を grep 監査: 上記 Sidebar 1件以外の巻き添え・残留(`itemId` 等)なし

---

## 運用ループ(フェーズ毎)

1. **仕様固定**(メイン): 委譲前にファイル単位契約を明文化(作るファイル / export シグネチャ / 参照可能モジュール / 対応する docs 節)
2. **委譲**: サブエージェントは本ファイルの該当フェーズ節 + docs の該当節を参照して実装
3. **機械ゲート**: 完了条件(冒頭)を全部緑に
4. **監査**(メイン): `git diff` で domain-model.md 突合・カスケード副作用・既存テスト改変有無を確認
5. **記録**: 本ファイルのチェック更新 + decisions.md 追記 + git コミット(フェーズ毎1コミット)
