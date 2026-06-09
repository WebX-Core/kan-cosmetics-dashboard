import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { engagementApi } from "@/features/engagement";
import { catalogApi } from "@/features/catalog";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

type Form = Readonly<{
  title: string;
  description: string;
  isActive: boolean;
}>;

const initial: Form = {
  title: "",
  description: "",
  isActive: true,
};

const read = (value: unknown): string => (typeof value === "string" ? value : "");

export const ProductFaqFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id: productId, faqId } = useParams<{ id: string; faqId: string }>();
  const isEdit = Boolean(faqId);

  const productQuery = catalogApi.products.hooks.useGet(productId, Boolean(productId));
  const getQuery = engagementApi.faqs.hooks.useGet(faqId, isEdit);
  const createMutation = engagementApi.faqs.hooks.useCreate();
  const updateMutation = engagementApi.faqs.hooks.useUpdate();
  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const row = getQuery.data as Record<string, unknown>;
    const descriptionRaw = row.description;
    const description =
      typeof descriptionRaw === "string"
        ? descriptionRaw
        : typeof descriptionRaw === "object" && descriptionRaw !== null
          ? read((descriptionRaw as Record<string, unknown>).text)
          : "";
    setForm({
      title: read(row.title),
      description,
      isActive: Boolean(row.isActive ?? true),
    });
  }, [getQuery.data, isEdit]);

  const productName = React.useMemo(() => {
    const row = (productQuery.data ?? {}) as Record<string, unknown>;
    return read(row.title ?? row.name) || "Product";
  }, [productQuery.data]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed || !productId) return;
    const payload = {
      title: parsed.title,
      description: parsed.description?.trim() || undefined,
      isSite: false,
      productId,
      isActive: parsed.isActive,
    };

    try {
      if (isEdit && faqId) {
        await updateMutation.mutateAsync({ id: faqId, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate(`/dashboard/products/${productId}/faqs`, { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading Product FAQ...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Product FAQ" : "Create Product FAQ"}
      subtitle={`For ${productName}`}
      onBack={() => navigate(`/dashboard/products/${productId}/faqs`)}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="FAQ Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="Enter FAQ question/title"
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={form.description}
              placeholder="Write the FAQ answer..."
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={5}
              className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </FormField>
        </FormSection>

        <FormSection title="Status">
          <label className="mt-2 inline-flex items-center gap-2 text-[14px] text-[#1d1d1f]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Active
          </label>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Product FAQ" : "Create Product FAQ"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate(`/dashboard/products/${productId}/faqs`)}
        />
      </form>
    </ModernFormLayout>
  );
};

