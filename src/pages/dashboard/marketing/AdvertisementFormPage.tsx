import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const adSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  image: z.string().trim().min(1, "Image URL is required"),
  targetType: z.string().trim().min(1, "Target type is required"),
  targetMode: z.string().trim().min(1, "Target mode is required"),
  season: z.string().trim().optional(),
  date: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().optional(),
  categoryId: z.string().trim().optional(),
  subcategoryId: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  targetIds: z.string().trim().optional(),
});

type AdForm = {
  title: string;
  image: string;
  targetType: string;
  targetMode: string;
  season: string;
  date: string;
  sortOrder: string;
  categoryId: string;
  subcategoryId: string;
  productId: string;
  targetIds: string;
};

const initial: AdForm = {
  title: "",
  image: "",
  targetType: "global",
  targetMode: "banner",
  season: "",
  date: "",
  sortOrder: "",
  categoryId: "",
  subcategoryId: "",
  productId: "",
  targetIds: "",
};

export const AdvertisementFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.advertisements.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.advertisements.hooks.useCreate();
  const updateMutation = marketingApi.advertisements.hooks.useUpdate();

  const [form, setForm] = React.useState<AdForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    const targetIds = Array.isArray(r.targetIds) ? (r.targetIds as string[]).join(", ") : read(r.targetIds);
    setForm({
      title: read(r.title),
      image: read(r.image),
      targetType: read(r.targetType) || "global",
      targetMode: read(r.targetMode) || "banner",
      season: read(r.season),
      date: read(r.date).slice(0, 10),
      sortOrder: typeof r.sortOrder === "number" ? String(r.sortOrder) : "",
      categoryId: read(r.categoryId),
      subcategoryId: read(r.subcategoryId),
      productId: read(r.productId),
      targetIds,
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof AdForm>(k: K, v: AdForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(adSchema, form, toast);
    if (!parsed) return;

    const rawTargetIds = parsed.targetIds?.trim();
    const targetIds = rawTargetIds
      ? rawTargetIds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const payload = {
      title: parsed.title,
      image: parsed.image,
      targetType: parsed.targetType,
      targetMode: parsed.targetMode,
      season: parsed.season?.trim() || undefined,
      date: parsed.date?.trim() || undefined,
      sortOrder: parsed.sortOrder,
      categoryId: parsed.categoryId?.trim() || undefined,
      subcategoryId: parsed.subcategoryId?.trim() || undefined,
      productId: parsed.productId?.trim() || undefined,
      targetIds,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Advertisement updated." : "Advertisement created.");
      navigate("/dashboard/advertisements", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading advertisement...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Advertisement" : "New Advertisement"}
      subtitle={isEdit ? "Update advertisement details." : "Create a new promotional banner or targeted ad."}
      onBack={() => navigate("/dashboard/advertisements")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Basic Info">
          <FormField label="Title" required>
            <input
              type="text"
              value={form.title}
              placeholder="Summer Sale Banner"
              onChange={(e) => up("title", e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Image URL" required>
            <input
              type="url"
              value={form.image}
              placeholder="https://cdn.example.com/banner.jpg"
              onChange={(e) => up("image", e.target.value)}
              className={inputClass}
            />
          </FormField>
          {form.image && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#d2d2d7]">
              <img src={form.image} alt="Preview" className="max-h-40 w-full object-cover" />
            </div>
          )}
        </FormSection>

        <FormSection title="Targeting">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Target Type" required>
              <select value={form.targetType} onChange={(e) => up("targetType", e.target.value)} className={inputClass}>
                <option value="global">Global</option>
                <option value="category">Category</option>
                <option value="subcategory">Subcategory</option>
                <option value="product">Product</option>
                <option value="custom">Custom</option>
              </select>
            </FormField>
            <FormField label="Target Mode" required>
              <select value={form.targetMode} onChange={(e) => up("targetMode", e.target.value)} className={inputClass}>
                <option value="banner">Banner</option>
                <option value="popup">Popup</option>
                <option value="sidebar">Sidebar</option>
                <option value="inline">Inline</option>
              </select>
            </FormField>
          </div>

          {form.targetType === "category" && (
            <FormField label="Category ID">
              <input
                type="text"
                value={form.categoryId}
                placeholder="Category UUID"
                onChange={(e) => up("categoryId", e.target.value)}
                className={inputClass}
              />
            </FormField>
          )}
          {form.targetType === "subcategory" && (
            <FormField label="Subcategory ID">
              <input
                type="text"
                value={form.subcategoryId}
                placeholder="Subcategory UUID"
                onChange={(e) => up("subcategoryId", e.target.value)}
                className={inputClass}
              />
            </FormField>
          )}
          {form.targetType === "product" && (
            <FormField label="Product ID">
              <input
                type="text"
                value={form.productId}
                placeholder="Product UUID"
                onChange={(e) => up("productId", e.target.value)}
                className={inputClass}
              />
            </FormField>
          )}
          {form.targetType === "custom" && (
            <FormField label="Target IDs" hint="Comma-separated UUIDs">
              <input
                type="text"
                value={form.targetIds}
                placeholder="uuid1, uuid2, uuid3"
                onChange={(e) => up("targetIds", e.target.value)}
                className={inputClass}
              />
            </FormField>
          )}
        </FormSection>

        <FormSection title="Schedule & Display">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Season">
              <input
                type="text"
                value={form.season}
                placeholder="summer, winter…"
                onChange={(e) => up("season", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => up("date", e.target.value)}
                className={inputClass}
              />
            </FormField>
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
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Ad" : "Create Ad"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/advertisements")}
        />
      </form>
    </ModernFormLayout>
  );
};
