// apps/frontend/src/store/toast.store.ts
import { create } from "zustand";
import type { NotificationType } from "@dmx/contracts/notifications";

export interface ToastEntry {
  id:    string;
  type:  NotificationType;
  title: string;
  body?: string;
  /** Auto-dismiss after N ms. 0 = sticky. Default 5000. */
  ttl?:  number;
}

interface ToastState {
  toasts: ToastEntry[];
  push:   (t: Omit<ToastEntry, "id">) => string;
  remove: (id: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = crypto.randomUUID();
    const entry: ToastEntry = { id, ttl: 5000, ...t };
    set({ toasts: [...get().toasts, entry] });
    if (entry.ttl && entry.ttl > 0) {
      setTimeout(() => get().remove(id), entry.ttl);
    }
    return id;
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Sugar API mirroring `sonner` so existing JSX doesn't need refactor. */
export const toast = {
  info:    (title: string, body?: string) => useToast.getState().push({ type: "INFO",    title, body }),
  success: (title: string, body?: string) => useToast.getState().push({ type: "SUCCESS", title, body }),
  warning: (title: string, body?: string) => useToast.getState().push({ type: "WARNING", title, body }),
  error:   (title: string, body?: string) => useToast.getState().push({ type: "ERROR",   title, body }),
};
