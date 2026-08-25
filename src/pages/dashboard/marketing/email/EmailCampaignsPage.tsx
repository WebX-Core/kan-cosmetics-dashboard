import React from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Send, Clock, FileText, Trash2 } from "lucide-react";
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

type CampaignRow = Readonly<{
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledAt: string;
  createdAt: string;
}>;

const campaignBadgeStatus = (s: string): "Active" | "Inactive" | "Pending" =>
  ["sent", "active"].includes(s.toLowerCase())
    ? "Active"
    : ["failed", "cancelled"].includes(s.toLowerCase())
    ? "Inactive"
    : "Pending";

const toCampaignRows = (payload: unknown): ReadonlyArray<CampaignRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    name: text(item.name, "Untitled Campaign"),
    subject: text(item.subject, "—"),
    status: text(item.status, "Draft"),
    scheduledAt: text(item.scheduledAt, ""),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailCampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const confirm = useConfirmAction();

  const query = marketingApi.emailCampaigns.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.emailCampaigns.hooks.useSoftDelete();

  const rows = React.useMemo(() => toCampaignRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const allVisibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);
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
    scheduled: rows.filter((r) => r.status.toLowerCase() === "scheduled").length,
    draft: rows.filter((r) => r.status.toLowerCase() === "draft").length,
  }), [rows, total]);

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />,
      render: (r: CampaignRow) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleOne(r.id, e.target.checked)} aria-label={`Select ${r.name}`} />
      ),
      width: "44px",
    },
    {
      key: "name",
      label: "Campaign",
      sortValue: (r: CampaignRow) => r.name,
      render: (r: CampaignRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          <div className="text-xs text-gray-400 line-clamp-1">{r.subject}</div>
        </div>
      ),
    },
    { key: "status", label: "Status", sortValue: (r: CampaignRow) => r.status, render: (r: CampaignRow) => <StatusBadge status={campaignBadgeStatus(r.status)} label={r.status} /> },
    { key: "scheduledAt", label: "Scheduled", sortValue: (r: CampaignRow) => r.scheduledAt, render: (r: CampaignRow) => <span className="text-xs text-gray-500">{fmt(r.scheduledAt)}</span> },
    { key: "createdAt", label: "Created", sortValue: (r: CampaignRow) => r.createdAt, render: (r: CampaignRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Email Campaigns"
      subtitle="Manage and monitor email marketing campaigns."
      onNew={() => navigate("/dashboard/marketing/email-campaigns/create")}
      newButtonLabel="New Campaign"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search campaigns..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Campaigns" value={stats.total} icon={Mail} colorVariant="blue" />
        <StatCardV2 label="Sent" value={stats.sent} icon={Send} colorVariant="emerald" />
        <StatCardV2 label="Scheduled" value={stats.scheduled} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Drafts" value={stats.draft} icon={FileText} colorVariant="gray" />
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
        onRowClick={(r) => navigate(`/dashboard/marketing/email-campaigns/${r.id}`)}
        onEdit={(r) => navigate(`/dashboard/marketing/email-campaigns/${r.id}/edit`)}
        onDelete={(r) => confirm.prompt("delete", [r.id])}
        emptyMessage={query.isLoading ? "Loading campaigns..." : "No campaigns found."}
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
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Move {confirm.ids.length === 1 ? "this campaign" : `${confirm.ids.length} campaigns`} to trash.
            </AlertDialogDescription>
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
