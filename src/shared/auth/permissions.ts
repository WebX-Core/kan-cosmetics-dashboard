import type { KnownRole, Role } from "@/features/auth";

// Backend generates permissions dynamically as `module:action`.
// Examples: "product:view", "seo:create", "admin:manage", "inventory:delete"
export type AppPermission = string;

// Static fallback for SUDOADMIN/ADMIN when DB returns no permissions.
const ROLE_GRANTS_ALL: ReadonlySet<KnownRole> = new Set<KnownRole>(["SUDOADMIN", "ADMIN"]);

export function can(role: Role | null | undefined, _permission: AppPermission): boolean {
  if (!role) return false;
  return ROLE_GRANTS_ALL.has(role as KnownRole);
}
