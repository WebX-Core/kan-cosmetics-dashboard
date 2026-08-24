import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { CheckCircle, Clock, FileText, Layers, Loader2, UploadCloud, X } from "lucide-react";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { marketingApi } from "@/features/marketing";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { slugify } from "@/shared/utils/slug";
import { validateOrToast } from "@/shared/utils/validation";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { confirmAction } from "@/shared/utils/confirm";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const num = (value: unknown): number => (typeof value === "number" ? value : 0);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type Row = Readonly<{
  id: string;
  title: string;
  slug: string;
  author: string;
  status: "Published" | "Draft" | "Scheduled";
  views: number;
  coverImage: string;
}>;

type BlogForm = Readonly<{
  title: string;
  slug: string;
  excerpt: string;
  description: string;
  isPublished: boolean;
  sortOrder: string;
}>;

const blogFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  description: z.string().optional(),
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().optional(),
});

const toStatus = (value: string): Row["status"] =>
  value.toLowerCase().includes("publish")
    ? "Published"
    : value.toLowerCase().includes("schedule")
      ? "Scheduled"
      : "Draft";

const statusFromPublishedFlag = (value: unknown, fallbackStatus: unknown): Row["status"] => {
  if (typeof value === "boolean") return value ? "Published" : "Draft";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return "Published";
    if (normalized === "false") return "Draft";
  }
  return toStatus(text(fallbackStatus, "Draft"));
};

const rowsFrom = (payload: unknown): ReadonlyArray<Row> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(item.id, crypto.randomUUID()),
      title: text(item.title, "Untitled"),
      slug: text(item.slug, "—"),
      author: text(item.author ?? item.createdBy, "—"),
      status: statusFromPublishedFlag(item.isPublished, item.status),
      views: num(item.views),
      coverImage: text(item.coverImage),
    };
  });
};

const isValidImageFile = (file: File): boolean =>
  file.type.startsWith("image/") && file.size <= MAX_IMAGE_SIZE_BYTES;

const DropArea: React.FC<{
  onFile: (file: File | null) => void;
}> = ({ onFile }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0] ?? null);
      }}
      className="rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-6 text-center"
    >
      <UploadCloud size={26} className="mx-auto text-[#86868b]" />
      <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">
        Choose a cover image or drag and drop it here.
      </p>
      <p className="mt-1 text-[12px] text-[#86868b]">Only images, up to 5MB</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"
      >
        Browse files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};

const ImageCard: React.FC<{ src: string; onRemove?: () => void }> = ({ src, onRemove }) => (
  <div className="relative h-40 w-full overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]">
    <img src={src} alt="Blog cover" className="h-full w-full object-cover" />
    {onRemove ? (
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white hover:bg-[#1d1d1f]"
        aria-label="Remove cover image"
      >
        <X size={14} />
      </button>
    ) : null}
  </div>
);

export const BlogPostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.blogs.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const del = marketingApi.blogs.hooks.useSoftDelete();

  const rows = React.useMemo(() => rowsFrom(query.data), [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const totalPosts = query.data?.total ?? rows.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === activeTab);
  }, [rows, activeTab]);

  const visibleIds = React.useMemo(() => tabFiltered.map((row) => row.id), [tabFiltered]);
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id)));
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(() => ({
    total: totalPosts,
    published: rows.filter((r) => r.status === "Published").length,
    draft: rows.filter((r) => r.status === "Draft").length,
    scheduled: rows.filter((r) => r.status === "Scheduled").length,
  }), [rows, totalPosts]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Draft" },
    { key: "scheduled", label: "Scheduled" },
  ];

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this blog post?");
    if (!ok) return;
    await del.mutateAsync(id);
    setSelectedIds((prev) => prev.filter((entry) => entry !== id));
  };

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} aria-label="Select all posts" />,
      render: (r: Row) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleSelectOne(r.id, e.target.checked)} aria-label={`Select ${r.id}`} />
      ),
      width: "44px",
    },
    {
      key: "post",
      label: "Post",
      render: (r: Row) => (
        <div>
          <div className="font-medium text-gray-900">{r.title}</div>
          <div className="text-xs text-gray-400">{r.author} · {r.slug}</div>
        </div>
      ),
    },
    { key: "views", label: "Views", render: (r: Row) => <span className="text-gray-600">{r.views}</span> },
    { key: "status", label: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageLayout
      title="Blog Posts"
      subtitle="Manage blog content and articles."
      onNew={() => navigate("/dashboard/blog-posts/create")}
      newButtonLabel="New Post"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search title, author..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Posts" value={stats.total} icon={FileText} colorVariant="blue" />
        <StatCardV2 label="Published" value={stats.published} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Draft" value={stats.draft} icon={Layers} colorVariant="amber" />
        <StatCardV2 label="Scheduled" value={stats.scheduled} icon={Clock} colorVariant="blue" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={tabFiltered}
        actions={selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">{selectedIds.length} selected</span>
            <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selected blog posts">
              <X size={12} />
            </button>
          </div>
        ) : undefined}
        searchValue={state.search}
        onRowClick={(r) => navigate(`/dashboard/blog-posts/${r.id}/edit`)}
        onEdit={(r) => navigate(`/dashboard/blog-posts/${r.id}/edit`)}
        onDelete={(r) => void handleDelete(r.id)}
        emptyMessage={query.isLoading ? "Loading posts..." : "No blog posts found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />
    </PageLayout>
  );
};

const blogInputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const BlogFormPage: React.FC<Readonly<{ mode: "create" | "edit" }>> = ({ mode }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = mode === "edit";

  const getQuery = marketingApi.blogs.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.blogs.hooks.useCreate();
  const updateMutation = marketingApi.blogs.hooks.useUpdate();

  const [manualSlug, setManualSlug] = React.useState(false);
  const [coverImageFile, setCoverImageFile] = React.useState<File | null>(null);
  const [existingCoverImage, setExistingCoverImage] = React.useState("");
  const [removedCoverUrls, setRemovedCoverUrls] = React.useState<ReadonlyArray<string>>([]);
  const [form, setForm] = React.useState<BlogForm>({
    title: "",
    slug: "",
    excerpt: "",
    description: "",
    isPublished: false,
    sortOrder: "0",
  });

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const row = (getQuery.data ?? {}) as Record<string, unknown>;
    setForm({
      title: text(row.title),
      slug: text(row.slug),
      excerpt: text(row.excerpt),
      description: text(row.description),
      isPublished: Boolean(row.isPublished),
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : "0",
    });
    setExistingCoverImage(text(row.coverImage));
    setCoverImageFile(null);
    setRemovedCoverUrls([]);
    setManualSlug(false);
  }, [getQuery.data, isEdit]);

  React.useEffect(() => {
    if (manualSlug && form.slug.trim()) return;
    const next = slugify(form.title);
    if (next === form.slug) return;
    setForm((prev) => ({ ...prev, slug: next }));
  }, [form.title, form.slug, manualSlug]);

  const saving = createMutation.isPending || updateMutation.isPending;
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

  const onPickCover = (file: File | null) => {
    if (!file) return;
    if (!isValidImageFile(file)) {
      toast.error("Only image files up to 5MB are allowed.");
      return;
    }
    setCoverImageFile(file);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(blogFormSchema, form, toast);
    if (!parsed) return;
    const payload = {
      title: parsed.title,
      slug: slugify(parsed.slug || parsed.title),
      excerpt: parsed.excerpt?.trim() || undefined,
      description: parsed.description?.trim() || undefined,
      isPublished: parsed.isPublished,
      sortOrder: parsed.sortOrder ?? 0,
      removeUrls: removedCoverUrls.length > 0 ? removedCoverUrls : undefined,
      coverImage: coverImageFile ?? undefined,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate("/dashboard/blog-posts", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading blog post...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Blog Post" : "Create Blog Post"}
      subtitle={isEdit ? "Update blog post details." : "Add a new blog post."}
      onBack={() => navigate("/dashboard/blog-posts")}
    >
      <form onSubmit={onSubmit} className="space-y-[21px]">
        <FormSection title="Main Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Title" required>
              <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={blogInputClass} />
            </FormField>
            <FormField label="Slug" required>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  const next = slugify(e.target.value);
                  setManualSlug(next.length > 0);
                  setForm((p) => ({ ...p, slug: next }));
                }}
                className={blogInputClass}
              />
            </FormField>
            <FormField label="Sort Order">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} className={blogInputClass} />
            </FormField>
            <FormField label="Published">
              <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-3 text-[14px] text-[#1d1d1f]">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                Published
              </label>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Content">
          <FormField label="Excerpt">
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </FormField>
          <FormField label="Description">
            <RichTextEditor
              initialContent={form.description}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Write the blog post content…"
            />
          </FormField>
        </FormSection>

        <FormSection title="Cover Image" description="Only image files are allowed. Max size: 5MB.">
          <div className="space-y-3">
            {coverImageFile ? (
              <ImageCard
                src={previewCover}
                onRemove={() => {
                  setCoverImageFile(null);
                }}
              />
            ) : null}
            {!coverImageFile && existingCoverImage ? (
              <ImageCard
                src={existingCoverImage}
                onRemove={() => {
                  setRemovedCoverUrls((prev) =>
                    prev.includes(existingCoverImage) ? prev : [...prev, existingCoverImage],
                  );
                  setExistingCoverImage("");
                }}
              />
            ) : null}
            {!coverImageFile || !existingCoverImage ? <DropArea onFile={onPickCover} /> : null}
            {existingCoverImage && !coverImageFile ? (
              <p className="text-[12px] text-[#86868b]">
                Upload a new image to replace the current cover image.
              </p>
            ) : null}
            {coverImageFile && existingCoverImage ? (
              <p className="text-[12px] text-[#86868b]">
                The new image will replace the current cover image when you save.
              </p>
            ) : null}
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Post" : "Create Post"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/blog-posts")}
        />
      </form>
    </ModernFormLayout>
  );
};

export const BlogPostCreatePage: React.FC = () => <BlogFormPage mode="create" />;
export const BlogPostEditPage: React.FC = () => <BlogFormPage mode="edit" />;
