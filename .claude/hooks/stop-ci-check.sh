#!/usr/bin/env bash
# Stop: 作業終了時、未コミット/コミット済みの変更があれば CI と同じチェックを走らせる。
# 失敗したら decision:block で Claude に差し戻し、test/lint が通るまで修正させる。
input=$(cat)

# Stop hook 由来の再起動なら再チェックしない（無限ループ防止）
if printf '%s' "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 変更が一切なければスキップ（clear / resume / compact 等で無駄に走らせない）
if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  exit 0
fi

# CI(lint.yml / test.yml) と同じチェック + CLAUDE.md 完了条件の tsc
out=$(npm run lint:typed 2>&1 && npm run format:check 2>&1 && npx tsc -b --noEmit 2>&1 && npm run test:coverage 2>&1)
status=$?

if [ "$status" -ne 0 ]; then
  reason=$(printf 'CI チェック失敗。stop 前に修正すること（lint:typed / format:check / tsc / test:coverage）。\n\n%s' "$(printf '%s' "$out" | tail -60)")
  jq -nc --arg r "$reason" '{decision:"block", reason:$r}'
fi
exit 0
