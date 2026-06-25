import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Trash2, UploadCloud } from "lucide-react";
import { z } from "zod";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { Input } from "@/shared/components/ui/input";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { slugify } from "@/shared/utils/slug";
import { validateOrToast } from "@/shared/utils/validation";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const subcategoryFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  description: z.string().optional(),
});

type FormData = Readonly<{
  title: string;
  slug: string;
  description: string;
}>;

const read = (value: unknown): string => (typeof value === "string" ? value : "");
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
    <img src={src} alt="Subcategory" className="h-full w-full object-cover" />
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

export const SubcategoryEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: categoryId, subcategoryId } = useParams();
  const toast = useToast();
  const { data } = catalogApi.subcategories.hooks.useGet(subcategoryId);
  const updateSubcategory = catalogApi.subcategories.hooks.useUpdate();
  const [loading, setLoading] = React.useState(false);
  const [manualSlug, setManualSlug] = React.useState(false);
  const [coverImageFile, setCoverImageFile] = React.useState<File | null>(null);
  const [existingCoverImage, setExistingCoverImage] = React.useState("");
  const [removedUrls, setRemovedUrls] = React.useState<ReadonlyArray<string>>([]);
  const [form, setForm] = React.useState<FormData>({ title: "", slug: "", description: "" });

  React.useEffect(() => {
    if (!data) return;
    const row = data as Record<string, unknown>;
    setForm({
      title: read(row.title ?? row.name),
      slug: read(row.slug),
      description: read(row.description),
    });
    setExistingCoverImage(read(row.coverImage));
    setCoverImageFile(null);
    setRemovedUrls([]);
  }, [data]);

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

  const hasCoverImage = Boolean(coverImageFile || existingCoverImage);

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
    if (!subcategoryId || !categoryId) return;

    const parsed = validateOrToast(subcategoryFormSchema, form, toast);
    if (!parsed) return;

    setLoading(true);
    try {
      await updateSubcategory.mutateAsync({
        id: subcategoryId,
        dto: {
          categoryId,
          title: parsed.title,
          slug: slugify(parsed.slug || parsed.title),
          description: parsed.description?.trim() ?? "",
          coverImage: coverImageFile ?? undefined,
          removeUrls: removedUrls.length ? removedUrls : undefined,
        },
      });
      toast.success("Subcategory updated");
      navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}`);
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernFormLayout
      title="Edit Subcategory"
      subtitle="Update subcategory details."
      eyebrow="Subcategory"
      onBack={() => navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}`)}
    >
      <form onSubmit={submit} className="space-y-6">
        <FormSection title="Basic" description="Core subcategory fields.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title" required>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </FormField>
            <FormField label="Slug" required>
              <Input
                value={form.slug}
                onChange={(e) => {
                  const next = slugify(e.target.value);
                  setManualSlug(next.length > 0);
                  setForm((p) => ({ ...p, slug: next }));
                }}
              />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
            />
          </FormField>
        </FormSection>

        <FormSection title="Cover Image" description="Only image files are allowed. Max size: 5MB.">
          {!hasCoverImage ? (
            <DropArea onFiles={onPickCover} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {coverImageFile ? (
                <ImageCard src={previewCover} onRemove={() => setCoverImageFile(null)} />
              ) : null}
              {!coverImageFile && existingCoverImage ? (
                <ImageCard
                  src={existingCoverImage}
                  onRemove={() => {
                    setRemovedUrls((prev) =>
                      prev.includes(existingCoverImage) ? prev : [...prev, existingCoverImage]
                    );
                    setExistingCoverImage("");
                  }}
                />
              ) : null}
            </div>
          )}
        </FormSection>

        <FormActions
          submitLabel="Update Subcategory"
          submitIcon={loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={16} />}
          isSubmitting={loading}
          onCancel={() => navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}`)}
        />
      </form>
    </ModernFormLayout>
  );
};
