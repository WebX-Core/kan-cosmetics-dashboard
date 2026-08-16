import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Check } from "lucide-react";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { identityApi } from "@/features/identity";
import { queryClient } from "@/shared/api/queryClient";

// ── styles ─────────────────────────────────────────────────────────────────

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

// ── validation ─────────────────────────────────────────────────────────────

const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(120, "Max 120 characters")
    .regex(
      /^[A-Z0-9_]+$/,
      "Must be uppercase — letters, numbers, and underscores only",
    ),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Max 120 characters"),
  description: z.string().trim().max(500, "Max 500 characters").optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? Number(v.trim()) : undefined),
    z.number().int().positive().optional(),
  ),
});

type RoleForm = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
};

const INITIAL: RoleForm = {
  name: "",
  slug: "",
  description: "",
  isActive: true,
  sortOrder: "",
};

// ── permission picker ──────────────────────────────────────────────────────

type PermOption = {
  id: string;
  module: string;
  action: string;
  key: string;
  description: string;
};

const toPermissionActionLabel = (action: string, key: string): string => {
  const source = (action || key).trim().toLowerCase();
  if (source.includes("create")) return "create";
  if (source.includes("edit") || source.includes("update")) return "update";
  if (source.includes("delete") || source.includes("remove")) return "delete";
  if (
    source.includes("view") ||
    source.includes("read") ||
    source.includes("get") ||
    source.includes("list")
  )
    return "view";
  return source || "view";
};

const normalizeModuleName = (moduleName: string): string =>
  moduleName
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");

const PermissionPicker: React.FC<{
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onAllIds?: (ids: string[]) => void;
}> = ({ selectedIds, onChange, onAllIds }) => {
  const [search, setSearch] = React.useState("");

  const q = useQuery({
    queryKey: ["permissions", "modules"],
    queryFn: identityApi.permissions.modules,
  });
  const permissions: PermOption[] = React.useMemo(() => {
    const root = q.data;
    const body = typeof root === "object" && root !== null && !Array.isArray(root)
      ? (root as Record<string, unknown>)
      : {};
    const modules: unknown[] = Array.isArray(root)
      ? root
      : Array.isArray(body.modules)
        ? body.modules
        : Array.isArray(body.data)
          ? body.data
          : [];
    const items = modules.flatMap((entry): unknown[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const moduleRow = entry as Record<string, unknown>;
      const nested = Array.isArray(moduleRow.permissions)
        ? moduleRow.permissions
        : Array.isArray(moduleRow.items)
          ? moduleRow.items
          : null;
      if (!nested) return [moduleRow];
      const moduleName = String(moduleRow.module ?? moduleRow.name ?? moduleRow.key ?? "");
      return nested.map((permission) =>
        typeof permission === "object" && permission !== null
          ? { ...(permission as Record<string, unknown>), module: (permission as Record<string, unknown>).module ?? moduleName }
          : permission,
      );
    });
    return items
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null,
      )
      .map((p) => ({
        id: String(p.id ?? ""),
        module: String(p.module ?? ""),
        action: String(p.action ?? ""),
        key: String(p.key ?? ""),
        description: String(p.description ?? ""),
      }))
      .filter((p) => p.id);
  }, [q.data]);

  React.useEffect(() => {
    if (permissions.length > 0) onAllIds?.(permissions.map((p) => p.id));
  }, [permissions, onAllIds]);

  const filtered = React.useMemo(() => {
    if (!search) return permissions;
    const s = search.toLowerCase();
    return permissions.filter(
      (p) =>
        p.module.toLowerCase().includes(s) ||
        p.action.toLowerCase().includes(s) ||
        p.key.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s),
    );
  }, [permissions, search]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, PermOption[]>();
    for (const permission of filtered) {
      const normalizedModule = normalizeModuleName(permission.module);
      const existing = map.get(normalizedModule) ?? [];
      const actionLabel = toPermissionActionLabel(
        permission.action,
        permission.key,
      );
      const hasSameAction = existing.some(
        (item) =>
          toPermissionActionLabel(item.action, item.key) === actionLabel,
      );
      if (hasSameAction) continue;
      map.set(normalizedModule, [...existing, permission]);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  const toggleModule = (perms: PermOption[]) => {
    const allSelected = perms.every((p) => selectedIds.includes(p.id));
    if (allSelected) {
      onChange(selectedIds.filter((id) => !perms.some((p) => p.id === id)));
    } else {
      const toAdd = perms
        .filter((p) => !selectedIds.includes(p.id))
        .map((p) => p.id);
      onChange([...selectedIds, ...toAdd]);
    }
  };

  if (q.isLoading) {
    return (
      <p className="py-4 text-center text-xs text-[#86868b]">
        Loading permissions…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions…"
          className="h-9 w-full rounded-xl border border-[#d2d2d7] bg-[#f9f9f9] pl-9 pr-4 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#86868b]">
          No permissions found.
        </p>
      ) : (
        <div className="max-h-[72vh] min-h-[520px] space-y-3 overflow-y-auto pr-1">
          {grouped.map(([module, perms]) => {
            const allChecked = perms.every((p) => selectedIds.includes(p.id));
            const someChecked =
              !allChecked && perms.some((p) => selectedIds.includes(p.id));
            return (
              <div key={module}>
                <button
                  type="button"
                  onClick={() => toggleModule(perms)}
                  className="mb-1.5 flex w-full items-center gap-2 text-left"
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      allChecked
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : someChecked
                          ? "border-[var(--primary)] bg-white"
                          : "border-[#d2d2d7] bg-white"
                    }`}
                  >
                    {allChecked && (
                      <Check size={10} strokeWidth={3} className="text-white" />
                    )}
                    {someChecked && (
                      <div className="h-1.5 w-1.5 rounded-sm bg-[var(--primary)]" />
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
                    {module}
                  </span>
                  <span className="ml-auto text-[10px] text-[#86868b]">
                    {perms.filter((p) => selectedIds.includes(p.id)).length}/
                    {perms.length}
                  </span>
                </button>
                <div className="grid gap-1.5 md:grid-cols-5">
                  {perms.map((perm) => {
                    const checked = selectedIds.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${
                          checked
                            ? "border-[var(--primary)]/30 bg-[#f0f7ff]"
                            : "border-[#e8e8ed] bg-white hover:bg-[#f9f9f9]"
                        }`}
                      >
                        <div
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            checked
                              ? "border-[var(--primary)] bg-[var(--primary)]"
                              : "border-[#d2d2d7] bg-white"
                          }`}
                        >
                          {checked && (
                            <Check
                              size={10}
                              strokeWidth={3}
                              className="text-white"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-medium text-[#1d1d1f]">
                            {toPermissionActionLabel(perm.action, perm.key)}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(perm.id)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-xs font-medium text-[var(--primary)]">
          {selectedIds.length} permission{selectedIds.length > 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
};

// ── main page ──────────────────────────────────────────────────────────────

export const RolesCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id: paramId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const editId = paramId?.trim() || searchParams.get("edit")?.trim() || "";
  const isEdit = editId.length > 0;

  const [form, setForm] = React.useState<RoleForm>(INITIAL);
  const [selectedPermissionIds, setSelectedPermissionIds] = React.useState<
    string[]
  >([]);
  const [allPermissionIds, setAllPermissionIds] = React.useState<string[]>([]);

  const roleQuery = identityApi.roles.hooks.useGet(editId, isEdit);

  const existingPermsQuery = useQuery({
    queryKey: ["rolePermissions", editId],
    queryFn: () =>
      identityApi.rolePermissions.listByRole(
        editId as `${string}-${string}-${string}-${string}-${string}`,
      ),
    enabled: isEdit,
  });

  React.useEffect(() => {
    if (!isEdit || !roleQuery.data) return;
    const r = roleQuery.data as Record<string, unknown>;
    setForm({
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      description: String(r.description ?? ""),
      isActive: r.isActive !== false,
      sortOrder: typeof r.sortOrder === "number" ? String(r.sortOrder) : "",
    });
  }, [roleQuery.data, isEdit]);

  React.useEffect(() => {
    if (!isEdit || !existingPermsQuery.data) return;
    const raw = existingPermsQuery.data;
    const items: unknown[] = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    const ids = items
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null,
      )
      .map((i) => {
        const nested =
          typeof i.permission === "object" && i.permission !== null
            ? (i.permission as Record<string, unknown>)
            : null;
        return String(nested?.id ?? i.permissionId ?? i.permission_id ?? "");
      })
      .filter(Boolean);
    setSelectedPermissionIds(ids);
  }, [existingPermsQuery.data, isEdit]);

  const createRole = identityApi.roles.hooks.useCreate();
  const updateRole = identityApi.roles.hooks.useUpdate();

  const assignPermMutation = useMutation({
    mutationFn: ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => identityApi.rolePermissions.assign({ roleId, permissionId }),
  });
  const removePermMutation = useMutation({
    mutationFn: (id: string) =>
      identityApi.rolePermissions.remove(
        id as `${string}-${string}-${string}-${string}-${string}`,
      ),
  });

  const set =
    <K extends keyof RoleForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const autoSlug = () => {
    if (!form.slug && form.name) {
      setForm((p) => ({
        ...p,
        slug: p.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      }));
    }
  };

  const isSaving =
    createRole.isPending ||
    updateRole.isPending ||
    assignPermMutation.isPending ||
    removePermMutation.isPending;

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const parsed = validateOrToast(
      roleSchema,
      { ...form, sortOrder: form.sortOrder || undefined },
      toast,
    );
    if (!parsed) return;

    const payload = {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description?.trim() || undefined,
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
    };

    try {
      let roleId: string;

      if (isEdit) {
        await updateRole.mutateAsync({ id: editId, dto: payload });
        roleId = editId;

        const prevItems = (() => {
          const raw = existingPermsQuery.data;
          const items: unknown[] = Array.isArray(raw)
            ? raw
            : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
          return items
            .filter(
              (i): i is Record<string, unknown> =>
                typeof i === "object" && i !== null,
            )
            .map((i) => {
              const nested =
                typeof i.permission === "object" && i.permission !== null
                  ? (i.permission as Record<string, unknown>)
                  : null;
              return {
                assignId: String(i.id ?? ""),
                permissionId: String(nested?.id ?? i.permissionId ?? i.permission_id ?? ""),
              };
            })
            .filter((i) => i.permissionId);
        })();

        const toAdd = selectedPermissionIds.filter(
          (pid) => !prevItems.some((p) => p.permissionId === pid),
        );
        const toRemove = prevItems.filter(
          (p) => !selectedPermissionIds.includes(p.permissionId),
        );

        await Promise.all([
          ...toAdd.map((permissionId) =>
            assignPermMutation.mutateAsync({ roleId, permissionId }),
          ),
          ...toRemove.map((p) => removePermMutation.mutateAsync(p.assignId)),
        ]);

        toast.success("Role updated.");
      } else {
        const result = await createRole.mutateAsync(payload);
        roleId = String((result as Record<string, unknown>)?.id ?? "");

        if (roleId && selectedPermissionIds.length > 0) {
          await Promise.all(
            selectedPermissionIds.map((permissionId) =>
              assignPermMutation.mutateAsync({ roleId, permissionId }),
            ),
          );
        }

        toast.success("Role created.");
      }

      await queryClient.invalidateQueries({ queryKey: ["roles", "list"] });
      navigate("/dashboard/rbac/roles", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && (roleQuery.isLoading || existingPermsQuery.isLoading)) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading role…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Role" : "Create Role"}
      subtitle={
        isEdit
          ? "Update role details and permission assignments."
          : "Define a new RBAC role and assign permissions."
      }
      onBack={() => navigate("/dashboard/rbac/roles")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <FormSection title="Role Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Role Name"
                required
                hint="Uppercase — e.g. PRODUCT_MANAGER"
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  onBlur={autoSlug}
                  placeholder="PRODUCT_MANAGER"
                  className={`${inputCls} font-mono uppercase`}
                  style={{ textTransform: "uppercase" }}
                />
              </FormField>
              <FormField label="Slug" required hint="Auto-filled from name">
                <input
                  type="text"
                  value={form.slug}
                  onChange={set("slug")}
                  placeholder="product-manager"
                  className={`${inputCls} font-mono`}
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={set("description")}
                placeholder="Describe what this role can do…"
                rows={2}
                className={`${inputCls} h-auto resize-none py-3`}
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Sort Order">
                <input
                  type="number"
                  min="1"
                  value={form.sortOrder}
                  onChange={set("sortOrder")}
                  placeholder="Optional"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Status">
                <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 transition-colors hover:bg-[#f9f9f9]">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                      form.isActive
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : "border-[#d2d2d7] bg-white"
                    }`}
                  >
                    {form.isActive && (
                      <Check size={11} strokeWidth={3} className="text-white" />
                    )}
                  </div>
                  <span className="text-sm text-[#1d1d1f]">Active</span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isActive: e.target.checked }))
                    }
                    className="sr-only"
                  />
                </label>
              </FormField>
            </div>
            <FormActions
              submitLabel={
                isSaving ? "Saving…" : isEdit ? "Update Role" : "Create Role"
              }
              submitIcon={
                isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : undefined
              }
              isSubmitting={isSaving}
              onCancel={() => navigate("/dashboard/rbac/roles")}
            />
          </FormSection>

          <div className="xl:sticky xl:top-[76px]">
            <FormSection
              title="Assigned Permissions"
              description="Select which permissions this role grants. Permissions are grouped by module."
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPermissionIds(allPermissionIds)}
                    className="text-[11px] font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)] disabled:opacity-40"
                    disabled={allPermissionIds.length === 0}
                  >
                    Select all
                  </button>
                  <span className="text-[#d2d2d7]">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPermissionIds([])}
                    className="text-[11px] font-medium text-[#86868b] transition-colors hover:text-[#1d1d1f] disabled:opacity-40"
                    disabled={selectedPermissionIds.length === 0}
                  >
                    Clear all
                  </button>
                </div>
              }
            >
              <PermissionPicker
                selectedIds={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
                onAllIds={setAllPermissionIds}
              />
            </FormSection>
          </div>
        </div>
      </form>
    </ModernFormLayout>
  );
};
