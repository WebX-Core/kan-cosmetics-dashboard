import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle, Clock, AlertCircle, Trash2, UserCheck, MailPlus } from "lucide-react";
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

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
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

type RecipientRow = Readonly<{
  id: string;
  email: string;
  name: string;
  campaignId: string;
  status: string;
  createdAt: string;
}>;

const toRecipientRows = (payload: unknown): ReadonlyArray<RecipientRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    email: text(item.email, "—"),
    name: text(item.name, "—"),
    campaignId: text(item.campaignId, "—"),
    status: text(item.status, "Pending"),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailRecipientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.emailRecipients.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.emailRecipients.hooks.useSoftDelete();

  const rows = React.useMemo(() => toRecipientRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() =>
    activeTab === "all" ? rows : rows.filter((r) => r.status.toLowerCase() === activeTab),
    [rows, activeTab],
  );

  const allVisibleIds = React.useMemo(() => filtered.map((r) => r.id), [filtered]);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id));
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

  const stats = React.useMemo(() => ({
    total,
    sent: rows.filter((r) => r.status.toLowerCase() === "sent").length,
    pending: rows.filter((r) => r.status.toLowerCase() === "pending").length,
    failed: rows.filter((r) => r.status.toLowerCase() === "failed").length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "sent", label: "Sent", count: stats.sent },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "failed", label: "Failed", count: stats.failed },
  ];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />,
      render: (r: RecipientRow) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleOne(r.id, e.target.checked)} aria-label={`Select ${r.email}`} />
      ),
      width: "44px",
    },
    {
      key: "recipient",
      label: "Recipient",
      render: (r: RecipientRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          <div className="text-xs text-gray-400">{r.email}</div>
        </div>
      ),
    },
    { key: "campaignId", label: "Campaign ID", render: (r: RecipientRow) => <span className="font-mono text-xs text-gray-500">{r.campaignId}</span> },
    {
      key: "status",
      label: "Status",
      render: (r: RecipientRow) => (
        <StatusBadge
          status={r.status.toLowerCase() === "sent" ? "Active" : r.status.toLowerCase() === "failed" ? "Inactive" : "Pending"}
          label={r.status}
        />
      ),
    },
    { key: "createdAt", label: "Added", render: (r: RecipientRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Email Recipients"
      subtitle="Recipients linked to email campaigns."
      onNew={() => navigate("/dashboard/marketing/email-recipients/create")}
      newButtonLabel="Add Recipient"
      actions={
        <>
          <button
            type="button"
            onClick={() => navigate("/dashboard/marketing/email-recipients/select-audience")}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <UserCheck size={13} strokeWidth={2} /> Select Audience
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/marketing/email-recipients/from-subscribers")}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <MailPlus size={13} strokeWidth={2} /> Import Subscribers
          </button>
        </>
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search recipients..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Recipients" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Sent" value={stats.sent} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Pending" value={stats.pending} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Failed" value={stats.failed} icon={AlertCircle} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        actions={
          selectedIds.length > 0 ? (
            <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        onEdit={(r) => navigate(`/dashboard/marketing/email-recipients/${r.id}/edit`)}
        onDelete={(r) => confirm.prompt("delete", [r.id])}
        emptyMessage={query.isLoading ? "Loading recipients..." : "No recipients found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recipient?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the selected recipient(s).</AlertDialogDescription>
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
