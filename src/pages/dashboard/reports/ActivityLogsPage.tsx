import React from "react";
import { Activity, TrendingDown, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { telemetryApi } from "@/features/telemetry";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

type ActivityRow = Readonly<{
  id: string;
  user: string;
  action: string;
  entity: string;
  type: string;
  timestamp: string;
}>;

type FunnelRow = Readonly<{
  id: string;
  step: string;
  count: string;
  rate: string;
}>;

const mapActivity = (payload: unknown): ReadonlyArray<ActivityRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(row.id, crypto.randomUUID()),
      user: text(row.user ?? row.actor ?? row.fullname, "Unknown"),
      action: text(row.action, "Activity"),
      entity: text(row.entity, "System"),
      type: text(row.type ?? row.action, "View"),
      timestamp: text(row.timestamp ?? row.createdAt, "—"),
    };
  });
};

const mapFunnel = (payload: unknown): ReadonlyArray<FunnelRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry, i) => {
    const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(row.id, String(i)),
      step: text(row.step ?? row.stage ?? row.name, `Step ${i + 1}`),
      count: String(typeof row.count === "number" ? row.count : row.count ?? "—"),
      rate: text(row.conversionRate ?? row.rate, "—"),
    };
  });
};

const mapDiscard = (payload: unknown): ReadonlyArray<FunnelRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry, i) => {
    const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(row.id, String(i)),
      step: text(row.step ?? row.page ?? row.event, `Event ${i + 1}`),
      count: String(typeof row.count === "number" ? row.count : row.count ?? "—"),
      rate: text(row.discardRate ?? row.rate, "—"),
    };
  });
};

export const ActivityLogsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("activity");

  const activityQuery = telemetryApi.userActivity.crud.hooks.useList();
  const funnelQuery = useQuery({
    queryKey: ["telemetry", "funnel"],
    queryFn: () => telemetryApi.userActivity.funnel(),
    staleTime: 60_000,
  });
  const discardQuery = useQuery({
    queryKey: ["telemetry", "discard-analytics"],
    queryFn: () => telemetryApi.userActivity.discardAnalytics(),
    staleTime: 60_000,
  });

  const activityRows = React.useMemo(() => mapActivity(activityQuery.data), [activityQuery.data]);
  const funnelRows = React.useMemo(() => mapFunnel(funnelQuery.data), [funnelQuery.data]);
  const discardRows = React.useMemo(() => mapDiscard(discardQuery.data), [discardQuery.data]);

  const filteredActivity = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activityRows;
    return activityRows.filter((r) =>
      [r.user, r.action, r.entity, r.type].some((v) => v.toLowerCase().includes(q))
    );
  }, [activityRows, search]);

  const tabs = [
    { key: "activity", label: "Activity Log", count: activityRows.length },
    { key: "funnel", label: "Funnel", count: funnelRows.length },
    { key: "discard", label: "Discard Analytics", count: discardRows.length },
  ];

  const activityColumns = [
    { key: "user", label: "User", render: (r: ActivityRow) => <span className="font-medium text-gray-900">{r.user}</span> },
    { key: "action", label: "Action", render: (r: ActivityRow) => <span className="text-gray-700">{r.action}</span> },
    { key: "entity", label: "Entity", render: (r: ActivityRow) => <span className="text-gray-600">{r.entity}</span> },
    { key: "type", label: "Type", render: (r: ActivityRow) => <StatusBadge status={r.type} /> },
    { key: "timestamp", label: "Time", render: (r: ActivityRow) => <span className="text-xs text-gray-400">{r.timestamp}</span> },
  ];

  const funnelColumns = [
    { key: "step", label: "Step / Stage", render: (r: FunnelRow) => <span className="font-medium text-gray-900">{r.step}</span> },
    { key: "count", label: "Count", render: (r: FunnelRow) => <span className="font-semibold text-gray-900">{r.count}</span> },
    { key: "rate", label: "Rate", render: (r: FunnelRow) => <span className="text-gray-600">{r.rate}</span> },
  ];

  const discardColumns = [
    { key: "step", label: "Page / Event", render: (r: FunnelRow) => <span className="font-medium text-gray-900">{r.step}</span> },
    { key: "count", label: "Discards", render: (r: FunnelRow) => <span className="font-semibold text-gray-900">{r.count}</span> },
    { key: "rate", label: "Discard Rate", render: (r: FunnelRow) => <span className="text-gray-600">{r.rate}</span> },
  ];

  return (
    <PageLayout
      title="Activity & Analytics"
      subtitle="User activity feed, conversion funnel, and discard analytics."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Activity Events" value={activityRows.length} icon={Activity} colorVariant="blue" />
        <StatCardV2 label="Funnel Steps" value={funnelRows.length} icon={Filter} colorVariant="emerald" />
        <StatCardV2 label="Discard Events" value={discardRows.length} icon={TrendingDown} colorVariant="red" />
      </div>

      {activeTab === "activity" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          columns={activityColumns}
          data={filteredActivity}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activity..."
          emptyMessage={activityQuery.isLoading ? "Loading activity..." : "No activity logs found."}
          showPagination={false}
        />
      )}

      {activeTab === "funnel" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          columns={funnelColumns}
          data={funnelRows}
          emptyMessage={funnelQuery.isLoading ? "Loading funnel data..." : "No funnel data available."}
          showPagination={false}
        />
      )}

      {activeTab === "discard" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          columns={discardColumns}
          data={discardRows}
          emptyMessage={discardQuery.isLoading ? "Loading analytics..." : "No discard analytics available."}
          showPagination={false}
        />
      )}
    </PageLayout>
  );
};
