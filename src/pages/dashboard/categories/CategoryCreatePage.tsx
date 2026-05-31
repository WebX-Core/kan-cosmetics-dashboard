import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, UploadCloud } from "lucide-react";
import { z } from "zod";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { slugify } from "@/shared/utils/slug";
import { validateOrToast } from "@/shared/utils/validation";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const categoryFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  description: z.string().optional(),
});

type FormData = Readonly<{
  title: string;
  slug: string;
  description: string;
}>;

const isValidImageFile = (file: File): boolean =>
  file.type.startsWith("image/") && file.size <= MAX_IMAGE_SIZE_BYTES;

const DropArea: React.FC<{
  onFiles: (files: FileList | null) => void;
  compact?: boolean;
}> = ({ onFiles, compact = false }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(event.dataTransfer?.files ?? null);
      }}
      className={
        compact
          ? "flex h-28 w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] p-2 text-center"
          : "rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-6 text-center"
      }
    >
      <UploadCloud size={compact ? 18 : 26} className="mx-auto text-[#86868b]" />
      {!compact ? (
        <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">
          Choose image file or drag and drop it here.
        </p>
      ) : null}
      {!compact ? <p className="mt-1 text-[12px] text-[#86868b]">Only images, up to 5MB</p> : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={
          compact
            ? "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[16px] font-semibold leading-none text-white hover:bg-blue-600"
            : "mt-3 inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"
        }
      >
        {compact ? "+" : "Browse files"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};

const ImageCard: React.FC<{ src: string; onRemove: () => void }> = ({ src, onRemove }) => (
  <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]">
    <img src={src} alt="Category" className="h-full w-full object-cover" />
    <button
      type="button"
      onClick={onRemove}
      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white hover:bg-[#1d1d1f]"
      aria-label="Remove image"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

export const CategoryCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createCategory = catalogApi.categories.hooks.useCreate();
  const [loading, setLoading] = React.useState(false);
  const [manualSlug, setManualSlug] = React.useState(false);
  const [coverImageFile, setCoverImageFile] = React.useState<File | null>(null);
  const [form, setForm] = React.useState<FormData>({ title: "", slug: "", description: "" });

  React.useEffect(() => {
    if (manualSlug && form.slug.trim()) return;
    const nextSlug = slugify(form.title);
    if (nextSlug === form.slug) return;
    setForm((prev) => ({ ...prev, slug: nextSlug }));
  }, [form.title, form.slug, manualSlug]);

  const previewCover = React.useMemo(
    () => (coverImageFile ? URL.createObjectURL(coverImageFile) : ""),
    [coverImageFile]
  );

  React.useEffect(
    () => () => {
      if (previewCover) URL.revokeObjectURL(previewCover);
    },
    [previewCover]
  );

  const onPickCover = (files: FileList | null) => {
    const first = files?.[0];
    if (!first) return;
    if (!isValidImageFile(first)) {
      toast.error("Only image files up to 5MB are allowed.");
      return;
    }
    setCoverImageFile(first);
  };

  const submit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(categoryFormSchema, form, toast);
    if (!parsed) return;

    setLoading(true);
    try {
      await createCategory.mutateAsync({
        title: parsed.title,
        slug: slugify(parsed.slug || parsed.title),
        description: parsed.description?.trim() ?? "",
        coverImage: coverImageFile ?? undefined,
      });
      toast.success("Category created");
      navigate("/dashboard/categories");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernFormLayout
      title="Create Category"
      subtitle="Add a new product category."
      onBack={() => navigate("/dashboard/categories")}
    >
      <form onSubmit={submit} className="space-y-8">
        <FormSection title="Basic Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="e.g. Skincare"
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Slug" required>
              <input
                type="text"
                value={form.slug}
                placeholder="e.g. skincare"
                onChange={(e) => {
                  const next = slugify(e.target.value);
                  setManualSlug(next.length > 0);
                  setForm((prev) => ({ ...prev, slug: next }));
                }}
                className={inputClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Cover Image" description="Only image files are allowed. Max size: 5MB.">
          {!coverImageFile ? (
            <DropArea onFiles={onPickCover} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              <ImageCard src={previewCover} onRemove={() => setCoverImageFile(null)} />
            </div>
          )}
        </FormSection>

        <FormSection title="Description">
          <textarea
            value={form.description}
            placeholder="Describe this category..."
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={5}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
          />
        </FormSection>

        <FormActions
          submitLabel="Create Category"
          isSubmitting={loading}
          onCancel={() => navigate("/dashboard/categories")}
        />
      </form>
    </ModernFormLayout>
  );
};
