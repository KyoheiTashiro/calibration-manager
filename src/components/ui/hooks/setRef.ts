import type { Ref } from "react";

/**
 * callback ref / object ref の両形式に同じノードを伝播させる plain 関数。
 * なぜ hook にしないか: hook 引数に props 由来の ref を渡すと react-compiler が
 * 「hook 引数の変更」と誤検知するため(useSelectBehavior.ts 冒頭コメント参照)、
 * コンポーネント本体の callback ref 内から呼ぶ plain 関数とする。
 */
export const setRef = <Node>(ref: Ref<Node> | undefined, node: Node | null): void => {
  if (typeof ref === "function") ref(node);
  else if (ref !== null && ref !== undefined) ref.current = node;
};
