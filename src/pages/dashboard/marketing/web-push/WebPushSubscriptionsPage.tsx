import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
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
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
};

const getRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { data?: { subscriptions?: unknown[] } | unknown[] };
  const rows = Array.isArray(data.data)
    ? data.data
    : Array.isArray((data.data as { subscriptions?: unknown[] } | undefined)?.subscriptions)
      ? (data.data as { subscriptions?: unknown[] }).subscriptions
      : [];

  return rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
};

type SubscriptionRow = Readonly<{
  id: string;
  endpoint: string;
  owner: string;
  isActive: "Active" | "Inactive";
  browser: string;
  platform: string;
  lastSeenAt: string;
  createdAt: string;
}>;

const toSubscriptionRows = (payload: unknown): ReadonlyArray<SubscriptionRow> =>
  getRows(payload).map((item) => {
    const customer = typeof item.customer === "object" && item.customer !== null ? (item.customer as Record<string, unknown>) : null;
    const user = typeof item.user === "object" && item.user !== null ? (item.user as Record<string, unknown>) : null;
    const owner =
      text(customer?.id ?? item.customerId, "") ||
      text(user?.id ?? item.userId, "") ||
      text(item.sessionId, "") ||
      "—";

    return {
      id: text(item.id, crypto.randomUUID()),
      endpoint: text(item.endpoint, "—"),
      owner,
      isActive: item.isActive === false ? "Inactive" : "Active",
      browser: text(item.browser ?? item.userAgent, "—"),
      platform: text(item.platform, "—"),
      lastSeenAt: text(item.lastSeenAt, ""),
      createdAt: text(item.createdAt, ""),
    };
  });

export const WebPushSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDeletedView = location.pathname === "/dashboard/marketing/web-push/subscriptions/deleted";
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

  const filtered = React.useMemo(
    () => (activeTab === "all" ? rows : rows.filter((r) => r.isActive.toLowerCase() === activeTab)),
    [rows, activeTab],
  );

  const stats = React.useMemo(
    () => ({
      total,
      active: rows.filter((r) => r.isActive === "Active").length,
      inactive: rows.filter((r) => r.isActive === "Inactive").length,
    }),
    [rows, total],
  );

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "inactive", label: "Inactive", count: stats.inactive },
  ];

  const columns = [
    {
      key: "endpoint",
      label: "Endpoint",
      render: (r: SubscriptionRow) => (
        <div className="max-w-[26rem]">
          <div className="truncate font-mono text-xs text-[#1d1d1f]">{r.endpoint}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6e6e73]">
            <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 font-medium text-[#1d1d1f]">
              {r.owner}
            </span>
            <span>{r.browser}</span>
          </div>
        </div>
      ),
    },
    {
      key: "platform",
      label: "Platform",
      render: (r: SubscriptionRow) => <span className="text-sm text-[#1d1d1f]">{r.platform}</span>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (r: SubscriptionRow) => <StatusBadge status={r.isActive} />,
    },
    {
      key: "lastSeenAt",
      label: "Last Seen",
      render: (r: SubscriptionRow) => <span className="text-xs text-[#6e6e73]">{fmt(r.lastSeenAt)}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (r: SubscriptionRow) => <span className="text-xs text-[#6e6e73]">{fmt(r.createdAt)}</span>,
    },
    {
      key: "actions",
      label: "",
      render: () => <ChevronRight size={14} className="text-[#86868b]" />,
      width: "44px",
    },
  ];

  return (
    <PageLayout
      title="Web Push Subscriptions"
      subtitle="Browser subscriptions already registered by customers and sessions."
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
        onTabChange={(tab) => {
          setActiveTab(tab);
          setState((p) => ({ ...p, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        onRowClick={!isDeletedView ? (row) => navigate(`/dashboard/marketing/web-push/subscriptions/${row.id}`) : undefined}
        emptyMessage={query.isLoading ? "Loading subscriptions..." : "No subscriptions found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
