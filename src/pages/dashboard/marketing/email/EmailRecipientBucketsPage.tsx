import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
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
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { Checkbox } from "@/shared/components/ui/checkbox";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};
const toRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null);
};

type BucketRow = Readonly<{
  id: string;
  name: string;
  description: string;
  district: string;
  limit: number;
  minTotalSpent: number;
  maxTotalSpent: number;
  createdAt: string;
}>;

const toBucketRows = (payload: unknown): ReadonlyArray<BucketRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    name: text(item.name, "—"),
    description: text(item.description, ""),
    district: text(item.district, ""),
    limit: num(item.limit),
    minTotalSpent: num(item.minTotalSpent),
    maxTotalSpent: num(item.maxTotalSpent),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailRecipientBucketsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isDeletedView = location.pathname === "/dashboard/marketing/email-recipient-buckets/deleted";
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.emailRecipientBuckets.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = marketingApi.emailRecipientBuckets.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = marketingApi.emailRecipientBuckets.hooks.useSoftDelete();
  const recover = marketingApi.emailRecipientBuckets.hooks.useRecover();
  const destroy = marketingApi.emailRecipientBuckets.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toBucketRows(sourceData), [sourceData]);
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
      toast.success(action === "recover" ? "Recovered." : action === "destroy" ? "Permanently deleted." : "Deleted.");
    } finally {
      confirm.dismiss();
    }
  };

  const columns = [
    {
      key: "select",
      label: <Checkbox checked={isAllSelected} onCheckedChange={(checked) => toggleAll(Boolean(checked))} aria-label="Select all" />,
      render: (r: BucketRow) => (
        <Checkbox checked={selectedIds.includes(r.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => toggleOne(r.id, Boolean(checked))} aria-label={`Select ${r.name}`} />
      ),
      width: "44px",
    },
    {
      key: "name",
      label: "Bucket Name",
      render: (r: BucketRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          {r.description && <div className="text-xs text-gray-400 line-clamp-1">{r.description}</div>}
        </div>
      ),
    },
    {
      key: "district",
      label: "District",
      render: (r: BucketRow) => <span className="text-sm text-gray-600">{r.district || "—"}</span>,
    },
    {
      key: "spent",
      label: "Spent Range",
      render: (r: BucketRow) => {
        if (!r.minTotalSpent && !r.maxTotalSpent) return <span className="text-gray-400">—</span>;
        const min = r.minTotalSpent ? `Rs ${r.minTotalSpent.toLocaleString()}` : "—";
        const max = r.maxTotalSpent ? `Rs ${r.maxTotalSpent.toLocaleString()}` : "—";
        return <span className="text-sm text-gray-600">{min} – {max}</span>;
      },
    },
    {
      key: "limit",
      label: "Limit",
      render: (r: BucketRow) => <span className="text-sm text-gray-600">{r.limit || "—"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: BucketRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span>,
    },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (r: BucketRow) => (
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => confirm.prompt("recover", [r.id])} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                  <RotateCcw size={11} /> Recover
                </button>
                <button type="button" onClick={() => confirm.prompt("destroy", [r.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
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
      title={isDeletedView ? "Deleted Buckets" : "Recipient Buckets"}
      subtitle={isDeletedView ? "View soft-deleted recipient buckets." : "Audience buckets for targeted email campaigns."}
      onBack={isDeletedView ? () => navigate("/dashboard/marketing/email-recipient-buckets") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/marketing/email-recipient-buckets/create") : undefined}
      newButtonLabel="New Bucket"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search buckets..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCardV2 label="Total Buckets" value={total} icon={Archive} colorVariant="blue" />
          <StatCardV2 label="On This Page" value={rows.length} icon={Archive} colorVariant="indigo" />
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
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
        onEdit={!isDeletedView ? (r) => navigate(`/dashboard/marketing/email-recipient-buckets/${r.id}/edit`) : undefined}
        onDelete={!isDeletedView ? (r) => confirm.prompt("delete", [r.id]) : undefined}
        emptyMessage={(isDeletedView ? deletedQuery.isLoading : query.isLoading) ? "Loading buckets..." : "No recipient buckets found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover bucket?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete bucket?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover" ? "This will restore the bucket." : "This permanently deletes the bucket and cannot be undone."}
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
