import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Trash2 } from "lucide-react";
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
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
import { TableActionsMenu } from "@/shared/components/dashboard/TableActionsMenu";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toRowsArray = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof payload !== "object" || payload === null) return [];
  const row = payload as Record<string, unknown>;
  const directCandidates = [row.data, row.items, row.inquiries, row.results];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    if (typeof candidate === "object" && candidate !== null) {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.data)) {
        return nested.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
      }
      if (Array.isArray(nested.items)) {
        return nested.items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
      }
    }
  }
  return [];
};

type Row = Readonly<{ id: string; customerName: string; email: string; subject: string; message: string; status: string }>;
const resolveStatus = (row: Record<string, unknown>): string => {
  if (row.isHandled === true) return "Resolved";
  const rawStatus = text(row.status, "New").toLowerCase();
  if (rawStatus.includes("resolve") || rawStatus.includes("handled")) return "Resolved";
  return "New";
};

const mapRows = (payload: unknown): ReadonlyArray<Row> => {
  const items = toRowsArray(payload);
  return items.map((entry) => {
    const row = entry;
    return {
      id: text(row.id ?? row._id, crypto.randomUUID()),
      customerName: text(row.customerName ?? row.fullname ?? row.fullName ?? row.name, "Unknown"),
      email: text(row.email, "—"),
      subject: text(row.subject ?? row.targetName ?? row.targetType ?? row.inquiryType, "Inquiry"),
      message: text(row.message, "—"),
      status: resolveStatus(row),
    };
  });
};

export const ProductInquiriesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const confirm = useConfirmAction();

  const query = engagementApi.inquiries.crud.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = engagementApi.inquiries.crud.hooks.useSoftDelete();

  const rows = React.useMemo(() => mapRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const tabFiltered = React.useMemo(() => activeTab === "all" ? rows : rows.filter((r) => r.status.toLowerCase() === activeTab), [rows, activeTab]);
  const visibleIds = React.useMemo(() => tabFiltered.map((r) => r.id), [tabFiltered]);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...visibleIds])) : prev.filter((id) => !visibleIds.includes(id)));

  const stats = React.useMemo(() => ({
    total,
    new: rows.filter((r) => r.status.toLowerCase() === "new").length,
    resolved: rows.filter((r) => r.status.toLowerCase() === "resolved").length,
  }), [rows, total]);

  const handleConfirm = async () => {
    const { ids } = confirm;
    if (!ids.length) return;
    try {
      await softDelete.mutateAsync(ids.join(","));
      await query.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success("Deleted.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  const isLoading = query.isLoading;
  const tabs = [{ key: "all", label: "All" }, { key: "new", label: "New" }, { key: "resolved", label: "Resolved" }];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />,
      render: (r: Row) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleOne(r.id, e.target.checked)} aria-label={`Select ${r.id}`} />
      ),
      width: "44px",
    },
    {
      key: "customer",
      label: "Customer",
      render: (r: Row) => (
        <div>
          <div className="font-medium text-gray-900">{r.customerName}</div>
          <div className="text-xs text-gray-400">{r.email}</div>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject / Message",
      render: (r: Row) => (
        <div>
          <div className="text-sm text-gray-800">{r.subject}</div>
          <div className="text-xs text-gray-400 line-clamp-1">{r.message}</div>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r: Row) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <TableActionsMenu
            triggerLabel="Actions"
            onView={() => navigate(`/dashboard/support/product-inquiries/${r.id}`)}
            onDelete={() => confirm.prompt("delete", [r.id])}
          />
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Product Inquiries"
      subtitle="Support inquiries submitted by customers."
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu basePath="/inquiry" params={{ page: state.page, limit: state.limit, search: debouncedSearch || undefined }} filename="product-inquiries"/>
        </div>
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search inquiries..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Inquiries" value={stats.total} icon={MessageSquare} colorVariant="blue" />
        <StatCardV2 label="New" value={stats.new} icon={MessageSquare} colorVariant="amber" />
        <StatCardV2 label="Resolved" value={stats.resolved} icon={MessageSquare} colorVariant="emerald" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={[...tabFiltered]}
        actions={
          selectedIds.length > 0 ? (
            <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        emptyMessage={isLoading ? "Loading inquiries..." : "No inquiries found."}
        onRowClick={(row) => navigate(`/dashboard/support/product-inquiries/${String(row.id)}`)}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inquiry?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected inquiry(s).</AlertDialogDescription>
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
