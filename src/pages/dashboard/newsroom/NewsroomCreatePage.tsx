import React from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Loader2, X, ImagePlus, FilePlus2 } from "lucide-react";
import { useCreateNewsroom } from "@/features/newsroom";
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

export const NewsroomCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateNewsroom();

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [newMediaFiles, setNewMediaFiles] = React.useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);

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
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await createMutation.mutateAsync({
        ...parsed.data,
        image: imageFile ?? null,
        mediaAssets: newMediaFiles,
      });
      toast.success("Newsroom entry created");
      navigate("/dashboard/newsroom", { replace: true });
    } catch (err) {
      const { message, fieldErrors: apiFieldErrors } = parseApiError(err);
      toast.error(message);
      if (apiFieldErrors) setFieldErrors(apiFieldErrors);
    }
  };

  const isSubmitting = createMutation.isPending;

  return (
    <ModernFormLayout
      title="Create Newsroom Entry"
      subtitle="Add a new newsroom article"
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
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
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
          <FormField label="Media Assets" error={fieldErrors.mediaAssets}>
            <div className="space-y-3">
              {newMediaFiles.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {newMediaFiles.map((file, idx) => (
                    <div key={idx} className="group relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-20 w-20 rounded-xl border border-[#d2d2d7] object-cover"
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
                <span className="text-[11px] text-[#86868b]">Add media files (multiple)</span>
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
          submitLabel="Create Entry"
          isSubmitting={isSubmitting}
          submitIcon={<Loader2 size={11} />}
          onCancel={() => navigate("/dashboard/newsroom")}
        />
      </form>
    </ModernFormLayout>
  );
};
