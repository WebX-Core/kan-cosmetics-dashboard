import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, RotateCcw, Trash2, CheckCircle, XCircle } from "lucide-react";
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
import { identityApi } from "@/features/identity";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useUserStore } from "@/store/UserStore";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

type PermRow = Readonly<{
  id: string;
  module: string;
  action: string;
  key: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}>;

const toRows = (payload: unknown): ReadonlyArray<PermRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item) => ({
      id: text(item.id),
      module: text(item.module, "—"),
      action: text(item.action, "—"),
      key: text(item.key, "—"),
      description: text(item.description, "—"),
      isActive: item.isActive !== false,
      createdAt: text(item.createdAt, ""),
    }));
};

const fmt = (v: string) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isSudoAdmin = useUserStore((s) => s.user?.role === "SUDOADMIN");
  const isDeletedView = location.pathname.endsWith("/deleted");

  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = identityApi.permissions.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = identityApi.permissions.hooks.useDeleted(
    { page: state.page, limit: state.limit },
    isDeletedView,
  );
  const softDelete = identityApi.permissions.hooks.useSoftDelete();
  const recover = identityApi.permissions.hooks.useRecover();
  const destroy = identityApi.permissions.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toRows(sourceData), [sourceData]);
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
          ? `${ids.length === 1 ? "Permission" : `${ids.length} permissions`} recovered.`
          : action === "destroy"
            ? "Permanently deleted."
            : `${ids.length === 1 ? "Permission" : `${ids.length} permissions`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

  const stats = React.useMemo(
    () => ({
      total,
      active: rows.filter((r) => r.isActive).length,
      inactive: rows.filter((r) => !r.isActive).length,
      modules: new Set(rows.map((r) => r.module).filter((m) => m !== "—")).size,
    }),
    [rows, total],
  );

  const columns = [
    {
      key: "select",
      label: (
        <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
      ),
      render: (r: PermRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => toggleOne(r.id, e.target.checked)}
          aria-label={`Select ${r.key}`}
        />
      ),
      width: "44px",
    },
    {
      key: "key",
      label: "Permission",
      render: (r: PermRow) => (
        <div>
          <div className="font-mono text-sm font-medium text-gray-900">{r.key}</div>
          {r.description !== "—" && <div className="mt-0.5 text-xs text-gray-400">{r.description}</div>}
        </div>
      ),
    },
    {
      key: "module",
      label: "Module",
      render: (r: PermRow) => (
        <span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
          {r.module}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (r: PermRow) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {r.action}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (r: PermRow) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: PermRow) => <span className="text-xs text-gray-400">{fmt(r.createdAt)}</span>,
    },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (r: PermRow) => (
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => confirm.prompt("recover", [r.id])}
                  className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <RotateCcw size={11} /> Recover
                </button>
                {isSudoAdmin && (
                  <button
                    type="button"
                    onClick={() => confirm.prompt("destroy", [r.id])}
                    className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={11} /> Delete Permanently
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Permissions" : "Permissions"}
      subtitle={isDeletedView ? "View soft-deleted permissions." : "Manage granular permission keys for RBAC."}
      onBack={isDeletedView ? () => navigate("/dashboard/rbac/permissions") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/rbac/permissions/create") : undefined}
      newButtonLabel="New Permission"
      actions={
        !isDeletedView && isSudoAdmin ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/rbac/permissions/deleted")}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Trash2 size={13} strokeWidth={2} /> View Deleted
          </button>
        ) : undefined
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search permissions..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCardV2 label="Total" value={stats.total} icon={ShieldCheck} colorVariant="blue" />
          <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
          <StatCardV2 label="Inactive" value={stats.inactive} icon={XCircle} colorVariant="amber" />
          <StatCardV2 label="Modules" value={stats.modules} icon={ShieldCheck} colorVariant="indigo" />
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
                  <button
                    type="button"
                    onClick={() => confirm.prompt("recover", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <RotateCcw size={12} /> Recover ({selectedIds.length})
                  </button>
                  {isSudoAdmin && (
                    <button
                      type="button"
                      onClick={() => confirm.prompt("destroy", selectedIds)}
                      className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={12} /> Delete Permanently ({selectedIds.length})
                    </button>
                  )}
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
        onRowClick={!isDeletedView ? (r) => navigate(`/dashboard/rbac/permissions/${r.id}/edit`) : undefined}
        onEdit={!isDeletedView ? (r) => navigate(`/dashboard/rbac/permissions/${r.id}/edit`) : undefined}
        onDelete={!isDeletedView ? (r) => confirm.prompt("delete", [r.id]) : undefined}
        emptyMessage={
          (isDeletedView ? deletedQuery.isLoading : query.isLoading)
            ? "Loading permissions..."
            : isDeletedView
              ? "No deleted permissions."
              : "No permissions found."
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover"
                ? "Recover permission?"
                : confirm.action === "destroy"
                  ? "Delete permanently?"
                  : "Delete permission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover"
                ? "This will restore the permission."
                : confirm.action === "destroy"
                  ? "This cannot be undone."
                  : "This will move the permission to trash."}
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
