import React from "react";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useCsrGet, useCsrList, useUpdateCsr } from "@/features/csr";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { slugify } from "@/shared/utils/slug";

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
const selectCls = `${inputCls} appearance-none pr-9 cursor-pointer`;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  link: z.string().min(1, "Link is required"),
  status: z.enum(["ONGOING", "UPCOMING", "PREVIOUS"]),
  date: z.string().min(1, "Date is required"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
});

type FieldErrors = Partial<Record<string, string>>;

export const CsrEditPage: React.FC = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useUpdateCsr();

  const isIdLike = React.useMemo(
    () =>
      Boolean(
        slugParam &&
          (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugParam) ||
            /^[0-9a-f]{24}$/i.test(slugParam))
      ),
    [slugParam]
  );

  const find = useCsrList({ page: 1, limit: 1, search: slugParam }, Boolean(slugParam && !isIdLike));

  const resolvedId = React.useMemo(() => {
    if (isIdLike) return slugParam;
    const rows = find.data?.data ?? [];
    return rows.find((r) => r.slug === slugParam)?.id ?? rows[0]?.id;
  }, [find.data?.data, isIdLike, slugParam]);

  const q = useCsrGet(resolvedId);

  const [initialized, setInitialized] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [link, setLink] = React.useState("");
  const [status, setStatus] = React.useState<"ONGOING" | "UPCOMING" | "PREVIOUS">("ONGOING");
  const [date, setDate] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("");

  const [removeCoverImage, setRemoveCoverImage] = React.useState(false);
  const [coverImageFile, setCoverImageFile] = React.useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = React.useState<string | null>(null);

  const [removedMediaAssetIds, setRemovedMediaAssetIds] = React.useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = React.useState<File[]>([]);

  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!q.data || initialized) return;
    const d = q.data;
    setTitle(d.title ?? "");
    setSlug(d.slug ?? "");
    setDescription(d.description ?? "");
    setLink(d.link ?? "");
    setStatus(d.status ?? "ONGOING");
    setDate(d.date ?? "");
    setSortOrder(d.sortOrder != null ? String(d.sortOrder) : "");
    setRemoveCoverImage(false);
    setCoverImageFile(null);
    const existingCover =
      (d as { coverImageUrl?: string; coverImage?: string; image?: string }).coverImageUrl ??
      (d as { coverImageUrl?: string; coverImage?: string; image?: string }).coverImage ??
      (d as { coverImageUrl?: string; coverImage?: string; image?: string }).image ??
      null;
    setCoverImagePreview(existingCover);
    setRemovedMediaAssetIds([]);
    setNewMediaFiles([]);
    setSlugManuallyEdited(false);
    setInitialized(true);
  }, [q.data, initialized]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slugManuallyEdited) setSlug(slugify(val));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverImageFile(file);
    setRemoveCoverImage(false);
    if (file) {
      setCoverImagePreview(URL.createObjectURL(file));
    } else {
      setCoverImagePreview(null);
    }
  };

  const handleRemoveCoverImage = () => {
    setRemoveCoverImage(true);
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const handleMediaAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setNewMediaFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAsset = (assetId: string) => {
    setRemovedMediaAssetIds((prev) => (prev.includes(assetId) ? prev : [...prev, assetId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedId) return;
    setFieldErrors({});

    const parsed = schema.safeParse({ title, slug, description, link, status, date, sortOrder });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await mutation.mutateAsync({
        id: resolvedId,
        dto: {
          ...parsed.data,
          removeCoverImage,
          coverImage: coverImageFile ?? null,
          mediaAssets: newMediaFiles,
          removeMediaAssetsIds: removedMediaAssetIds,
        },
      });
      toast.success("CSR updated successfully");
      navigate("/dashboard/csr", { replace: true });
    } catch (err) {
      const { message, fieldErrors: fe } = parseApiError(err);
      toast.error(message);
      if (fe) setFieldErrors(fe);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slugParam) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-[#86868b]">
        Invalid slug
      </div>
    );
  }

  if (find.isLoading || (isIdLike === false && !resolvedId && find.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-[14px] text-[#86868b]">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (!resolvedId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-[#86868b]">
        CSR entry not found
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-[14px] text-[#86868b]">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[14px] text-red-500">
        Failed to load CSR entry
      </div>
    );
  }

  const existingAssets = (q.data?.mediaAssets ?? []).filter(
    (asset) => !removedMediaAssetIds.includes(asset.id)
  );

  return (
    <ModernFormLayout
      title="Edit CSR"
      subtitle="Update the corporate social responsibility entry"
      onBack={() => navigate("/dashboard/csr")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="space-y-6">
          <FormSection title="Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Title" required error={fieldErrors.title}>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Enter title"
                  className={inputCls}
                />
              </FormField>

              <FormField label="Slug" required error={fieldErrors.slug} hint="Auto-generated from title, editable">
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="enter-slug"
                  className={inputCls}
                />
              </FormField>

              <FormField label="Link" required error={fieldErrors.link}>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </FormField>

              <FormField label="Status" required error={fieldErrors.status}>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className={selectCls}
                  >
                    <option value="ONGOING">ONGOING</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="PREVIOUS">PREVIOUS</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]"
                  />
                </div>
              </FormField>

              <FormField label="Date" required error={fieldErrors.date}>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Sort Order" error={fieldErrors.sortOrder}>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Description">
            <FormField label="Description" required error={fieldErrors.description}>
              <RichTextEditor initialContent={description} onChange={setDescription} />
            </FormField>
          </FormSection>

          <FormSection title="Media">
            <FormField label="Cover Image" error={fieldErrors.coverImage}>
              {coverImagePreview && !removeCoverImage ? (
                <div className="relative inline-block">
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="h-32 w-48 rounded-xl object-cover border border-[#d2d2d7]"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-sm transition hover:bg-red-500"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="block w-full text-[13px] text-[#1d1d1f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[#1d1d1f] hover:file:bg-[#e8e8ed]"
                />
              )}
            </FormField>

            <FormField label="Media Assets" error={fieldErrors.mediaAssets}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMediaAssetsChange}
                className="block w-full text-[13px] text-[#1d1d1f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f5f7] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[#1d1d1f] hover:file:bg-[#e8e8ed]"
              />

              {existingAssets.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] text-[#86868b]">Existing assets</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {existingAssets.map((asset) => (
                      <div key={asset.id} className="relative">
                        <img
                          src={asset.url}
                          alt="Media asset"
                          className="h-16 w-full rounded-lg object-cover border border-[#d2d2d7]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingAsset(asset.id)}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-sm transition hover:bg-red-500"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {newMediaFiles.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] text-[#86868b]">New files</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {newMediaFiles.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-16 w-full rounded-lg object-cover border border-[#d2d2d7]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewMedia(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-sm transition hover:bg-red-500"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </FormField>
          </FormSection>

          <FormActions
            submitLabel="Update CSR"
            submitIcon={<Loader2 size={11} />}
            isSubmitting={isSubmitting}
            onCancel={() => navigate("/dashboard/csr")}
          />
        </div>
      </form>
    </ModernFormLayout>
  );
};
