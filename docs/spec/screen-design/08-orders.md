# 8. 点検校正外部案件

[画面設計 共通仕様・全体構成](./README.md) の一部。ステータス色・モーダル共通挙動・確認ダイアログ等の共通仕様は [README(§0 共通仕様)](./README.md#0-共通仕様) を参照。

**目的**: 外部校正の発注〜返却〜記録までの進捗を、状態別かんばんで管理する。

**URL**: `/orders`

## 画面レイアウト

```
┌───────────────────────────────────────────────────────────┐
│ 点検校正外部案件                     [✓ 完了/中止も表示]      │
│ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐         │
│ │ planned │ │ ordered │ │inCalibr. │ │returned │         │
│ │(発注準備)│ │(発注済)│ │ (校正中) │ │(返却済) │         │
│ ├─────────┤ ├─────────┤ ├──────────┤ ├─────────┤         │
│ │EQ-001   │ │EQ-014   │ │EQ-020    │ │EQ-005   │         │
│ │年次校正 │ │校正     │ │年次校正  │ │校正     │         │
│ │ミツトヨ │ │エー社   │ │日本測器  │ │ミツトヨ │         │
│ │予定06-20│ │発06-01  │ │返予07-10 │ │返07-05  │         │
│ │[発注する]│ │[校正中へ]│ │[返却する] │ │[記録登録]│        │
│ │[中止]   │ │[中止]   │ │[中止]    │ │         │         │
│ └─────────┘ └─────────┘ └──────────┘ └─────────┘         │
└───────────────────────────────────────────────────────────┘
```

## 表示項目(カード = CalibrationOrder §3.6)

各カード: `管理番号`(inspectionItem→equipment.managementNo)、`機器名`、`項目名`(inspectionItem.name)、`校正依頼先`(vendorId→Vendor.name)、`発注日`(orderedDate)、`返却予定日`(dueDate)、`費用`(cost)。列は status で分類(planned/ordered/inCalibration/returned)。

## 操作・アクション(状態遷移。ドメインモデル §3.6 に厳密準拠)

```
planned → ordered → inCalibration → returned → completed
                                        ↘ cancelled
```

- **planned → ordered**: 「発注する」→ 小ダイアログで `orderedDate` 入力(既定=今日)。任意で dueDate・cost。
- **ordered → inCalibration**: 「校正中へ」→ 即時遷移(入力なし)。
- **inCalibration → returned**: 「返却する」→ ダイアログで `returnedDate`(実返却日、既定=今日)入力。
- **returned → completed**: 「記録登録」→ **[実施記録登録モーダル](./07-record-modal.md)** を起動。記録確定で当該案件が `completed`、項目の nextDueDate 更新([§7 副作用5](./07-record-modal.md#操作アクション副作用重要))。
- **各段階 → cancelled**: 「中止」→ 確認ダイアログ後に `cancelled`。
- 遷移は上記の隣接遷移のみ許可(飛び越し不可)。`completed`/`cancelled` からの再遷移不可。

## 案件作成モーダル(planned新規作成)

- 起動元: [点検校正項目一覧](./05-inspection-item-list.md)の「案件」アクション(外部・有効案件なしの項目)。
- 入力: `inspectionItemId`(プリセット)、`vendorId`(既定=inspectionItem.vendorId、`isCalibrator=true`)、任意で dueDate・cost・note。作成時 `status=planned`。

## 表示ルール・バリデーション(zod)

- 表示トグル「完了/中止も表示」ON で `completed`/`cancelled` の2列を右側に追加表示する(カードはグレー調・アクションボタンなし)。**既定は OFF(非表示)**(D-018)。
- `orderedDate`(発注時)/ `returnedDate`(返却時)は必須・`YYYY-MM-DD`。
- `dueDate`・`returnedDate` が入力されている場合 `orderedDate ≤ dueDate`、`orderedDate ≤ returnedDate` の不整合は警告表示のみでブロックしない。形式検証(必須・`YYYY-MM-DD`)は zod でブロックする(D-019)。
- `cost`: 任意・0以上の整数のみ(小数は検証エラー。D-021)。
- 1つの項目に対し有効案件(`planned`〜`returned` の全状態)は同時に1件まで(D-006)。`addOrder` がストア層で強制し、既存の有効案件がある場合は no-op(null 返却)する。

## 空状態

- 全列0件: 「点検校正外部案件はありません。点検校正項目一覧から案件を追加できます」+ `/inspection-items` 導線。
- 個別列0件: 各列に薄い「なし」プレースホルダ。
