import React from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useCreateAdminUser } from "@/features/adminUsers";
import { identityApi } from "@/features/identity";
import { FormLayout } from "@/shared/components/forms/FormLayout";
import { Button } from "@/shared/components/ui/button";
import { useEntityForm } from "@/shared/hooks/useEntityForm";
import { EntityFormRenderer, type EntityFieldConfig } from "@/shared/components/forms/EntityFormRenderer";

const e164PhoneRegex = /^\+[1-9]\d{7,14}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

const schema = z.object({
  firstname: z.string().trim().min(1, "First name is required"),
  middlename: z.string().trim().optional(),
  lastname: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Email must be valid"),
  phone: z
    .string()
    .trim()
    .regex(e164PhoneRegex, "Phone must be valid E.164 format with country code (e.g. +97798XXXXXXXX)"),
  password: z
    .string()
    .regex(
      passwordRegex,
      "Password must be at least 6 characters and include a letter, a number, and a special character",
    ),
  address: z.string().trim().min(1, "Address is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  roleId: z.string().min(1, "Role is required"),
  isVerified: z.boolean().default(true),
  profile: z.instanceof(File).nullable().optional(),
});

type FormValues = Readonly<{
  firstname: string; middlename: string; lastname: string;
  email: string; phone: string; password: string;
  address: string; gender: "MALE" | "FEMALE" | "OTHER";
  roleId: string; isVerified: boolean; profile: File | null;
}>;
type SubmitValues = z.output<typeof schema>;

type RoleOption = Readonly<{ id: string; name: string }>;

const toRoleOptions = (value: unknown): ReadonlyArray<RoleOption> => {
  const items: unknown[] = Array.isArray(value)
    ? value
    : ((value as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((i) => ({ id: String(i.id ?? ""), name: String(i.name ?? i.slug ?? i.id ?? "") }))
    .filter((i) => i.id);
};

const baseFields: ReadonlyArray<EntityFieldConfig> = [
  { name: "firstname", label: "First Name", type: "text" },
  { name: "middlename", label: "Middle Name", type: "text" },
  { name: "lastname", label: "Last Name", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "password", label: "Password", type: "password" },
  { name: "address", label: "Address", type: "text" },
  { name: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "MALE" }, { label: "Female", value: "FEMALE" }, { label: "Other", value: "OTHER" }] },
  { name: "isVerified", label: "Verified", type: "checkbox" },
  { name: "profile", label: "Profile", type: "file", accept: "image/*" },
];

export const UsersCreatePage: React.FC = () => {
  const nav = useNavigate();
  const m = useCreateAdminUser();
  const rolesQuery = identityApi.roles.hooks.useList({ limit: 200 });
  const roleOptions = React.useMemo(() => toRoleOptions(rolesQuery.data), [rolesQuery.data]);

  const fields: ReadonlyArray<EntityFieldConfig> = React.useMemo(() => [
    ...baseFields.slice(0, 8),
    {
      name: "roleId",
      label: "Role",
      type: "select",
      options: roleOptions.map((r) => ({ label: r.name, value: r.id })),
    },
    ...baseFields.slice(8),
  ], [roleOptions]);

  const form = useEntityForm<FormValues, SubmitValues>({
    schema,
    initialValues: {
      firstname: "", middlename: "", lastname: "",
      email: "", phone: "", password: "",
      address: "", gender: "MALE",
      roleId: "", isVerified: true, profile: null,
    },
    successMessage: "User created",
    onSubmit: async (p) => {
      const { roleId, ...rest } = p;
      await m.mutateAsync({ ...rest, roleIds: roleId ? [roleId] : [], profile: p.profile ?? null });
      nav("/dashboard/users", { replace: true });
    },
  });

  return (
    <FormLayout title="Create User">
      <form
        onSubmit={(e) => { e.preventDefault(); void form.submit(); }}
        style={{ display: "grid", gap: 10 }}
      >
        <EntityFormRenderer
          fields={fields}
          values={form.values as Record<string, unknown>}
          errors={form.errors}
          onFieldChange={(name, value) => form.setField(name as keyof FormValues, value as never)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onClick={() => nav("/dashboard/users")}>Cancel</Button>
        </div>
      </form>
    </FormLayout>
  );
};
