import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { useOrders, commerceApi } from "@/features/commerce";
import { catalogApi } from "@/features/catalog";
import { useAuditLogList, useUserActivityList } from "@/features/telemetry";

type Detail = Readonly<{
  id: string;
  category: string;
  title: string;
  description: string;
  value: string;
  trend: string;
  metrics: ReadonlyArray<Readonly<{ label: string; value: string; note: string }>>;
}>;

const rows = (value: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(value)) return value as ReadonlyArray<Record<string, unknown>>;
  if (!value || typeof value !== "object") return [];
  const r = value as Record<string, unknown>;
  return Array.isArray(r.data) ? (r.data as ReadonlyArray<Record<string, unknown>>) : [];
};

const amount = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
};

export const ReportDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const ordersQuery = useOrders();
  const productsQuery = catalogApi.products.hooks.useList();
  const inventoryQuery = catalogApi.inventory.hooks.useList();
  const auditQuery = useAuditLogList();
  const activityQuery = useUserActivityList();
  const salesAnalyticsQuery = useQuery({
    queryKey: ["commerce", "orders", "sales-analytics"],
    queryFn: () => commerceApi.orders.salesAnalytics(),
    staleTime: 60_000,
    enabled: id === "sales",
  });

  const detail = React.useMemo<Detail | null>(() => {
    const orders = rows(ordersQuery.data);
    const products = rows(productsQuery.data);
    const inventory = rows(inventoryQuery.data);
    const audits = rows(auditQuery.data);
    const activities = rows(activityQuery.data);
    const revenue = orders.reduce((sum, row) => sum + amount(row.total ?? row.totalAmount), 0);

    const map: Readonly<Record<string, Detail>> = {
      sales: {
        id: "sales",
        category: "Sales",
        title: "Sales Overview",
        description: "Live order and revenue performance from /order/sales-analytics.",
        value: `Rs ${revenue.toLocaleString()}`,
        trend: `${orders.length} total orders`,
        metrics: (() => {
          const analytics = salesAnalyticsQuery.data;
          const base = [
            { label: "Total Orders", value: String(orders.length), note: "From /order/get-all" },
            { label: "Gross Revenue", value: `Rs ${revenue.toLocaleString()}`, note: "Sum(total || totalAmount)" },
          ];
          if (analytics && typeof analytics === "object") {
            const a = analytics as Record<string, unknown>;
            if (a.totalSales != null) base.push({ label: "Total Sales (analytics)", value: String(a.totalSales), note: "From /order/sales-analytics" });
            if (a.averageOrderValue != null) base.push({ label: "Avg Order Value", value: `Rs ${String(a.averageOrderValue)}`, note: "From /order/sales-analytics" });
          }
          return base;
        })(),
      },
      inventory: {
        id: "inventory",
        category: "Inventory",
        title: "Inventory Health",
        description: "Inventory sizing and availability posture.",
        value: String(inventory.length),
        trend: "Active stock records",
        metrics: [
          { label: "Inventory Records", value: String(inventory.length), note: "From /inventory/get-all" },
          { label: "Products Covered", value: String(products.length), note: "From /product/get-all" },
        ],
      },
      catalog: {
        id: "catalog",
        category: "Catalog",
        title: "Catalog Coverage",
        description: "Current product catalog breadth.",
        value: String(products.length),
        trend: "Product footprint",
        metrics: [
          { label: "Product Records", value: String(products.length), note: "From /product/get-all" },
          { label: "Inventory Links", value: String(inventory.length), note: "Inventory-product association volume" },
        ],
      },
      telemetry: {
        id: "telemetry",
        category: "Telemetry",
        title: "Audit & Activity",
        description: "Cross-cutting action and activity traces.",
        value: String(audits.length + activities.length),
        trend: `${audits.length} audit + ${activities.length} activity`,
        metrics: [
          { label: "Audit Logs", value: String(audits.length), note: "From /audit-log/get-all" },
          { label: "User Activity", value: String(activities.length), note: "From /user-activity/get-all" },
        ],
      },
    };

    return id ? (map[id] ?? null) : null;
  }, [id, ordersQuery.data, productsQuery.data, inventoryQuery.data, auditQuery.data, activityQuery.data, salesAnalyticsQuery.data]);

  if (!detail) {
    return (
      <div className="rounded-[16px] border border-(--line) bg-white p-6">
        <h1 className="text-[24px] font-semibold text-(--text)">Report not found</h1>
        <Button variant="ghost" className="mt-3 px-0" onClick={() => navigate("/dashboard/reports")}><ArrowLeft size={15} />Back To Reports</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate("/dashboard/reports")}><ArrowLeft size={15} />Back To Reports</Button>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--muted)">{detail.category}</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-(--text)">{detail.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-(--muted)">{detail.description}</p>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[16px] border border-(--line) bg-white p-5">
          <h2 className="text-[16px] font-semibold text-(--text)">Summary</h2>
          <div className="mt-4 rounded-[14px] bg-[#f5f5f7] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--muted)">Primary Value</p>
            <p className="mt-2 text-[30px] font-semibold text-(--text)">{detail.value}</p>
            <p className="mt-2 text-sm font-medium text-[#0066cc]">{detail.trend}</p>
          </div>
        </div>

        <div className="rounded-[16px] border border-(--line) bg-white p-5">
          <h2 className="text-[16px] font-semibold text-(--text)">Metrics Breakdown</h2>
          <div className="mt-4 space-y-3">
            {detail.metrics.map((metric) => (
              <div key={metric.label} className="rounded-[14px] bg-[#f5f5f7] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--muted)">{metric.label}</p>
                    <p className="mt-1 text-sm text-(--muted)">{metric.note}</p>
                  </div>
                  <p className="text-[20px] font-semibold text-(--text)">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
