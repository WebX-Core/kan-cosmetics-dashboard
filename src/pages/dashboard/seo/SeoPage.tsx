import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Globe, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { confirmAction } from "@/shared/utils/confirm";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { engagementApi } from "@/features/engagement";
import { queryClient } from "@/shared/api/queryClient";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

// ── constants ──────────────────────────────────────────────────────────────

const SEO_ENTITY_TYPES = [
  "PAGE", "PRODUCT", "CATEGORY", "SUBCATEGORY", "BLOG", "FAQ", "REVIEW",
] as const;

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  entityType: z.string().min(1, "Entity type is required"),
  entityId: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(320).optional(),
  keywords: z.string().trim().optional(),
  canonicalUrl: z.string().trim().optional(),
  ogTitle: z.string().trim().max(95).optional(),
  ogDescription: z.string().trim().max(200).optional(),
  ogImage: z.string().trim().optional(),
  twitterTitle: z.string().trim().max(95).optional(),
  twitterDescription: z.string().trim().max(200).optional(),
  twitterImage: z.string().trim().optional(),
  isIndexable: z.boolean().default(true),
  isOptimized: z.boolean().default(false),
});

type FormState = z.infer<typeof schema>;

const INITIAL: FormState = {
  entityType: "PAGE",
  entityId: "",
  slug: "",
  title: "",
  description: "",
  keywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  isIndexable: true,
  isOptimized: false,
};

// ── helpers ────────────────────────────────────────────────────────────────

const toRows = (data: unknown) => {
  const items: unknown[] = Array.isArray(data)
    ? data
    : ((data as { items?: unknown[]; data?: unknown[] } | undefined)?.items ??
      (data as { data?: unknown[] } | undefined)?.data ??
      []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((i) => ({
      id: String(i.id ?? ""),
      entityType: String(i.entityType ?? ""),
      slug: String(i.slug ?? "—"),
      title: String(i.title ?? "—"),
      description: String(i.description ?? ""),
      isIndexable: Boolean(i.isIndexable !== false),
      isOptimized: Boolean(i.isOptimized === true),
      createdAt: String(i.createdAt ?? ""),
    }));
};

// ── site wide seo card ─────────────────────────────────────────────────────

const SiteWideSeoCard: React.FC = () => {
  const navigate = useNavigate();

  const siteWideQuery = useQuery({
    queryKey: ["seo", "site-wide"],
    queryFn: async () => {
      try {
        return await engagementApi.seo.byPage("global") as Record<string, unknown> | null;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const record = siteWideQuery.data;
  const exists = Boolean(record && (record as Record<string, unknown>).id);
  const seoRecord = exists ? record as Record<string, unknown> : null;

  return (
    <div className="mb-2 rounded-2xl border border-[#d2d2d7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f7ff]">
            <Globe size={18} className="text-[var(--primary)]" />
          </div>
          <div>
            <div className="font-semibold text-[15px] text-[#1d1d1f]">Site Wide SEO</div>
            <div className="text-[12px] text-[#86868b]">
              {exists
                ? `${String(seoRecord!.title ?? "—")} · ${seoRecord!.isIndexable !== false ? "Indexable" : "No-index"}`
                : "No site-wide SEO record yet. Set global meta tags that apply to the entire website."}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (exists) {
              navigate(`/dashboard/seo-metadata/${String(seoRecord!.id)}/edit`);
            } else {
              navigate(`/dashboard/seo-metadata/create?entityType=PAGE&slug=global`);
            }
          }}
          className="shrink-0 flex h-9 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Pencil size={13} />
          {exists ? "Edit" : "Set Up"}
        </button>
      </div>
    </div>
  );
};

// ── list page ──────────────────────────────────────────────────────────────

export const SeoListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const q = engagementApi.seo.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toRows(q.data?.data), [q.data]);
  const totalPages = (q.data as Record<string, unknown> | undefined)?.totalPages as number | undefined ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => engagementApi.seo.service.softDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo"] }),
  });

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirmAction(`Delete "${title}"?`);
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("SEO record deleted.");
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const columns = [
    {
      key: "entityType",
      label: "Entity Type",
      sortValue: (row: (typeof rows)[number]) => row.entityType,
      render: (row: (typeof rows)[number]) => (
        <span className="inline-flex items-center rounded-full bg-[#f0f7ff] px-2 py-0.5 text-[11px] font-medium text-[var(--primary)]">
          {row.entityType}
        </span>
      ),
    },
    {
      key: "title",
      label: "Title",
      sortValue: (row: (typeof rows)[number]) => row.title,
      render: (row: (typeof rows)[number]) => (
        <div>
          <div className="font-medium text-gray-900 truncate max-w-[260px]">{row.title}</div>
          {row.slug !== "—" && <div className="text-xs text-gray-400 font-mono">{row.slug}</div>}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: (typeof rows)[number]) => (
        <span className="text-xs text-gray-500 line-clamp-2 max-w-[240px]">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "indexable",
      label: "Indexable",
      sortValue: (row: (typeof rows)[number]) => (row.isIndexable ? 1 : 0),
      render: (row: (typeof rows)[number]) => (
        <StatusBadge status={row.isIndexable ? "Active" : "Inactive"} />
      ),
    },
    {
      key: "optimized",
      label: "Optimized",
      sortValue: (row: (typeof rows)[number]) => (row.isOptimized ? 1 : 0),
      render: (row: (typeof rows)[number]) => (
        <StatusBadge status={row.isOptimized ? "Active" : "Inactive"} />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: (typeof rows)[number]) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="text-[#1d1d1f] focus:text-[#1d1d1f]"
              onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/seo-metadata/${row.id}/edit`); }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={(e) => { e.stopPropagation(); void handleDelete(row.id, row.title); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="SEO Metadata"
      subtitle="Manage page and entity-level SEO records."
      onNew={() => navigate("/dashboard/seo-metadata/create")}
      newButtonLabel="New SEO Record"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search title, slug…"
    >
      <SiteWideSeoCard />
      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={q.isLoading ? "Loading…" : "No SEO records found."}
        searchValue={state.search}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((p) => ({ ...p, page }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
        onRowClick={(row) => navigate(`/dashboard/seo-metadata/${(row as typeof rows[number]).id}/edit`)}
        rowId={(row) => (row as typeof rows[number]).id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clear) => (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Delete ${ids.size} record(s)?`)) return;
              await Promise.all([...ids].map((id) => deleteMutation.mutateAsync(id)));
              clear();
              toast.success(`${ids.size} record(s) deleted.`);
            }}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} /> Delete selected
          </button>
        )}
      />
    </PageLayout>
  );
};

// ── form page ──────────────────────────────────────────────────────────────

export const SeoFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);

  const prefillEntityType = searchParams.get("entityType") ?? "";
  const prefillEntityId = searchParams.get("entityId") ?? "";
  const prefillSlug = searchParams.get("slug") ?? "";

  const [form, setForm] = React.useState<FormState>(() => ({
    ...INITIAL,
    entityType: prefillEntityType || INITIAL.entityType,
    entityId: prefillEntityId,
    slug: prefillSlug,
  }));
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});

  const existingQuery = useQuery({
    queryKey: ["seo", id],
    queryFn: () => engagementApi.seo.service.get(id!),
    enabled: isEdit && Boolean(id),
  });

  React.useEffect(() => {
    if (!isEdit || !existingQuery.data) return;
    const r = existingQuery.data as Record<string, unknown>;
    const og = (r.openGraph ?? {}) as Record<string, unknown>;
    const tw = (r.twitter ?? {}) as Record<string, unknown>;
    const kw = Array.isArray(r.keywords)
      ? (r.keywords as string[]).join(", ")
      : String(r.keywords ?? "");
    setForm({
      entityType: String(r.entityType ?? "PAGE"),
      entityId: String(r.entityId ?? ""),
      slug: String(r.slug ?? ""),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
      keywords: kw,
      canonicalUrl: String(r.canonicalUrl ?? ""),
      ogTitle: String(og.title ?? ""),
      ogDescription: String(og.description ?? ""),
      ogImage: String(og.image ?? ""),
      twitterTitle: String(tw.title ?? ""),
      twitterDescription: String(tw.description ?? ""),
      twitterImage: String(tw.image ?? ""),
      isIndexable: r.isIndexable !== false,
      isOptimized: r.isOptimized === true,
    });
  }, [existingQuery.data, isEdit]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => engagementApi.seo.service.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ payload }: { payload: Record<string, unknown> }) =>
      engagementApi.seo.service.update(id!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo"] }),
  });

  const set = <K extends keyof FormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const result = schema.safeParse(form);
    if (result.success) { setErrors({}); return result.data; }
    const errs: Partial<Record<keyof FormState, string>> = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as keyof FormState;
      if (!errs[k]) errs[k] = issue.message;
    }
    setErrors(errs);
    return null;
  };

  const buildPayload = (data: FormState) => {
    const keywords = data.keywords
      ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      : undefined;
    const openGraph =
      data.ogTitle || data.ogDescription || data.ogImage
        ? { title: data.ogTitle || undefined, description: data.ogDescription || undefined, image: data.ogImage || undefined }
        : undefined;
    const twitter =
      data.twitterTitle || data.twitterDescription || data.twitterImage
        ? { title: data.twitterTitle || undefined, description: data.twitterDescription || undefined, image: data.twitterImage || undefined }
        : undefined;

    return {
      entityType: data.entityType,
      entityId: data.entityId || undefined,
      slug: data.slug || undefined,
      title: data.title,
      description: data.description || undefined,
      keywords,
      canonicalUrl: data.canonicalUrl || undefined,
      openGraph,
      twitter,
      isIndexable: data.isIndexable,
      isOptimized: data.isOptimized,
    };
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const data = validate();
    if (!data) return;
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ payload: buildPayload(data) });
        toast.success("SEO record updated.");
      } else {
        await createMutation.mutateAsync(buildPayload(data));
        toast.success("SEO record created.");
      }
      navigate("/dashboard/seo-metadata");
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && existingQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit SEO Record" : "New SEO Record"}
      subtitle={isEdit ? "Update SEO metadata for this entity." : "Create a new SEO metadata record."}
      onBack={() => navigate("/dashboard/seo-metadata")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

        <FormSection title="Entity">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Entity Type" required error={errors.entityType}>
              <select value={form.entityType} onChange={set("entityType")} className={`${inputCls} appearance-none`}>
                {SEO_ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Entity ID" error={errors.entityId} hint="UUID of the related entity (optional for PAGE type)">
              <input type="text" value={form.entityId} onChange={set("entityId")} placeholder="Leave blank for page-level SEO" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Slug" error={errors.slug} hint="URL-friendly identifier">
            <input type="text" value={form.slug} onChange={set("slug")} placeholder="e.g. home, about-us" className={inputCls} />
          </FormField>
        </FormSection>

        <FormSection title="Core Meta">
          <FormField label="Title" required error={errors.title} hint="Max 160 characters">
            <input type="text" value={form.title} onChange={set("title")} placeholder="Page title" className={inputCls} />
          </FormField>
          <FormField label="Description" error={errors.description} hint="Max 320 characters">
            <textarea value={form.description} onChange={set("description")} rows={3} placeholder="Meta description" className={`${inputCls} h-auto resize-none py-3`} />
          </FormField>
          <FormField label="Keywords" error={errors.keywords} hint="Comma-separated">
            <input type="text" value={form.keywords} onChange={set("keywords")} placeholder="keyword1, keyword2, keyword3" className={inputCls} />
          </FormField>
          <FormField label="Canonical URL" error={errors.canonicalUrl}>
            <input type="text" value={form.canonicalUrl} onChange={set("canonicalUrl")} placeholder="https://example.com/page" className={inputCls} />
          </FormField>
        </FormSection>

        <FormSection title="Open Graph">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="OG Title" error={errors.ogTitle}>
              <input type="text" value={form.ogTitle} onChange={set("ogTitle")} placeholder="Open Graph title" className={inputCls} />
            </FormField>
            <FormField label="OG Image URL" error={errors.ogImage}>
              <input type="text" value={form.ogImage} onChange={set("ogImage")} placeholder="https://…/og-image.jpg" className={inputCls} />
            </FormField>
          </div>
          <FormField label="OG Description" error={errors.ogDescription}>
            <textarea value={form.ogDescription} onChange={set("ogDescription")} rows={2} placeholder="Open Graph description" className={`${inputCls} h-auto resize-none py-3`} />
          </FormField>
        </FormSection>

        <FormSection title="Twitter Card">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Twitter Title" error={errors.twitterTitle}>
              <input type="text" value={form.twitterTitle} onChange={set("twitterTitle")} placeholder="Twitter card title" className={inputCls} />
            </FormField>
            <FormField label="Twitter Image URL" error={errors.twitterImage}>
              <input type="text" value={form.twitterImage} onChange={set("twitterImage")} placeholder="https://…/twitter-image.jpg" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Twitter Description" error={errors.twitterDescription}>
            <textarea value={form.twitterDescription} onChange={set("twitterDescription")} rows={2} placeholder="Twitter card description" className={`${inputCls} h-auto resize-none py-3`} />
          </FormField>
        </FormSection>

        <FormSection title="Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Indexable">
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 hover:bg-[#f9f9f9]">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${form.isIndexable ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[#d2d2d7] bg-white"}`}>
                  {form.isIndexable && <Globe size={10} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm text-[#1d1d1f]">Allow search engine indexing</span>
                <input type="checkbox" checked={form.isIndexable} onChange={(e) => setForm((p) => ({ ...p, isIndexable: e.target.checked }))} className="sr-only" />
              </label>
            </FormField>
            <FormField label="Optimized">
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d2d2d7] bg-white px-4 hover:bg-[#f9f9f9]">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${form.isOptimized ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[#d2d2d7] bg-white"}`}>
                  {form.isOptimized && <Globe size={10} strokeWidth={3} className="text-white" />}
                </div>
                <span className="text-sm text-[#1d1d1f]">Mark as fully optimized</span>
                <input type="checkbox" checked={form.isOptimized} onChange={(e) => setForm((p) => ({ ...p, isOptimized: e.target.checked }))} className="sr-only" />
              </label>
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel={isSaving ? "Saving…" : isEdit ? "Update Record" : "Create Record"}
          submitIcon={isSaving ? <Loader2 size={13} className="animate-spin" /> : undefined}
          isSubmitting={isSaving}
          onCancel={() => navigate("/dashboard/seo-metadata")}
        />
      </form>
    </ModernFormLayout>
  );
};
