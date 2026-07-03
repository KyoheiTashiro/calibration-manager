// oxlint-disable import/max-dependencies -- 全ルート定義のため依存数上限の対象外とする
import { AppLayout } from "@/components/layout/AppLayout";
import { ROUTES } from "@/constants/routes";
import { Dashboard } from "@/features/dashboard";
import { EquipmentDetail } from "@/features/equipment/detail";
import { EquipmentForm } from "@/features/equipment/form";
import { EquipmentList } from "@/features/equipment/list";
import { InspectionItemList } from "@/features/inspectionItems";
import { Manual } from "@/features/manual";
import { NotificationCenter } from "@/features/notifications";
import { useNotificationScan } from "@/features/notifications/useNotificationScan";
import { OrderList } from "@/features/orders";
import { PersonList } from "@/features/persons";
import { Settings } from "@/features/settings";
import { VendorList } from "@/features/vendors";
import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";

// なぜ function 宣言か（coding-standards.md §4の例外）:
// アロー関数コンポーネントが原則だが、`App.tsx` のルートコンポーネントのみ
// `function` 宣言 + `export default` が慣習として許容されている
// （姉妹プロジェクト pinpon-match-manage 踏襲・directory-structure.mdの想定通りルート定義をここに置く）。
function App(): ReactElement {
  // 通知スキャンの起動（D-025）。アプリ全体で1度だけマウントする。
  useNotificationScan();

  return (
    <Routes>
      {/* 共通レイアウト（サイドバー+ヘッダー+Outlet）配下に全12ルートを定義する
          （screen-design/README.md §0.2 のルーティング一覧に対応）。 */}
      <Route element={<AppLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.EQUIPMENT_LIST} element={<EquipmentList />} />
        {/* なぜ登録・編集で同一コンポーネントか: タスク指示の通りEQUIPMENT_NEW/EQUIPMENT_EDITは
            同じフォームプレースホルダを表示する（後続フェーズで新規/編集モードを内部分岐する想定）。 */}
        <Route path={ROUTES.EQUIPMENT_NEW} element={<EquipmentForm />} />
        <Route path={ROUTES.EQUIPMENT_DETAIL} element={<EquipmentDetail />} />
        <Route path={ROUTES.EQUIPMENT_EDIT} element={<EquipmentForm />} />
        <Route path={ROUTES.INSPECTION_ITEM_LIST} element={<InspectionItemList />} />
        <Route path={ROUTES.ORDER_LIST} element={<OrderList />} />
        <Route path={ROUTES.VENDOR_LIST} element={<VendorList />} />
        <Route path={ROUTES.PERSON_LIST} element={<PersonList />} />
        <Route path={ROUTES.NOTIFICATION_LIST} element={<NotificationCenter />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        <Route path={ROUTES.MANUAL} element={<Manual />} />
        {/* 定義済み12パス以外はNotFound相当の簡素な案内を表示する。 */}
        <Route path="*" element={<div>ページが見つかりません</div>} />
      </Route>
    </Routes>
  );
}

export default App;
