import { BellIcon, MenuIcon } from "@/components/icons";
import { ROUTES } from "@/constants/routes";
import { unreadNotificationCount } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  onMenuClick: () => void;
};

export const Header = ({ onMenuClick }: Props): ReactElement => {
  const navigate = useNavigate();
  // なぜ selectors.ts 経由か: 横断selectorはコンポーネントごとに再定義せず
  // store/selectors.ts の純関数へ集約する(coding-standards.md §5)。
  const unreadCount = useAppStore((state) => unreadNotificationCount(state));

  const handleBellClick = (): void => {
    navigate(ROUTES.NOTIFICATION_LIST);
  };

  return (
    <header className="border-line flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={onMenuClick}
          className="text-slate-600 md:hidden"
        >
          {/* oxlint-disable-next-line react/forbid-component-props -- icons/base.tsの方針通り
              アイコンのサイズは呼び出し側classNameで制御する設計のため許容する */}
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="text-base font-semibold">機器点検・校正管理</span>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          aria-label="通知"
          onClick={handleBellClick}
          className="relative text-slate-600"
        >
          {/* oxlint-disable-next-line react/forbid-component-props -- icons/base.tsの方針通り
              アイコンのサイズは呼び出し側classNameで制御する設計のため許容する */}
          <BellIcon className="h-6 w-6" />
          {/* なぜ 0件で非表示か: ui-guidelines.md §5「未読0でバッジ非表示」に従う。
              バッジ自体は装飾表現のためaria-hiddenにし、件数の告知は下のaria-live領域に任せる。 */}
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white"
            >
              {unreadCount}
            </span>
          ) : null}
        </button>
        {/* なぜ aria-live か: ui-guidelines.md §11「通知ベルの未読件数変化はaria-live="polite"の
            領域で告知する」に対応するため、視覚バッジとは別にスクリーンリーダー専用の文言を持つ。 */}
        <span className="sr-only" aria-live="polite">
          {unreadCount > 0 ? `未読通知${unreadCount}件` : "未読通知なし"}
        </span>
      </div>
    </header>
  );
};
