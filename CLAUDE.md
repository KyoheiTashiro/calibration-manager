# CLAUDE.md — calibration-manager 実装ルール

機器点検・校正期限管理アプリ(React 19 + TS + Vite、LocalStorage永続化、GitHub Pages)。

## 真実源(優先順)

1. `docs/spec/domain-model.md` — ドメイン仕様。一言一句矛盾させない
2. `docs/spec/screen-design/*.md` — 画面仕様
3. `docs/guides/` — 規約・アーキテクチャ・インフラ

実装前に必ず該当節を読む。仕様が曖昧・矛盾していたら実装せず報告。コード・docs 中の「(D-xxx)」は確定済み実装判断のタグで、実質は docs 本文に反映済み(索引は `docs/README.md`)。

## 変更禁止(サブエージェント厳守)

- `src/domain/` 配下と `src/store/types.ts` / `src/store/schema.ts` — 変更が必要と思ったら報告のみ
- 既存テストの改変・削除・skip — テストを通すためにテストを弱めるの禁止
- `vite.config.ts` の base / PWA 設定
- カバレッジ閾値の引き下げ

## 完了条件(全タスク共通)

- `npx tsc -b --noEmit` エラー0
- `npm run lint` エラー0
- `npx vitest run` 全緑(新規コードはテスト同時作成)
- 上記が通らない状態で「完了」と報告しない

## 規約要点

- 詳細は `docs/guides/coding-standards.md` / `docs/guides/testing.md`
- UI文言・ラベルは日本語。ステータスは色 + 日本語ラベル併記必須
- 列挙は as const + 派生union(`src/domain/constants.ts` 参照)。文字列リテラル直書き禁止
- 日付は YYYY-MM-DD 文字列(`src/utils/time.ts` 経由)。`new Date()` 直接比較禁止
- ルーティングは `src/constants/routes.ts` の ROUTES 経由

## 運用

タスク完了 = 完了条件 + メイン監査 + コミット。実装判断が発生したら該当 docs へ直接反映し、「(D-xxx)」で採番タグ付け(最終番号は `docs/README.md` 参照)。
