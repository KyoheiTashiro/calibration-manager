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
  const unreadCount = useAppStore((state) => unreadNotificationCount(state));

  // なぜcatchで終端するか: no-void下でfloating promiseを残さないため(navigateは基本的に例外を投げない設計)。
  const handleBellClick = (): void => {
    navigate(ROUTES.NOTIFICATION_LIST)?.catch(() => {
      // navigateは基本的に例外を投げない設計のため到達しない想定
    });
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
          <MenuIcon className="h-6 w-6" />
        </button>
        <span className="text-base font-semibold">機器点検校正管理</span>
      </div>

      <div className="flex items-center">
        <button
          type="button"
          aria-label="通知"
          onClick={handleBellClick}
          className="relative text-slate-600"
        >
          <BellIcon className="h-6 w-6" />
          {/* バッジ自体は装飾表現のためaria-hiddenにし、件数の告知は下のaria-live領域に任せる。 */}
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white"
            >
              {unreadCount}
            </span>
          ) : null}
        </button>
        <span className="sr-only" aria-live="polite">
          {unreadCount > 0 ? `未読通知${unreadCount}件` : "未読通知なし"}
        </span>
      </div>
    </header>
  );
};
