import React from "react";
import { Users, CheckCircle, AlertCircle } from "lucide-react";
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

type SubscriptionRow = Readonly<{
  id: string;
  endpoint: string;
  customerId: string;
  isActive: string;
  createdAt: string;
}>;

const toSubscriptionRows = (payload: unknown): ReadonlyArray<SubscriptionRow> =>
  toRows(payload).map((item) => ({
    id: text(item.id, crypto.randomUUID()),
    endpoint: text(item.endpoint, "—"),
    customerId: text(item.customerId ?? item.userId, "—"),
    isActive: item.isActive === false ? "Inactive" : "Active",
    createdAt: text(item.createdAt, ""),
  }));

export const WebPushSubscriptionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.webPushSubscriptions.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toSubscriptionRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() =>
    activeTab === "all" ? rows : rows.filter((r) => r.isActive.toLowerCase() === activeTab),
    [rows, activeTab],
  );

  const stats = React.useMemo(() => ({
    total,
    active: rows.filter((r) => r.isActive === "Active").length,
    inactive: rows.filter((r) => r.isActive === "Inactive").length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "inactive", label: "Inactive", count: stats.inactive },
  ];

  const columns = [
    { key: "endpoint", label: "Endpoint", render: (r: SubscriptionRow) => <span className="max-w-xs truncate font-mono text-xs text-gray-600">{r.endpoint}</span> },
    { key: "customerId", label: "Customer ID", render: (r: SubscriptionRow) => <span className="font-mono text-xs text-gray-500">{r.customerId}</span> },
    { key: "isActive", label: "Status", render: (r: SubscriptionRow) => <StatusBadge status={r.isActive as "Active" | "Inactive"} /> },
    { key: "createdAt", label: "Subscribed At", render: (r: SubscriptionRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Web Push Subscriptions"
      subtitle="Browser push notification subscriptions."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search subscriptions..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Subscriptions" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactive} icon={AlertCircle} colorVariant="gray" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading subscriptions..." : "No subscriptions found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
