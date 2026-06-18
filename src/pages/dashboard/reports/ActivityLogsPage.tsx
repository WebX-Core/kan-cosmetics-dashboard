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

  const activityQuery = useUserActivityList();
  const visitorQuery = useUserMetadataList({ page: 1, limit: 200 });
  const funnelQuery = useUserActivityFunnel();
  const discardQuery = useUserActivityDiscardAnalytics();

  const activityRows = React.useMemo(
    () => toAnalyticsRows(activityQuery.data, "activity"),
    [activityQuery.data],
  );
  const visitorRows = React.useMemo(
    () => toAnalyticsRows(visitorQuery.data, "visitor"),
    [visitorQuery.data],
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
  const filteredActivity = React.useMemo(
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

  const activityLocations = React.useMemo(
    () => summarizeByField(visitorRows, ["country", "region", "city"]),
    [visitorRows],
  );

  const activityColumns = React.useMemo(
    () =>
      buildColumns(filteredActivity, [
        "activityType",
        "entityType",
        "entityId",
        "userId",
        "customerId",
        "sessionId",
        "path",
        "method",
        "referrer",
        "occurredAt",
      ]),
    [filteredActivity],
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
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search activity..."
          emptyMessage={
            activityQuery.isLoading
              ? "Loading activity..."
              : "No activity logs found."
          }
          showPagination={false}
          rowId={(row) => row.__rowId}
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
            data={visitorRows}
            emptyMessage={
              visitorQuery.isLoading
                ? "Loading visitor metadata..."
                : "No visitor metadata available."
            }
            showPagination={false}
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
          showPagination={false}
          rowId={(row) => row.__rowId}
        />
      )}
    </PageLayout>
  );
};
