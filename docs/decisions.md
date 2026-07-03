# 実装判断記録(ADR-lite)

実装中に発生した仕様判断の記録。domain-model.md・screen-design と食い違う場合、**確定済み判断が最新の真実源**(確定後は該当 docs にも反映してから閉じる)。

書式: 1判断 = 1節。ステータス: `未決` / `確定` / `docs反映済`。

---

## D-001: 担当者無効化時の通知宛先フォールバック

- ステータス: **docs反映済**(2026-07-03)
- 論点: Person を inactive にした後、その personId 宛の通知をどう扱うか
- 判断: **フォールバックしない**。既存通知・項目の personId は元のまま保持し、無効化後も当該 personId 宛の通知を生成・表示し続ける。UI は必要箇所で担当者名に「(無効)」を注記して表示する
- 根拠: 代替宛先(部署既定担当者等)のデータ構造が存在せず、自動付け替えはユーザーデータの暗黙変更になる。アプリ内通知のみ(メール実送信なし)のため宛先が無効でも通知自体は通知センターで可視。dangling 参照を許容する D-003 の寛容方針と整合

## D-002: 休止機器の再稼働時の期限リセット

- ステータス: **docs反映済**(2026-07-03)
- 論点: EQUIPMENT_STATUS 休止 → 稼働の復帰時、配下項目の nextDueDate をリセットするか据え置くか
- 判断: **据え置き**(リセットしない)。suspended/retired の除外は期限計算・通知スキャンの導出側の責務であり、項目の nextDueDate は機器状態の変更で書き換えない。再稼働すると保存済み期限のまま再計算対象へ戻り、休止中に期限超過していれば overdue として表示される
- 根拠: リセットには新たな起算日が必要だが仕様に定義がなく、勝手な起算はデータ捏造になる。復帰時に overdue を出す方が「再稼働前に点検させる」安全側の挙動。機器状態変更でユーザーデータを暗黙変更しない方針(D-001 / D-003)と整合

## D-003: sanitizeAppState の dangling FK 処理

- ステータス: **docs反映済**(2026-07-03)
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

- ステータス: **docs反映済**(2026-07-03)
- 判断: `addOrder` がストア層で強制。対象項目に有効案件(planned〜returned)が既存なら no-op(null 返却)。新規案件の初期 status は常に `planned`
- 根拠: UI 側バリデーションだけだと CSV インポート等の別経路で破れる。ストアが最終防衛線

## D-004: 校正値・合格基準の数値記録

- ステータス: **確定**(2026-07-03)
- 判断: スコープ外。記録は result(pass/adjusted/fail)+ メモのみ。数値入力・判定機能は実装しない

## D-007: Person 新規追加時の isActive 既定値(Phase 4 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: PersonModal の新規追加フォームは `isActive=true` を既定値とする
- 根拠: 仕様書(screen-design/09-masters.md §9-B)に明記なし。無効な担当者を新規作成する運用は不自然で、有効が既定の一覧運用と整合

## D-008: Vendor 削除ガードの判定タイミング(Phase 4 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 削除ボタン押下時に UI 側で参照有無(Equipment.manufacturerId / InspectionItem.vendorId / CalibrationOrder.vendorId)を判定し、参照ありなら確認ダイアログを出さず即「削除できません」表示。未参照時のみ ConfirmModal → `removeVendor`。`removeVendor` が false を返した場合(確認中の競合等)も同メッセージへフォールバック
- 根拠: 09-masters.md §9-A「削除ボタン押下時に表示。未参照時のみ確認ダイアログ後に削除」と、ストア層ガード(最終防衛線)の二重化を両立

## D-009: 汎用フォーム部品 TextField / Checkbox の追加(Phase 4 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `components/ui/` に TextField(type 素通し、既定 text)と Checkbox(ラベル右横)を追加。Select / DateField と同じラベル・必須マーク・aria-describedby エラー表示パターン
- 根拠: Phase 4 の両マスタフォームで必要。班委譲前にメインが追加し barrel 経由供給(班間の重複実装・ファイル衝突回避)

## D-010: 機器一覧 状態フィルタの既定値と選択肢(Phase 5 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 論点: 02-equipment-list.md のASCIIモックは「稼働のみ」だが本文は「フィルタ選択肢は全て/稼働/休止/廃棄、デフォルトは retired 非表示(=稼働+休止)」で不整合
- 判断: 本文に従い、選択肢に複合値**「稼働+休止」を明示追加して既定値**とする(計5択: 稼働+休止 / 全て / 稼働 / 休止 / 廃棄)。フィルタ値は EquipmentStatus と別軸の画面ローカル as const 定数(`features/equipment/list/index.tsx`)
- 根拠: 「デフォルト retired 非表示」を4択で表すと既定状態を選択肢で再現できず、フィルタUIと表示内容が食い違う。モックより本文が優先

## D-012: 項目編集モーダル 担当者セレクトの無効担当者の扱い(Phase 6 実装判断)

- ステータス: **確定**(2026-07-03)
- 論点: 06-item-modal.md は担当者セレクトを「Person isActive=true」に限定するが、現担当が無効化済みの項目を編集すると選択肢に現在値が存在せず、無関係な編集(項目名変更等)でも再割当を強制されてしまう
- 判断: 選択肢は isActive=true の Person(仕様どおり)+ **編集時のみ、現担当が無効なら「◯◯(無効)」として選択肢に含める**。新規時は有効担当者のみ
- 根拠: D-001(personId は元のまま保持)と整合。無効担当者への「新規」割当は引き続き不可能で、仕様の意図(新たな割当先は有効者のみ)を保つ

## D-013: 汎用フォーム部品 RadioGroup の追加(Phase 6 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `components/ui/RadioGroup` を追加(fieldset/legend + ラジオ横並び、register 素通し、Select/TextField と同じ必須マーク・aria-describedby エラー表示パターン)。項目編集モーダルの種別(点検/校正)・実施区分(内部/外部)で使用
- 根拠: D-009 と同じ運用。班委譲前にメインが追加し barrel 経由供給

## D-014: 非稼働機器の詳細画面での項目ステータス表示(Phase 6 実装判断)

- ステータス: **確定**(2026-07-03)
- 論点: domain-model.md §3.3 は suspended/retired 機器を「期限計算・通知の対象外」とするが、04-equipment-detail.md は非稼働機器の項目一覧のステータスバッジ表示を規定していない
- 判断: 機器が active のときのみ deriveItemStatus のバッジを表示。suspended/retired ではステータス欄を「—」表示(nextDueDate 等の保存値はそのまま表示)。機器一覧(Phase 5)の「非稼働機器の期限は—」と同方針
- 根拠: 対象外の機器に overdue(赤)を出すと要対応と誤読させる。D-002(据え置き)により再稼働すれば導出が自然に復活する

## D-011: 機器フォーム「廃棄にする」の表示条件・遷移先(Phase 5 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 編集時のみ表示(仕様どおり)。status が既に retired でも表示する(操作は冪等)。確認後 `setEquipmentStatus(retired)` し機器詳細へ遷移。フォームの未保存編集は破棄(保存とは独立した操作)
- 根拠: 仕様は表示条件「編集時のみ」以外を規定せず。遷移先は保存時と同じ詳細画面で統一

## D-015: result=fail 時の lastDoneDate 更新(Phase 7 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 論点: Phase 2 実装の addRecord は fail 時に lastDoneDate も据え置いていたが、07-record-modal.md 副作用は「2. `item.lastDoneDate = doneDate`(無条件)」「4. fail は `nextDueDate` を更新せず」と lastDoneDate と nextDueDate を区別している
- 判断: 仕様に合わせ実装を是正。**fail でも lastDoneDate = doneDate に更新**し、据え置くのは nextDueDate のみ。既存テストの期待値も仕様準拠へ修正(テストを弱める改変ではなく仕様違反の是正)
- 根拠: lastDoneDate は「最後に実施した日」であり、不合格でも実施の事実は変わらない。domain-model.md §3.5 も「fail の場合は**次回期限を**更新せず」とのみ規定

## D-016: 記録モーダルの未来日入力の扱い(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: doneDate が今日より未来の場合、モーダル内に警告文を表示するが登録は**ブロックしない**
- 根拠: 07-record-modal.md「未来日は警告(任意でブロック)」。ブロックは任意規定であり、実施予定日での先行入力運用を妨げない警告のみとする

## D-017: 記録モーダル doneBy プリフィルの解決順(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: ①案件経由起動(orderId あり)→ 当該案件の vendorId から Vendor.name、②それ以外で項目が external → item.vendorId から Vendor.name、③internal または Vendor 解決不能 → 空欄
- 根拠: 07-record-modal.md「外部は業者名。可能なら Vendor.name をプリフィル」。案件経由では実際に依頼した案件側の業者が最も確度が高い

## D-018: かんばん「完了/中止も表示」トグルの表示形式(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: トグル ON 時に completed / cancelled の**2列を右側に追加表示**する(カードはグレー調・アクションボタンなし)。既定は OFF(非表示)
- 根拠: 08-orders.md「completed/cancelled 列(またはグレー表示)を出す。既定は非表示」の択一を列追加方式で確定。進行中4列のレイアウトを汚さない

## D-019: 遷移ダイアログの日付整合チェック(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `orderedDate ≤ dueDate`、`orderedDate ≤ returnedDate` の不整合は**警告表示のみでブロックしない**。形式検証(必須・YYYY-MM-DD)は zod でブロックする
- 根拠: 08-orders.md「推奨チェック(整合警告)」。過去日の遡り登録等の実運用を妨げない

## D-020: 案件作成モーダル(OrderModal)の実装フェーズ(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: OrderModal(planned 新規作成、08-orders.md「案件作成モーダル」)は **Phase 7 でコンポーネント・テストまで作成**し、起動元(点検校正項目一覧の「案件」アクション)への接続は Phase 8 で行う
- 根拠: §8 の仕様を Phase 7 で完結させ、Phase 8 を起動結節点の接続に純化する(Phase 6 の「記録ボタン先行設置」と同じ運用)。addOrder の1項目1有効案件制約(D-006)の UI 表出もここで確定する

## D-021: 案件費用(cost)の入力粒度(Phase 7 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: OrderModal・発注ダイアログの費用入力は **0以上の整数のみ**受け付ける(小数は検証エラー)
- 根拠: 08-orders.md は「0以上の数値」とのみ規定。円単位の費用管理で小数は実用上不要であり、ItemModal の日数系フィールドと同じ整数検証ヘルパ運用に統一する。小数が必要になったら検証の緩和のみで対応可能

## D-022: 点検校正項目一覧フィルタの状態管理(Phase 8 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 4フィルタ(status/type/execution/personId)の状態は **URL クエリパラメータを唯一の真実源**とする(useSearchParams)。フィルタ変更は `setSearchParams(..., { replace: true })` で反映し履歴を汚さない。不正・未知のクエリ値は無視して「全て」扱い(エラーにしない)。「クリア」は全クエリ除去
- 根拠: 05-item-list.md「クエリを受け付ける」「ダッシュボードからの遷移時は status クエリで初期化」。ローカル state と二重管理すると初期化タイミングのバグ源になる。URL 共有・リロード耐性も得られる

## D-023: 点検校正項目一覧の「無効・非稼働も表示」トグル(Phase 8 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 05-item-list.md の「トグルで表示可、任意」は**不実装**。対象は常に稼働(active)機器の有効(isActive=true)項目のみ
- 根拠: 任意規定。無効項目・非稼働機器の項目は機器詳細(§4)で確認できる(Phase 5 の期限セルバッジ色不実装と同じ運用)

## D-024: personLabelOf の store/selectors.ts への昇格(Phase 8 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 判断: 担当者表示名解決(dangling「—」/ 無効「(無効)」注記、D-001)を `features/equipment/detail/hooks.ts` から `store/selectors.ts` へ移動し、シグネチャを selector 規約(`(state: Pick<AppState, "persons">, personId)`)に統一
- 根拠: 点検校正項目一覧(§5)も同一規則で担当者名を表示するため。feature 間 import を避け、横断導出は selectors.ts に置く規約(coding-standards.md §5)に従う

## D-025: 通知スキャンの起動方式と前回スキャン日の保持(Phase 9 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `useNotificationScan`(App.tsx でマウント)は (1)マウント時に即スキャン (2)60秒間隔のポーリング (3)`visibilitychange` で可視復帰時、の3経路で `todayIsoDate()` を前回スキャン日(useRef、**非永続**)と比較し、異なる場合のみ `generateNotifications(today)` を呼ぶ
- 根拠: 10-notifications.md「起動時 + 日付変更検知時」。起動時に必ずスキャンするため前回スキャン日の永続化は不要(persist の partialize=エンティティのみ、の方針も維持)。日跨ぎ放置タブはポーリングで、スリープ復帰はvisibilitychangeで拾う。同日内の再スキャンは重複抑止がストア側にあるため無害だが、無駄な走査を避けるため ref 比較で抑止

## D-026: ダッシュボード要対応リストの行クリック遷移先(Phase 9 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 判断: 行クリックは**機器詳細 `/equipment/:id`** へ遷移(01-dashboard.md の「または点検校正項目一覧の該当行」は採らない)
- 根拠: 点検校正項目一覧はフィルタ画面であり「該当行」への位置指定手段(行アンカー)を持たない。機器詳細なら当該項目の編集・記録へ直接到達でき、機器一覧(§2)の行クリックとも挙動が揃う

## D-027: 通知行クリックの遷移先解決(Phase 9 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 判断: 行クリックはまず `markAsRead`、次に遷移: `targetType=order` → `/orders`(カードのハイライトは不実装)。`targetType=item` → 項目から機器を辿り機器詳細 `/equipment/:id`。項目が dangling(削除済み)の場合は**既読化のみで遷移しない**
- 根拠: 10-notifications.md は item の遷移先を「`/items`(該当項目)または該当機器詳細」と許容しており、D-026 と同じ理由で機器詳細に統一。dangling 通知は sanitize(D-003)で起動時に除去されるが、セッション中の削除で発生し得るため例外を投げず既読化のみとする

## D-028: CSV 列仕様(Phase 10 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: 各エンティティの CSV 列 = `store/types.ts` のフィールド宣言順、ヘッダ行 = フィールド名(英語キー)そのまま。boolean は `true`/`false`、optional 未設定は空セル、数値は10進文字列。エクスポート・インポートで同一仕様(ラウンドトリップ保証)。改行コードは CRLF、引用は RFC 4180 準拠(`"` 囲み + `""` エスケープ)
- 根拠: 日本語ヘッダは列↔フィールドの対応表が別途必要になり、インポート検証(zod)との突合も複雑化する。バックアップ用途では機械可読性優先。Excel 互換は BOM(§11)と CRLF で担保

## D-029: CSV インポートの取り込み意味論 = 対象エンティティ全置換(Phase 10 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: インポート確定 = **選択エンティティの Record を取り込み行で全置換**(upsert しない)。検証は (a) 行単位 zod(store/schema.ts 流用)、(b) ファイル内ユニーク(全種 id、equipment は managementNo も)、(c) 外向き参照の存在チェックは**現在ストアの他エンティティ**と突合(equipment.manufacturerId→vendors、items.equipmentId/vendorId/personId、records.itemId/orderId、orders.itemId/vendorId、notifications.targetId(targetType別)/personId)。確認ダイアログに「既存の◯◯は置き換えられます」を明記
- 根拠: §11 の用途は「復元」であり、置換が最も予測可能(エクスポート→インポートで完全一致)。upsert は既存残留分との managementNo 重複など置換にない衝突を生む。参照順(vendors/persons → equipment → items → orders → records → notifications)で復元すれば参照チェックは常に成立

## D-030: インポートのエラー行スキップは不実装(Phase 10 実装判断)

- ステータス: **docs反映済**(2026-07-03)
- 判断: §11 の「エラー行はスキップ、または全件中断のいずれか。既定=エラーありなら中断」から**中断のみ採用**。エラー1件以上で[確定]非活性。エラー行プレビューの行番号は**ファイル上の行番号**(ヘッダ=1行目、データ先頭=行2)
- 根拠: 仕様が既定を中断と明示。スキップ取り込みは「どの行が入ったか」の追跡 UI が別途必要で、全置換(D-029)と組むとデータ欠落リスクが高い

## D-031: データ全削除の2段階確認 UI(Phase 10 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: [データを全削除] → モーダル(警告文 + 「全データを削除することを理解しました」チェックボックス。チェックで[削除する]活性化)→ `resetAll()`。ConfirmModal の追加多重確認はしない(チェック自体が §0.6 の2段階目)
- 根拠: §11・§0.6 の「チェックボックス同意 → 実行ボタン」の2段階そのまま。3段化は仕様外

## D-032: カバレッジラチェット最終確定値(Phase 11 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `vitest.config.ts` の `coverage.thresholds` を以下で最終確定(lines/functions/branches/statements)
  - `src/domain/**`: 98 / 100 / 98 / 98(実測 100/100/100/100)
  - `src/store/**`: 97 / 96 / 92 / 97(実測 99.5/98.7/95.8/99.2)
  - `src/utils/id.ts`: 100 / 100 / 100 / 100(実測 100)
  - `src/utils/csv.ts`: 97 / 95 / 90 / 97(実測 100。testing.md の `src/utils/csv/**` は実体がファイルのためグロブを `csv.ts` に読み替え)
- 根拠: testing.md のラチェット方式「実測に対し数%の余白を残した値へ後日調整」の最終実施。暫定目標値(domain 98/100/95、store 95/95/88、csv 95/90/75)をすべて上回り、引き下げなし(CLAUDE.md 遵守)

## D-033: フォント woff2 を precache 対象へ追加(Phase 11 実装判断)

- ステータス: **確定**(2026-07-03)
- 判断: `workbox.globPatterns` に `woff2` を追加(`**/*.{js,css,html,svg,png,webmanifest,woff2}`)。woff は対象外。pwa.md §3 も同期更新
- 根拠: @fontsource/noto-sans-jp のサブセットフォント(woff2 約120ファイル・計2.9MB)は CSS から遅延読み込みされるため、precache なしではオフライン時に未取得サブセットがフォールバック表示になり、pwa.md §3/§5「アプリシェル一式 precache による完全オフライン動作」の趣旨に反する。woff2 のみで足りる理由: SW 対応ブラウザは全て woff2 対応であり woff は実際に取得されない(容量半減)。初回 precache 増分 2.9MB は現場利用(初回のみオンライン)で許容

## D-034: 開発用シーダー(DEV限定・空ストア時のみ投入)

- ステータス: **docs反映済**(2026-07-03)
- 判断: `src/dev/seed.ts` に `buildSeedState(today)`(純関数、全日付は today 相対)+ `seedIfEmpty()`(7エンティティ全空のときのみ `setState`、既存データがあれば no-op)を実装。`src/main.tsx` から `import.meta.env.DEV` ガード + 動的 import で起動時に呼ぶ(本番バンドルには Rollup のデッドコード除去でチャンクごと含まれない)。notifications はシードせず空(D-025 の useNotificationScan が起動時に導出・再生成するため)。ID は可読な固定文字列 `seed-*`(schema の id 制約は非空 string のみで uuid 必須ではない)
- 根拠: 画面確認に5ステータス(overdue/orderNow/inProgress/dueSoon/ok)全網羅のデータが毎回手入力なしで揃う。today 相対日付により何日後に起動してもステータス分布が崩れない。空ストア判定によりユーザー入力データを絶対に上書きしない。データは D-006(1項目1有効案件)を遵守し、seed.test.ts でスキーマ整合・参照整合・5ステータス出現・D-006 を恒常検証

## D-035: 利用マニュアル画面の追加

- ステータス: **docs反映済**(2026-07-03)
- 判断: 利用マニュアル画面を追加。`/manual`、静的コンテンツ・store参照なし、サイドバー最下部(設定の次)に配置。詳細は [screen-design/12-manual.md](./screen-design/12-manual.md) 参照
- 根拠: アプリの目的・基本操作の流れ・ステータスの見方・期限計算式・各画面の説明・バックアップ方法を1画面に集約し、初見ユーザーのオンボーディングと既存ユーザーの参照先を兼ねる。store を参照しない静的ページとすることで実装・テストを軽量に保ち、既存のドメイン層・状態管理に一切影響を与えない

## D-036: item → inspectionItem 全域リネーム(スキーマ v2)

- ステータス: **docs反映済**(2026-07-03)
- 判断: 略記「item」を全域で `inspectionItem` 系へリネーム。エンティティ型 `InspectionItem` は従来どおり、周辺の派生命名を統一
  - 状態キー `items` → `inspectionItems`、FK `itemId` → `inspectionItemId`(InspectionRecord / CalibrationOrder)、`Notification.targetType` の値 `item` → `inspectionItem`
  - `STORAGE_VERSION` 1→2。`migrateV1ToV2`(persistence.ts)で v1 の LocalStorage データを無損失変換(MIGRATIONS[1] に登録)
  - `src/features/items/` → `src/features/inspectionItems/`、`components/domain/ItemModal/` → `InspectionItemModal/`、`domain/itemStatus.ts` → `inspectionItemStatus.ts`(`deriveItemStatus` → `deriveInspectionItemStatus`)
  - ルート `/items` → `/inspection-items`(`ROUTES.INSPECTION_ITEM_LIST`)、screen-design/05-item-list.md → 05-inspection-item-list.md
  - 例外(リネーム対象外): 汎用 UI の `NavItem` / `NAV_ITEMS`(Sidebar)、`localStorage.setItem/getItem`、本ファイルの過去エントリ(履歴ログのため原文維持)、テストフィクスチャ ID 文字列 `item-1` 等
- 根拠: 「item」は一般語として抽象的すぎ、ドメイン用語(domain-model.md §2 の InspectionItem)との対応が読み取りにくい。ユビキタス言語をコード全域に貫徹する。永続化データ・URL はマイグレーション/ルート定数経由の一括変更で互換を確保
- 注意: v1 で CSV エクスポートしたファイル(`items` エンティティ・`itemId` 列)は新バージョンへそのまま再インポート不可(列名不一致でエラー行になる)。必要なら新バージョンで再エクスポートする
