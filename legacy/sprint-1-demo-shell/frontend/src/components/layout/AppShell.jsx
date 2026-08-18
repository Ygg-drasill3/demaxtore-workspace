import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <TopNav />
      <main className="ml-64 px-8 py-8" data-testid="app-main">
        <div className="mx-auto max-w-[1400px] animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;
