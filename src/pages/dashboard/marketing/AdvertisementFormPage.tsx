import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { z } from "zod";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";
import { catalogApi } from "@/features/catalog";
import type { AdvertisementDto } from "@/features/marketing/marketing.types";

const inputClass = "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type TargetType = AdvertisementDto["targetType"];
type TargetMode = AdvertisementDto["targetMode"];
type Option = Readonly<{ id: string; label: string }>;
type Form = Readonly<{
  title: string;
  targetType: TargetType;
  targetMode: TargetMode;
  season: string;
  date: string;
  sortOrder: string;
  categoryId: string;
  subcategoryId: string;
  productId: string;
  targetIds: ReadonlyArray<string>;
}>;

const read = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const relationId = (value: unknown): string => typeof value === "object" && value !== null ? read((value as Record<string, unknown>).id) : "";
const optionsFrom = (items: ReadonlyArray<Record<string, unknown>>): ReadonlyArray<Option> => items.map((item) => ({ id: read(item.id), label: read(item.title ?? item.name ?? item.sku, "Untitled") })).filter((option) => option.id);

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  targetType: z.enum(["CATEGORY", "SUBCATEGORY", "PRODUCT", "VARIANT"]),
  targetMode: z.enum(["IDS", "ALL"]),
  season: z.string().trim().max(120).optional(),
  date: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(1).optional(),
});

const initial: Form = { title: "", targetType: "PRODUCT", targetMode: "IDS", season: "", date: "", sortOrder: "1", categoryId: "", subcategoryId: "", productId: "", targetIds: [] };

const TargetChecklist: React.FC<{ options: ReadonlyArray<Option>; selected: ReadonlyArray<string>; onChange: (ids: ReadonlyArray<string>) => void; loading: boolean }> = ({ options, selected, onChange, loading }) => (
  <div className="overflow-hidden rounded-xl border border-[#d2d2d7] bg-white">
    <label className="flex cursor-pointer items-center gap-3 border-b border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-[13px] font-medium text-[#1d1d1f]">
      <input type="checkbox" checked={options.length > 0 && options.every((option) => selected.includes(option.id))} onChange={(event) => onChange(event.target.checked ? options.map((option) => option.id) : [])} className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]" />
      Select all ({options.length})
    </label>
    <div className="max-h-72 divide-y divide-[#e5e5ea] overflow-y-auto">
      {loading ? <div className="flex items-center justify-center px-4 py-10 text-[13px] text-[#86868b]"><Loader2 size={14} className="mr-2 animate-spin" /> Loading targets…</div> : options.length ? options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-[13px] text-[#1d1d1f] hover:bg-[#f5f5f7]">
          <input type="checkbox" checked={selected.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]" />
          {option.label}
        </label>
      )) : <div className="px-4 py-10 text-center text-[13px] text-[#86868b]">No targets found.</div>}
    </div>
  </div>
);

export const AdvertisementFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const getQuery = useQuery({ queryKey: ["advertisements", "get", id], queryFn: () => marketingApi.getAdvertisement(id as string), enabled: isEdit });
  const createMutation = marketingApi.advertisements.hooks.useCreate();
  const updateMutation = marketingApi.advertisements.hooks.useUpdate();
  const categoriesQuery = catalogApi.categories.hooks.useList({ page: 1, limit: 1000 });
  const subcategoriesQuery = catalogApi.subcategories.hooks.useList({ page: 1, limit: 1000 });
  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 });
  const variantsQuery = catalogApi.productVariants.hooks.useList({ page: 1, limit: 1000 });
  const [form, setForm] = React.useState<Form>(initial);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [existingImage, setExistingImage] = React.useState("");

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const row = getQuery.data;
    setForm({
      title: read(row.title),
      targetType: (read(row.targetType) || "PRODUCT") as TargetType,
      targetMode: (read(row.targetMode) || "IDS") as TargetMode,
      season: read(row.season),
      date: read(row.date).slice(0, 10),
      sortOrder: typeof row.sortOrder === "number" ? String(row.sortOrder) : "1",
      categoryId: read(row.categoryId) || relationId(row.category),
      subcategoryId: read(row.subcategoryId) || relationId(row.subcategory),
      productId: read(row.productId) || relationId(row.product),
      targetIds: Array.isArray(row.targetIds) ? row.targetIds.filter((value): value is string => typeof value === "string") : [],
    });
    setExistingImage(read(row.image));
  }, [getQuery.data, isEdit]);

  const imagePreview = React.useMemo(() => imageFile ? URL.createObjectURL(imageFile) : existingImage, [existingImage, imageFile]);
  React.useEffect(() => () => { if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const up = <K extends keyof Form>(key: K, value: Form[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const targetOptions = React.useMemo(() => form.targetType === "CATEGORY" ? optionsFrom(categoriesQuery.data?.data ?? []) : form.targetType === "SUBCATEGORY" ? optionsFrom(subcategoriesQuery.data?.data ?? []) : form.targetType === "PRODUCT" ? optionsFrom(productsQuery.data?.data ?? []) : optionsFrom(variantsQuery.data?.data ?? []), [categoriesQuery.data?.data, form.targetType, productsQuery.data?.data, subcategoriesQuery.data?.data, variantsQuery.data?.data]);
  const targetLoading = form.targetType === "CATEGORY" ? categoriesQuery.isLoading : form.targetType === "SUBCATEGORY" ? subcategoriesQuery.isLoading : form.targetType === "PRODUCT" ? productsQuery.isLoading : variantsQuery.isLoading;

  const onImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE) return toast.error("Choose an image file up to 5MB.");
    setImageFile(file);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;
    if (!imageFile && !existingImage) return toast.error("Advertisement image is required.");
    if (parsed.targetMode === "IDS" && !form.targetIds.length) return toast.error("Select at least one target.");
    const payload: AdvertisementDto = {
      title: parsed.title,
      image: imageFile ?? existingImage,
      targetType: parsed.targetType,
      targetMode: parsed.targetMode,
      targetIds: parsed.targetMode === "IDS" ? form.targetIds : undefined,
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      productId: form.productId || undefined,
      season: parsed.season || undefined,
      date: parsed.date || undefined,
      sortOrder: parsed.sortOrder,
    };
    try {
      if (isEdit && id) await updateMutation.mutateAsync({ id, dto: payload });
      else await createMutation.mutateAsync(payload);
      toast.success(isEdit ? "Advertisement updated." : "Advertisement created.");
      navigate("/dashboard/advertisements", { replace: true });
    } catch (error) { toast.error(parseApiError(error).message); }
  };

  if (isEdit && getQuery.isLoading) return <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]"><Loader2 size={18} className="mr-2 animate-spin" /> Loading advertisement…</div>;
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <ModernFormLayout title={isEdit ? "Edit Advertisement" : "New Advertisement"} subtitle={isEdit ? "Update advertisement content and targeting." : "Create a promotional banner for selected catalog targets."} onBack={() => navigate("/dashboard/advertisements")}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Basic Info">
          <FormField label="Title" required><input value={form.title} onChange={(event) => up("title", event.target.value)} placeholder="Summer Sale Banner" className={inputClass} /></FormField>
          <FormField label="Advertisement Image" required>
            <div className="space-y-3">
              {imagePreview ? <div className="relative overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]"><img src={imagePreview} alt="Advertisement preview" className="max-h-64 w-full object-contain" /><button type="button" onClick={() => { setImageFile(null); setExistingImage(""); }} className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white hover:bg-[#1d1d1f]" aria-label="Remove image"><Trash2 size={14} /></button></div> : null}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-6 text-center hover:bg-[#fafafa]">
                {imagePreview ? <ImagePlus size={22} className="text-[#86868b]" /> : <UploadCloud size={26} className="text-[#86868b]" />}
                <span className="mt-2 text-[13px] font-medium text-[#1d1d1f]">{imagePreview ? "Replace image" : "Choose an image"}</span><span className="mt-1 text-[12px] text-[#86868b]">PNG, JPEG, GIF or WebP, up to 5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => { onImage(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
              </label>
            </div>
          </FormField>
        </FormSection>
        <FormSection title="Targeting" description="Choose a catalog level, then target selected records or all records.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Target Type" required><select value={form.targetType} onChange={(event) => { up("targetType", event.target.value as TargetType); up("targetIds", []); }} className={inputClass}><option value="CATEGORY">Categories</option><option value="SUBCATEGORY">Subcategories</option><option value="PRODUCT">Products</option><option value="VARIANT">Product Variants</option></select></FormField>
            <FormField label="Target Mode" required><select value={form.targetMode} onChange={(event) => { up("targetMode", event.target.value as TargetMode); if (event.target.value === "ALL") up("targetIds", []); }} className={inputClass}><option value="IDS">Selected targets</option><option value="ALL">All targets</option></select></FormField>
          </div>
          {form.targetMode === "IDS" ? <TargetChecklist options={targetOptions} selected={form.targetIds} onChange={(ids) => up("targetIds", ids)} loading={targetLoading} /> : <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#6e6e73]">This advertisement applies to all {form.targetType.toLowerCase()} targets.</div>}
        </FormSection>
        <FormSection title="Schedule & Display"><div className="grid gap-4 md:grid-cols-3"><FormField label="Season"><input value={form.season} onChange={(event) => up("season", event.target.value)} placeholder="Summer" className={inputClass} /></FormField><FormField label="Date"><input type="date" value={form.date} onChange={(event) => up("date", event.target.value)} className={inputClass} /></FormField><FormField label="Sort Order"><input type="number" min={1} value={form.sortOrder} onChange={(event) => up("sortOrder", event.target.value)} className={inputClass} /></FormField></div></FormSection>
        <FormActions submitLabel={saving ? "Saving…" : isEdit ? "Update Ad" : "Create Ad"} submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined} isSubmitting={saving} onCancel={() => navigate("/dashboard/advertisements")} />
      </form>
    </ModernFormLayout>
  );
};
