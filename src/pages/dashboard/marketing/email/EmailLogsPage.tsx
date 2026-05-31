import React from "react";
import { Inbox, CheckCircle, AlertCircle } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

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

type LogRow = Readonly<{
  id: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string;
  createdAt: string;
}>;

const toLogRows = (payload: unknown): ReadonlyArray<LogRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    to: text(item.to ?? item.email, "—"),
    subject: text(item.subject, "—"),
    status: text(item.status, "—"),
    sentAt: text(item.sentAt ?? item.deliveredAt, ""),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("all");
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

  const columns = [
    { key: "to", label: "To", render: (r: LogRow) => <span className="font-medium text-gray-900">{r.to}</span> },
    { key: "subject", label: "Subject", render: (r: LogRow) => <span className="text-gray-600 line-clamp-1">{r.subject}</span> },
    {
      key: "status",
      label: "Status",
      render: (r: LogRow) => (
        <StatusBadge
          status={["delivered", "sent"].includes(r.status.toLowerCase()) ? "Active" : "Inactive"}
          label={r.status}
        />
      ),
    },
    { key: "sentAt", label: "Sent At", render: (r: LogRow) => <span className="text-xs text-gray-500">{fmt(r.sentAt)}</span> },
    { key: "createdAt", label: "Logged At", render: (r: LogRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
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
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading logs..." : "No email logs found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
