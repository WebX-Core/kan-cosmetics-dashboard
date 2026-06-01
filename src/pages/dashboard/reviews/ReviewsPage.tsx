import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, CheckCircle, Clock, XCircle, BarChart2, Trash2, RotateCcw, Globe, MoreHorizontal } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
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
import { engagementApi } from "@/features/engagement";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useUserStore } from "@/store/UserStore";
import { parseApiError } from "@/shared/utils/apiError";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const num = (value: unknown): number => (typeof value === "number" ? value : 0);

type Row = Readonly<{ id: string; productName: string; customerName: string; rating: number; comment: string; status: string; type: string }>;

const mapRows = (payload: unknown): ReadonlyArray<Row> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    const s = text(row.status, "Pending");
    return {
      id: text(row.id, crypto.randomUUID()),
      productName: text(row.productName ?? row.title, "Review"),
      customerName: text(row.customerName ?? row.fullname, "Anonymous"),
      rating: num(row.rating),
      comment: text(row.comment ?? row.message, "—"),
      status: s.toLowerCase().includes("reject") ? "Rejected" : s.toLowerCase().includes("publish") ? "Published" : "Pending",
      type: text(row.type, "Product").toLowerCase().includes("site") ? "Site" : "Product",
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

const LIVE_PATH = "/dashboard/reviews";
const DELETED_PATH = "/dashboard/reviews/deleted";

export const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isSudoAdmin = useUserStore((s) => s.user?.role === "SUDOADMIN");
  const isDeletedView = location.pathname === DELETED_PATH;

  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const confirm = useConfirmAction();

  const query = engagementApi.reviews.crud.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = engagementApi.reviews.crud.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = engagementApi.reviews.crud.hooks.useSoftDelete();
  const recover = engagementApi.reviews.crud.hooks.useRecover();
  const destroy = engagementApi.reviews.crud.hooks.useDestroy();
  const siteQuery = useQuery({
    queryKey: ["reviews", "site", state.page, state.limit],
    queryFn: () => engagementApi.reviews.site({ page: state.page, limit: state.limit }),
    enabled: activeTab === "site" && !isDeletedView,
  });

  const sourceData = isDeletedView ? deletedQuery.data : activeTab === "site" ? siteQuery.data : query.data;
  const rows = React.useMemo(() => mapRows(sourceData), [sourceData]);
  const totalPages = (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (sourceData as { total?: number } | undefined)?.total ?? rows.length;

  const tabFiltered = React.useMemo(() =>
    activeTab === "all" || activeTab === "site" ? rows : rows.filter((r) => r.status.toLowerCase() === activeTab),
  [rows, activeTab]);
  const visibleIds = React.useMemo(() => tabFiltered.map((r) => r.id), [tabFiltered]);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...visibleIds])) : prev.filter((id) => !visibleIds.includes(id)));

  const stats = React.useMemo(() => ({
    total,
    published: rows.filter((r) => r.status === "Published").length,
    pending: rows.filter((r) => r.status === "Pending").length,
    rejected: rows.filter((r) => r.status === "Rejected").length,
    avgRating: rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "0.0",
  }), [rows, total]);

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (!ids.length) return;
    try {
      if (action === "delete") await softDelete.mutateAsync(ids.join(","));
      if (action === "recover") await recover.mutateAsync({ ids });
      if (action === "destroy") await destroy.mutateAsync(ids.join(","));
      await query.refetch();
      await deletedQuery.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success(action === "recover" ? "Recovered." : action === "destroy" ? "Permanently deleted." : "Deleted.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  const isLoading = isDeletedView ? deletedQuery.isLoading : activeTab === "site" ? siteQuery.isLoading : query.isLoading;
  const tabs = [{ key: "all", label: "All" }, { key: "published", label: "Published" }, { key: "pending", label: "Pending" }, { key: "rejected", label: "Rejected" }, { key: "site", label: "Site Reviews" }];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all reviews" />,
      render: (r: Row) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleOne(r.id, e.target.checked)} aria-label={`Select ${r.id}`} />
      ),
      width: "44px",
    },
    {
      key: "review", label: "Review",
      render: (r: Row) => (
        <div>
          <div className="font-medium text-gray-900">{r.productName}</div>
          <div className="text-xs text-gray-400">{r.customerName} · <span className="line-clamp-1">{r.comment}</span></div>
        </div>
      ),
    },
    { key: "rating", label: "Rating", render: (r: Row) => <Stars rating={r.rating} /> },
    { key: "type", label: "Type", render: (r: Row) => <span className="text-gray-600">{r.type}</span> },
    { key: "status", label: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
    {
      key: "actions", label: "",
      render: (r: Row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {isDeletedView ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => confirm.prompt("recover", [r.id])} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                <RotateCcw size={11} /> Recover
              </button>
              <button type="button" onClick={() => confirm.prompt("destroy", [r.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                <Trash2 size={11} /> Delete Permanently
              </button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <MoreHorizontal size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/dashboard/seo-metadata/create?entityType=REVIEW&entityId=${encodeURIComponent(r.id)}`)}>
                  <Globe className="mr-2 h-4 w-4" /> SEO
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => confirm.prompt("delete", [r.id])}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Reviews" : "Reviews"}
      subtitle={isDeletedView ? "Deleted review records." : "Moderate product and site reviews."}
      onBack={isDeletedView ? () => navigate(LIVE_PATH) : undefined}
      actions={
        !isDeletedView && isSudoAdmin ? (
          <button type="button" onClick={() => navigate(DELETED_PATH)} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
            <Trash2 size={13} strokeWidth={2} /> View Deleted
          </button>
        ) : undefined
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search reviews..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCardV2 label="Total" value={stats.total} icon={Star} colorVariant="blue" />
          <StatCardV2 label="Published" value={stats.published} icon={CheckCircle} colorVariant="emerald" />
          <StatCardV2 label="Pending" value={stats.pending} icon={Clock} colorVariant="amber" />
          <StatCardV2 label="Rejected" value={stats.rejected} icon={XCircle} colorVariant="red" />
          <StatCardV2 label="Avg Rating" value={stats.avgRating} icon={BarChart2} colorVariant="blue" />
        </div>
      )}

      <DataTableV2
        tabs={!isDeletedView ? tabs : undefined}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={tabFiltered}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              {isDeletedView ? (
                <>
                  <button type="button" onClick={() => confirm.prompt("recover", selectedIds)} className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    <RotateCcw size={12} /> Recover ({selectedIds.length})
                  </button>
                  <button type="button" onClick={() => confirm.prompt("destroy", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
                    <Trash2 size={12} /> Delete Permanently ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
                  <Trash2 size={12} /> Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        emptyMessage={isLoading ? "Loading reviews..." : "No reviews found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover review?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete review?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover" ? "This will restore the selected review." : confirm.action === "destroy" ? "This cannot be undone." : "This will move the review to trash."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm.action === "recover" ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700" : "rounded-full bg-red-600 text-white hover:bg-red-700"}
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "recover" ? "Recover" : confirm.action === "destroy" ? "Delete Permanently" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
