import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";

// なぜ function 宣言か（coding-standards.md §4の例外）:
// アロー関数コンポーネントが原則だが、`App.tsx` のルートコンポーネントのみ
// `function` 宣言 + `export default` が慣習として許容されている
// （姉妹プロジェクト pinpon-match-manage 踏襲・directory-structure.mdの想定通りルート定義をここに置く）。
function App(): ReactElement {
  return (
    <Routes>
      {/* なぜプレースホルダのみか: Phase 0はプロジェクト基盤構築のみが対象で、
          各画面（screen-design/README.md §0.2の11画面）は後続フェーズで実装するため。 */}
      <Route path="/" element={<div>機器点検・校正管理</div>} />
    </Routes>
  );
}

export default App;
