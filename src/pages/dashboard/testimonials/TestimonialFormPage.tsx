import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Star, Trash2, UploadCloud } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { api } from "@/shared/api/api";
import { engagementApi } from "@/features/engagement";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const ImageCard: React.FC<{ src: string; onRemove: () => void }> = ({ src, onRemove }) => (
  <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]">
    <img src={src} alt="Reviewer photo" className="h-full w-full object-cover" />
    <button
      type="button"
      onClick={onRemove}
      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white transition hover:bg-[#1d1d1f]"
      aria-label="Remove photo"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

const DropArea: React.FC<{ onFile: (file: File) => void }> = ({ onFile }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const handle = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer?.files ?? null); }}
      className="rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-6 text-center"
    >
      <UploadCloud size={26} className="mx-auto text-[#86868b]" />
      <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Choose photo or drag and drop it here.</p>
      <p className="mt-1 text-[12px] text-[#86868b]">Images only, up to 5MB</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"
      >
        Browse files
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handle(e.target.files); e.currentTarget.value = ""; }} />
    </div>
  );
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text: tip, children }) => (
  <span className="group/tip relative inline-flex">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1d1d1f] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100">
      {tip}
      <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1d1d1f]" />
    </span>
  </span>
);

const read = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const asBool = (v: unknown): boolean => v === true || v === "true";

type Form = {
  reviewerName: string;
  reviewerEmail: string;
  title: string;
  comment: string;
  rating: number;
  isPublished: boolean;
  image: File | null;
  existingImage: string;
};

const initial: Form = {
  reviewerName: "",
  reviewerEmail: "",
  title: "",
  comment: "",
  rating: 5,
  isPublished: false,
  image: null,
  existingImage: "",
};

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hovered, setHovered] = React.useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition-transform hover:scale-110"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            size={22}
            className={i <= (hovered || value) ? "fill-amber-400 text-amber-400" : "text-gray-200"}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-[#6e6e73]">{hovered || value} / 5</span>
    </div>
  );
};

export const TestimonialFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = useQuery({
    queryKey: ["reviews", "get", id],
    queryFn: () => engagementApi.reviews.crud.service.get(id!),
    enabled: isEdit,
  });

  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({
      reviewerName: read(r.reviewerName),
      reviewerEmail: read(r.reviewerEmail),
      title: read(r.title),
      comment: read(r.comment),
      rating: typeof r.rating === "number" ? r.rating : 5,
      isPublished: asBool(r.isPublished),
      image: null,
      existingImage: read(r.image ?? r.imageUrl),
    });
  }, [isEdit, getQuery.data]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append("reviewerName", form.reviewerName.trim());
    fd.append("reviewerEmail", form.reviewerEmail.trim());
    if (form.title.trim()) fd.append("title", form.title.trim());
    fd.append("comment", form.comment.trim());
    fd.append("rating", String(form.rating));
    fd.append("isSite", "true");
    fd.append("isPublished", String(form.isPublished));
    if (form.image) fd.append("image", form.image);
    return fd;
  };

  const createMutation = useMutation({
    mutationFn: () => api.post("/review/create", buildFormData(), { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
      void qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Testimonial created.");
      navigate("/dashboard/testimonials");
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/review/update/${id}`, buildFormData(), { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
      void qc.invalidateQueries({ queryKey: ["reviews", "get", id] });
      toast.success("Testimonial updated.");
      navigate("/dashboard/testimonials");
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reviewerName.trim()) { toast.error("Reviewer name is required."); return; }
    if (!form.reviewerEmail.trim()) { toast.error("Reviewer email is required."); return; }
    if (!form.comment.trim()) { toast.error("Comment is required."); return; }
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-[14px] text-[#86868b]">
        Loading…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Testimonial" : "New Testimonial"}
      subtitle={isEdit ? "Update this site testimonial." : "Add a new site-wide customer testimonial."}
      onBack={() => navigate("/dashboard/testimonials")}
    >
      <form onSubmit={handleSubmit}>
        <FormSection title="Reviewer">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name" required>
              <input
                className={inputClass}
                placeholder="Jane Doe"
                value={form.reviewerName}
                onChange={(e) => set("reviewerName", e.target.value)}
              />
            </FormField>
            <FormField label="Email" required>
              <input
                type="email"
                className={inputClass}
                placeholder="jane@example.com"
                value={form.reviewerEmail}
                onChange={(e) => set("reviewerEmail", e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Content">
          <FormField label="Title">
            <input
              className={inputClass}
              placeholder="Optional headline"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FormField>
          <FormField label="Comment" required>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 resize-none"
              placeholder="What did the customer say?"
              value={form.comment}
              onChange={(e) => set("comment", e.target.value)}
            />
          </FormField>
          <FormField label="Rating" required>
            <StarPicker value={form.rating} onChange={(v) => set("rating", v)} />
          </FormField>
        </FormSection>

        <div className="pt-4"><FormSection title="Media">
          <FormField label="Photo">
            {form.image || form.existingImage ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ImageCard
                  src={form.image ? URL.createObjectURL(form.image) : form.existingImage}
                  onRemove={() => { set("image", null); set("existingImage", ""); }}
                />
              </div>
            ) : (
              <DropArea onFile={(file) => set("image", file)} />
            )}
          </FormField>
        </FormSection></div>

        <div className="pt-4"><FormSection title="Visibility">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isPublished}
              onClick={() => set("isPublished", !form.isPublished)}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.isPublished ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-gray-700">Published</span>
              <Tooltip text="Controls whether this testimonial appears publicly on the site">
                <Info size={12} className="cursor-help text-[#86868b]" />
              </Tooltip>
            </div>
          </div>
        </FormSection></div>

        <FormActions
          onCancel={() => navigate("/dashboard/testimonials")}
          submitLabel={isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Testimonial"}
          isSubmitting={isPending}
        />
      </form>
    </ModernFormLayout>
  );
};
