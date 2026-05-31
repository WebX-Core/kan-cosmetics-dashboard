import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "../../features/auth";
import { useAuth } from "../providers/AuthContext";

type Props = Readonly<{
  allow: ReadonlyArray<Role>;
  redirectTo?: string;
}>;

export const RoleGuard: React.FC<Props> = ({ allow, redirectTo = "/dashboard" }) => {
  const { state } = useAuth();

  if (!state.isAuthenticated || !state.role) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(state.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
