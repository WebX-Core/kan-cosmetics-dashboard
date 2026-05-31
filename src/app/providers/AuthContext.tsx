/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { queryClient } from "../../shared/api/queryClient";
import { registerLogoutHandler } from "./authEvents";
import type { Role, User } from "../../features/auth/auth.types";
import { clearSessionToken } from "@/shared/auth/sessionToken";

export type AuthState = Readonly<{
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
  permissions: ReadonlyArray<string>;
}>;

type AuthContextValue = Readonly<{
  state: AuthState;
  setAuthenticated: (user: User | null, permissions?: ReadonlyArray<string>) => void;
  clearAuth: () => void;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "dashboard_auth_state";

function readInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, user: null, role: null, permissions: [] };
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return { isAuthenticated: false, user: null, role: null, permissions: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      user: parsed.user ?? null,
      role: parsed.role ?? null,
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return { isAuthenticated: false, user: null, role: null, permissions: [] };
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();

  const [state, setState] = useState<AuthState>(readInitialAuthState);

  const setAuthenticated = (user: User | null, permissions: ReadonlyArray<string> = []) => {
    setState({
      isAuthenticated: true,
      user,
      role: user?.role ?? null,
      permissions,
    });
  };

  const clearAuth = () => {
    clearSessionToken();
    setState({
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
    });
  };

  React.useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => {
    registerLogoutHandler({
      clearAuth,
      queryClient,
      navigateToLogin: () => navigate("/login", { replace: true }),
    });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, setAuthenticated, clearAuth }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
