import { Outlet } from "react-router-dom";
import { CatalogSearchBar } from "../components/CatalogSearchBar";
import { SmartContainerSidebar } from "../components/SmartContainerSidebar";
import { useContainerSession } from "../lib/useContainerSession";

export default function SmartContainerDiscoveryLayout() {
  const { containerId } = useContainerSession();

  return (
    <div data-testid="mc-discovery-layout" data-guide="mc-catalog" className="max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <main className="flex-1 min-w-0 space-y-2">
          <CatalogSearchBar />
          <Outlet />
        </main>
        <aside className="w-full lg:w-80 shrink-0" data-guide="mc-catalog-sidebar">
          <SmartContainerSidebar containerId={containerId} />
        </aside>
      </div>
    </div>
  );
}
