# 実装判断記録(ADR-lite)

実装中に発生した仕様判断の記録。domain-model.md・screen-design と食い違う場合、**確定済み判断が最新の真実源**(確定後は該当 docs にも反映してから閉じる)。

書式: 1判断 = 1節。ステータス: `未決` / `確定` / `docs反映済`。

---

## D-001: 担当者無効化時の通知宛先フォールバック

- ステータス: **未決**(Phase 6 着手前に確定必須)
- 論点: Person を inactive にした後、その personId 宛の通知をどう扱うか
- 暫定: 元 personId のまま(無効化しても通知は残す)
- 確定日 / 判断:(未記入)

## D-002: 休止機器の再稼働時の期限リセット

- ステータス: **未決**(Phase 6 着手前に確定必須)
- 論点: EQUIPMENT_STATUS 休止 → 稼働の復帰時、配下項目の nextDueDate をリセットするか据え置くか
- 確定日 / 判断:(未記入)

## D-003: sanitizeAppState の dangling FK 処理

- ステータス: **確定**(2026-07-03)
- 論点: 参照先エンティティが消えたレコードを (a) merge 時に除去 or (b) 残して表示側で「参照先なし」
- 判断: **ハイブリッド**
  - ユーザー入力データ(vendors / persons / equipment / items / records / orders)は dangling FK でも**保持**。表示側で「参照先なし」扱い。サルベージでユーザーデータを消さない
  - Notification のみ**除去**対象: targetId(item/order)または personId が dangling のもの。通知は `generateNotifications` で再生成可能な導出データであり、消しても失うものがない
- 根拠: 既存 domain 層(notificationRules.ts の messagePrefix)も dangling equipment を例外なく許容する寛容方針。coding-standards §8「例外を投げない」と整合

## D-005: addRecord の不正入力時の挙動(Phase 2 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 以下はレコード追加ごと**全体 no-op**(null 返却)。部分適用しない
  - itemId が存在しない
  - `result !== 'fail'` かつ `addCycle(doneDate, cycle)` が null(doneDate 不正)
  - orderId 指定時: 案件が存在しない、または現状態から completed へ遷移不可(returned 以外)
- 根拠: 記録だけ追加して期限更新や案件遷移が失敗すると不整合。原子性優先

## D-006: 1項目1有効案件制約の強制箇所

- ステータス: **確定**(2026-07-03)
- 判断: `addOrder` がストア層で強制。対象項目に有効案件(planned〜returned)が既存なら no-op(null 返却)。新規案件の初期 status は常に `planned`
- 根拠: UI 側バリデーションだけだと CSV インポート等の別経路で破れる。ストアが最終防衛線

## D-004: 校正値・合格基準の数値記録

- ステータス: **確定**(2026-07-03)
- 判断: スコープ外。記録は result(pass/adjusted/fail)+ メモのみ。数値入力・判定機能は実装しない
