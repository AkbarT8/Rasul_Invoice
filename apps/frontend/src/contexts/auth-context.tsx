"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: User }>("/auth/me", { skipRefresh: false })
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const payload = await apiFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember }),
      skipRefresh: true
    });
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch<void>("/auth/logout", { method: "POST", skipRefresh: true }).catch(() => undefined);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
