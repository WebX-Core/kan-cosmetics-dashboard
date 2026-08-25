import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, Clock, Trash2, Send } from "lucide-react";
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
import { formatDateTime, notificationTargetLabel, readString } from "./webPushNotification.utils";

const getRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { data?: { notifications?: unknown[] } | unknown[] };
  const rows: unknown[] = Array.isArray(data.data)
    ? data.data
    : Array.isArray((data.data as { notifications?: unknown[] } | undefined)?.notifications)
      ? (data.data as { notifications?: unknown[] } | undefined)?.notifications ?? []
      : [];

  return rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
};

type NotificationRow = Readonly<{
  id: string;
  title: string;
  body: string;
  target: string;
  status: string;
  scheduledAt: string;
  deliveredAt: string;
  sentAt: string;
  createdAt: string;
}>;

const targetLabel = (row: Record<string, unknown>): string => notificationTargetLabel(row);

const toNotificationRows = (payload: unknown): ReadonlyArray<NotificationRow> =>
  getRows(payload).map((item) => ({
    id: readString(item.id, crypto.randomUUID()),
    title: readString(item.title, "Untitled"),
    body: readString(item.body, "—"),
    target: targetLabel(item),
    status: readString(item.status, "queued"),
    scheduledAt: readString(item.scheduledAt, ""),
    deliveredAt: readString(item.deliveredAt, ""),
    sentAt: readString(item.sentAt, ""),
    createdAt: readString(item.createdAt, ""),
  }));

const normalizeStatus = (status: string): string => {
  const value = status.trim().toLowerCase();
  if (value === "sent") return "delivered";
  return value;
};

export const WebPushNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.webPushNotifications.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.webPushNotifications.hooks.useSoftDelete();

  const rows = React.useMemo(() => toNotificationRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(
    () => (activeTab === "all" ? rows : rows.filter((r) => normalizeStatus(r.status) === activeTab)),
    [rows, activeTab],
  );

  const allVisibleIds = React.useMemo(() => filtered.map((r) => r.id), [filtered]);
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

  const stats = React.useMemo(
    () => ({
      total,
      queued: rows.filter((r) => normalizeStatus(r.status) === "queued").length,
      delivered: rows.filter((r) => normalizeStatus(r.status) === "delivered").length,
      partial: rows.filter((r) => normalizeStatus(r.status) === "partial").length,
      failed: rows.filter((r) => normalizeStatus(r.status) === "failed").length,
    }),
    [rows, total],
  );

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "queued", label: "Queued", count: stats.queued },
    { key: "delivered", label: "Delivered", count: stats.delivered },
    { key: "partial", label: "Partial", count: stats.partial },
    { key: "failed", label: "Failed", count: stats.failed },
  ];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />,
      render: (r: NotificationRow) => (
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
      label: "Notification",
      sortValue: (r: NotificationRow) => r.title,
      render: (r: NotificationRow) => (
        <div className="max-w-[240px]">
          <div className="truncate font-medium text-[#1d1d1f]">{r.title}</div>
          <div className="truncate text-xs text-[#6e6e73]">{r.body}</div>
        </div>
      ),
    },
    {
      key: "target",
      label: "Target",
      width: "140px",
      render: (r: NotificationRow) => <span className="block max-w-[140px] truncate text-xs text-[#6e6e73]" title={r.target}>{r.target}</span>,
    },
    { key: "status", label: "Status", width: "100px", sortValue: (r: NotificationRow) => r.status, render: (r: NotificationRow) => <StatusBadge status={r.status} /> },
    {
      key: "when",
      label: "When",
      width: "140px",
      sortValue: (r: NotificationRow) => r.sentAt || r.deliveredAt || r.scheduledAt || r.createdAt,
      render: (r: NotificationRow) => (
        <span className="text-xs text-[#6e6e73]">
          {formatDateTime(r.sentAt || r.deliveredAt || r.scheduledAt || r.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <PageLayout
      title="Web Push Notifications"
      subtitle="Compose and manage browser push notifications for customers."
      onNew={() => navigate("/dashboard/marketing/web-push/notifications/create")}
      newButtonLabel="New Notification"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search notifications..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total" value={stats.total} icon={Bell} colorVariant="blue" />
        <StatCardV2 label="Queued" value={stats.queued} icon={Send} colorVariant="amber" />
        <StatCardV2 label="Delivered" value={stats.delivered} icon={BellRing} colorVariant="emerald" />
        <StatCardV2 label="Partial / Failed" value={stats.partial + stats.failed} icon={Clock} colorVariant="gray" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setState((p) => ({ ...p, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        actions={
          selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => confirm.prompt("delete", selectedIds)}
              className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={12} />
              Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={(row) => navigate(`/dashboard/marketing/web-push/notifications/${row.id}`)}
        onEdit={(r) => navigate(`/dashboard/marketing/web-push/notifications/${r.id}/edit`)}
        onDelete={(r) => confirm.prompt("delete", [r.id])}
        emptyMessage={query.isLoading ? "Loading notifications..." : "No notifications found."}
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
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected notification(s).</AlertDialogDescription>
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
    </PageLayout>
  );
};
