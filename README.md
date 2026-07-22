<h1 align="center">calibration-manager</h1>

<p align="center">
  機器の点検・校正の期限を一元管理し、対応が必要なものを見逃さないための業務アプリ。<br />
  <b>点検・校正業務のための、インストール不要な期限管理ボード</b>です。
</p>

<p align="center">
  <a href="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/deploy.yml"><img src="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/deploy.yml/badge.svg" alt="deploy" /></a>
  <a href="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/test.yml"><img src="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/test.yml/badge.svg" alt="test" /></a>
  <a href="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/lint.yml"><img src="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/lint.yml/badge.svg" alt="lint" /></a>
  <a href="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/format.yml"><img src="https://github.com/KyoheiTashiro/calibration-manager/actions/workflows/format.yml/badge.svg" alt="format" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

バックエンドなし・LocalStorage 永続化・CSV バックアップ。PWA として完全オフラインで動作し、データは端末の外に出ません。

## こんな現場を想定しています

- 中小規模の製造業・品質管理部門
- 測定器・試験機の校正期限をExcelや紙の台帳で管理している現場
- 単一端末でのローカル運用(マルチユーザー同期なし)

## 🌐 今すぐ使う

インストール不要。ブラウザーで開くだけで利用できます。

**→ https://kyoheitashiro.github.io/calibration-manager/**

PWA としてインストールすれば、オフラインでも起動できます。

## ⚡ 主な機能

### 📊 ダッシュボード

- 期限切れ・発注推奨・期限接近の件数をひと目で確認
- カードから対象の点検校正項目一覧へ直行

### ⚙️ 機器・点検校正項目の管理

- 🔧 機器台帳(メーカー・型式・管理番号・担当者)
- 📅 点検校正項目ごとの周期・次回期限・発注推奨日の自動計算
- 🏷️ ステータスは色 + 日本語ラベル併記(期限切れ / 要発注 / 校正中 / 期限接近 / 正常)

### 🗂️ 外部案件ボード

- 外部校正の発注 → 校正中 → 返却 → 記録登録を状態別ボードで進捗管理
- 返却予定日の接近・超過を自動通知

### 🔔 通知センター

- 期限接近・期限切れ・発注推奨・返却関連をアプリ内通知
- 未読バッジ・既読管理

### 💾 データ管理

- 📤 種類ごとの CSV エクスポート(UTF-8 BOM 付き、Excel でそのまま開ける)
- 📥 CSV インポート(バックアップ復元・表計算ソフトからの一括登録)
- 🔒 データはすべてブラウザー内(LocalStorage)。外部サーバーへ送信しません

### 📖 利用マニュアル内蔵

- 画面の説明・ステータスの見方・CSV 仕様をアプリ内で参照可能(検索付き)

## 🚀 ローカルで動かす

要件: Node.js >= 24

```bash
git clone https://github.com/KyoheiTashiro/calibration-manager.git
cd calibration-manager
npm install
npm run dev
```

その他のスクリプト(テスト・lint・Storybook 等)は [package.json](package.json) 参照。

## 🏗️ 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **状態管理**: Zustand(LocalStorage 永続化)
- **スタイリング**: Tailwind CSS 4
- **テスト**: Vitest + Testing Library + fast-check
- **ホスティング**: GitHub Pages(PWA / 完全オフライン動作)

## 📚 ドキュメント

仕様・設計・規約は [`docs/`](docs/README.md) に集約しています。

- [ドメインモデル](docs/spec/domain-model.md) — 用語・状態遷移・期限計算ロジック
- [画面設計書](docs/spec/screen-design/README.md) — 全 12 画面の仕様
- [コーディング規約](docs/guides/coding-standards.md) / [テスト方針](docs/guides/testing.md) / [アーキテクチャ](docs/guides/architecture/tech-stack.md)

## 🔒 プライバシーとセキュリティ

- [プライバシーポリシー](PRIVACY.md) — データの取り扱い(外部送信なし)
- [セキュリティポリシー](.github/SECURITY.md) — 脆弱性の報告方法

## 🤝 コントリビュート

バグ報告・機能提案は [Issues](https://github.com/KyoheiTashiro/calibration-manager/issues) へ。

## 📄 ライセンス

[MIT License](LICENSE)([日本語参考訳](LICENSE.ja.md))。ソースコードは自由に改変・拡張して利用できます。
