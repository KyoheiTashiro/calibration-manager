# 機器点検・校正期限管理 仕様・設計ドキュメント

機器の点検・校正の期限を管理し、担当者へ通知するWebアプリ(Mock)。バックエンドなし・LocalStorage永続化・CSVバックアップ。GitHub Pagesで無料ホスティング。

- 対象: 中小規模の製造・品質管理部門を想定した業務アプリのモック
- 利用形態: 単一端末ローカル運用(マルチユーザー同期なし)
- オフライン動作: PWA対応・インストール可・完全オフライン動作
- UI方針: PC中心・情報密度高め。テーブルUI多用。ステータス色+ラベル併記で状態を一目で判別

---

## ドキュメント構成

```
docs/
├── spec/     — 何を作るか(仕様)
└── guides/   — どう作るか(規約・設計・運用)
```

### spec/ — 仕様

- [domain-model.md](spec/domain-model.md) — ドメインモデル(用語・エンティティ定義・状態遷移・期限計算ロジック・永続化方針・未決事項)
- [ui-guidelines.md](spec/ui-guidelines.md) — UI/UX設計(レイアウト・ステータスバッジ・テーブル・フォーム・アクセシビリティ)
- [screen-design/README.md](spec/screen-design/README.md) — 画面設計書 目次・共通仕様(レイアウト/ルーティング一覧/バッジ色/モーダル/確認ダイアログ)
  - [01 ダッシュボード](spec/screen-design/01-dashboard.md) / [02 機器一覧](spec/screen-design/02-equipment-list.md) / [03 機器登録・編集](spec/screen-design/03-equipment-form.md) / [04 機器詳細](spec/screen-design/04-equipment-detail.md)
  - [05 点検校正項目一覧(中核)](spec/screen-design/05-inspection-item-list.md) / [06 点検校正項目モーダル](spec/screen-design/06-inspection-item-modal.md) / [07 実施記録登録モーダル](spec/screen-design/07-record-modal.md)
  - [08 点検校正外部案件(かんばん)](spec/screen-design/08-orders.md) / [09 マスタ管理](spec/screen-design/09-masters.md) / [10 通知センター](spec/screen-design/10-notifications.md) / [11 設定・バックアップ](spec/screen-design/11-settings.md) / [12 利用マニュアル](spec/screen-design/12-manual.md)

### guides/ — 規約・設計・運用

- [coding-standards.md](guides/coding-standards.md) — コーディング規約(命名・構成・型・状態管理・言語方針)
- [testing.md](guides/testing.md) — テスト方針(Vitest・fast-check・カバレッジラチェット・Storybook)
- [architecture/tech-stack.md](guides/architecture/tech-stack.md) — 技術スタック(HashRouter採用理由含む)
- [architecture/store.md](guides/architecture/store.md) — ストア設計(スライス・永続化・migrate・導出値・通知生成)
- [architecture/directory-structure.md](guides/architecture/directory-structure.md) — ディレクトリ構成
- [infra/pwa.md](guides/infra/pwa.md) — PWA設計
- [infra/deploy.md](guides/infra/deploy.md) — デプロイ

### 実装判断の記録(D-xxx)

コード・docs 中の「(D-xxx)」は実装中に確定した判断のタグ。判断の実質は該当する spec/guides の本文に反映済み。新たな判断が発生したら該当 docs へ直接反映し、必要なら (D-xxx) 形式で採番してタグ付けする(既存最終番号: D-044)。

---

## 機能要件(索引)

各画面の詳細仕様は `spec/screen-design/` 配下を参照(ルーティング一覧は [screen-design/README.md §0.2](spec/screen-design/README.md))。

- 機器管理(CRUD・稼働/休止/廃棄) → [02](spec/screen-design/02-equipment-list.md)、[03](spec/screen-design/03-equipment-form.md)、[04](spec/screen-design/04-equipment-detail.md)
- 点検校正項目管理・期限一覧・フィルタ → [05](spec/screen-design/05-inspection-item-list.md)、[06](spec/screen-design/06-inspection-item-modal.md)
- 実施記録登録・次回期限自動更新 → [07](spec/screen-design/07-record-modal.md)
- 点検校正外部案件の進捗管理(発注〜返却) → [08](spec/screen-design/08-orders.md)
- マスタ管理(メーカー/取引先・担当者) → [09](spec/screen-design/09-masters.md)
- アプリ内通知(期限接近・発注推奨・納期遅延) → [10](spec/screen-design/10-notifications.md)
- CSVエクスポート/インポート・データ全削除 → [11](spec/screen-design/11-settings.md)

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

## 残タスク

- PWA 完全オフラインの実機検証(SW登録 → 機内モード → 全画面遷移)
- 実ブラウザでの Lighthouse Accessibility 95+ 確認(axe-core の重大違反0は検証済み)

---

## スコープ外(将来拡張)

- 認証・複数端末同期(バックエンド導入)
- メール実送信(現状はアプリ内通知のみ)
- 校正値・合格基準の数値記録(スコープ外で確定、D-004)
- 添付ファイル(校正証明書PDF等)
- バーコード/QRによる機器検索
