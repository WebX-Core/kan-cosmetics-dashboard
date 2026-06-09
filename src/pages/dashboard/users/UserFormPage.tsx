import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Camera, Check, ChevronDown, X, Eye, EyeOff } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { adminUsersApi } from "@/features/adminUsers/adminUsers.api";
import { useAdminUsersGet } from "@/features/adminUsers";
import { identityApi } from "@/features/identity";

// ── constants ──────────────────────────────────────────────────────────────

const E164 = /^\+[1-9]\d{7,14}$/;
const PWD = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

const createSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required"),
  middlename: z.string().trim().optional(),
  lastname: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(E164, "Use E.164 format — e.g. +97798XXXXXXXX"),
  password: z.string().regex(PWD, "Min 6 chars with at least one letter, number, and special character"),
  address: z.string().trim().min(1, "Address is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  isVerified: z.boolean().default(true),
});

const editSchema = createSchema.omit({ password: true });

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:bg-[#f5f5f7] disabled:text-[#86868b]";

const selectCls = `${inputCls} appearance-none pr-9 cursor-pointer`;

// ── role picker ────────────────────────────────────────────────────────────

const RolePicker: React.FC<{
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ selectedIds, onChange }) => {
  const q = identityApi.roles.hooks.useList({ limit: 200 });
  const roles = React.useMemo(() => {
    const raw = q.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    return items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((r) => ({ id: String(r.id ?? ""), name: String(r.name ?? "") }))
      .filter((r) => r.id);
  }, [q.data]);

  const selectedId = selectedIds[0] ?? "";

  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
        className="h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:bg-[#f5f5f7]"
        disabled={q.isLoading}
      >
        <option value="">— No role —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
    </div>
  );
};

// ── permission matrix ──────────────────────────────────────────────────────

type CrudCol = "create" | "edit" | "view" | "delete";
type PermRow = Readonly<{ id: string; module: string; action: string }>;

const toCrudCol = (action: string): CrudCol | null => {
  const a = action.trim().toUpperCase();
  if (a === "CREATE") return "create";
  if (a === "EDIT" || a === "UPDATE") return "edit";
  if (a === "VIEW") return "view";
  if (a === "DELETE") return "delete";
  return null;
};

const PermissionMatrix: React.FC<{
  roleId: string;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}> = ({ roleId, selected, onChange }) => {
  const rolePermsQuery = useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () =>
      identityApi.rolePermissions.listByRole(
        roleId as `${string}-${string}-${string}-${string}-${string}`,
      ),
    enabled: roleId.length > 0,
  });

  const rows: PermRow[] = React.useMemo(() => {
    const raw = rolePermsQuery.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    return items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((item) => {
        const p = (typeof item.permission === "object" && item.permission !== null
          ? item.permission : item) as Record<string, unknown>;
        return {
          id: String(p.id ?? item.permissionId ?? ""),
          module: String(p.module ?? ""),
          action: String(p.action ?? ""),
        };
      })
      .filter((p) => p.id && p.module);
  }, [rolePermsQuery.data]);

  const matrix = React.useMemo(() => {
    const map = new Map<string, Record<CrudCol, string[]>>();
    for (const row of rows) {
      const col = toCrudCol(row.action);
      if (!col) continue;
      const cur = map.get(row.module) ?? { create: [], edit: [], view: [], delete: [] };
      map.set(row.module, { ...cur, [col]: [...cur[col], row.id] });
    }
    return Array.from(map.entries())
      .map(([module, cols]) => ({ module, cols }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [rows]);

  const toggle = (ids: string[]) => {
    if (!ids.length) return;
    const next = new Set(selected);
    const shouldSelect = !ids.every((id) => next.has(id));
    ids.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  if (!roleId) {
    return (
      <p className="py-3 text-[13px] text-[#86868b]">
        Assign a role above to configure permissions.
      </p>
    );
  }

  if (rolePermsQuery.isLoading) {
    return (
      <p className="flex items-center gap-2 py-3 text-[13px] text-[#86868b]">
        <Loader2 size={13} className="animate-spin" /> Loading permissions…
      </p>
    );
  }

  if (!matrix.length) {
    return (
      <p className="py-3 text-[13px] text-[#86868b]">
        The selected role has no permissions configured.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8e8ed]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#e8e8ed] bg-[#f9f9f9]">
            <th className="px-4 py-2.5 text-left font-medium text-[#6e6e73]">Module</th>
            {(["create", "edit", "view", "delete"] as const).map((col) => (
              <th key={col} className="px-3 py-2.5 text-center font-medium capitalize text-[#6e6e73]">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map(({ module, cols }) => (
            <tr key={module} className="border-b border-[#f0f0f2] last:border-0">
              <td className="px-4 py-2.5 font-medium text-[#1d1d1f]">{module}</td>
              {(["create", "edit", "view", "delete"] as const).map((col) => (
                <td key={col} className="px-3 py-2.5 text-center">
                  {cols[col].length > 0 ? (
                    <label className="inline-flex cursor-pointer items-center justify-center">
                      <div
                        className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border-2 transition-colors ${
                          cols[col].every((id) => selected.has(id))
                            ? "border-[var(--primary)] bg-[var(--primary)]"
                            : "border-[#d2d2d7] bg-white"
                        }`}
                      >
                        {cols[col].every((id) => selected.has(id)) && (
                          <Check size={9} strokeWidth={3} className="text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={cols[col].every((id) => selected.has(id))}
                        onChange={() => toggle(cols[col])}
                      />
                    </label>
                  ) : (
                    <span className="text-[#d2d2d7]">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── profile upload ─────────────────────────────────────────────────────────

const ProfileUpload: React.FC<{
  file: File | null;
  existingUrl?: string | null;
  onChange: (f: File | null) => void;
  onRemoveExisting: () => void;
}> = ({ file, existingUrl, onChange, onRemoveExisting }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : existingUrl ?? null;

  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => ref.current?.click()}
        className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] transition-colors hover:border-[var(--primary)] hover:bg-[#f0f7ff]"
      >
        {preview ? (
          <>
            <img src={preview} alt="Profile" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
              <Camera size={18} className="text-white" />
            </div>
          </>
        ) : (
          <Camera size={20} className="text-[#86868b]" />
        )}
      </div>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          <Camera size={13} /> {preview ? "Change photo" : "Upload photo"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => { onChange(null); onRemoveExisting(); }}
            className="flex h-8 items-center gap-1 text-xs text-red-600 hover:underline"
          >
            <X size={11} /> Remove
          </button>
        )}
        <p className="text-[11px] text-[#86868b]">JPG, PNG or WebP · max 5 MB</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
};

// ── helpers ────────────────────────────────────────────────────────────────

const extractPermIdsFromRolePerms = (raw: unknown): string[] => {
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((i) => {
      const p = (typeof i.permission === "object" && i.permission !== null
        ? i.permission
        : i) as Record<string, unknown>;
      return String(p.id ?? i.permissionId ?? "");
    })
    .filter(Boolean);
};

// ── main page ──────────────────────────────────────────────────────────────

type FormState = {
  firstname: string; middlename: string; lastname: string;
  email: string; phone: string; password: string;
  address: string; gender: "MALE" | "FEMALE" | "OTHER";
  isVerified: boolean;
};

const INITIAL: FormState = {
  firstname: "", middlename: "", lastname: "",
  email: "", phone: "", password: "",
  address: "", gender: "MALE", isVerified: true,
};

export const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [profileFile, setProfileFile] = React.useState<File | null>(null);
  const [removeExistingProfile, setRemoveExistingProfile] = React.useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([]);
  const [selectedPermIds, setSelectedPermIds] = React.useState<Set<string>>(new Set());
  const [showPwd, setShowPwd] = React.useState(false);
  const [userChangedRole, setUserChangedRole] = React.useState(false);

  const userQuery = useAdminUsersGet(id, isEdit);

  const existingRolesQuery = useQuery({
    queryKey: ["userRoles", id],
    queryFn: () => identityApi.userRoles.listByUser(id!),
    enabled: isEdit && Boolean(id),
  });

  const existingPermsQuery = useQuery({
    queryKey: ["user-permissions", id],
    queryFn: () => identityApi.userPermissions.listByUser(id!),
    enabled: isEdit && Boolean(id),
  });

  const roleId = selectedRoleIds[0] ?? "";

  const rolePermsQuery = useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () =>
      identityApi.rolePermissions.listByRole(
        roleId as `${string}-${string}-${string}-${string}-${string}`,
      ),
    enabled: roleId.length > 0,
    staleTime: 60_000,
  });

  // Auto-select all role permissions when role is picked:
  // - on create: always
  // - on edit: only when the user explicitly changed the role
  React.useEffect(() => {
    if (!roleId || !rolePermsQuery.data) return;
    if (isEdit && !userChangedRole) return;
    setSelectedPermIds(new Set(extractPermIdsFromRolePerms(rolePermsQuery.data)));
  }, [roleId, rolePermsQuery.data, isEdit, userChangedRole]);

  React.useEffect(() => {
    if (!isEdit || !userQuery.data) return;
    const u = userQuery.data;
    setForm({
      firstname: u.firstname ?? "",
      middlename: u.middlename ?? "",
      lastname: u.lastname ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      password: "",
      address: u.address ?? "",
      gender: (u.gender as "MALE" | "FEMALE" | "OTHER") ?? "MALE",
      isVerified: Boolean(u.isVerified),
    });
  }, [userQuery.data, isEdit]);

  React.useEffect(() => {
    if (!isEdit || !existingRolesQuery.data) return;
    const raw = existingRolesQuery.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    const ids = items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((i) => String(i.roleId ?? i.role_id ?? ""))
      .filter(Boolean);
    setSelectedRoleIds(ids);
  }, [existingRolesQuery.data, isEdit]);

  React.useEffect(() => {
    if (!isEdit || !existingPermsQuery.data) return;
    const raw = existingPermsQuery.data;
    const items: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    const ids = items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((i) => {
        const p = (typeof i.permission === "object" && i.permission !== null ? i.permission : i) as Record<string, unknown>;
        return String(p.id ?? i.permissionId ?? "");
      })
      .filter(Boolean);
    setSelectedPermIds(new Set(ids));
  }, [existingPermsQuery.data, isEdit]);

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof adminUsersApi.create>[0]) => adminUsersApi.create(payload),
  });
  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof adminUsersApi.update>[1] }) =>
      adminUsersApi.update(userId as `${string}-${string}-${string}-${string}-${string}`, payload),
  });

  const set = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = (): boolean => {
    const schema = isEdit ? editSchema : createSchema;
    const result = schema.safeParse(form);
    if (result.success) { setErrors({}); return true; }
    const errs: Partial<Record<keyof FormState, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FormState;
      if (!errs[key]) errs[key] = issue.message;
    }
    setErrors(errs);
    return false;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!validate()) return;

    const permissionIds = Array.from(selectedPermIds);

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          userId: id,
          payload: {
            firstname: form.firstname,
            middlename: form.middlename || undefined,
            lastname: form.lastname,
            email: form.email,
            phone: form.phone,
            address: form.address,
            gender: form.gender,
            isVerified: form.isVerified,
            roleIds: selectedRoleIds,
            permissionIds,
            profile: profileFile,
            removeProfile: removeExistingProfile && !profileFile ? true : undefined,
          },
        });
        toast.success("User updated.");
      } else {
        await createMutation.mutateAsync({
          firstname: form.firstname,
          middlename: form.middlename || undefined,
          lastname: form.lastname,
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
          gender: form.gender,
          isVerified: form.isVerified,
          roleIds: selectedRoleIds,
          permissionIds: permissionIds.length > 0 ? permissionIds : undefined,
          profile: profileFile,
        });
        toast.success("User created.");
      }

      navigate("/dashboard/users", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const profileUrl = React.useMemo(() => {
    const u = userQuery.data as Record<string, unknown> | undefined;
    if (!u) return null;
    return (
      (typeof u.profileUrl === "string" && u.profileUrl) ||
      (typeof u.profilePicture === "string" && u.profilePicture) ||
      (typeof u.profile === "string" && u.profile) ||
      null
    );
  }, [userQuery.data]);

  if (isEdit && userQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading user…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit User" : "Create User"}
      subtitle={isEdit ? "Update account details, role, and permissions." : "Create a new admin user account."}
      onBack={() => navigate("/dashboard/users")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

        <FormSection title="Personal Information">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="First Name" required error={errors.firstname}>
              <input type="text" value={form.firstname} onChange={set("firstname")} placeholder="Jane" className={inputCls} />
            </FormField>
            <FormField label="Middle Name" error={errors.middlename}>
              <input type="text" value={form.middlename} onChange={set("middlename")} placeholder="Optional" className={inputCls} />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Last Name" required error={errors.lastname}>
              <input type="text" value={form.lastname} onChange={set("lastname")} placeholder="Doe" className={inputCls} />
            </FormField>
            <FormField label="Gender" required error={errors.gender}>
              <div className="relative">
                <select value={form.gender} onChange={set("gender")} className={selectCls}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              </div>
            </FormField>
          </div>
          <FormField label="Address" required error={errors.address}>
            <input type="text" value={form.address} onChange={set("address")} placeholder="Kathmandu, Nepal" className={inputCls} />
          </FormField>
        </FormSection>

        <FormSection title="Contact & Login">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" className={inputCls} />
            </FormField>
            <FormField label="Phone" required error={errors.phone} hint="E.164 format — e.g. +97798XXXXXXXX">
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+97798XXXXXXXX" className={inputCls} />
            </FormField>
          </div>
          {!isEdit && (
            <FormField label="Password" required error={errors.password} hint="Min 6 chars with a letter, number, and special character">
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] transition-colors hover:text-[#1d1d1f]"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormField>
          )}
        </FormSection>

        <FormSection title="Account Settings">
          <FormField label="Verification">
            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 transition-colors hover:bg-[#f9f9f9]">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${form.isVerified ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[#d2d2d7] bg-white"}`}>
                {form.isVerified && <Check size={11} strokeWidth={3} className="text-white" />}
              </div>
              <span className="text-sm text-[#1d1d1f]">Mark as verified</span>
              <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm((p) => ({ ...p, isVerified: e.target.checked }))} className="sr-only" />
            </label>
          </FormField>
        </FormSection>

        <FormSection title="Profile Photo">
          <ProfileUpload
            file={profileFile}
            existingUrl={removeExistingProfile ? null : profileUrl}
            onChange={setProfileFile}
            onRemoveExisting={() => setRemoveExistingProfile(true)}
          />
        </FormSection>

        <FormSection
          title="Role"
          description="Controls what this user can access. Permissions below are scoped to the selected role."
        >
          <RolePicker selectedIds={selectedRoleIds} onChange={(ids) => {
            setSelectedRoleIds(ids);
            setSelectedPermIds(new Set());
            setUserChangedRole(true);
          }} />
        </FormSection>

        <FormSection
          title="Permissions"
          description="Fine-tune which actions within the role this user can perform."
          action={
            roleId ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (rolePermsQuery.data)
                      setSelectedPermIds(new Set(extractPermIdsFromRolePerms(rolePermsQuery.data)));
                  }}
                  className="text-[11px] font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
                >
                  Select all
                </button>
                <span className="text-[#d2d2d7]">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedPermIds(new Set())}
                  disabled={selectedPermIds.size === 0}
                  className="text-[11px] font-medium text-[#86868b] transition-colors hover:text-[#1d1d1f] disabled:opacity-40"
                >
                  Clear all
                </button>
              </div>
            ) : null
          }
        >
          <PermissionMatrix
            roleId={roleId}
            selected={selectedPermIds}
            onChange={setSelectedPermIds}
          />
        </FormSection>

        <FormActions
          submitLabel={isSaving ? "Saving…" : isEdit ? "Update User" : "Create User"}
          submitIcon={isSaving ? <Loader2 size={13} className="animate-spin" /> : undefined}
          isSubmitting={isSaving}
          onCancel={() => navigate("/dashboard/users")}
        />
      </form>
    </ModernFormLayout>
  );
};
