import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "@/shared/hooks/usePermission";
import { useAuth } from "../providers/AuthContext";
import type { AppPermission } from "@/shared/auth/permissions";

type Props = Readonly<{
  permission: AppPermission;
  redirectTo?: string;
}>;

export const PermissionGuard: React.FC<Props> = ({ permission, redirectTo = "/dashboard" }) => {
  const { state } = useAuth();
  const canAccess = usePermission(permission);

  if (state.sessionStatus === "checking") {
    return null;
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
