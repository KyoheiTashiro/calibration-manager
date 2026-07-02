# 6. 項目編集モーダル

[画面設計 共通仕様・全体構成](./README.md) の一部。ステータス色・モーダル共通挙動・確認ダイアログ等の共通仕様は [README(§0 共通仕様)](./README.md#0-共通仕様) を参照。

**目的**: 点検校正項目(InspectionItem)の新規登録・編集。機器詳細・項目一覧から起動。

**起動元**: [機器詳細](./04-equipment-detail.md)、[項目一覧](./05-item-list.md)

## 画面レイアウト

```
┌───────────────────────────────────────┐
│ 点検校正項目を追加 / 編集          [×]│
│ 対象機器   EQ-001 ノギス(固定表示)  │
│ 項目名*    [年次校正            ]      │
│ 種別*      (○点検 / ○校正)           │
│ 周期*      [1Y ▼]                      │
│ 実施区分*  (○内部 / ○外部)           │
│ ─ 外部選択時のみ ─────────────────    │
│ 校正依頼先*[ミツトヨ校正センター ▼]   │
│ 納期(日)  [30    ](空→標準納期使用) │
│ 発注余裕日 [14    ]                    │
│ ───────────────────────────────────   │
│ 担当者*    [田中 ▼]                    │
│ 通知開始日数[30    ]                   │
│ 次回期限*  [2026-06-20]                │
│   ※新規のみ手入力。以降は記録から自動 │
│    計算されます(編集時は注意)        │
│ 有効       [✓]                        │
│                       [キャンセル][保存]│
└───────────────────────────────────────┘
```

## 表示項目 / 入力フィールド(InspectionItem §3.4)

| フィールド   | 属性             | 必須    | 形式                                                    |
| ------------ | ---------------- | ------- | ------------------------------------------------------- |
| 対象機器     | equipmentId      | ○       | 起動元からプリセット・固定表示                          |
| 項目名       | name             | ○       | テキスト                                                |
| 種別         | type             | ○       | inspection/calibration                                  |
| 周期         | cycle            | ○       | enum(1M/3M/6M/1Y/2Y/3Y/5Y/10Y)                          |
| 実施区分     | execution        | ○       | internal/external                                       |
| 校正依頼先   | vendorId         | 外部時○ | セレクト(Vendor `isCalibrator=true`)                    |
| 納期(日)     | leadTimeDays     |         | 数値。空欄なら Vendor.standardLeadTimeDays を使用(§4.2) |
| 発注余裕日   | bufferDays       | ○       | 数値。既定14                                            |
| 担当者       | personId         | ○       | セレクト(Person `isActive=true`)                        |
| 通知開始日数 | noticeDaysBefore | ○       | 数値。既定30                                            |
| 次回期限     | nextDueDate      | ○       | 日付。新規は手入力必須                                  |
| 有効         | isActive         | ○       | チェックボックス。既定true                              |

## 操作・アクション

- `execution` を `external` にした時のみ、校正依頼先/納期/発注余裕日ブロックを表示。`internal` では非表示かつ vendorId/leadTimeDays をクリア。
- 「保存」→ 検証通過で作成/更新し、起動元画面を再描画。

## 表示ルール・バリデーション(zod)

- `name` / `type` / `cycle` / `execution` / `bufferDays` / `personId` / `noticeDaysBefore` / `nextDueDate` / `isActive`: 必須(ドメインモデル必須列に準拠)。
- `vendorId`: **execution=external のとき必須**。`isCalibrator=true` の Vendor に限定。internal のときは値を持たない。
- `leadTimeDays`: 任意・0以上の数値。空欄可。
- `bufferDays`: 0以上の数値。未入力時は既定14を投入。
- `noticeDaysBefore`: 0以上の数値。既定30。
- `nextDueDate`: `YYYY-MM-DD`。**新規作成時は手入力必須**。編集時も変更可能だが「以降は実施記録から自動計算されます」の注意書きを表示(誤操作防止)。

## 空状態

- 外部選択時に `isCalibrator=true` Vendor が0件: 「校正業者が未登録です」+ `/vendors` への導線。
- `isActive=true` の Person が0件: 「有効な担当者がいません」+ `/persons` への導線。
