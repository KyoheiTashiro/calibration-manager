#!/usr/bin/env bash
# PostToolUse(Write|Edit): src 配下の実装変更時にリマインダーを注入する。
# (1) 対応する docs/ の確認・修正 (2) stories / test 追加の検討
input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

case "$f" in
  */src/*) ;;
  *) exit 0 ;;
esac

# テスト・ストーリー・型定義そのものの編集はリマインダー対象外
case "$f" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*.stories.tsx|*.d.ts) exit 0 ;;
esac

msg="実装変更検知: ${f}
(1) 対応する docs/ を確認し、仕様変更があれば修正すること（docs/spec/domain-model.md / docs/spec/screen-design / docs/guides 配下）。
(2) この変更に応じた stories(*.stories.tsx) / test(*.test.ts) の追加・更新が必要か検討すること。"

jq -nc --arg m "$msg" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse", additionalContext:$m}}'
exit 0
