import React from "react";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, X, ImagePlus, FilePlus2 } from "lucide-react";
import { useNewsroomGet, useNewsroomList, useUpdateNewsroom } from "@/features/newsroom";
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
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OID_RE = /^[0-9a-f]{24}$/i;

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  description: z.string().trim().min(1, "Description is required"),
  sortOrder: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? Number(v) : undefined),
    z.number().int().positive().optional(),
  ),
});

type FieldErrors = Partial<Record<string, string>>;

export const NewsroomEditPage: React.FC = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const updateMutation = useUpdateNewsroom();

  // Resolve the actual record id from slug or id param
  const isIdLike = React.useMemo(
    () => Boolean(slugParam && (UUID_RE.test(slugParam) || OID_RE.test(slugParam))),
    [slugParam],
  );

  const listQuery = useNewsroomList({ page: 1, limit: 1, search: slugParam }, Boolean(slugParam) && !isIdLike);

  const resolvedId = React.useMemo(() => {
    if (isIdLike) return slugParam;
    const rows = listQuery.data?.data ?? [];
    return rows.find((r) => r.slug === slugParam)?.id ?? rows[0]?.id;
  }, [isIdLike, slugParam, listQuery.data?.data]);

  const q = useNewsroomGet(resolvedId);

  // Form state
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("");

  // Image state
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [removeImage, setRemoveImage] = React.useState(false);

  // Media assets state
  const [newMediaFiles, setNewMediaFiles] = React.useState<File[]>([]);
  const [removedMediaAssetIds, setRemovedMediaAssetIds] = React.useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);

  // Populate form when data loads
  React.useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.title ?? "");
    setSlug(q.data.slug ?? "");
    setDescription(q.data.description ?? "");
    setSortOrder(q.data.sortOrder != null ? String(q.data.sortOrder) : "");
    setSlugManuallyEdited(false);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setNewMediaFiles([]);
    setRemovedMediaAssetIds([]);
  }, [q.data]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slugManuallyEdited) setSlug(slugify(val));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setRemoveImage(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setNewMediaFiles((prev) => [...prev, ...files]);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
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

    const parsed = schema.safeParse({ title, slug, description, sortOrder });
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: resolvedId,
        dto: {
          ...parsed.data,
          removeImage,
          image: imageFile ?? null,
          mediaAssets: newMediaFiles,
          removeMediaAssetsIds: removedMediaAssetIds,
        },
      });
      toast.success("Newsroom entry updated");
      navigate("/dashboard/newsroom", { replace: true });
    } catch (err) {
      const { message, fieldErrors: apiFieldErrors } = parseApiError(err);
      toast.error(message);
      if (apiFieldErrors) setFieldErrors(apiFieldErrors);
    }
  };

  const isSubmitting = updateMutation.isPending;

  // Existing image URL from data (not replaced/removed)
  const existingImageUrl =
    (q.data as { imageUrl?: string; image?: string } | undefined)?.imageUrl ??
    (q.data as { imageUrl?: string; image?: string } | undefined)?.image ??
    null;

  const visibleExistingImage = !removeImage && !imageFile ? existingImageUrl : null;
  const visibleNewImage = imageFile ? imagePreview : null;
  const shownImageSrc = visibleNewImage ?? visibleExistingImage;

  // Existing assets filtered by removed ids
  const visibleExistingAssets = (q.data?.mediaAssets ?? []).filter(
    (a) => !removedMediaAssetIds.includes(a.id),
  );

  if (!slugParam) return <div className="p-8 text-[14px] text-[#6e6e73]">Invalid URL parameter.</div>;
  if (!isIdLike && listQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }
  if (!resolvedId) return <div className="p-8 text-[14px] text-[#6e6e73]">Newsroom entry not found.</div>;
  if (q.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }
  if (q.isError) return <div className="p-8 text-[14px] text-red-500">Failed to load newsroom entry.</div>;

  return (
    <ModernFormLayout
      title="Edit Newsroom Entry"
      subtitle="Update the newsroom article"
      onBack={() => navigate("/dashboard/newsroom")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Details */}
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

            <FormField
              label="Slug"
              required
              error={fieldErrors.slug}
              hint="Auto-generated from title, editable"
            >
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="entry-slug"
                className={inputCls}
              />
            </FormField>

            <FormField label="Sort Order" error={fieldErrors.sortOrder}>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
                min={1}
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        {/* Description */}
        <FormSection title="Description">
          <FormField label="Description" required error={fieldErrors.description}>
            <RichTextEditor
              initialContent={description}
              onChange={setDescription}
              placeholder="Write the article content…"
            />
          </FormField>
        </FormSection>

        {/* Media */}
        <FormSection title="Media">
          {/* Cover Image */}
          <FormField label="Cover Image" error={fieldErrors.image}>
            {shownImageSrc ? (
              <div className="relative inline-block">
                <img
                  src={shownImageSrc}
                  alt="Cover preview"
                  className="h-40 w-auto rounded-xl border border-[#d2d2d7] object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-[#d2d2d7] transition hover:bg-red-50 hover:ring-red-300"
                  aria-label="Remove image"
                >
                  <X size={12} className="text-[#6e6e73]" />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d2d2d7] bg-white transition hover:border-[var(--primary)] hover:bg-[#f5f5f7]">
                <ImagePlus size={22} className="text-[#86868b]" />
                <span className="text-[12px] text-[#86868b]">Click to upload cover image</span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </FormField>

          {/* Media Assets */}
          <FormField label="Media Assets">
            <div className="space-y-3">
              {/* Existing thumbnails */}
              {visibleExistingAssets.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {visibleExistingAssets.map((asset) => (
                    <div key={asset.id} className="group relative">
                      <img
                        src={asset.url}
                        alt="Media asset"
                        className="h-20 w-20 rounded-xl border border-[#d2d2d7] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAsset(asset.id)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white opacity-0 shadow-md ring-1 ring-[#d2d2d7] transition group-hover:opacity-100 hover:bg-red-50 hover:ring-red-300"
                        aria-label="Remove asset"
                      >
                        <X size={10} className="text-[#6e6e73]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New file thumbnails */}
              {newMediaFiles.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {newMediaFiles.map((file, idx) => (
                    <div key={idx} className="group relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-20 w-20 rounded-xl border border-[#d2d2d7] object-cover ring-2 ring-[var(--primary)]/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewMedia(idx)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white opacity-0 shadow-md ring-1 ring-[#d2d2d7] transition group-hover:opacity-100 hover:bg-red-50 hover:ring-red-300"
                        aria-label="Remove file"
                      >
                        <X size={10} className="text-[#6e6e73]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d2d2d7] bg-white transition hover:border-[var(--primary)] hover:bg-[#f5f5f7]">
                <FilePlus2 size={18} className="text-[#86868b]" />
                <span className="text-[11px] text-[#86868b]">Add more media files</span>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="sr-only"
                  onChange={handleMediaChange}
                />
              </label>
            </div>
          </FormField>
        </FormSection>

        <FormActions
          submitLabel="Save Changes"
          isSubmitting={isSubmitting}
          submitIcon={<Loader2 size={11} />}
          onCancel={() => navigate("/dashboard/newsroom")}
        />
      </form>
    </ModernFormLayout>
  );
};
