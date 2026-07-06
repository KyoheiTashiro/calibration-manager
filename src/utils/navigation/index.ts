import { useNavigate, type To } from "react-router-dom";

export const useSafeNavigate = (): ((to: To | number) => void) => {
  const navigate = useNavigate();
  return (to: To | number): void => {
    // なぜ Promise.resolve().catch() か: navigate() は react-router 7 で
    // `void | Promise<void>` を返す。遷移完了を待つ必要はなく、失敗時も
    // 画面表示に影響しないため、両方の戻り値を統一的に無視する。
    // なぜ三項分岐が必要か: navigate() はオーバーロード関数で、引数が
    // To か number かで異なるシグネチャに解決される。union型の引数を
    // そのまま渡すと呼び出しがマッチしないため、型ごとに分岐して呼び出す。
    Promise.resolve(typeof to === "number" ? navigate(to) : navigate(to)).catch(() => {
      // 遷移エラーは無視する
    });
  };
};
