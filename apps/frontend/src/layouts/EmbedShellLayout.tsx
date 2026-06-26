// Sidebar + header; main area is full-height for external panel iframes (FreightIQ, CommodityBid).
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Header } from "./components/Header";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { useUi } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export default function EmbedShellLayout() {
  const collapsed = useUi((s) => s.sidebarCollapsed);

  return (
    <div data-testid="embed-shell-layout" className="min-h-screen bg-paper-50 flex overflow-hidden">
      <Sidebar />
      <MobileNav />
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col transition-[margin] duration-300 ease-out h-screen",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[260px]",
        )}
      >
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <NotificationDrawer />
    </div>
  );
}
