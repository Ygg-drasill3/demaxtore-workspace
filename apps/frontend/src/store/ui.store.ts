// apps/frontend/src/store/ui.store.ts
import { create } from "zustand";

interface UiState {
  sidebarCollapsed:       boolean;
  notificationDrawerOpen: boolean;
  mobileMenuOpen:         boolean;
  toggleSidebar:          () => void;
  setSidebar:             (v: boolean) => void;
  openNotifDrawer:        () => void;
  closeNotifDrawer:       () => void;
  openMobileMenu:         () => void;
  closeMobileMenu:        () => void;
  toggleMobileMenu:       () => void;
}

/** UI-only state. NEVER mirror server data here — that lives in TanStack Query. */
export const useUi = create<UiState>((set) => ({
  sidebarCollapsed:       false,
  notificationDrawerOpen: false,
  mobileMenuOpen:         false,
  toggleSidebar:    () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar:       (v) => set({ sidebarCollapsed: v }),
  openNotifDrawer:  () => set({ notificationDrawerOpen: true }),
  closeNotifDrawer: () => set({ notificationDrawerOpen: false }),
  openMobileMenu:   () => set({ mobileMenuOpen: true }),
  closeMobileMenu:  () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
}));
