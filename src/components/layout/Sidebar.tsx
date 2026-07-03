import { ROUTES } from "@/constants/routes";
import type { ReactElement } from "react";
import { NavLink } from "react-router-dom";

type Props = {
  /** モバイルオーバーレイでリンククリック時にオーバーレイを閉じるための任意コールバック */
  onNavigate?: () => void;
};

type NavItem = {
  path: string;
  label: string;
  /** ダッシュボード("/")のみ true。他ルートとの前方一致誤爆を防ぐ(NavLinkのendプロパティ) */
  end?: boolean;
};

// なぜここに集約するか: screen-design/README.md §0.1 のワイヤーフレーム通りの9項目・順序を
// 1箇所で管理し、パス文字列は ROUTES 定数参照に限定してハードコードを避けるため。
const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.DASHBOARD, label: "ダッシュボード", end: true },
  { path: ROUTES.EQUIPMENT_LIST, label: "機器一覧" },
  { path: ROUTES.ITEM_LIST, label: "項目一覧" },
  { path: ROUTES.ORDER_LIST, label: "校正案件" },
  { path: ROUTES.VENDOR_LIST, label: "メーカー・取引先" },
  { path: ROUTES.PERSON_LIST, label: "担当者" },
  { path: ROUTES.NOTIFICATION_LIST, label: "通知" },
  { path: ROUTES.SETTINGS, label: "設定" },
  { path: ROUTES.MANUAL, label: "利用マニュアル" },
];

export const Sidebar = ({ onNavigate }: Props): ReactElement => {
  // なぜ: propsで渡されない場合(PC固定表示)は何もしない安全側の既定動作にする。
  const handleNavigate = (): void => {
    onNavigate?.();
  };

  return (
    <nav aria-label="メインナビゲーション" className="bg-subBg h-full w-60">
      <ul className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.end}
              onClick={handleNavigate}
              // oxlint-disable-next-line react/forbid-component-props -- NavLinkはisActiveでクラス出し分けする関数classNameが公式APIのため、この用途に限り許容する
              className={({ isActive }): string =>
                `block rounded px-3 py-2 text-sm ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
