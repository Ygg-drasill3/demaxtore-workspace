// apps/frontend/src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Header } from "./components/Header";
import { MainContentOffset } from "./components/MainContentOffset";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { ProductTour } from "@/features/onboarding/components/ProductTour";
import { useOnboardingRealtime } from "@/features/onboarding/hooks";
import { WorkspaceAcademyRoot } from "@/features/workspace-academy";
import { AmbientBackground, CursorGlow, PageTransition } from "@/motion";

/** Authenticated app shell: sidebar + header + content + global drawer. */
export default function AppLayout() {
  useOnboardingRealtime();

  return (
    <WorkspaceAcademyRoot>
      <div data-testid="app-layout" className="min-h-screen bg-paper-50 flex relative">
        <AmbientBackground />
        <CursorGlow />
        <Sidebar />
        <MobileNav />
        <MainContentOffset>
          <Header />
          <main className="flex-1 px-5 sm:px-8 py-6 lg:py-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </MainContentOffset>
        <NotificationDrawer />
        <ProductTour />
      </div>
    </WorkspaceAcademyRoot>
  );
}
