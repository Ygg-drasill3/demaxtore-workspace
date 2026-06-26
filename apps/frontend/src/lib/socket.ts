// apps/frontend/src/lib/socket.ts
import { io, type Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/store/auth.store";

let socket: Socket | null = null;
let authSyncRegistered = false;

function registerAuthTokenSync() {
  if (authSyncRegistered || typeof useAuth.subscribe !== "function") return;
  authSyncRegistered = true;
  useAuth.subscribe((state, prev) => {
    if (!socket || state.accessToken === prev.accessToken) return;
    socket.auth = freshAuth();
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  });
}

function socketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "");
}

function freshAuth() {
  return { token: useAuth.getState().accessToken ?? "" };
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(socketUrl(), {
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 2_000,
    reconnectionDelayMax: 15_000,
    timeout: 20_000,
    transports: ["websocket", "polling"],
    auth: (cb) => cb(freshAuth()),
  });

  socket.io.on("reconnect_attempt", () => {
    if (socket) socket.auth = freshAuth();
  });

  registerAuthTokenSync();

  useAuth.subscribe((state, prev) => {
    if (state.status === "unauthenticated" && prev.status === "authenticated" && socket?.connected) {
      socket.disconnect();
    }
  });

  return socket;
}

/** True when the shared socket is connected (safe for dependent refetches). */
export function isSocketConnected(): boolean {
  return !!socket?.connected;
}

/** Subscribe to a workspace room; auto-leaves on unmount. */
export function useWorkspaceSocket(
  workspaceId: string | undefined,
  handlers: Partial<Record<string, (payload: any) => void>>,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!workspaceId) return;
    const sock = getSocket();
    sock.emit("workspace:subscribe", workspaceId);

    const wrapped: Array<[string, (p: any) => void]> = [];
    for (const event of Object.keys(handlersRef.current)) {
      const fn = (p: any) => handlersRef.current[event]?.(p);
      sock.on(event, fn);
      wrapped.push([event, fn]);
    }
    return () => {
      for (const [event, fn] of wrapped) sock.off(event, fn);
      sock.emit("workspace:unsubscribe", workspaceId);
    };
  }, [workspaceId]);
}
