import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, API_BASE, tokenStore, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user: undefined = loading, null = unauthenticated, object = authenticated
  const [user, setUser] = useState(undefined);

  const fetchMe = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get(`${API_BASE}/auth/me`);
      setUser(data);
    } catch (_) {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post(`${API_BASE}/auth/login`, { email, password });
      tokenStore.set({ access_token: data.access_token, refresh_token: data.refresh_token });
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post(`${API_BASE}/auth/logout`);
    } catch (_) {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshMe: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
