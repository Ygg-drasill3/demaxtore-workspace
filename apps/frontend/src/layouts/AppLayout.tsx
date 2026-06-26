// apps/frontend/src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Header } from "./components/Header";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { ProductTour } from "@/features/onboarding/components/ProductTour";
import { useOnboardingRealtime } from "@/features/onboarding/hooks";
import { useUi } from "@/store/ui.store";
import { cn } from "@/lib/utils";

/** Authenticated app shell: sidebar + header + content + global drawer. */
export default function AppLayout() {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  useOnboardingRealtime();

  return (
    <div data-testid="app-layout" className="min-h-screen bg-paper-50 flex">
      <Sidebar />
      <MobileNav />
      <div className={cn("flex-1 min-w-0 flex flex-col transition-[margin] duration-300 ease-out",
                         collapsed ? "lg:ml-[68px]" : "lg:ml-[260px]")}>
        <Header />
        <main className="flex-1 px-5 sm:px-8 py-6 lg:py-8 dmx-thin-scroll">
          <Outlet />
        </main>
      </div>
      <NotificationDrawer />
      <ProductTour />
    </div>
  );
}
