import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { commerceApi } from "@/features/commerce";

const inputClass = "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const schema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FLAT"]),
  discountValue: z.coerce.number().min(0, "Must be ≥ 0"),
  minimumOrderAmount: z.coerce.number().optional(),
  maximumDiscountAmount: z.coerce.number().optional(),
  usageLimit: z.coerce.number().optional(),
  perUserUsageLimit: z.coerce.number().optional(),
  startsAt: z.string().min(1, "Start date required"),
  expiresAt: z.string().min(1, "Expiry date required"),
  isActive: z.boolean().optional(),
  appliesToAllUsers: z.boolean().optional(),
  firstSignupOnly: z.boolean().optional(),
  sortOrder: z.coerce.number().optional(),
});

type Form = {
  code: string; title: string; description: string;
  discountType: "PERCENTAGE" | "FLAT"; discountValue: string;
  minimumOrderAmount: string; maximumDiscountAmount: string;
  usageLimit: string; perUserUsageLimit: string;
  startsAt: string; expiresAt: string;
  isActive: boolean; appliesToAllUsers: boolean; firstSignupOnly: boolean;
  sortOrder: string;
};

const initial: Form = {
  code: "", title: "", description: "", discountType: "FLAT", discountValue: "",
  minimumOrderAmount: "", maximumDiscountAmount: "", usageLimit: "",
  perUserUsageLimit: "", startsAt: "", expiresAt: "",
  isActive: true, appliesToAllUsers: true, firstSignupOnly: false, sortOrder: "0",
};

export const CouponCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const getQuery = commerceApi.coupons.crud.hooks.useGet(id, isEdit);
  const createMutation = commerceApi.coupons.crud.hooks.useCreate();
  const updateMutation = commerceApi.coupons.crud.hooks.useUpdate();

  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    const s = (k: string) => (typeof r[k] === "string" ? String(r[k]) : "");
    const n = (k: string) => (r[k] != null ? String(r[k]) : "");
    setForm({
      code: s("code"), title: s("title"), description: s("description"),
      discountType: (s("discountType") as "PERCENTAGE" | "FLAT") || "FLAT",
      discountValue: n("discountValue"),
      minimumOrderAmount: n("minimumOrderAmount"), maximumDiscountAmount: n("maximumDiscountAmount"),
      usageLimit: n("usageLimit"), perUserUsageLimit: n("perUserUsageLimit"),
      startsAt: s("startsAt").slice(0, 16), expiresAt: s("expiresAt").slice(0, 16),
      isActive: Boolean(r.isActive ?? true), appliesToAllUsers: Boolean(r.appliesToAllUsers ?? true),
      firstSignupOnly: Boolean(r.firstSignupOnly), sortOrder: n("sortOrder") || "0",
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;

    const payload = {
      code: parsed.code,
      title: parsed.title,
      description: parsed.description?.trim() || undefined,
      discountType: parsed.discountType,
      discountValue: parsed.discountValue,
      minimumOrderAmount: parsed.minimumOrderAmount || undefined,
      maximumDiscountAmount: parsed.maximumDiscountAmount || undefined,
      usageLimit: parsed.usageLimit || undefined,
      perUserUsageLimit: parsed.perUserUsageLimit || undefined,
      startsAt: parsed.startsAt,
      expiresAt: parsed.expiresAt,
      isActive: parsed.isActive,
      appliesToAllUsers: parsed.appliesToAllUsers,
      firstSignupOnly: parsed.firstSignupOnly,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
        toast.success("Coupon updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Coupon created");
      }
      navigate("/dashboard/coupons");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading coupon...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Coupon" : "Create Coupon"}
      subtitle={isEdit ? "Update coupon details." : "Create a new discount coupon."}
      onBack={() => navigate("/dashboard/coupons")}
    >
      <form onSubmit={onSubmit} className="space-y-8">
        <FormSection title="Coupon Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Code" required>
              <input type="text" value={form.code} placeholder="e.g. SAVE20" onChange={(e) => up("code", e.target.value.toUpperCase())} className={inputClass} />
            </FormField>
            <FormField label="Title" required>
              <input type="text" value={form.title} placeholder="e.g. 20% Off Summer Sale" onChange={(e) => up("title", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Discount Type" required>
              <select value={form.discountType} onChange={(e) => up("discountType", e.target.value as "PERCENTAGE" | "FLAT")} className={inputClass}>
                <option value="FLAT">Flat (Rs)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </FormField>
            <FormField label="Discount Value" required>
              <input type="number" min="0" value={form.discountValue} placeholder={form.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 100"} onChange={(e) => up("discountValue", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Starts At" required>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => up("startsAt", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Expires At" required>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => up("expiresAt", e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea
              value={form.description}
              placeholder="Describe this coupon..."
              onChange={(e) => up("description", e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
            />
          </FormField>
        </FormSection>

        <FormSection title="Limits & Rules">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Minimum Order Amount">
              <input type="number" min="0" value={form.minimumOrderAmount} placeholder="No minimum" onChange={(e) => up("minimumOrderAmount", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Maximum Discount Amount">
              <input type="number" min="0" value={form.maximumDiscountAmount} placeholder="No cap" onChange={(e) => up("maximumDiscountAmount", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Usage Limit (total)">
              <input type="number" min="0" value={form.usageLimit} placeholder="Unlimited" onChange={(e) => up("usageLimit", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Usage Limit Per User">
              <input type="number" min="0" value={form.perUserUsageLimit} placeholder="Unlimited" onChange={(e) => up("perUserUsageLimit", e.target.value)} className={inputClass} />
            </FormField>
            
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            {(["isActive", "appliesToAllUsers", "firstSignupOnly"] as const).map((key) => {
              const labels: Record<typeof key, string> = {
                isActive: "Active",
                appliesToAllUsers: "Applies to all users",
                firstSignupOnly: "First signup only",
              };
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => up(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#0071e3]"
                  />
                  <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                </label>
              );
            })}
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/coupons")}
        />
      </form>
    </ModernFormLayout>
  );
};
