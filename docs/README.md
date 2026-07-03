# 機器点検・校正期限管理 仕様・設計ドキュメント

機器の点検・校正の期限を管理し、担当者へ通知するWebアプリ(Mock)。バックエンドなし・LocalStorage永続化・CSVバックアップ。GitHub Pagesで無料ホスティング。

- 対象: 中小規模の製造・品質管理部門を想定した業務アプリのモック
- 利用形態: 単一端末ローカル運用(マルチユーザー同期なし)
- オフライン動作: PWA対応・インストール可・完全オフライン動作
- UI方針: PC中心・情報密度高め。テーブルUI多用。ステータス色+ラベル併記で状態を一目で判別

---

## ドキュメント目次

### ドメイン

- [domain-model.md](domain-model.md) — ドメインモデル(用語・エンティティ定義・状態遷移・期限計算ロジック・永続化方針)

### 規約

- [coding-standards.md](coding-standards.md) — コーディング規約(命名・構成・型・状態管理・テスト・言語方針)

### アーキテクチャ

- [tech-stack.md](architecture/tech-stack.md) — 技術スタック(HashRouter採用理由含む)
- [store.md](architecture/store.md) — ストア設計(スライス・永続化・migrate・導出値・通知生成)
- [directory-structure.md](architecture/directory-structure.md) — ディレクトリ構成

### デザイン

- [ui-guidelines.md](design/ui-guidelines.md) — UI/UX設計(レイアウト・ステータスバッジ・テーブル・フォーム・アクセシビリティ)

### インフラ

- [pwa.md](infra/pwa.md) — PWA設計
- [deploy.md](infra/deploy.md) — デプロイ

### テスト

- [testing.md](testing.md) — テスト方針(Vitest・fast-check・Storybook UIカタログ含む)

### 実装管理

- [implementation-plan.md](implementation-plan.md) — 実装フェーズ計画・進捗・運用ループ
- [decisions.md](decisions.md) — 実装判断記録(未決事項の確定はここに追記)

### 画面別仕様

- [screen-design/README.md](screen-design/README.md) — 画面設計書 目次・共通仕様(レイアウト/ルーティング/バッジ色/モーダル/確認ダイアログ)
- [screen-design/01-dashboard.md](screen-design/01-dashboard.md) — ダッシュボード
- [screen-design/02-equipment-list.md](screen-design/02-equipment-list.md) — 機器一覧
- [screen-design/03-equipment-form.md](screen-design/03-equipment-form.md) — 機器登録・編集
- [screen-design/04-equipment-detail.md](screen-design/04-equipment-detail.md) — 機器詳細
- [screen-design/05-inspection-item-list.md](screen-design/05-inspection-item-list.md) — 点検校正項目一覧(中核画面)
- [screen-design/06-inspection-item-modal.md](screen-design/06-inspection-item-modal.md) — 項目編集モーダル
- [screen-design/07-record-modal.md](screen-design/07-record-modal.md) — 実施記録登録モーダル
- [screen-design/08-orders.md](screen-design/08-orders.md) — 外部校正案件一覧(かんばん)
- [screen-design/09-masters.md](screen-design/09-masters.md) — マスタ管理(メーカー/取引先・担当者)
- [screen-design/10-notifications.md](screen-design/10-notifications.md) — 通知センター
- [screen-design/11-settings.md](screen-design/11-settings.md) — 設定・バックアップ
- [screen-design/12-manual.md](screen-design/12-manual.md) — 利用マニュアル

---

## 機能要件(索引)

各画面の詳細仕様は `screen-design/` 配下を参照。

- 機器管理(CRUD・稼働/休止/廃棄) → [02](screen-design/02-equipment-list.md)、[03](screen-design/03-equipment-form.md)、[04](screen-design/04-equipment-detail.md)
- 点検校正項目管理・期限一覧・フィルタ → [05](screen-design/05-inspection-item-list.md)、[06](screen-design/06-inspection-item-modal.md)
- 実施記録登録・次回期限自動更新 → [07](screen-design/07-record-modal.md)
- 外部校正案件の進捗管理(発注〜返却) → [08](screen-design/08-orders.md)
- マスタ管理(メーカー/取引先・担当者) → [09](screen-design/09-masters.md)
- アプリ内通知(期限接近・発注推奨・納期遅延) → [10](screen-design/10-notifications.md)
- CSVエクスポート/インポート・データ全削除 → [11](screen-design/11-settings.md)

---

## 非機能要件

- 対応ブラウザ: 最新Chrome/Edge/Safari/Firefox
- レスポンシブ: PC中心。モバイル幅ではサイドバーをハンバーガーに畳む
- ストレージ上限: LocalStorage 5MB想定。機器500台・項目1,000件・記録10,000件規模で動作
- パフォーマンス: 上記規模で一覧のフィルタ・ソートが体感遅延なし
- アクセシビリティ: キーボード入力可・WCAG 2.1 AA準拠目標。ステータスは色のみに依存せずラベル文字列を併記
- PWA: ホーム画面追加可・初回ロード後オフライン全機能動作・更新時 自動再取得
- 日付: 表示・入力・CSVすべて `YYYY-MM-DD`。時刻は扱わない

---

## 画面一覧

| #   | ルート                                      | 画面                                                                                                                                                                                                   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `/#/`                                       | [ダッシュボード](screen-design/01-dashboard.md)                                                                                                                                                        |
| 2   | `/#/equipment`                              | [機器一覧](screen-design/02-equipment-list.md)                                                                                                                                                         |
| 3   | `/#/equipment/new`・`/#/equipment/:id/edit` | [機器登録・編集](screen-design/03-equipment-form.md)                                                                                                                                                   |
| 4   | `/#/equipment/:id`                          | [機器詳細](screen-design/04-equipment-detail.md)                                                                                                                                                       |
| 5   | `/#/inspection-items`                                  | [点検校正項目一覧(中核)](screen-design/05-inspection-item-list.md)                                                                                                                                                |
| 6   | `/#/orders`                                 | [外部校正案件一覧](screen-design/08-orders.md)                                                                                                                                                         |
| 7   | `/#/vendors`・`/#/persons`                  | [マスタ管理](screen-design/09-masters.md)                                                                                                                                                              |
| 8   | `/#/notifications`                          | [通知センター](screen-design/10-notifications.md)                                                                                                                                                      |
| 9   | `/#/settings`                               | [設定・バックアップ](screen-design/11-settings.md)                                                                                                                                                     |
| 10  | `/#/manual`                                 | [利用マニュアル](screen-design/12-manual.md)                                                                                                                                                           |
| —   | モーダル                                    | [項目編集](screen-design/06-inspection-item-modal.md) / [実施記録](screen-design/07-record-modal.md) / 案件作成・状態更新([08](screen-design/08-orders.md)) / マスタ追加・編集([09](screen-design/09-masters.md)) |

各画面のワイヤーは `screen-design/` 配下参照。

---

## スコープ外(将来拡張)

- 認証・複数端末同期(バックエンド導入)
- メール実送信(現状はアプリ内通知のみ)
- 校正値・合格基準の数値記録(スコープ外で確定 — [decisions.md D-004](decisions.md))
- 添付ファイル(校正証明書PDF等)
- バーコード/QRによる機器検索
