/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useRef, useState } from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";
import { queryClient } from "../../shared/api/queryClient";
import { registerLogoutHandler } from "./authEvents";
import { authApi } from "../../features/auth";
import type { Role, User } from "../../features/auth/auth.types";
import { clearSessionToken } from "@/shared/auth/sessionToken";
import { useUserStore } from "@/store/UserStore";

export type AuthState = Readonly<{
  isAuthenticated: boolean;
  user: User | null;
  role: Role | null;
  permissions: ReadonlyArray<string>;
  sessionStatus: "checking" | "authenticated" | "unauthenticated";
}>;

type AuthContextValue = Readonly<{
  state: AuthState;
  setAuthenticated: (user: User | null, permissions?: ReadonlyArray<string>) => void;
  clearAuth: () => void;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = "dashboard_auth_state";
const AUTH_FAILURE_STATUSES = new Set([401]);

function getResponseStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.status ?? null;
}

function readInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      sessionStatus: "checking",
    };
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return {
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      sessionStatus: "checking",
    };
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
      sessionStatus: "checking",
    };
  } catch {
    return {
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      sessionStatus: "checking",
    };
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();

  const [state, setState] = useState<AuthState>(readInitialAuthState);
  const authVersionRef = useRef(0);

  const setAuthenticated = React.useCallback((user: User | null, permissions: ReadonlyArray<string> = []) => {
    authVersionRef.current += 1;
    setState({
      isAuthenticated: true,
      user,
      role: user?.role ?? null,
      permissions,
      sessionStatus: "authenticated",
    });
    if (user) {
      useUserStore.getState().saveInfo({
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
          role: user.role,
          firstname: user.firstname,
          middlename: user.middlename ?? null,
          lastname: user.lastname,
          phone: user.phone,
          gender: user.gender,
          address: user.address,
          profilePicture: user.profileUrl ?? null,
          createdAt: user.createdAt ?? "",
          updatedAt: user.updatedAt ?? "",
        },
      });
    }
  }, []);

  const clearAuth = React.useCallback(() => {
    authVersionRef.current += 1;
    clearSessionToken();
    queryClient.clear();
    setState({
      isAuthenticated: false,
      user: null,
      role: null,
      permissions: [],
      sessionStatus: "unauthenticated",
    });
    useUserStore.getState().logout();
  }, []);

  const verifySession = React.useCallback(async () => {
    const requestVersion = authVersionRef.current;

    try {
      const session = await authApi.session();

      if (requestVersion !== authVersionRef.current) {
        return;
      }

      if (!session.authenticated) {
        clearAuth();
        return;
      }

      setState((previous) => {
        if (requestVersion !== authVersionRef.current) {
          return previous;
        }

        return {
          isAuthenticated: true,
          user: previous.user,
          role: previous.role ?? session.user?.role ?? null,
          permissions: previous.permissions,
          sessionStatus: "authenticated",
        };
      });
    } catch (error) {
      if (requestVersion !== authVersionRef.current) {
        return;
      }

      const status = getResponseStatus(error);
      if (status && AUTH_FAILURE_STATUSES.has(status)) {
        clearAuth();
        return;
      }

      setState((previous) => ({
        ...previous,
        sessionStatus: previous.isAuthenticated ? "authenticated" : "unauthenticated",
      }));
    }
  }, [clearAuth]);

  React.useEffect(() => {
    void verifySession();

    const handleFocus = () => {
      void verifySession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void verifySession();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [verifySession]);

  React.useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => {
    registerLogoutHandler({
      clearAuth,
      queryClient,
      navigateToLogin: () => navigate("/login", { replace: true }),
    });
  }, [clearAuth, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ state, setAuthenticated, clearAuth }),
    [clearAuth, setAuthenticated, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
