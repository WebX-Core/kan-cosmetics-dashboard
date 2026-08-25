import React from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Trash2 } from "lucide-react";
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
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.emailRecipientBuckets.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.emailRecipientBuckets.hooks.useSoftDelete();

  const rows = React.useMemo(() => toBucketRows(query.data), [query.data]);
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
      sortValue: (r: BucketRow) => r.name,
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
      sortValue: (r: BucketRow) => r.limit,
      render: (r: BucketRow) => <span className="text-sm text-gray-600">{r.limit || "—"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (r: BucketRow) => r.createdAt,
      render: (r: BucketRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span>,
    },
  ];

  return (
    <PageLayout
      title="Recipient Buckets"
      subtitle="Audience buckets for targeted email campaigns."
      onNew={() => navigate("/dashboard/marketing/email-recipient-buckets/create")}
      newButtonLabel="New Bucket"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search buckets..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardV2 label="Total Buckets" value={total} icon={Archive} colorVariant="blue" />
        <StatCardV2 label="On This Page" value={rows.length} icon={Archive} colorVariant="indigo" />
      </div>

      <DataTableV2
        columns={columns}
        data={rows}
        actions={
          selectedIds.length > 0 ? (
            <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        onEdit={(r) => navigate(`/dashboard/marketing/email-recipient-buckets/${r.id}/edit`)}
        onDelete={(r) => confirm.prompt("delete", [r.id])}
        emptyMessage={query.isLoading ? "Loading buckets..." : "No recipient buckets found."}
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
            <AlertDialogTitle>Delete bucket?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected bucket(s).</AlertDialogDescription>
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
