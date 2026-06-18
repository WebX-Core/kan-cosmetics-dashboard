import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, BellRing, Clock, RotateCcw, Trash2, Send } from "lucide-react";
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
import { useUserStore } from "@/store/UserStore";
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
  const location = useLocation();
  const toast = useToast();
  const isSudoAdmin = useUserStore((s) => s.user?.role === "SUDOADMIN");
  const isDeletedView = location.pathname === "/dashboard/marketing/web-push/notifications/deleted";
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.webPushNotifications.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = marketingApi.webPushNotifications.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = marketingApi.webPushNotifications.hooks.useSoftDelete();
  const recover = marketingApi.webPushNotifications.hooks.useRecover();
  const destroy = marketingApi.webPushNotifications.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toNotificationRows(sourceData), [sourceData]);
  const totalPages = (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (sourceData as { total?: number } | undefined)?.total ?? rows.length;

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
      render: (r: NotificationRow) => (
        <div>
          <div className="font-medium text-[#1d1d1f]">{r.title}</div>
          <div className="line-clamp-1 text-xs text-[#6e6e73]">{r.body}</div>
        </div>
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (r: NotificationRow) => <span className="text-xs text-[#6e6e73]">{r.target}</span>,
    },
    { key: "status", label: "Status", render: (r: NotificationRow) => <StatusBadge status={r.status} /> },
    { key: "sentAt", label: "Sent At", render: (r: NotificationRow) => <span className="text-xs text-[#6e6e73]">{formatDateTime(r.sentAt || r.deliveredAt)}</span> },
    { key: "scheduledAt", label: "Scheduled", render: (r: NotificationRow) => <span className="text-xs text-[#6e6e73]">{formatDateTime(r.scheduledAt)}</span> },
    { key: "createdAt", label: "Created", render: (r: NotificationRow) => <span className="text-xs text-[#6e6e73]">{formatDateTime(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Notifications" : "Web Push Notifications"}
      subtitle={isDeletedView ? "View soft-deleted push notifications." : "Compose and manage browser push notifications for customers."}
      onBack={isDeletedView ? () => navigate("/dashboard/marketing/web-push/notifications") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/marketing/web-push/notifications/create") : undefined}
      newButtonLabel="New Notification"
      actions={
        !isDeletedView && isSudoAdmin ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/marketing/web-push/notifications/deleted")}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Trash2 size={13} strokeWidth={2} />
            View Deleted
          </button>
        ) : undefined
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search notifications..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label="Total" value={stats.total} icon={Bell} colorVariant="blue" />
          <StatCardV2 label="Queued" value={stats.queued} icon={Send} colorVariant="amber" />
          <StatCardV2 label="Delivered" value={stats.delivered} icon={BellRing} colorVariant="emerald" />
          <StatCardV2 label="Partial / Failed" value={stats.partial + stats.failed} icon={Clock} colorVariant="gray" />
        </div>
      )}

      <DataTableV2
        tabs={!isDeletedView ? tabs : undefined}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setState((p) => ({ ...p, page: 1 }));
        }}
        columns={columns}
        data={filtered}
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
                    <RotateCcw size={12} />
                    Recover ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm.prompt("destroy", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={12} />
                    Delete Permanently ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => confirm.prompt("delete", selectedIds)}
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={12} />
                  Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={!isDeletedView ? (row) => navigate(`/dashboard/marketing/web-push/notifications/${row.id}`) : undefined}
        onEdit={!isDeletedView ? (r) => navigate(`/dashboard/marketing/web-push/notifications/${r.id}/edit`) : undefined}
        onDelete={!isDeletedView ? (r) => confirm.prompt("delete", [r.id]) : undefined}
        emptyMessage={(isDeletedView ? deletedQuery.isLoading : query.isLoading) ? "Loading notifications..." : "No notifications found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover notification?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete notification?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover" ? "This will restore the notification." : confirm.action === "destroy" ? "This cannot be undone." : "This will move the notification to trash."}
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
