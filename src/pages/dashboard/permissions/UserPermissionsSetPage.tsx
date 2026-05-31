import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { identityApi } from "@/features/identity";
import { useAdminUsersGet } from "@/features/adminUsers";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { Button } from "@/shared/components/ui/button";
import { useToast } from "@/shared/components/feedback/ToastProvider";

type PermissionRow = Readonly<{ id: string; module: string; action: string; key: string }>;
type CrudColumn = "create" | "edit" | "view" | "delete";

const toCrudColumn = (action: string): CrudColumn | null => {
  const normalized = action.trim().toUpperCase();
  if (normalized === "CREATE") return "create";
  if (normalized === "EDIT" || normalized === "UPDATE") return "edit";
  if (normalized === "VIEW") return "view";
  if (normalized === "DELETE") return "delete";
  return null;
};

const toAssignedPermissionIds = (value: unknown): ReadonlySet<string> => {
  if (!Array.isArray(value)) return new Set();
  const ids = value
    .map((row) => {
      if (!row || typeof row !== "object") return "";
      const permission = (row as Record<string, unknown>).permission;
      if (!permission || typeof permission !== "object") return "";
      const id = (permission as Record<string, unknown>).id;
      return typeof id === "string" ? id : "";
    })
    .filter((id) => id.length > 0);
  return new Set(ids);
};

const moduleLabel = (moduleName: string) => (moduleName === "BLOG_POSTS" ? "Blogs" : moduleName);

export const UserPermissionsSetPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const userQuery = useAdminUsersGet(id, id.length > 0);

  const userRolesQuery = useQuery({
    queryKey: ["user-roles", id],
    queryFn: () => identityApi.userRoles.listByUser(id as `${string}-${string}-${string}-${string}-${string}`),
    enabled: id.length > 0,
  });

  const roleId = React.useMemo(() => {
    const raw = userRolesQuery.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    const first = items.find((i): i is Record<string, unknown> => typeof i === "object" && i !== null);
    return first ? String(first.roleId ?? first.role_id ?? "") : "";
  }, [userRolesQuery.data]);

  const rolePermissionsQuery = useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () => identityApi.rolePermissions.listByRole(roleId as `${string}-${string}-${string}-${string}-${string}`),
    enabled: roleId.length > 0,
  });

  const assignedQuery = useQuery({
    queryKey: ["user-permissions", id],
    queryFn: () => identityApi.userPermissions.listByUser(id),
    enabled: id.length > 0,
  });

  const rows = React.useMemo(() => {
    const raw = rolePermissionsQuery.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    return items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((item) => {
        const perm = (typeof item.permission === "object" && item.permission !== null
          ? item.permission
          : item) as Record<string, unknown>;
        return {
          id: String(perm.id ?? item.permissionId ?? ""),
          module: String(perm.module ?? ""),
          action: String(perm.action ?? ""),
          key: String(perm.key ?? ""),
        };
      })
      .filter((p) => p.id.length > 0 && p.module.length > 0);
  }, [rolePermissionsQuery.data]);
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(new Set());

  React.useEffect(() => {
    setSelected(toAssignedPermissionIds(assignedQuery.data));
  }, [assignedQuery.data]);

  const matrix = React.useMemo(() => {
    const map = new Map<string, Record<CrudColumn, ReadonlyArray<string>>>();
    for (const row of rows) {
      const col = toCrudColumn(row.action);
      if (!col) continue;
      const current = map.get(row.module) ?? { create: [], edit: [], view: [], delete: [] };
      map.set(row.module, { ...current, [col]: [...current[col], row.id] });
    }
    return Array.from(map.entries())
      .map(([moduleName, columns]) => ({ moduleName, columns }))
      .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }, [rows]);

  const toggleMany = (ids: ReadonlyArray<string>) => {
    if (ids.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldSelect = !ids.every((idValue) => next.has(idValue));
      ids.forEach((idValue) => {
        if (shouldSelect) next.add(idValue);
        else next.delete(idValue);
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await identityApi.userPermissions.clearByUser(id);
      const permissionIds = Array.from(selected);
      if (permissionIds.length > 0) {
        await identityApi.userPermissions.assign({ userId: id, permissionIds });
      }
      toast.success("Permissions updated.");
      await assignedQuery.refetch();
    } catch {
      toast.error("Failed to update permissions.");
    }
  };

  return (
    <PageLayout
      title="Set Permissions"
      subtitle={`User: ${userQuery.data?.email ?? id}`}
      onBack={() => nav("/dashboard/permissions/users")}
      actions={<div className="flex gap-2"><Button variant="outline" onClick={() => nav('/dashboard/permissions/users')}>Cancel</Button><Button onClick={() => void handleSave()}>Save Permissions</Button></div>}
    >
      <div className="rounded-xl border border-[#e5e5e7] bg-white p-4">
        {(userRolesQuery.isLoading || rolePermissionsQuery.isLoading) && (
          <p className="py-4 text-center text-sm text-[#86868b]">Loading role permissions…</p>
        )}
        {!userRolesQuery.isLoading && roleId.length === 0 && (
          <p className="py-4 text-center text-sm text-[#86868b]">No role assigned to this user. Assign a role first to set permissions.</p>
        )}
        {roleId.length > 0 && !rolePermissionsQuery.isLoading && rows.length === 0 && (
          <p className="py-4 text-center text-sm text-[#86868b]">The assigned role has no permissions configured.</p>
        )}
        {rows.length > 0 && (
        <div className="mb-3 text-sm text-[#6e6e73]">Selected: {selected.size} of {rows.length}</div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d2d2d7]">
                  <th className="px-3 py-2 text-left">Module</th>
                  <th className="px-3 py-2 text-center">Create</th>
                  <th className="px-3 py-2 text-center">Edit</th>
                  <th className="px-3 py-2 text-center">View</th>
                  <th className="px-3 py-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map(({ moduleName, columns }) => (
                  <tr key={moduleName} className="border-b border-[#f0f0f2]">
                    <td className="px-3 py-2 font-medium">{moduleLabel(moduleName)}</td>
                    {(["create", "edit", "view", "delete"] as const).map((column) => (
                      <td key={`${moduleName}-${column}`} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={columns[column].length > 0 && columns[column].every((idValue) => selected.has(idValue))}
                          disabled={columns[column].length === 0}
                          onChange={() => toggleMany(columns[column])}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
