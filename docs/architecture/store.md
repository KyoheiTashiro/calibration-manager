# ストア設計（useAppStore）

関連: [domain-model.md](../domain-model.md) ／ [tech-stack.md](./tech-stack.md)

アプリ全状態を保持する zustand ストアの設計方針。実装想定パス: `src/store/useAppStore.ts`。calibration-manager は設計フェーズであり、以下はいずれも実装方針・想定であってすでに動作する実績ではない。

## 全体像

```
useAppStore = create<StoreState>()(
  persist(                       // ← LocalStorage 永続化・migrate・merge
    immer(                       // ← set 内でミュータブル記法（Immer ドラフト）
      (...) => ({ ...7スライス合成 })
    ),
    { name, version, partialize, migrate, merge }
  )
)
```

- ミドルウェア順は `persist(immer(...))`。`immer` を内側に置くことで、各スライスの `set` はImmerドラフトを直接変更する記法で書ける想定とする。
- 単一ストア構成とし、Context Providerは設けない。コンポーネントは `useAppStore(selector)` で購読する方針とする。
- 永続化はLocalStorageのみとし、サーバ同期は行わない（単一端末ローカル運用）。
- calibration-managerの7エンティティ（Vendor / Person / Equipment / InspectionItem / InspectionRecord / CalibrationOrder / Notification）にそれぞれ1対1対応する7スライスのみでストアを構成する方針とする。画面専用の `uiSlice`（フォントサイズ等）は設けない。サイドバーの開閉状態など、ドメインに属さないUI状態は各コンポーネントのローカルstateで完結させる方針とし、ストアはドメイン状態のみを保持する。

## スライス構成

`StoreState = VendorSlice & PersonSlice & EquipmentSlice & InspectionItemSlice & InspectionRecordSlice & CalibrationOrderSlice & NotificationSlice`。各スライスは `StateCreator` として定義し、ルートで合成する想定とする。

| スライス                | 状態                                          | 主なアクション                                            | 実装想定パス                      |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| `vendorSlice`           | `vendors: Record<string, Vendor>`             | `addVendor` / `updateVendor` / `removeVendor`             | `slices/vendorSlice.ts`           |
| `personSlice`           | `persons: Record<string, Person>`             | `addPerson` / `updatePerson` / `setPersonActive`          | `slices/personSlice.ts`           |
| `equipmentSlice`        | `equipment: Record<string, Equipment>`        | `addEquipment` / `updateEquipment` / `setEquipmentStatus` | `slices/equipmentSlice.ts`        |
| `inspectionItemSlice`   | `inspectionItems: Record<string, InspectionItem>`       | `addInspectionItem` / `updateInspectionItem` / `setInspectionItemActive`                | `slices/inspectionItemSlice.ts`   |
| `inspectionRecordSlice` | `records: Record<string, InspectionRecord>`   | `addRecord`                                               | `slices/inspectionRecordSlice.ts` |
| `calibrationOrderSlice` | `orders: Record<string, CalibrationOrder>`    | `addOrder` / `updateOrder` / `updateOrderStatus`          | `slices/calibrationOrderSlice.ts` |
| `notificationSlice`     | `notifications: Record<string, Notification>` | `generateNotifications` / `markAsRead` / `markAllAsRead`  | `slices/notificationSlice.ts`     |

- スライスは互いの状態へ `StoreState` 経由で到達可能とする想定（`set` は全ストアのドラフト、`get()` は全状態を参照できる）。カスケード処理（後述）はこの前提で成立する。
- 各エンティティの属性一覧は本書では再掲しない。[domain-model.md](../domain-model.md) §3を参照。

## アクション仕様（カスケード・整合性）

データ整合は各アクションが手続き的に維持する方針とする。参照を壊さない設計とする。

- `removeVendor(id)`: Equipment.manufacturerId / InspectionItem.vendorId / CalibrationOrder.vendorId のいずれかから参照されている場合は削除不可とし、no-op（真偽値を返す）とする方針とする。UIは事前に確認ダイアログ（screen-design §0.6）を出し、参照が残っている場合はエラー表示する。
- `setPersonActive(id, isActive)`: Personは物理削除しない（domain-model.md §3.2）。無効化はscreen-design §0.6の確認ダイアログ対象とする。
- `setEquipmentStatus(id, status)`: 機器は論理削除のみ（`retired`）とする方針とする。`retired`への変更は確認ダイアログ対象（screen-design §0.6）とする。`suspended`/`retired`は期限計算・通知の対象外とする（domain-model.md §3.3）。休止からの再稼働時の期限リセットは据え置き（リセットしない）で確定（decisions.md D-002）。
- `setInspectionItemActive(id, isActive)`: 他エンティティと整合を取り、物理削除は行わずisActiveで無効化する方針とする（実装判断）。
- `addRecord(inspectionItemId, doneDate, doneBy, result, orderId?, note?)`: InspectionRecordを追加した上で、
  - `inspectionItem.lastDoneDate = doneDate` は `result` に関わらず無条件で更新する（decisions.md D-015）。
  - `result !== 'fail'` の場合のみ `inspectionItem.nextDueDate = addCycle(doneDate, inspectionItem.cycle)`（暦月ベース加算。domain-model.md §4.1）に更新する方針とする。`result === 'fail'` の場合は次回期限のみ据え置く（domain-model.md §3.5、decisions.md D-015）。
  - `orderId` が指定されている場合: 対象の `CalibrationOrder.status` を `completed` に更新する（domain-model.md §3.6）。
- `updateOrderStatus(id, nextStatus)`: 状態遷移はdomain-model.md §3.6の状態遷移図に従い、`domain/orderStatus.ts` の許可テーブルで検証する方針とする（許可されない遷移はno-op）。`completed`への遷移は上記`addRecord`のカスケード経由のみとし、本アクションから直接指定はしない方針とする。
- `generateNotifications(today)`: 全ての有効な項目（`inspectionItem.isActive` かつ 紐づくEquipmentが `active`）・案件をスキャンし、domain-model.md §3.7の5種別の発生条件を判定する。判定は `domain/notificationRules.ts`（純粋関数。ストアに依存しない）が担う想定とし、本アクションは判定結果と現在の `notifications` を突き合わせて、同一 `(targetType, targetId, type)` の**未読**通知が既に存在する場合は生成をスキップする（domain-model.md §3.7「同一対象・同一種別の未読通知は重複生成しない」）。CalibrationOrder起点の通知（`deliveryDueSoon`/`deliveryOverdue`）はCalibrationOrderにpersonId属性がないため、`order.inspectionItemId` からInspectionItemを辿って `inspectionItem.personId` を宛先とする方針とする。
- `markAsRead(id)` / `markAllAsRead()`: 対象が無ければno-opとする。

## 永続化（zustand persist）

- ストアキー（`name`）: `calibration-manager:v1`
- スキーマ `version`: `1`。初回スキーマのため、現時点でmigrationステップは未登録とする。将来のスキーマ変更に備え、`migrations: Record<number, Migration>` によるバージョン間ステップ変換の仕組みを最初から用意する方針とする。
- `partialize`: 永続化対象は7エンティティの `Record`（vendors / persons / equipment / inspectionItems / records / orders / notifications）のみとする方針とする。アクション関数・派生値は保存しない。
- 読込パイプライン: LocalStorage → `migrate`（バージョン変換）→ `merge`（検証・サニタイズ・結合）→ ストア、という流れを採用する。

### migrate

`migratePersistedState(persisted, fromVersion)` は「version N→N+1」のステップ変換テーブルを順に適用する設計とする。現状は `version = 1` のためテーブルは空とする。将来のスキーマ変更時には `migrateVNToVN+1` を追加してテーブルへ登録し、`STORAGE_VERSION` をインクリメントする運用方針とする。

### merge（サルベージ戦略）

3段構え（ハッピーパス → 部分破損サルベージ → 最終手段）で復元する方針とする。

1. **ハッピーパス**: 永続化データ全体をスキーマで `safeParse` し、成功すれば参照整合修復を経てストアへ結合する。
2. **部分破損**: 全体のパースに失敗した場合、7エンティティそれぞれを1レコードずつ `store/schema.ts` のzodスキーマで `safeParse` し、成功分のみ保持する方針とする。
3. **最終手段**: 永続化データがオブジェクトですらない場合は初期状態を採用する。

最後に `sanitizeAppState` で参照整合（Equipment/Person/Vendorなどへの dangling FK を持つ InspectionItem/InspectionRecord/CalibrationOrder/Notification の扱い）を行う。ユーザー入力データ（vendors/persons/equipment/inspection-items/records/orders）は dangling FK でも保持し、表示側で「参照先なし」として扱う。Notification のみ、targetId（inspectionItem/order）または personId が dangling のものを除去する（再生成可能な導出データのため。decisions.md D-003）。

## 派生（永続化しない）

ストアに置かず、`domain/` の純粋関数または `store/selectors.ts` で導出する値を想定する。

- `deriveInspectionItemStatus(inspectionItem, orders, today)`（`domain/inspectionItemStatus.ts`）— domain-model.md §4.3の優先度付き5ステータス
- `recommendedOrderDate(inspectionItem, vendor)` / `resolveLeadTime(inspectionItem, vendor)`（`domain/leadTime.ts`）— domain-model.md §4.2
- `addCycle(date, cycle)`（`domain/dateCycle.ts`）— 暦月ベースの次回期限計算（domain-model.md §4.1）
- `statusBadgeClass(status)`（`domain/statusBadge.ts`）— screen-design §0.3のバッジ色マッピング
- `computeExpectedNotifications(inspectionItems, orders, vendors, equipment, today)`（`domain/notificationRules.ts`）— 上記`generateNotifications`が使う純粋判定ロジック。dangling equipment（参照先なし）を許容しつつ機器情報を通知文へ解決するため `equipment` を引数に取る
- `inspectionItemsOf(equipmentId)` / `ordersOf(inspectionItemId)` / `recordsOf(inspectionItemId)` / `unreadNotificationCount()`（`store/selectors.ts`）

## テスト

以下のテストファイル構成を想定する。

- `useAppStore.test.ts` — アクション・カスケード・migrate/mergeの検証
- `merge.test.ts` — merge 3段構えのサルベージ挙動の検証
- `slices/*.test.ts` — スライス単体の検証
- `selectors.test.ts` — 導出ロジックの検証
- `domain/*.test.ts` — 純粋関数群の検証。一部は `*.proptest.test.ts` としてfast-checkによるproperty testを想定する。特に `addCycle` の月末補正や `deriveInspectionItemStatus` の優先度判定は境界値・優先順位が絡むロジックであり、property testと相性が良いと考える。
