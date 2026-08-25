import React from "react";
import { Inbox, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { EmailLogDetailModal } from "./EmailLogDetailModal";
import type { EmailLogRow } from "./emailLogs.types";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
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

const toLogRows = (payload: unknown): ReadonlyArray<EmailLogRow> =>
  toRows(payload).map((item) => {
    const campaign = record(item.campaign);
    const providerResponse = record(item.providerResponse);
    const sentAt = text(item.sentAt) || text(item.createdAt);
    return {
      id: text(item.id, crypto.randomUUID()),
      recipientEmail: text(item.recipientEmail ?? item.to ?? item.email, "—"),
      campaignTitle: text(campaign.title, "—"),
      subject: text(campaign.subject, "—"),
      status: text(item.status, "—"),
      errorMessage: text(item.errorMessage),
      messageId: text(providerResponse.messageId),
      providerMessage: text(providerResponse.response),
      sentAt: fmt(sentAt),
    };
  });

export const EmailLogsPage: React.FC = () => {
  const toast = useToast();
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedRow, setSelectedRow] = React.useState<EmailLogRow | null>(null);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.emailLogs.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toLogRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() =>
    activeTab === "all" ? rows : rows.filter((r) => r.status.toLowerCase() === activeTab),
    [rows, activeTab],
  );

  const stats = React.useMemo(() => ({
    total,
    delivered: rows.filter((r) => ["delivered", "sent"].includes(r.status.toLowerCase())).length,
    bounced: rows.filter((r) => r.status.toLowerCase() === "bounced").length,
    failed: rows.filter((r) => r.status.toLowerCase() === "failed").length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "delivered", label: "Delivered" },
    { key: "bounced", label: "Bounced" },
    { key: "failed", label: "Failed" },
  ];

  const handleRetry = async (row: EmailLogRow) => {
    setRetryingId(row.id);
    try {
      await marketingApi.retryEmailLog(row.id);
      toast.success("Email queued for retry.");
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setRetryingId(null);
    }
  };

  const columns = [
    { key: "recipientEmail", label: "Who", sortValue: (r: EmailLogRow) => r.recipientEmail, render: (r: EmailLogRow) => <span className="font-medium text-gray-900">{r.recipientEmail}</span> },
    {
      key: "campaign",
      label: "What",
      sortValue: (r: EmailLogRow) => r.campaignTitle,
      render: (r: EmailLogRow) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={["delivered", "sent"].includes(r.status.toLowerCase()) ? "Active" : "Inactive"} label={r.status} />
          <span className="text-gray-700 line-clamp-1">{r.campaignTitle}</span>
        </div>
      ),
    },
    { key: "sentAt", label: "When", render: (r: EmailLogRow) => <span className="text-xs text-gray-500">{r.sentAt}</span> },
    {
      key: "actions",
      label: "",
      render: (r: EmailLogRow) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {r.status.toLowerCase() === "failed" && (
            <button
              type="button"
              disabled={retryingId === r.id}
              onClick={() => void handleRetry(r)}
              className="rounded-full border border-[#d2d2d7] px-3 py-1.5 text-xs font-semibold hover:bg-[#f5f5f7] disabled:opacity-50"
            >
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
      title="Email Logs"
      subtitle="Delivery history and status for all outbound emails."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search logs..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Logs" value={stats.total} icon={Inbox} colorVariant="blue" />
        <StatCardV2 label="Delivered" value={stats.delivered} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Bounced" value={stats.bounced} icon={AlertCircle} colorVariant="amber" />
        <StatCardV2 label="Failed" value={stats.failed} icon={AlertCircle} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        onRowClick={setSelectedRow}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading logs..." : "No email logs found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
      />
      {selectedRow && (
        <EmailLogDetailModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onRetry={(row) => void handleRetry(row)}
          retrying={retryingId === selectedRow.id}
        />
      )}
    </PageLayout>
  );
};
