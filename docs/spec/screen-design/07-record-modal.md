# 7. 実施記録登録モーダル

[画面設計 共通仕様・全体構成](./README.md) の一部。ステータス色・モーダル共通挙動・確認ダイアログ等の共通仕様は [README(§0 共通仕様)](./README.md#0-共通仕様) を参照。

**目的**: 項目の実施結果(InspectionRecord)を登録し、次回期限を更新する。

**起動元**: [機器詳細](./04-equipment-detail.md)、[点検校正項目一覧](./05-inspection-item-list.md)、[点検校正外部案件](./08-orders.md)の `returned` カード

## 画面レイアウト

```
┌───────────────────────────────────────┐
│ 実施記録を登録                     [×]│
│ 対象:EQ-001 ノギス / 年次校正        │
│ 実施日*   [2026-06-20]  (既定:今日) │
│ 実施者*   [ミツトヨ校正センター  ]    │
│ 結果*     (○合格 ○不合格 ○調整合格) │
│ 備考      [証明書#A-102          ]    │
│ (案件連携:ORD-0007 と紐付け表示)    │
│                       [キャンセル][登録]│
└───────────────────────────────────────┘
```

## 表示項目 / 入力フィールド(InspectionRecord §3.5)

| フィールド | 属性     | 必須 | 形式                                                      |
| ---------- | -------- | ---- | --------------------------------------------------------- |
| 対象項目   | inspectionItemId   | ○    | 起動元からプリセット・固定表示                            |
| 実施日     | doneDate | ○    | 日付。既定=今日                                           |
| 実施者     | doneBy   | ○    | テキスト(外部は業者名。可能なら Vendor.name をプリフィル) |
| 結果       | result   | ○    | pass/fail/adjusted                                        |
| 備考       | note     |      | テキスト(校正証明書番号など)                              |
| 案件参照   | orderId  |      | 案件経由起動時に自動セット                                |

**doneBy プリフィルの解決順(D-017)**: ①案件経由起動(orderId あり)→ 当該案件の vendorId から Vendor.name、②それ以外で項目が external → item.vendorId から Vendor.name、③internal または Vendor が解決不能 → 空欄。

## 操作・アクション・副作用(重要)

登録時の副作用を以下に明記する(ドメインモデル §3.5 / §4.1):

1. InspectionRecord を新規作成。
2. `inspectionItem.lastDoneDate = doneDate`。
3. **`result` が `pass` または `adjusted` のとき**: `inspectionItem.nextDueDate = doneDate + cycle`(暦月ベース [§0.4](./README.md#04-日付表示形式))。
4. **`result` が `fail` のとき**: `nextDueDate` を更新せず、項目は要対応状態(再実施が必要)として扱う。※期限が過ぎていれば `overdue` のまま表示。
5. **点検校正外部案件(status=`returned`)から起動した場合**: `orderId` を記録に紐付け、当該 CalibrationOrder を `completed` へ遷移(§3.6)。

**不正入力時の挙動(D-005)**: 以下のいずれかに該当する場合、レコード追加ごと全体 no-op(部分適用しない)とする。
- `inspectionItemId` が存在しない。
- `result !== 'fail'` かつ `addCycle(doneDate, cycle)` が null(doneDate 不正)。
- `orderId` 指定時に、案件が存在しない、または現状態から `completed` へ遷移不可(`returned` 以外からの遷移)。

## 表示ルール・バリデーション(zod)

- `doneDate`: 必須・`YYYY-MM-DD`。既定=今日。未来日は警告表示のみでブロックしない(D-016)。
- `doneBy`: 必須・非空。
- `result`: 必須・enum(pass/fail/adjusted)。
- `note`: 任意。
- fail 選択時、モーダル内に「次回期限は更新されません」の注意書きを表示。

## 空状態

- なし(常に対象項目が確定した状態で起動)。
