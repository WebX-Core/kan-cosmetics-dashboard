import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, CheckCircle, Clock, BarChart2, Trash2, MoreHorizontal, Globe, Pencil } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { engagementApi } from "@/features/engagement";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/api";
import { Checkbox } from "@/shared/components/ui/checkbox";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

type Row = Readonly<{
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  title: string;
  comment: string;
  rating: number;
  image: string;
  isPublished: boolean;
}>;

const mapRows = (payload: unknown): ReadonlyArray<Row> => {
  const p = payload as Record<string, unknown> | undefined;
  const items = Array.isArray(payload) ? payload : Array.isArray(p?.reviews) ? (p.reviews as unknown[]) : ((p?.data) as unknown[] | undefined) ?? [];
  return items
    .filter((e) => {
      const r = (typeof e === "object" && e !== null ? e : {}) as Record<string, unknown>;
      return r.isSite === true || r.isSite === "true";
    })
    .map((entry) => {
      const r = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
      return {
        id: text(r.id, crypto.randomUUID()),
        reviewerName: text(r.reviewerName ?? r.fullname, "Anonymous"),
        reviewerEmail: text(r.reviewerEmail ?? r.email, ""),
        title: text(r.title, ""),
        comment: text(r.comment ?? r.message, ""),
        rating: num(r.rating),
        image: text(r.image ?? r.imageUrl, ""),
        isPublished: Boolean(r.isPublished),
      };
    });
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={12} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
    ))}
  </div>
);

export const TestimonialsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const confirm = useConfirmAction();

  const qc = useQueryClient();

  const liveQuery = useQuery({
    queryKey: ["testimonials", "site", state.page, state.limit, debouncedSearch],
    queryFn: () => engagementApi.reviews.site({ page: state.page, limit: state.limit, search: debouncedSearch || undefined }),
  });

  const publishToggle = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.put(`/review/update/${id}`, new URLSearchParams({ isPublished: String(isPublished), isSite: "true" })),
    onSuccess: () => {
      void liveQuery.refetch();
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });
  const softDelete = engagementApi.reviews.crud.hooks.useSoftDelete();

  const rows = React.useMemo(() => mapRows(liveQuery.data), [liveQuery.data]);
  const totalPages = (liveQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (liveQuery.data as { total?: number } | undefined)?.total ?? rows.length;

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...visibleIds])) : prev.filter((id) => !visibleIds.includes(id)));

  const stats = React.useMemo(() => ({
    total,
    published: rows.filter((r) => r.isPublished).length,
    unpublished: rows.filter((r) => !r.isPublished).length,
    avg: rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "0.0",
  }), [rows, total]);

  const handleConfirm = async () => {
    const { ids } = confirm;
    if (!ids.length) return;
    try {
      await softDelete.mutateAsync(ids.join(","));
      await liveQuery.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success("Deleted.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  const isLoading = liveQuery.isLoading;

  const columns = [
    {
      key: "select",
      label: <Checkbox checked={isAllSelected} onCheckedChange={(checked) => toggleAll(Boolean(checked))} aria-label="Select all" />,
      render: (r: Row) => (
        <Checkbox checked={selectedIds.includes(r.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => toggleOne(r.id, Boolean(checked))} aria-label={`Select ${r.id}`} />
      ),
      width: "44px",
    },
    {
      key: "reviewer", label: "Reviewer",
      sortValue: (r: Row) => r.reviewerName,
      render: (r: Row) => (
        <div className="flex items-center gap-3">
          {r.image ? (
            <img src={r.image} alt={r.reviewerName} className="h-8 w-8 rounded-full object-cover border border-[#e5e5ea] shrink-0" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] font-semibold text-[#86868b]">
              {r.reviewerName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{r.reviewerName}</div>
            <div className="text-xs text-gray-400">{r.reviewerEmail}</div>
          </div>
        </div>
      ),
    },
    {
      key: "content", label: "Content",
      render: (r: Row) => (
        <div>
          {r.title && <div className="text-sm font-medium text-gray-800">{r.title}</div>}
          <div className="text-xs text-gray-400 line-clamp-1">{r.comment || "—"}</div>
        </div>
      ),
    },
    { key: "rating", label: "Rating", sortValue: (r: Row) => r.rating, render: (r: Row) => <Stars rating={r.rating} /> },
    {
      key: "status", label: "Published",
      sortValue: (r: Row) => (r.isPublished ? 1 : 0),
      render: (r: Row) => (
        <button
          type="button"
          role="switch"
          aria-checked={r.isPublished}
          onClick={(e) => { e.stopPropagation(); publishToggle.mutate({ id: r.id, isPublished: !r.isPublished }); }}
          className={`relative h-6 w-11 rounded-full transition-colors ${r.isPublished ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}
          disabled={publishToggle.isPending}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${r.isPublished ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      ),
    },
    {
      key: "actions", label: "",
      render: (r: Row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/dashboard/testimonials/${r.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/dashboard/seo-metadata/create?entityType=REVIEW&entityId=${encodeURIComponent(r.id)}`)}>
                <Globe className="mr-2 h-4 w-4" /> SEO
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirm.prompt("delete", [r.id])}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Testimonials"
      subtitle="Site-wide customer testimonials."
      onNew={() => navigate("/dashboard/testimonials/create")}
      newButtonLabel="New Testimonial"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search testimonials..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total" value={stats.total} icon={Star} colorVariant="blue" />
        <StatCardV2 label="Published" value={stats.published} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Unpublished" value={stats.unpublished} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Avg Rating" value={stats.avg} icon={BarChart2} colorVariant="blue" />
      </div>

      <DataTableV2
        columns={columns}
        data={rows}
        actions={
          selectedIds.length > 0 ? (
            <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        emptyMessage={isLoading ? "Loading testimonials..." : "No testimonials found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((prev) => ({ ...prev, page: 1, limit: size }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected testimonial(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void handleConfirm()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
