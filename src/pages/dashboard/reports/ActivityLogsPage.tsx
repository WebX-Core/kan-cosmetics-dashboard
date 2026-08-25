import React from "react";
import { Activity, Filter, TrendingDown, Users } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import {
  useUserActivityDiscardAnalytics,
  useUserActivityFunnel,
  useUserActivityList,
  useUserMetadataList,
} from "@/features/telemetry";
import {
  formatAnalyticsValue,
  readFirstText,
  toTelemetryRows,
  toText,
  uniqueTextCount,
} from "@/features/telemetry/telemetry.utils";
import { ActivityLogDetailModal } from "./ActivityLogDetailModal";
import type { ActivityRow } from "./activityLogs.types";

type AnalyticsTabKey = "activity" | "visitors" | "funnel" | "discard";

type AnalyticsRow = Readonly<Record<string, unknown>> & Readonly<{
  __rowId: string;
}>;

const formatColumnLabel = (key: string): string =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const toAnalyticsRows = (payload: unknown, prefix: string): ReadonlyArray<AnalyticsRow> =>
  toTelemetryRows(payload).map((row, index) => ({
    ...row,
    __rowId: toText(row.id ?? row._id, `${prefix}-${index}`),
  }));

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const formatActivityType = (value: string): string =>
  value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Activity";

const formatActivityTimestamp = (value: unknown): string => {
  const date = new Date(toText(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const toActivityRow = (row: AnalyticsRow): ActivityRow => {
  const user = record(row.user);
  const customer = record(row.customer);
  const person = record(user).firstname || record(user).lastname ? user : customer;
  const firstname = toText(person.firstname);
  const lastname = toText(person.lastname);
  const fullName = [firstname, lastname].filter(Boolean).join(" ");
  const email = toText(person.email);
  const who = fullName || email || toText(row.sessionId) || "Anonymous";

  const entityType = toText(row.entityType);
  const entityId = toText(row.entityId);
  const entityLabel = entityType
    ? `${formatActivityType(entityType)}${entityId ? ` #${entityId.slice(0, 8)}` : ""}`
    : "—";

  return {
    id: toText(row.id, row.__rowId),
    who,
    activityLabel: formatActivityType(toText(row.activityType, "activity")),
    entityLabel,
    path: toText(row.path, "—"),
    method: toText(row.method, "—"),
    referrer: toText(row.referrer, "—"),
    sessionId: toText(row.sessionId, "—"),
    occurredAtLabel: formatActivityTimestamp(row.occurredAt ?? row.createdAt),
    metadata: row.metadata,
  };
};

const buildColumns = (
  rows: ReadonlyArray<AnalyticsRow>,
  preferredKeys: ReadonlyArray<string>,
  maxColumns = 8,
) => {
  const orderedKeys = new Set<string>();
  preferredKeys.forEach((key) => orderedKeys.add(key));

  rows.slice(0, 20).forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "__rowId") orderedKeys.add(key);
    });
  });

  return [...orderedKeys]
    .filter((key) => rows.some((row) => row[key] !== undefined && row[key] !== null))
    .slice(0, maxColumns)
    .map((key) => ({
      key,
      label: formatColumnLabel(key),
      render: (row: AnalyticsRow) => {
        const value = formatAnalyticsValue(row[key]);
        return (
          <span
            className="block max-w-[18rem] truncate text-sm text-gray-700"
            title={value}
          >
            {value}
          </span>
        );
      },
    }));
};

const filterRows = (
  rows: ReadonlyArray<AnalyticsRow>,
  search: string,
  keys: ReadonlyArray<string>,
): ReadonlyArray<AnalyticsRow> => {
  const q = search.trim().toLowerCase();
  if (!q) return rows;

  return rows.filter((row) =>
    keys.some((key) => {
      const value = row[key];
      if (value == null) return false;
      return formatAnalyticsValue(value).toLowerCase().includes(q);
    }),
  );
};

const summarizeByField = (
  rows: ReadonlyArray<AnalyticsRow>,
  keys: ReadonlyArray<string>,
): ReadonlyArray<Readonly<{ label: string; count: number }>> => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const label = readFirstText(row, keys, "Unknown");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
};

export const ActivityLogsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRow | null>(null);
  const [activeTab, setActiveTab] = React.useState<AnalyticsTabKey>("activity");
  const handleTabChange = React.useCallback((tab: string) => {
    if (
      tab === "activity" ||
      tab === "visitors" ||
      tab === "funnel" ||
      tab === "discard"
    ) {
      setActiveTab(tab);
    }
  }, []);

  const [activityPage, setActivityPage] = React.useState(1);
  const [visitorPage, setVisitorPage] = React.useState(1);
  const [discardPage, setDiscardPage] = React.useState(1);
  const VISITOR_PAGE_SIZE = 20;

  const activityQuery = useUserActivityList({ page: activityPage, limit: 20 });
  const visitorQuery = useUserMetadataList({ page: 1, limit: 200 });
  const funnelQuery = useUserActivityFunnel();
  const discardQuery = useUserActivityDiscardAnalytics({ page: discardPage, limit: 20 });

  const activityTotalPages = (activityQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const discardTotalPages = (discardQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;

  const activityRows = React.useMemo(
    () => toAnalyticsRows(activityQuery.data, "activity"),
    [activityQuery.data],
  );
  const visitorRows = React.useMemo(
    () => toAnalyticsRows(visitorQuery.data, "visitor"),
    [visitorQuery.data],
  );
  const visitorTotalPages = Math.max(1, Math.ceil(visitorRows.length / VISITOR_PAGE_SIZE));
  const visitorPageRows = React.useMemo(
    () => visitorRows.slice((visitorPage - 1) * VISITOR_PAGE_SIZE, visitorPage * VISITOR_PAGE_SIZE),
    [visitorRows, visitorPage],
  );
  const funnelRows = React.useMemo(
    () => toAnalyticsRows(funnelQuery.data, "funnel"),
    [funnelQuery.data],
  );
  const discardRows = React.useMemo(
    () => toAnalyticsRows(discardQuery.data, "discard"),
    [discardQuery.data],
  );

  const visitorSessions = React.useMemo(
    () => uniqueTextCount(visitorRows, ["sessionId"]),
    [visitorRows],
  );
  const visitorLocations = React.useMemo(
    () => uniqueTextCount(visitorRows, ["country", "region", "city"]),
    [visitorRows],
  );
  const filteredActivityRaw = React.useMemo(
    () =>
      filterRows(activityRows, search, [
        "userId",
        "customerId",
        "sessionId",
        "activityType",
        "entityType",
        "entityId",
        "path",
        "method",
        "referrer",
        "occurredAt",
        "createdAt",
      ]),
    [activityRows, search],
  );
  const filteredActivity = React.useMemo(
    () => filteredActivityRaw.map(toActivityRow),
    [filteredActivityRaw],
  );

  const activityLocations = React.useMemo(
    () => summarizeByField(visitorRows, ["country", "region", "city"]),
    [visitorRows],
  );

  const activityColumns = React.useMemo(
    () => [
      { key: "who", label: "Who", render: (r: ActivityRow) => <span className="font-medium text-gray-900">{r.who}</span> },
      { key: "activity", label: "Activity", render: (r: ActivityRow) => <span className="text-gray-700">{r.activityLabel}</span> },
      { key: "entity", label: "On", render: (r: ActivityRow) => <span className="text-gray-600">{r.entityLabel}</span> },
      { key: "path", label: "Page", render: (r: ActivityRow) => <span className="text-xs text-gray-500">{r.path}</span> },
      { key: "occurredAt", label: "When", render: (r: ActivityRow) => <span className="text-xs text-gray-400">{r.occurredAtLabel}</span> },
    ],
    [],
  );
  const visitorColumns = React.useMemo(
    () =>
      buildColumns(visitorRows, [
        "sessionId",
        "userId",
        "customerId",
        "ip",
        "country",
        "region",
        "city",
        "deviceType",
        "device",
        "browser",
        "os",
        "userAgent",
      ]),
    [visitorRows],
  );
  const funnelColumns = React.useMemo(
    () =>
      buildColumns(funnelRows, [
        "step",
        "stage",
        "name",
        "count",
        "sessions",
        "visitors",
        "rate",
        "conversionRate",
        "total",
      ]),
    [funnelRows],
  );
  const discardColumns = React.useMemo(
    () =>
      buildColumns(discardRows, [
        "step",
        "stage",
        "name",
        "count",
        "sessions",
        "visitors",
        "rate",
        "discardRate",
        "total",
      ]),
    [discardRows],
  );

  const tabs = React.useMemo(
    () => [
      { key: "activity", label: "Activity", count: activityRows.length },
      { key: "visitors", label: "Visitors", count: visitorRows.length },
      { key: "funnel", label: "Funnel", count: funnelRows.length },
      { key: "discard", label: "Discard", count: discardRows.length },
    ],
    [activityRows.length, discardRows.length, funnelRows.length, visitorRows.length],
  );

  return (
    <PageLayout
      title="Activity & analytics"
      subtitle="Backend-driven activity, visitor metadata, funnel steps, and discard analytics."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardV2
          label="Activity events"
          value={activityRows.length}
          icon={Activity}
          colorVariant="blue"
        />
        <StatCardV2
          label="Visitor sessions"
          value={visitorSessions}
          icon={Users}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Funnel rows"
          value={funnelRows.length}
          icon={Filter}
          colorVariant="amber"
        />
        <StatCardV2
          label="Discard rows"
          value={discardRows.length}
          icon={TrendingDown}
          colorVariant="red"
        />
      </div>

      {activeTab === "activity" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          columns={activityColumns}
          data={filteredActivity}
          onRowClick={setSelectedActivity}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activity..."
          emptyMessage={
            activityQuery.isLoading
              ? "Loading activity..."
              : "No activity logs found."
          }
          showPagination
          currentPage={activityPage}
          totalPages={activityTotalPages}
          onPageChange={setActivityPage}
          rowId={(row) => row.id}
        />
      )}

      {activeTab === "visitors" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Sessions
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {visitorSessions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Locations
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {visitorLocations.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Raw records
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {visitorRows.length.toLocaleString()}
              </p>
            </div>
          </div>

          {activityLocations.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              {activityLocations.map(({ label, count }) => {
                const pct =
                  visitorRows.length > 0
                    ? Math.max(4, Math.round((count / visitorRows.length) * 100))
                    : 0;

                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs font-semibold text-gray-500">
                        {count.toLocaleString()}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              No visitor metadata returned by the backend.
            </div>
          )}

          <DataTableV2
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            columns={visitorColumns}
            data={visitorPageRows}
            emptyMessage={
              visitorQuery.isLoading
                ? "Loading visitor metadata..."
                : "No visitor metadata available."
            }
            showPagination
            currentPage={visitorPage}
            totalPages={visitorTotalPages}
            onPageChange={setVisitorPage}
            rowId={(row) => row.__rowId}
          />
        </div>
      )}

      {activeTab === "funnel" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          columns={funnelColumns}
          data={funnelRows}
          emptyMessage={
            funnelQuery.isLoading
              ? "Loading funnel data..."
              : "No funnel data available."
          }
          showPagination={false}
          rowId={(row) => row.__rowId}
        />
      )}

      {activeTab === "discard" && (
        <DataTableV2
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          columns={discardColumns}
          data={discardRows}
          emptyMessage={
            discardQuery.isLoading
              ? "Loading discard analytics..."
              : "No discard analytics available."
          }
          showPagination
          currentPage={discardPage}
          totalPages={discardTotalPages}
          onPageChange={setDiscardPage}
          rowId={(row) => row.__rowId}
        />
      )}
      {selectedActivity && (
        <ActivityLogDetailModal row={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </PageLayout>
  );
};
