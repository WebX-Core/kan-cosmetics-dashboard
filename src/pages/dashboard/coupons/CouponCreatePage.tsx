import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { commerceApi } from "@/features/commerce";
import { catalogApi } from "@/features/catalog";
import { marketingApi } from "@/features/marketing";

const inputClass = "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

type Option = Readonly<{ id: string; label: string; detail?: string }>;
const records = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (!payload || typeof payload !== "object") return [];
  for (const value of Object.values(payload as Record<string, unknown>)) { const found = records(value); if (found.length) return found; }
  return [];
};
const options = (payload: unknown, fallback: string): Option[] => records(payload).map((row) => ({ id: String(row.id ?? ""), label: String(row.title ?? row.name ?? row.code ?? [row.firstname, row.lastname].filter(Boolean).join(" ") ?? fallback), detail: typeof row.email === "string" ? row.email : undefined })).filter((item) => item.id);
const csv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

const MultiSelect: React.FC<{ label: string; value: string; choices: Option[]; onChange: (value: string) => void; required?: boolean; loading?: boolean }> = ({ label, value, choices, onChange, required, loading }) => {
  const [search, setSearch] = React.useState("");
  const selected = csv(value);
  const filtered = choices.filter((item) => `${item.label} ${item.detail ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id).join(", ") : [...selected, id].join(", "));
  return <FormField label={label} required={required}><div className="rounded-xl border border-gray-200 bg-white p-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} className="mb-2 h-9 w-full rounded-lg bg-[#f5f5f7] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/10"/><div className="max-h-44 space-y-1 overflow-auto">{loading ? <p className="px-2 py-3 text-xs text-[#86868b]">Loading...</p> : filtered.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-[#f5f5f7]"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span className="min-w-0"><span className="block truncate text-sm text-[#1d1d1f]">{item.label}</span>{item.detail ? <span className="block truncate text-xs text-[#86868b]">{item.detail}</span> : null}</span></label>)}</div>{selected.length ? <p className="mt-2 text-xs font-medium text-[var(--primary)]">{selected.length} selected</p> : <p className="mt-2 text-xs text-[#86868b]">No restriction selected</p>}</div></FormField>;
};

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
  issueOnSignup: z.boolean().optional(),
  campaignId: z.string().trim().optional(),
  eligibleCustomerIds: z.string().optional(),
  categoryIds: z.string().optional(),
  subcategoryIds: z.string().optional(),
  productIds: z.string().optional(),
  productVariantIds: z.string().optional(),
  sortOrder: z.coerce.number().int().min(1).optional(),
});

type Form = {
  code: string; title: string; description: string;
  discountType: "PERCENTAGE" | "FLAT"; discountValue: string;
  minimumOrderAmount: string; maximumDiscountAmount: string;
  usageLimit: string; perUserUsageLimit: string;
  startsAt: string; expiresAt: string;
  isActive: boolean; appliesToAllUsers: boolean; firstSignupOnly: boolean; issueOnSignup: boolean;
  campaignId: string; eligibleCustomerIds: string; categoryIds: string; subcategoryIds: string; productIds: string; productVariantIds: string; sortOrder: string;
};

const initial: Form = {
  code: "", title: "", description: "", discountType: "FLAT", discountValue: "",
  minimumOrderAmount: "", maximumDiscountAmount: "", usageLimit: "",
  perUserUsageLimit: "", startsAt: "", expiresAt: "",
  isActive: true, appliesToAllUsers: true, firstSignupOnly: false, issueOnSignup: false,
  campaignId: "", eligibleCustomerIds: "", categoryIds: "", subcategoryIds: "", productIds: "", productVariantIds: "", sortOrder: "1",
};

export const CouponCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const getQuery = commerceApi.coupons.crud.hooks.useGet(id, isEdit);
  const createMutation = commerceApi.coupons.crud.hooks.useCreate();
  const updateMutation = commerceApi.coupons.crud.hooks.useUpdate();
  const customersQuery = useQuery({ queryKey: ["coupon-form", "customers"], queryFn: () => commerceApi.customers.getAll({ page: 1, limit: 1000 }) });
  const categoriesQuery = catalogApi.categories.hooks.useList({ page: 1, limit: 1000 });
  const subcategoriesQuery = catalogApi.subcategories.hooks.useList({ page: 1, limit: 1000 });
  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 });
  const variantsQuery = catalogApi.productVariants.hooks.useList({ page: 1, limit: 1000 });
  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 1000 });

  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    const s = (k: string) => (typeof r[k] === "string" ? String(r[k]) : "");
    const n = (k: string) => (r[k] != null ? String(r[k]) : "");
    const scopes = Array.isArray(r.scopes) ? r.scopes.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null) : [];
    const scopedIds = (type: string) => scopes.filter((entry) => entry.scopeType === type).map((entry) => String(entry.targetId ?? "")).filter(Boolean).join(", ");
    setForm({
      code: s("code"), title: s("title"), description: s("description"),
      discountType: (s("discountType") as "PERCENTAGE" | "FLAT") || "FLAT",
      discountValue: n("discountValue"),
      minimumOrderAmount: n("minimumOrderAmount"), maximumDiscountAmount: n("maximumDiscountAmount"),
      usageLimit: n("usageLimit"), perUserUsageLimit: n("perUserUsageLimit"),
      startsAt: s("startsAt").slice(0, 16), expiresAt: s("expiresAt").slice(0, 16),
      isActive: Boolean(r.isActive ?? true), appliesToAllUsers: Boolean(r.appliesToAllUsers ?? true),
      firstSignupOnly: Boolean(r.firstSignupOnly), issueOnSignup: Boolean(r.issueOnSignup),
      campaignId: typeof (r.campaign as Record<string, unknown> | undefined)?.id === "string" ? String((r.campaign as Record<string, unknown>).id) : s("campaignId"),
      eligibleCustomerIds: Array.isArray(r.eligibleCustomerIds) ? r.eligibleCustomerIds.join(", ") : "",
      categoryIds: scopedIds("CATEGORY"), subcategoryIds: scopedIds("SUBCATEGORY"), productIds: scopedIds("PRODUCT"), productVariantIds: scopedIds("PRODUCT_VARIANT"), sortOrder: n("sortOrder") || "1",
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;
    const ids = (value?: string) => value?.split(",").map((entry) => entry.trim()).filter(Boolean);

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
      issueOnSignup: parsed.issueOnSignup,
      campaignId: parsed.campaignId || undefined,
      sortOrder: parsed.sortOrder,
      eligibleCustomerIds: parsed.appliesToAllUsers ? undefined : ids(parsed.eligibleCustomerIds),
      categoryIds: ids(parsed.categoryIds),
      subcategoryIds: ids(parsed.subcategoryIds),
      productIds: ids(parsed.productIds),
      productVariantIds: ids(parsed.productVariantIds),
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
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
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
            {(["isActive", "appliesToAllUsers", "firstSignupOnly", "issueOnSignup"] as const).map((key) => {
              const labels: Record<typeof key, string> = {
                isActive: "Active",
                appliesToAllUsers: "Applies to all users",
                firstSignupOnly: "First signup only",
                issueOnSignup: "Issue on signup",
              };
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => up(key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]"
                  />
                  <span className="text-sm font-medium text-gray-700">{labels[key]}</span>
                </label>
              );
            })}
          </div>
          {!form.appliesToAllUsers ? <MultiSelect label="Eligible Customers" value={form.eligibleCustomerIds} onChange={(value) => up("eligibleCustomerIds", value)} choices={options(customersQuery.data, "Customer")} loading={customersQuery.isLoading} required /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email Campaign"><select value={form.campaignId} onChange={(e) => up("campaignId", e.target.value)} className={inputClass}><option value="">No campaign</option>{options(campaignsQuery.data?.data, "Campaign").map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></FormField>
            <FormField label="Sort Order"><input type="number" min="1" value={form.sortOrder} onChange={(e) => up("sortOrder", e.target.value)} className={inputClass} /></FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <MultiSelect label="Categories" value={form.categoryIds} onChange={(value) => up("categoryIds", value)} choices={options(categoriesQuery.data?.data, "Category")} loading={categoriesQuery.isLoading} />
            <MultiSelect label="Subcategories" value={form.subcategoryIds} onChange={(value) => up("subcategoryIds", value)} choices={options(subcategoriesQuery.data?.data, "Subcategory")} loading={subcategoriesQuery.isLoading} />
            <MultiSelect label="Products" value={form.productIds} onChange={(value) => up("productIds", value)} choices={options(productsQuery.data?.data, "Product")} loading={productsQuery.isLoading} />
            <MultiSelect label="Product Variants" value={form.productVariantIds} onChange={(value) => up("productVariantIds", value)} choices={options(variantsQuery.data?.data, "Variant")} loading={variantsQuery.isLoading} />
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
