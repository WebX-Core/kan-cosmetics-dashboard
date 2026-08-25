import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Trash2, CheckCircle, XCircle } from "lucide-react";
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

  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = identityApi.permissions.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = identityApi.permissions.hooks.useSoftDelete();

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const allVisibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);
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
  ];

  return (
    <PageLayout
      title="Permissions"
      subtitle="Manage granular permission keys for RBAC."
      onNew={() => navigate("/dashboard/rbac/permissions/create")}
      newButtonLabel="New Permission"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search permissions..."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCardV2 label="Total" value={stats.total} icon={ShieldCheck} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactive} icon={XCircle} colorVariant="amber" />
        <StatCardV2 label="Modules" value={stats.modules} icon={ShieldCheck} colorVariant="indigo" />
      </div>

      <DataTableV2
        columns={columns}
        data={rows}
        actions={
          selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => confirm.prompt("delete", selectedIds)}
              className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={(r) => navigate(`/dashboard/rbac/permissions/${r.id}/edit`)}
        onEdit={(r) => navigate(`/dashboard/rbac/permissions/${r.id}/edit`)}
        onDelete={(r) => confirm.prompt("delete", [r.id])}
        emptyMessage={query.isLoading ? "Loading permissions..." : "No permissions found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permission?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the permission and cannot be undone.</AlertDialogDescription>
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
