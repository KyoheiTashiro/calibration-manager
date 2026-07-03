import { Header } from "@/components/system/Header";
import { Sidebar } from "@/components/system/Sidebar";
import { useEffect, useState, type ReactElement } from "react";
import { Outlet } from "react-router-dom";

export const AppLayout = (): ReactElement => {
  // なぜローカルuseStateか: サイドバーオーバーレイの開閉はUI一時状態であり、
  // 永続化対象ではないためstoreに置かない(coding-standards.md §5)。
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const handleMenuClick = (): void => {
    setIsOverlayOpen(true);
  };

  const handleOverlayClose = (): void => {
    setIsOverlayOpen(false);
  };

  useEffect(() => {
    // なぜオーバーレイが開いているときだけ購読するか: 不要なイベントリスナーを
    // 常時貼り続けないため(閉じている間はEscを監視する意味がない)。
    if (!isOverlayOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOverlayOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOverlayOpen]);

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={handleMenuClick} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {isOverlayOpen ? (
          <div className="fixed inset-0 z-20 md:hidden">
            {/* なぜbutton要素か: div+onClickだとjsx-a11y(click-events-have-key-events/
                no-static-element-interactions)に抵触するため、クリック可能な背景は
                セマンティックなbuttonにする。なぜ背景側だけにハンドラを置くか:
                サイドバー本体(下のrelative div)とは重ならない別要素として敷くことで、
                stopPropagationに頼らずとも「サイドバー内クリックでは閉じない・
                背景クリックでは閉じる」を実現するため。 */}
            <button
              type="button"
              aria-label="オーバーレイを閉じる"
              onClick={handleOverlayClose}
              className="absolute inset-0 border-0 bg-black/50 p-0"
            />
            <div className="relative h-full w-60">
              <Sidebar onNavigate={handleOverlayClose} />
            </div>
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
