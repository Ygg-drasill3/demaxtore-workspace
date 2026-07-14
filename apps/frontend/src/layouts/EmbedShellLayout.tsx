// Sidebar + header; main area is full-height for external panel iframes (FreightIQ, CommodityBid).
import { Outlet } from "react-router-dom";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Header } from "./components/Header";
import { MainContentOffset } from "./components/MainContentOffset";

export default function EmbedShellLayout() {
  return (
    <div data-testid="embed-shell-layout" className="min-h-screen bg-paper-50 flex overflow-hidden">
      <Sidebar />
      <MobileNav />
      <MainContentOffset className="h-screen">
        <Header />
        <main className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </MainContentOffset>
      <NotificationDrawer />
    </div>
  );
}
