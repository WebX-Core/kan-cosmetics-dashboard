import React from "react";
import { List, Clock, Send, AlertCircle } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
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

type QueueRow = Readonly<{
  id: string;
  to: string;
  subject: string;
  status: string;
  attempts: number;
  createdAt: string;
}>;

const toQueueRows = (payload: unknown): ReadonlyArray<QueueRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    to: text(item.to ?? item.email, "—"),
    subject: text(item.subject, "—"),
    status: text(item.status, "Queued"),
    attempts: num(item.attempts ?? item.retryCount),
    createdAt: text(item.createdAt, ""),
  }));

export const EmailQueuePage: React.FC = () => {
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.emailQueues.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toQueueRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const stats = React.useMemo(() => ({
    total,
    queued: rows.filter((r) => r.status.toLowerCase() === "queued").length,
    processing: rows.filter((r) => r.status.toLowerCase() === "processing").length,
    failed: rows.filter((r) => r.status.toLowerCase() === "failed").length,
  }), [rows, total]);

  const columns = [
    { key: "to", label: "To", render: (r: QueueRow) => <span className="font-medium text-gray-900">{r.to}</span> },
    { key: "subject", label: "Subject", render: (r: QueueRow) => <span className="text-gray-600 line-clamp-1">{r.subject}</span> },
    {
      key: "status",
      label: "Status",
      render: (r: QueueRow) => (
        <StatusBadge
          status={r.status.toLowerCase() === "sent" ? "Active" : r.status.toLowerCase() === "failed" ? "Inactive" : "Pending"}
          label={r.status}
        />
      ),
    },
    { key: "attempts", label: "Attempts", render: (r: QueueRow) => <span className="text-gray-600">{r.attempts}</span> },
    { key: "createdAt", label: "Queued At", render: (r: QueueRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Email Queue"
      subtitle="Outbound email queue and delivery status."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search queue..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total in Queue" value={stats.total} icon={List} colorVariant="blue" />
        <StatCardV2 label="Queued" value={stats.queued} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Processing" value={stats.processing} icon={Send} colorVariant="indigo" />
        <StatCardV2 label="Failed" value={stats.failed} icon={AlertCircle} colorVariant="red" />
      </div>
      <DataTableV2
        columns={columns}
        data={rows}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading queue..." : "Email queue is empty."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
