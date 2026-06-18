import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { useOrders } from "@/features/commerce";
import { catalogApi } from "@/features/catalog";
import { useAuditLogList, useUserActivityList, useUserMetadataList } from "@/features/telemetry";

type ReportCard = Readonly<{
  id: string;
  category: string;
  title: string;
  description: string;
  value: string;
  trend: string;
  status: "Ready" | "Draft";
}>;

const readArray = (value: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(value)) return value as ReadonlyArray<Record<string, unknown>>;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as ReadonlyArray<Record<string, unknown>>;
  return [];
};

const toAmount = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
};

export const ReportsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const ordersQuery = useOrders();
  const productsQuery = catalogApi.products.hooks.useList();
  const inventoryQuery = catalogApi.inventory.hooks.useList();
  const auditQuery = useAuditLogList();
  const activityQuery = useUserActivityList();
  const visitorQuery = useUserMetadataList();

  const reports = React.useMemo<ReadonlyArray<ReportCard>>(() => {
    const orders = readArray(ordersQuery.data);
    const inventory = readArray(inventoryQuery.data);
    const products = readArray(productsQuery.data);
    const audits = readArray(auditQuery.data);
    const activities = readArray(activityQuery.data);
    const visitors = readArray(visitorQuery.data);
    const revenue = orders.reduce((sum, row) => sum + toAmount(row.total ?? row.totalAmount), 0);

    return [
      { id: "sales", category: "Sales", title: "Sales Overview", description: "Order volume and gross revenue from live orders.", value: `Rs ${revenue.toLocaleString()}`, trend: `${orders.length} orders`, status: "Ready" },
      { id: "inventory", category: "Inventory", title: "Inventory Health", description: "Current inventory records and stock posture.", value: `${inventory.length}`, trend: "Live records", status: "Ready" },
      { id: "catalog", category: "Catalog", title: "Catalog Coverage", description: "Total product entries currently available.", value: `${products.length}`, trend: "Product count", status: "Ready" },
      { id: "telemetry", category: "Telemetry", title: "Audit, activity, and visitors", description: "Admin audit trail, user activity stream, and visitor metadata volume.", value: `${audits.length + activities.length + visitors.length}`, trend: `${audits.length} audit + ${activities.length} activity + ${visitors.length} visitor records`, status: "Ready" },
    ];
  }, [ordersQuery.data, inventoryQuery.data, productsQuery.data, auditQuery.data, activityQuery.data, visitorQuery.data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => [r.title, r.category, r.description].some((v) => v.toLowerCase().includes(q)));
  }, [reports, search]);

  const loading = ordersQuery.isLoading || productsQuery.isLoading || inventoryQuery.isLoading || auditQuery.isLoading || activityQuery.isLoading || visitorQuery.isLoading;

  return (
    <PageLayout title="Reports" subtitle="Live operational snapshots from integrated APIs.">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports..."
          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
      </div>
      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-400">Loading reports...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((report) => (
            <Link
              key={report.id}
              to={`/dashboard/reports/${report.id}`}
              className="rounded-xl border border-gray-100 bg-white p-5 transition-colors hover:border-[var(--primary)]/20 hover:bg-[var(--primary)]/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{report.category}</p>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900">{report.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{report.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{report.status}</span>
              </div>
              <div className="mt-5 flex items-end justify-between gap-4 rounded-xl bg-gray-50 px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Primary Metric</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{report.value}</p>
                </div>
                <p className="text-sm font-medium text-[var(--primary)]">{report.trend}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
};
