import React from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useSignup } from "@/features/auth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { Button } from "@/shared/components/ui/button";

const schema = z.object({
  firstname: z.string().min(1),
  middlename: z.string().optional(),
  lastname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(8),
  address: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  selectedRole: z.enum(["SUDOADMIN", "ADMIN", "USER"]),
  isVerified: z.boolean().default(true),
  sortOrder: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  profile: z.instanceof(File).nullable().optional(),
});

type FormValues = z.input<typeof schema>;

const roleIdFromEnv = (role: "SUDOADMIN" | "ADMIN" | "USER"): string | null => {
  const map = {
    SUDOADMIN: (import.meta.env.VITE_ROLE_ID_SUDOADMIN as string | undefined)?.trim(),
    ADMIN: (import.meta.env.VITE_ROLE_ID_ADMIN as string | undefined)?.trim(),
    USER: (import.meta.env.VITE_ROLE_ID_USER as string | undefined)?.trim(),
  } as const;
  const value = map[role];
  return value && value.length > 0 ? value : null;
};

export const SignupPage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const signup = useSignup();
  const [values, setValues] = React.useState<FormValues>({
    firstname: "",
    middlename: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    gender: "MALE",
    selectedRole: "USER",
    isVerified: true,
    sortOrder: "",
    profile: null,
  });
  const [showPassword, setShowPassword] = React.useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    const roleId = roleIdFromEnv(parsed.data.selectedRole);
    if (!roleId) {
      toast.error(`Missing role id env for ${parsed.data.selectedRole}. Set VITE_ROLE_ID_${parsed.data.selectedRole}.`);
      return;
    }

    const { selectedRole, ...dto } = parsed.data;

    try {
      await signup.mutateAsync({
        ...dto,
        roleIds: [roleId],
        profile: parsed.data.profile ?? null,
      });
      toast.success("User created");
      nav("/dashboard/users", { replace: true });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Create Admin User</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input placeholder="First name" value={values.firstname} onChange={(e) => setValues((p) => ({ ...p, firstname: e.target.value }))} />
        <input placeholder="Middle name" value={values.middlename ?? ""} onChange={(e) => setValues((p) => ({ ...p, middlename: e.target.value }))} />
        <input placeholder="Last name" value={values.lastname} onChange={(e) => setValues((p) => ({ ...p, lastname: e.target.value }))} />
        <input placeholder="Email" value={values.email} onChange={(e) => setValues((p) => ({ ...p, email: e.target.value }))} />
        <input placeholder="Phone" value={values.phone} onChange={(e) => setValues((p) => ({ ...p, phone: e.target.value }))} />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={values.password}
            onChange={(e) => setValues((p) => ({ ...p, password: e.target.value }))}
            style={{ width: "100%", paddingRight: 34 }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 border-none bg-transparent p-0 text-[var(--muted)] shadow-none hover:bg-transparent"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
        <input placeholder="Address" value={values.address} onChange={(e) => setValues((p) => ({ ...p, address: e.target.value }))} />
        <select value={values.gender} onChange={(e) => setValues((p) => ({ ...p, gender: e.target.value as FormValues["gender"] }))}>
          <option value="MALE">MALE</option><option value="FEMALE">FEMALE</option><option value="OTHER">OTHER</option>
        </select>
        <select value={values.selectedRole} onChange={(e) => setValues((p) => ({ ...p, selectedRole: e.target.value as FormValues["selectedRole"] }))}>
          <option value="USER">USER</option><option value="ADMIN">ADMIN</option><option value="SUDOADMIN">SUDOADMIN</option>
        </select>
        <label><input type="checkbox" checked={Boolean(values.isVerified)} onChange={(e) => setValues((p) => ({ ...p, isVerified: e.target.checked }))} /> Verified</label>
        <input type="file" accept="image/*" onChange={(e) => setValues((p) => ({ ...p, profile: e.target.files?.[0] ?? null }))} />
        <button type="submit" disabled={signup.isPending}>{signup.isPending ? "Saving..." : "Create"}</button>
      </form>
    </div>
  );
};
