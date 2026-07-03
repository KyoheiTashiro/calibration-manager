# CLAUDE.md — calibration-manager 実装ルール

機器点検・校正期限管理アプリ(React 19 + TS + Vite、LocalStorage永続化、GitHub Pages)。

## 真実源(優先順)

1. `docs/decisions.md` — 確定済み実装判断(docs と食い違ったらこちらが勝つ)
2. `docs/domain-model.md` — ドメイン仕様。一言一句矛盾させない
3. `docs/screen-design/*.md` — 画面仕様
4. `docs/implementation-plan.md` — フェーズ計画・担当・進捗

実装前に必ず該当節を読む。仕様が曖昧・矛盾していたら実装せず報告。

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

- 詳細は `docs/coding-standards.md` / `docs/testing.md`
- UI文言・ラベルは日本語。ステータスは色 + 日本語ラベル併記必須
- 列挙は as const + 派生union(`src/domain/constants.ts` 参照)。文字列リテラル直書き禁止
- 日付は YYYY-MM-DD 文字列(`src/utils/time.ts` 経由)。`new Date()` 直接比較禁止
- ルーティングは `src/constants/routes.ts` の ROUTES 経由

## フェーズ運用

フェーズ完了 = 完了条件 + メイン監査 + `docs/implementation-plan.md` チェック更新 + コミット。判断が発生したら `docs/decisions.md` に追記。
