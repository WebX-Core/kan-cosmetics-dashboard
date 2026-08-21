import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { List, Clock, Send, AlertCircle, Megaphone, Archive, RotateCcw, Trash2, X } from "lucide-react";
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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
};
const toRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null);
};

type QueueRow = Readonly<{
  id: string;
  to: string;
  subject: string;
  status: string;
  attempts: number;
  createdAt: string;
}>;

const toQueueRows = (payload: unknown): ReadonlyArray<QueueRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    to: text(item.to ?? item.email, "—"),
    subject: text(item.subject, "—"),
    status: text(item.status, "Queued"),
    attempts: num(item.attempts ?? item.retryCount),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isDeletedView = location.pathname === "/dashboard/marketing/email-queue/deleted";
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.emailQueues.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = marketingApi.emailQueues.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = marketingApi.emailQueues.hooks.useSoftDelete();
  const recover = marketingApi.emailQueues.hooks.useRecover();
  const destroy = marketingApi.emailQueues.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toQueueRows(sourceData), [sourceData]);
  const totalPages = (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (sourceData as { total?: number } | undefined)?.total ?? rows.length;

  const allVisibleIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
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
        action === "recover" ? `${ids.length === 1 ? "Queue item" : `${ids.length} queue items`} recovered.`
          : action === "destroy" ? `${ids.length === 1 ? "Queue item" : `${ids.length} queue items`} permanently deleted.`
          : `${ids.length === 1 ? "Queue item" : `${ids.length} queue items`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

  const stats = React.useMemo(
    () => ({
      total,
      queued: rows.filter((row) => row.status.toLowerCase() === "queued").length,
      processing: rows.filter((row) => row.status.toLowerCase() === "processing").length,
      failed: rows.filter((row) => row.status.toLowerCase() === "failed").length,
    }),
    [rows, total],
  );

  const columns = [
    {
      key: "select",
      label: <Checkbox checked={isAllSelected} onCheckedChange={(checked) => toggleAll(Boolean(checked))} aria-label="Select all" />,
      render: (r: QueueRow) => (
        <Checkbox checked={selectedIds.includes(r.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => toggleOne(r.id, Boolean(checked))} aria-label={`Select ${r.to}`} />
      ),
      width: "44px",
    },
    { key: "to", label: "To", render: (r: QueueRow) => <span className="font-medium text-gray-900">{r.to}</span> },
    { key: "subject", label: "Subject", render: (r: QueueRow) => <span className="text-gray-600 line-clamp-1">{r.subject}</span> },
    {
      key: "status",
      label: "Status",
      render: (r: QueueRow) => (
        <StatusBadge
          status={r.status.toLowerCase() === "sent" ? "Active" : r.status.toLowerCase() === "failed" ? "Inactive" : "Pending"}
          label={r.status}
        />
      ),
    },
    { key: "attempts", label: "Attempts", render: (r: QueueRow) => <span className="text-gray-600">{r.attempts}</span> },
    { key: "createdAt", label: "Queued At", render: (r: QueueRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (r: QueueRow) => (
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
      title={isDeletedView ? "Deleted Queue Items" : "Email Queue"}
      subtitle={isDeletedView ? "View soft-deleted email queue entries." : "Outbound email queue and delivery status."}
      onBack={isDeletedView ? () => navigate("/dashboard/marketing/email-queue") : undefined}
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search queue..."
      actions={
        !isDeletedView ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/dashboard/marketing/email-queue/create-from-campaign")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
              <Megaphone size={13} strokeWidth={2} /> From Campaign
            </button>
            <button type="button" onClick={() => navigate("/dashboard/marketing/email-queue/create-from-bucket")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
              <Archive size={13} strokeWidth={2} /> From Bucket
            </button>
          </div>
        ) : undefined
      }
    >
      {!isDeletedView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label="Total in Queue" value={stats.total} icon={List} colorVariant="blue" />
          <StatCardV2 label="Queued" value={stats.queued} icon={Clock} colorVariant="amber" />
          <StatCardV2 label="Processing" value={stats.processing} icon={Send} colorVariant="indigo" />
          <StatCardV2 label="Failed" value={stats.failed} icon={AlertCircle} colorVariant="red" />
        </div>
      ) : null}
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
              <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selection">
                <X size={12} />
              </button>
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onDelete={!isDeletedView ? (row) => confirm.prompt("delete", [row.id]) : undefined}
        emptyMessage={(isDeletedView ? deletedQuery.isLoading : query.isLoading) ? "Loading queue..." : isDeletedView ? "No deleted queue items." : "Email queue is empty."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover queue item?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete queue item?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover" ? "This will restore the queue item." : "This permanently deletes the queue item and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
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
