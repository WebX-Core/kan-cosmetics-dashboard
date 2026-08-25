import React from "react";
import { useNavigate } from "react-router-dom";
import { List, Clock, Send, AlertCircle, Megaphone, Archive, Trash2, X, RotateCcw, Eye } from "lucide-react";
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
import { parseApiError } from "@/shared/utils/apiError";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const record = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
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
  recipientEmail: string;
  recipientName: string;
  campaignId: string;
  subject: string;
  status: string;
  retryCount: number;
  batchNumber: number;
  scheduledTime: string;
  sentAt: string;
  createdAt: string;
}>;

const toQueueRows = (payload: unknown): ReadonlyArray<QueueRow> =>
  toRows(payload).map((item) => {
    const campaign = record(item.campaign);
    return {
      id: text(item.id, crypto.randomUUID()),
      recipientEmail: text(item.recipientEmail, "—"),
      recipientName: text(item.recipientName, ""),
      campaignId: text(campaign.id, ""),
      subject: text(campaign.subject ?? campaign.title, "—"),
      status: text(item.status, "PENDING"),
      retryCount: num(item.retryCount),
      batchNumber: num(item.batchNumber),
      scheduledTime: text(item.scheduledTime, ""),
      sentAt: text(item.sentAt, ""),
      createdAt: text(item.createdAt, ""),
    };
  });

export const EmailQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [selectedRow, setSelectedRow] = React.useState<QueueRow | null>(null);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const confirm = useConfirmAction();

  const query = marketingApi.emailQueues.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.emailQueues.hooks.useSoftDelete();
  const updateQueue = marketingApi.emailQueues.hooks.useUpdate();

  const rows = React.useMemo(() => toQueueRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const allVisibleIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, ...allVisibleIds])) : prev.filter((id) => !allVisibleIds.includes(id)),
    );

  const handleConfirm = async () => {
    const { ids } = confirm;
    if (!ids.length) return;
    try {
      await softDelete.mutateAsync(ids.join(","));
      await query.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } finally {
      confirm.dismiss();
    }
  };

  const handleRetry = async (row: QueueRow) => {
    if (!row.campaignId) {
      toast.error("Missing campaign reference — cannot retry.");
      return;
    }
    setRetryingId(row.id);
    try {
      await updateQueue.mutateAsync({
        id: row.id,
        dto: { campaignId: row.campaignId, recipientEmail: row.recipientEmail, status: "PENDING" },
      });
      toast.success("Queue item requeued.");
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setRetryingId(null);
    }
  };

  const stats = React.useMemo(
    () => ({
      total,
      queued: rows.filter((row) => row.status.toLowerCase() === "pending").length,
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
        <Checkbox checked={selectedIds.includes(r.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={(checked) => toggleOne(r.id, Boolean(checked))} aria-label={`Select ${r.recipientEmail}`} />
      ),
      width: "44px",
    },
    {
      key: "to",
      label: "To",
      render: (r: QueueRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.recipientEmail}</div>
          {r.recipientName && <div className="text-xs text-gray-500">{r.recipientName}</div>}
        </div>
      ),
    },
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
    { key: "retryCount", label: "Attempts", render: (r: QueueRow) => <span className="text-gray-600">{r.retryCount}</span> },
    { key: "createdAt", label: "Queued At", render: (r: QueueRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
    {
      key: "actions",
      label: "",
      render: (r: QueueRow) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {r.status.toLowerCase() === "failed" && (
            <button
              type="button"
              disabled={retryingId === r.id}
              onClick={() => void handleRetry(r)}
              className="flex items-center gap-1 rounded-full border border-[#d2d2d7] px-2.5 py-1 text-xs font-semibold hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              <RotateCcw size={11} className={retryingId === r.id ? "animate-spin" : ""} />
              {retryingId === r.id ? "Retrying…" : "Retry"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedRow(r)}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label={`View details for email to ${r.recipientEmail}`}
          >
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Email Queue"
      subtitle="Outbound email queue and delivery status."
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search queue..."
      actions={
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/dashboard/marketing/email-queue/create-from-campaign")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
            <Megaphone size={13} strokeWidth={2} /> From Campaign
          </button>
          <button type="button" onClick={() => navigate("/dashboard/marketing/email-queue/create-from-bucket")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
            <Archive size={13} strokeWidth={2} /> From Bucket
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total in Queue" value={stats.total} icon={List} colorVariant="blue" />
        <StatCardV2 label="Pending" value={stats.queued} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Processing" value={stats.processing} icon={Send} colorVariant="indigo" />
        <StatCardV2 label="Failed" value={stats.failed} icon={AlertCircle} colorVariant="red" />
      </div>
      <DataTableV2
        columns={columns}
        data={rows}
        onRowClick={setSelectedRow}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
                <Trash2 size={12} /> Delete ({selectedIds.length})
              </button>
              <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selection">
                <X size={12} />
              </button>
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onDelete={(row) => confirm.prompt("delete", [row.id])}
        emptyMessage={query.isLoading ? "Loading queue..." : "Email queue is empty."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete queue item?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected queue item(s).</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void handleConfirm()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedRow && (
        <AlertDialog open onOpenChange={(open) => !open && setSelectedRow(null)}>
          <AlertDialogContent className="w-[min(94vw,520px)] max-w-none">
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedRow.recipientEmail}</AlertDialogTitle>
              <AlertDialogDescription>Queue item detail</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-xl border border-[#e5e5e7]">
              <table className="w-full border-collapse text-left text-[13px]">
                <tbody>
                  {[
                    ["Recipient", selectedRow.recipientEmail],
                    ["Recipient Name", selectedRow.recipientName || "—"],
                    ["Subject", selectedRow.subject],
                    ["Status", selectedRow.status],
                    ["Attempts", String(selectedRow.retryCount)],
                    ["Batch #", String(selectedRow.batchNumber)],
                    ["Scheduled", fmt(selectedRow.scheduledTime)],
                    ["Sent At", fmt(selectedRow.sentAt)],
                    ["Queued At", fmt(selectedRow.createdAt)],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-[#f0f0f2] last:border-0 align-top">
                      <td className="w-[120px] whitespace-nowrap px-3 py-2 font-medium text-[#424245]">{label}</td>
                      <td className="whitespace-pre-wrap px-3 py-2 text-[#424245]">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              {selectedRow.status.toLowerCase() === "failed" && (
                <AlertDialogAction disabled={retryingId === selectedRow.id} onClick={() => void handleRetry(selectedRow)}>
                  {retryingId === selectedRow.id ? "Retrying…" : "Retry"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageLayout>
  );
};
