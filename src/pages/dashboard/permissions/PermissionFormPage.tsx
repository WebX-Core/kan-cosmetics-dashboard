import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { identityApi } from "@/features/identity";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const permissionSchema = z.object({
  module: z.string().trim().min(1, "Module is required"),
  action: z.string().trim().min(1, "Action is required"),
  key: z.string().trim().min(1, "Key is required"),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().optional(),
});

type PermForm = {
  module: string;
  action: string;
  key: string;
  description: string;
  isActive: boolean;
  sortOrder: string;
};

const initial: PermForm = {
  module: "",
  action: "read",
  key: "",
  description: "",
  isActive: true,
  sortOrder: "",
};

const COMMON_ACTIONS = ["read", "create", "update", "delete", "manage", "export", "import"];

export const PermissionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = identityApi.permissions.hooks.useGet(id, isEdit);
  const createMutation = identityApi.permissions.hooks.useCreate();
  const updateMutation = identityApi.permissions.hooks.useUpdate();

  const [form, setForm] = React.useState<PermForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({
      module: read(r.module),
      action: read(r.action) || "read",
      key: read(r.key),
      description: read(r.description),
      isActive: r.isActive !== false,
      sortOrder: typeof r.sortOrder === "number" ? String(r.sortOrder) : "",
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof PermForm>(k: K, v: PermForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const autoKey = () => {
    if (form.module && form.action && !form.key) {
      up("key", `${form.module.toLowerCase().replace(/\s+/g, "-")}.${form.action.toLowerCase()}`);
    }
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(permissionSchema, form, toast);
    if (!parsed) return;

    const payload = {
      module: parsed.module,
      action: parsed.action,
      key: parsed.key,
      description: parsed.description?.trim() || undefined,
      isActive: parsed.isActive,
      sortOrder: parsed.sortOrder,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Permission updated." : "Permission created.");
      navigate("/dashboard/rbac/permissions", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading permission...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Permission" : "New Permission"}
      subtitle={isEdit ? "Update permission details." : "Define a new granular permission key."}
      onBack={() => navigate("/dashboard/rbac/permissions")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Permission Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Module" required hint="e.g. products, orders, users">
              <input
                type="text"
                value={form.module}
                placeholder="products"
                onChange={(e) => up("module", e.target.value)}
                onBlur={autoKey}
                className={inputClass}
              />
            </FormField>
            <FormField label="Action" required>
              <select
                value={form.action}
                onChange={(e) => {
                  up("action", e.target.value);
                }}
                onBlur={autoKey}
                className={inputClass}
              >
                {COMMON_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
                <option value="custom">custom…</option>
              </select>
            </FormField>
          </div>

          <FormField label="Key" required hint="Auto-filled from module.action — edit if needed">
            <input
              type="text"
              value={form.key}
              placeholder="products.create"
              onChange={(e) => up("key", e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </FormField>

          <FormField label="Description">
            <input
              type="text"
              value={form.description}
              placeholder="Can create new products"
              onChange={(e) => up("description", e.target.value)}
              className={inputClass}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sort Order">
              <input
                type="number"
                value={form.sortOrder}
                placeholder="0"
                min={0}
                onChange={(e) => up("sortOrder", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Status">
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => up("isActive", e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <span className="text-[14px] text-[#1d1d1f]">Active</span>
              </label>
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Permission" : "Create Permission"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/rbac/permissions")}
        />
      </form>
    </ModernFormLayout>
  );
};
