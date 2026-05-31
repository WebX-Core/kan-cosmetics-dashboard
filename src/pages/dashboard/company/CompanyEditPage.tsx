import React from "react";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCompanyGet, useCompanyList, useUpdateCompany } from "@/features/company";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { slugify } from "@/shared/utils/slug";

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  link: z.string().min(1, "Link is required"),
  bgcolor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  removeLogo: z.boolean().default(false),
  logo: z.instanceof(File).nullable().optional(),
});

type FormState = {
  title: string;
  slug: string;
  description: string;
  link: string;
  bgcolor: string;
  sortOrder: string;
  removeLogo: boolean;
  logo: File | null;
};

const initialState: FormState = {
  title: "",
  slug: "",
  description: "",
  link: "",
  bgcolor: "#ffffff",
  sortOrder: "",
  removeLogo: false,
  logo: null,
};

const isIdLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
  /^[0-9a-f]{24}$/i.test(value);

export const CompanyEditPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useUpdateCompany();

  const slugIsId = React.useMemo(() => Boolean(slug && isIdLike(slug)), [slug]);

  const listQuery = useCompanyList({ page: 1, limit: 1, search: slug }, !slugIsId && Boolean(slug));

  const resolvedId = React.useMemo(() => {
    if (slugIsId) return slug;
    const rows = listQuery.data?.data ?? [];
    return rows.find((r) => r.slug === slug)?.id ?? rows[0]?.id;
  }, [listQuery.data?.data, slugIsId, slug]);

  const q = useCompanyGet(resolvedId);

  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [populated, setPopulated] = React.useState(false);

  React.useEffect(() => {
    if (!q.data || populated) return;
    setForm({
      title: q.data.title ?? "",
      slug: q.data.slug ?? "",
      description: q.data.description ?? "",
      link: q.data.link ?? "",
      bgcolor: q.data.bgcolor ?? "#ffffff",
      sortOrder: q.data.sortOrder != null ? String(q.data.sortOrder) : "",
      removeLogo: false,
      logo: null,
    });
    setSlugManuallyEdited(false);
    setPopulated(true);
  }, [q.data, populated]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleTitleChange = (value: string) => {
    setField("title", value);
    if (!slugManuallyEdited) {
      setField("slug", slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setField("slug", slugify(value));
  };

  const handleBgcolorTextChange = (value: string) => {
    setField("bgcolor", value);
  };

  const handleBgcolorSwatchChange = (value: string) => {
    setField("bgcolor", value);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setField("logo", file);
    setField("removeLogo", false);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
  };

  const handleRemoveLogo = () => {
    setField("logo", null);
    setField("removeLogo", true);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedId) return;

    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;

    try {
      await mutation.mutateAsync({
        id: resolvedId,
        dto: {
          title: parsed.title,
          slug: parsed.slug,
          description: parsed.description,
          link: parsed.link,
          bgcolor: parsed.bgcolor as `#${string}`,
          sortOrder: parsed.sortOrder,
          removeLogo: parsed.removeLogo,
          logo: parsed.logo ?? null,
        },
      });
      toast.success("Company updated successfully");
      navigate("/dashboard/company", { replace: true });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      if (fieldErrors) {
        setErrors(fieldErrors as Partial<Record<keyof FormState, string>>);
      }
      toast.error(message);
    }
  };

  const existingLogoUrl = q.data?.logoUrl ?? null;
  const showLogoPreview =
    !form.removeLogo && (logoPreview !== null || existingLogoUrl !== null);
  const displayLogoSrc = logoPreview ?? existingLogoUrl;

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-[#6e6e73]">
        Invalid slug
      </div>
    );
  }

  if (!slugIsId && listQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#0071e3]" size={24} />
      </div>
    );
  }

  if (!resolvedId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-[#6e6e73]">
        Company not found
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-[#0071e3]" size={24} />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-red-500">
        Failed to load company
      </div>
    );
  }

  return (
    <ModernFormLayout
      title="Edit Company"
      subtitle="Update company details"
      onBack={() => navigate("/dashboard/company")}
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
        <FormSection title="Details">
          <FormField label="Title" required error={errors.title}>
            <input
              className={inputCls}
              placeholder="Company title"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </FormField>

          <FormField label="Slug" required hint="Auto-filled from title" error={errors.slug}>
            <input
              className={inputCls}
              placeholder="company-slug"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </FormField>

          <FormField label="Link" required error={errors.link}>
            <input
              className={inputCls}
              placeholder="https://example.com"
              value={form.link}
              onChange={(e) => setField("link", e.target.value)}
            />
          </FormField>

          <FormField label="Background Color" required error={errors.bgcolor}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.bgcolor}
                onChange={(e) => handleBgcolorSwatchChange(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border border-[#d2d2d7] bg-white p-1 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
              />
              <input
                className={inputCls}
                placeholder="#ffffff"
                value={form.bgcolor}
                onChange={(e) => handleBgcolorTextChange(e.target.value)}
              />
            </div>
          </FormField>
        </FormSection>

        <FormSection title="Description">
          <FormField label="Description" required error={errors.description}>
            <RichTextEditor
              initialContent={form.description}
              onChange={(content) => setField("description", content)}
              placeholder="Enter company description…"
            />
          </FormField>
        </FormSection>

        <FormSection title="Media">
          <FormField label="Logo" error={errors.logo as string | undefined}>
            {showLogoPreview && displayLogoSrc ? (
              <div className="flex flex-col gap-2">
                <img
                  src={displayLogoSrc}
                  alt="Logo preview"
                  className="h-32 w-32 rounded-xl border border-[#d2d2d7] object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="w-fit rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-[11px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d2d2d7] bg-white transition hover:border-[#0071e3] hover:bg-[#f5f5f7]">
                <span className="text-[12px] text-[#86868b]">Click to upload logo</span>
                <span className="text-[11px] text-[#86868b]">PNG, JPG, WEBP accepted</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            )}
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <FormField label="Sort Order" error={errors.sortOrder}>
            <input
              type="number"
              className={inputCls}
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => setField("sortOrder", e.target.value)}
            />
          </FormField>
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          isSubmitting={mutation.isPending}
          onCancel={() => navigate("/dashboard/company")}
        />
      </form>
    </ModernFormLayout>
  );
};
