import { useMemo } from "react";
import { useAuth } from "@/app/providers/AuthContext";
import { can, type AppPermission } from "@/shared/auth/permissions";

export function usePermission(permission: AppPermission) {
  const { state } = useAuth();
  return useMemo(() => {
    const backendPermissions = state.permissions ?? [];
    if (backendPermissions.length > 0) {
      return backendPermissions.includes(permission);
    }
    // Fallback to static role map when backend permissions are not hydrated.
    if (state.isAuthenticated && state.role === null) return true;
    return can(state.role, permission);
  }, [permission, state.isAuthenticated, state.permissions, state.role]);
}
