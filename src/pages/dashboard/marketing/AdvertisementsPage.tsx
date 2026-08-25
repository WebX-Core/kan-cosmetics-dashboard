import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, RotateCcw, Trash2, Target, Search, Archive } from "lucide-react";
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
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { catalogApi } from "@/features/catalog";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type AdRow = Readonly<{
  id: string;
  title: string;
  targetType: string;
  targetMode: string;
  season: string;
  date: string;
  sortOrder: number;
  createdAt: string;
  image: string;
}>;

const toAdRows = (payload: unknown): ReadonlyArray<AdRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item) => ({
      id: text(item.id),
      title: text(item.title, "Untitled"),
      targetType: text(item.targetType, "—"),
      targetMode: text(item.targetMode, "—"),
      season: text(item.season, "—"),
      date: text(item.date, ""),
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
      createdAt: text(item.createdAt, ""),
      image: text(item.image, ""),
    }));
};

export const AdvertisementsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isDeletedView = location.pathname.endsWith("/deleted");

  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [matchContext, setMatchContext] = React.useState({ categoryId: "", subcategoryId: "", productId: "", variantId: "" });
  const [submittedMatchQuery, setSubmittedMatchQuery] = React.useState<typeof matchContext | null>(null);
  const confirm = useConfirmAction();

  const categoriesQuery = catalogApi.categories.hooks.useList({ page: 1, limit: 1000 });
  const subcategoriesQuery = catalogApi.subcategories.hooks.useList({ page: 1, limit: 1000 });
  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 });
  const variantsQuery = catalogApi.productVariants.hooks.useList({ page: 1, limit: 1000 });
  const catalogOptions = (items: ReadonlyArray<Record<string, unknown>>) => items.map((item) => ({ id: text(item.id), label: text(item.title ?? item.name ?? item.sku, "Untitled") })).filter((item) => item.id);

  const matchResults = useQuery({
    queryKey: ["advertisements", "match", submittedMatchQuery],
    queryFn: () => marketingApi.advertisementsMatch(submittedMatchQuery ? {
      categoryId: submittedMatchQuery.categoryId || undefined,
      subcategoryId: submittedMatchQuery.subcategoryId || undefined,
      productId: submittedMatchQuery.productId || undefined,
      variantId: submittedMatchQuery.variantId || undefined,
    } : undefined),
    enabled: Boolean(submittedMatchQuery),
  });

  const query = marketingApi.advertisements.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = marketingApi.advertisements.hooks.useDeleted(
    { page: state.page, limit: state.limit },
    isDeletedView,
  );
  const softDelete = marketingApi.advertisements.hooks.useSoftDelete();
  const recover = marketingApi.advertisements.hooks.useRecover();
  const destroy = marketingApi.advertisements.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toAdRows(sourceData), [sourceData]);
  const totalPages = (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (sourceData as { total?: number } | undefined)?.total ?? rows.length;

  const allVisibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, ...allVisibleIds])) : prev.filter((id) => !allVisibleIds.includes(id)),
    );

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
      toast.success(
        action === "recover"
          ? `${ids.length === 1 ? "Ad" : `${ids.length} ads`} recovered.`
          : action === "destroy"
            ? `${ids.length === 1 ? "Ad" : `${ids.length} ads`} permanently deleted.`
            : `${ids.length === 1 ? "Ad" : `${ids.length} ads`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

  const stats = React.useMemo(
    () => ({
      total,
      seasonal: rows.filter((r) => r.season !== "—").length,
      targeted: rows.filter((r) => r.targetType !== "—").length,
    }),
    [rows, total],
  );

  const columns = [
    {
      key: "select",
      label: (
        <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
      ),
      render: (r: AdRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => toggleOne(r.id, e.target.checked)}
          aria-label={`Select ${r.title}`}
        />
      ),
      width: "44px",
    },
    {
      key: "title",
      label: "Advertisement",
      sortValue: (r: AdRow) => r.title,
      render: (r: AdRow) => (
        <div className="flex items-center gap-3">
          {r.image ? <img src={r.image} alt="" className="h-10 w-16 rounded-lg border border-[#e5e5ea] object-cover" /> : null}
          <div>
          <div className="font-medium text-gray-900">{r.title}</div>
          {r.date ? <div className="text-xs text-gray-400">{fmt(r.date)}</div> : null}
          </div>
        </div>
      ),
    },
    {
      key: "targetType",
      label: "Target Type",
      sortValue: (r: AdRow) => r.targetType,
      render: (r: AdRow) => (
        <StatusBadge
          status={r.targetType !== "—" ? "Active" : "Inactive"}
          label={r.targetType}
        />
      ),
    },
    {
      key: "targetMode",
      label: "Mode",
      sortValue: (r: AdRow) => r.targetMode,
      render: (r: AdRow) => <span className="text-sm text-gray-600">{r.targetMode}</span>,
    },
    {
      key: "season",
      label: "Season",
      sortValue: (r: AdRow) => r.season,
      render: (r: AdRow) => <span className="text-sm text-gray-600">{r.season}</span>,
    },
    {
      key: "sortOrder",
      label: "Order",
      sortValue: (r: AdRow) => r.sortOrder,
      render: (r: AdRow) => <span className="text-sm text-gray-500">{r.sortOrder || "—"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (r: AdRow) => r.createdAt,
      render: (r: AdRow) => <span className="text-xs text-gray-400">{fmt(r.createdAt)}</span>,
    },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (r: AdRow) => (
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => confirm.prompt("recover", [r.id])}
                  className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <RotateCcw size={11} /> Recover
                </button>
                <button
                  type="button"
                  onClick={() => confirm.prompt("destroy", [r.id])}
                  className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={11} /> Delete Permanently
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Advertisements" : "Advertisements"}
      subtitle={isDeletedView ? "View soft-deleted ads." : "Manage promotional banners and targeted advertisements."}
      onBack={isDeletedView ? () => navigate("/dashboard/advertisements") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/advertisements/create") : undefined}
      newButtonLabel="New Ad"
      actions={!isDeletedView ? <button type="button" onClick={() => navigate("/dashboard/advertisements/deleted")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"><Archive size={13} /> Deleted Ads</button> : undefined}
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search advertisements..."
    >
      {!isDeletedView && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCardV2 label="Total Ads" value={stats.total} icon={Megaphone} colorVariant="blue" />
            <StatCardV2 label="Seasonal" value={stats.seasonal} icon={Target} colorVariant="amber" />
            <StatCardV2 label="Targeted" value={stats.targeted} icon={Target} colorVariant="indigo" />
          </div>

          <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 space-y-2">
            <p className="text-sm font-medium text-[#1d1d1f]">Match Advertisements</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {([
                ["categoryId", "Category", catalogOptions(categoriesQuery.data?.data ?? [])],
                ["subcategoryId", "Subcategory", catalogOptions(subcategoriesQuery.data?.data ?? [])],
                ["productId", "Product", catalogOptions(productsQuery.data?.data ?? [])],
                ["variantId", "Variant", catalogOptions(variantsQuery.data?.data ?? [])],
              ] as const).map(([key, label, options]) => <select key={key} value={matchContext[key]} onChange={(event) => setMatchContext((previous) => ({ ...previous, [key]: event.target.value }))} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"><option value="">{label}: Any</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>)}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSubmittedMatchQuery(matchContext)}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                <Search size={14} /> Match
              </button>
              {submittedMatchQuery && (
                <button type="button" onClick={() => { setMatchContext({ categoryId: "", subcategoryId: "", productId: "", variantId: "" }); setSubmittedMatchQuery(null); }} className="flex h-10 shrink-0 items-center rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]">
                  Clear
                </button>
              )}
            </div>
            {matchResults.isLoading && <p className="text-xs text-[#86868b]">Matching…</p>}
            {matchResults.isError && <p className="text-xs text-red-600">Match query failed.</p>}
            {Boolean(matchResults.data) && !matchResults.isLoading && (
              <div className="rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] p-3">
                <p className="text-xs font-medium text-[#86868b] mb-1">Match results</p>
                <pre className="text-xs text-[#1d1d1f] whitespace-pre-wrap break-all">
                  {JSON.stringify(matchResults.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              {isDeletedView ? (
                <>
                  <button
                    type="button"
                    onClick={() => confirm.prompt("recover", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <RotateCcw size={12} /> Recover ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm.prompt("destroy", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={12} /> Delete Permanently ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => confirm.prompt("delete", selectedIds)}
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={12} /> Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={!isDeletedView ? (r) => navigate(`/dashboard/advertisements/${r.id}/edit`) : undefined}
        onEdit={!isDeletedView ? (r) => navigate(`/dashboard/advertisements/${r.id}/edit`) : undefined}
        onDelete={!isDeletedView ? (r) => confirm.prompt("delete", [r.id]) : undefined}
        emptyMessage={
          (isDeletedView ? deletedQuery.isLoading : query.isLoading)
            ? "Loading ads..."
            : isDeletedView
              ? "No deleted advertisements."
              : "No advertisements found."
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover"
                ? "Recover advertisement?"
                : confirm.action === "destroy"
                  ? "Delete permanently?"
                  : "Delete advertisement?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover"
                ? `Recover ${confirm.ids.length === 1 ? "this ad" : `${confirm.ids.length} ads`}.`
                : confirm.action === "destroy"
                  ? "This cannot be undone."
                  : `Move ${confirm.ids.length === 1 ? "this ad" : `${confirm.ids.length} ads`} to trash.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm.action === "recover"
                  ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  : "rounded-full bg-red-600 text-white hover:bg-red-700"
              }
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
