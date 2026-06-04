import React from "react";
import {
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Truck,
  FileText,
  CheckCircle2,
  RotateCcw,
  BarChart2,
  ShoppingCart,
} from "lucide-react";
import { useOrders, usePaymentsAggregate } from "@/features/commerce";
import { catalogApi } from "@/features/catalog";
import { useInquiryList, useSiteInquiryList } from "@/features/engagement";
import { useAdminUsersList } from "@/features/adminUsers";

// ──────────────────────────────────────────────
// Sales Overview interactive line chart
// ──────────────────────────────────────────────
const SalesLineChart: React.FC<{ months: string[]; values: number[] }> = ({
  months,
  values,
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const maxValue = Math.max(...values, 1);
  const yMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
  const yLevels = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const W = 520, H = 200, pL = 36, pR = 12, pT = 22, pB = 28;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = months.length;

  const pts = months.map((_, i) => ({
    x: n > 1 ? pL + (i / (n - 1)) * cW : pL + cW / 2,
    y: pT + cH - (values[i] / yMax) * cH,
  }));

  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaD = pts.length > 0
    ? `${pathD} L ${pts[pts.length - 1].x} ${pT + cH} L ${pts[0].x} ${pT + cH} Z`
    : "";

  const colW = n > 1 ? cW / (n - 1) : cW;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 200 }}
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="salesLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0071e3" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0071e3" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Vertical hover line */}
      {hovered !== null && (
        <line
          x1={pts[hovered].x}
          y1={pT}
          x2={pts[hovered].x}
          y2={pT + cH}
          stroke="#0071e3"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.4}
        />
      )}

      {/* Grid lines + Y labels */}
      {yLevels.map((v) => {
        const y = pT + cH - (v / yMax) * cH;
        return (
          <g key={v}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="var(--line-soft)" strokeWidth={1} />
            <text x={pL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-tertiary)">
              {v === 0 ? "0" : `${Math.round(v / 1000)}K`}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      {areaD && <path d={areaD} fill="url(#salesLineGrad)" />}

      {/* Line */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="#0071e3"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Per-point: X label, hover zone, dot, tooltip */}
      {pts.map((pt, i) => {
        const isHovered = hovered === i;
        const tooltipX = Math.min(Math.max(pt.x - 38, pL), W - pR - 76);
        const tooltipY = pt.y - 36;
        return (
          <g key={months[i]}>
            <text x={pt.x} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">
              {months[i]}
            </text>

            {/* Invisible wide hit area */}
            <rect
              x={pt.x - colW / 2}
              y={pT}
              width={colW}
              height={cH}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onMouseEnter={() => setHovered(i)}
            />

            {/* Dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isHovered ? 5.5 : 3}
              fill={isHovered ? "#0071e3" : "white"}
              stroke="#0071e3"
              strokeWidth={2}
              style={{ transition: "r 100ms ease, fill 100ms ease" }}
              pointerEvents="none"
            />

            {/* Tooltip */}
            {isHovered && (
              <g pointerEvents="none">
                <rect x={tooltipX} y={tooltipY} width={76} height={24} rx={6} fill="#1d1d1f" opacity={0.88} />
                <text x={tooltipX + 38} y={tooltipY + 15} textAnchor="middle" fontSize={11} fill="white" fontWeight="600">
                  {values[i].toLocaleString()}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ──────────────────────────────────────────────
// Stat card top icons (small SVG icons)
// ──────────────────────────────────────────────
const CoinIcon = () => (
  <img
    src="/logo/nrs.png"
    alt="NRS"
    className="h-[18px] w-[18px] object-contain"
  />
);

const toText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const toNum = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
};
const formatDate = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const readFirstText = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
};
const readFirstNum = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = 0,
): number => {
  for (const key of keys) {
    const value = row[key];
    const parsed = toNum(value);
    if (parsed > 0) return parsed;
  }
  return fallback;
};
const formatNpr = (value: number): string =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);
const getCutoffTime = (range: "7d" | "1m" | "6m" | "12m" | "30d"): number => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "7d") return now - 7 * day;
  if (range === "1m" || range === "30d") return now - 30 * day;
  if (range === "6m") return now - 183 * day;
  if (range === "12m") return now - 365 * day;
  return now - 30 * day;
};

const orderStatusStyle: Record<
  "Processing" | "Shipped" | "Pending" | "Delivered" | "Cancelled",
  string
> = {
  Pending: "bg-amber-100 text-amber-800",
  Processing: "bg-sky-100 text-sky-800",
  Shipped: "bg-blue-100 text-blue-800",
  Delivered: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-red-100 text-red-800",
};

const inquiryStatusStyle: Record<"New" | "In Progress" | "Resolved", string> = {
  New: "bg-amber-100 text-amber-800",
  "In Progress": "bg-sky-100 text-sky-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

const inquiryTypeStyle: Record<"Product" | "Site", string> = {
  Product:
    "bg-[color-mix(in_srgb,var(--primary)_16%,white)] text-[var(--badge-primary-text)]",
  Site: "bg-slate-100 text-slate-700",
};
type PaymentRow = Readonly<{
  amount: number;
  status: "Completed" | "Pending" | "Failed" | "Refunded";
  date: string;
}>;
const normalizePaymentStatus = (value: unknown): PaymentRow["status"] => {
  const status = toText(value, "pending").toLowerCase();
  if (
    status.includes("complete") ||
    status.includes("paid") ||
    status.includes("success")
  )
    return "Completed";
  if (status.includes("refund")) return "Refunded";
  if (status.includes("fail")) return "Failed";
  return "Pending";
};
const toPaymentRows = (payload: unknown): ReadonlyArray<PaymentRow> => {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return rows.map((entry) => {
    const row = toRecord(entry);
    return {
      amount: toNum(row.amount ?? row.totalAmount),
      status: normalizePaymentStatus(row.status),
      date: toText(row.date ?? row.createdAt),
    };
  });
};
const useCountUp = (value: number, durationMs = 900): number => {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, value) : 0;
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (time: number) => {
      const elapsed = Math.min(1, (time - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(target * eased));
      if (elapsed < 1) rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return display;
};

// ──────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────
export const DashboardOverviewPage: React.FC = () => {
  const [salesRange, setSalesRange] = React.useState<
    "7d" | "1m" | "6m" | "12m"
  >("6m");
  const [topProductsRange, setTopProductsRange] = React.useState<"7d" | "30d">(
    "7d",
  );
  const [categoryRange, setCategoryRange] = React.useState<
    "7d" | "1m" | "6m" | "12m"
  >("6m");
  const [activeCategoryBand, setActiveCategoryBand] = React.useState<
    number | null
  >(null);
  const [animateRows, setAnimateRows] = React.useState(false);
  const [visitorsRange, setVisitorsRange] = React.useState<
    "today" | "7d" | "30d"
  >("today");
  const ordersQuery = useOrders({ page: 1, limit: 200 });
  const categoriesQuery = catalogApi.categories.hooks.useList({
    page: 1,
    limit: 200,
  });
  const productsQuery = catalogApi.products.hooks.useList({
    page: 1,
    limit: 200,
  });
  const paymentsQuery = usePaymentsAggregate();
  const usersQuery = useAdminUsersList({ page: 1, limit: 500 });
  const inquiryQuery = useInquiryList({ page: 1, limit: 100 });
  const siteInquiryQuery = useSiteInquiryList({ page: 1, limit: 100 });

  const orders = React.useMemo(() => {
    const payload = ordersQuery.data as unknown;
    const p = payload as Record<string, unknown> | undefined;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(p?.orders)
      ? (p.orders as unknown[])
      : ((p as { data?: unknown[] } | undefined)?.data ?? []);
    return rows as ReadonlyArray<Record<string, unknown>>;
  }, [ordersQuery.data]);

  const products = React.useMemo(
    () =>
      (productsQuery.data?.data ?? []) as ReadonlyArray<
        Record<string, unknown>
      >,
    [productsQuery.data?.data],
  );
  const categories = React.useMemo(
    () =>
      (categoriesQuery.data?.data ?? []) as ReadonlyArray<
        Record<string, unknown>
      >,
    [categoriesQuery.data?.data],
  );
  const users = React.useMemo(
    () =>
      (usersQuery.data?.data ?? []) as ReadonlyArray<Record<string, unknown>>,
    [usersQuery.data?.data],
  );

  const inquiries = React.useMemo(() => {
    const productRows = ((inquiryQuery.data as { data?: unknown[] } | undefined)
      ?.data ?? []) as ReadonlyArray<Record<string, unknown>>;
    const siteRows = ((
      siteInquiryQuery.data as { data?: unknown[] } | undefined
    )?.data ?? []) as ReadonlyArray<Record<string, unknown>>;

    const mapStatus = (value: string): "New" | "In Progress" | "Resolved" =>
      value.toLowerCase().includes("progress")
        ? "In Progress"
        : value.toLowerCase().includes("resolved") ||
            value.toLowerCase().includes("closed")
          ? "Resolved"
          : "New";

    return [
      ...productRows.map((row) => ({
        id: toText(row.id, crypto.randomUUID()),
        name: toText(row.fullname ?? row.name, "Customer"),
        email: toText(row.email, "—"),
        subject: toText(row.message ?? row.subject, "Inquiry"),
        type: "Product" as const,
        status: mapStatus(toText(row.status, "New")),
        date: formatDate(row.createdAt),
      })),
      ...siteRows.map((row) => ({
        id: toText(row.id, crypto.randomUUID()),
        name: toText(row.fullname ?? row.name, "Customer"),
        email: toText(row.email, "—"),
        subject: toText(row.message ?? row.subject, "Inquiry"),
        type: "Site" as const,
        status: mapStatus(toText(row.status, "New")),
        date: formatDate(row.createdAt),
      })),
    ].slice(0, 8);
  }, [inquiryQuery.data, siteInquiryQuery.data]);

  const payments = React.useMemo(
    () =>
      (paymentsQuery.data ?? []).flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
          return [];
        return toPaymentRows(
          (entry as { paymentPayload?: unknown }).paymentPayload,
        );
      }),
    [paymentsQuery.data],
  );

  const paymentRevenue = React.useMemo(
    () =>
      payments
        .filter((p) => p.status === "Completed")
        .reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );
  const paymentMonthly = React.useMemo(() => {
    const now = new Date();
    const months =
      salesRange === "12m"
        ? 12
        : salesRange === "6m"
          ? 6
          : salesRange === "1m"
            ? 1
            : 1;
    const dayWindow = salesRange === "7d" ? 7 : 30;
    const points = Array.from({ length: months }, (_, offset) => {
      const dt =
        salesRange === "7d"
          ? new Date(
              now.getTime() - (dayWindow - 1 - offset) * 24 * 60 * 60 * 1000,
            )
          : new Date(
              now.getFullYear(),
              now.getMonth() - (months - 1 - offset),
              1,
            );
      const key =
        salesRange === "7d"
          ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
          : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label =
        salesRange === "7d"
          ? dt.toLocaleDateString("en-US", { weekday: "short" })
          : dt.toLocaleDateString("en-US", { month: "short" });
      return { key, label, value: 0 };
    });
    const indexByKey = new Map(points.map((point, idx) => [point.key, idx]));
    payments.forEach((p) => {
      if (p.status !== "Completed" || !p.date) return;
      const created = new Date(p.date);
      if (Number.isNaN(created.getTime())) return;
      const key =
        salesRange === "7d"
          ? `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`
          : `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      const idx = indexByKey.get(key);
      if (idx === undefined) return;
      points[idx] = { ...points[idx], value: points[idx].value + p.amount };
    });
    return points;
  }, [payments, salesRange]);

  const revenue = React.useMemo(() => paymentRevenue, [paymentRevenue]);
  const totalOrders = orders.length;
  const shippedCount = React.useMemo(
    () =>
      orders.filter((row) => toText(row.status).toLowerCase() === "shipped")
        .length,
    [orders],
  );
  const deliveredCount = React.useMemo(
    () =>
      orders.filter((row) => toText(row.status).toLowerCase() === "delivered")
        .length,
    [orders],
  );
  const pendingCount = React.useMemo(
    () =>
      orders.filter((row) => toText(row.status).toLowerCase() === "pending")
        .length,
    [orders],
  );
  const customerCount = React.useMemo(
    () =>
      users.filter((row) => toText(row.role).toUpperCase() === "USER").length,
    [users],
  );
  const [currentTime] = React.useState(() => Date.now());

  const growthPct = React.useMemo(() => {
    const now = currentTime;
    const day = 24 * 60 * 60 * 1000;
    const currentStart = now - 30 * day;
    const previousStart = now - 60 * day;
    const userRows = users.filter(
      (row) => toText(row.role).toUpperCase() === "USER",
    );
    const current = userRows.filter((row) => {
      const created = new Date(toText(row.createdAt)).getTime();
      return created >= currentStart;
    }).length;
    const previous = userRows.filter((row) => {
      const created = new Date(toText(row.createdAt)).getTime();
      return created >= previousStart && created < currentStart;
    }).length;
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [users, currentTime]);

  const topProducts = React.useMemo(() => {
    const productMeta = new Map(
      products.map((row) => {
        const id = toText(row.id);
        const title = toText(row.title ?? row.name, "Product");
        const sku = toText(row.sku);
        const category = toText(
          toRecord(toRecord(row.subcategory).category).title ??
            toRecord(row.subcategory).title,
          "Catalog",
        );
        return [id, { title, sku, category }];
      }),
    );

    const totals = new Map<
      string,
      { qty: number; revenue: number; name: string; category: string }
    >();
    const cutoff = getCutoffTime(topProductsRange);
    orders.forEach((order) => {
      const created = new Date(
        toText(order.createdAt ?? order.placedAt),
      ).getTime();
      if (Number.isNaN(created) || created < cutoff) return;
      const orderItemsRaw =
        (Array.isArray(order.items) && order.items) ||
        (Array.isArray(order.orderItems) && order.orderItems) ||
        (Array.isArray(order.products) && order.products) ||
        [];
      orderItemsRaw.forEach((item) => {
        const row = toRecord(item);
        const nestedProduct = toRecord(row.product);
        const productId = readFirstText({ ...nestedProduct, ...row }, [
          "productId",
          "id",
        ]);
        const productName = readFirstText(
          { ...nestedProduct, ...row },
          ["productName", "title", "name"],
          "Product",
        );
        const sku = readFirstText({ ...nestedProduct, ...row }, ["sku"]);
        const quantity = readFirstNum(row, ["quantity", "qty", "count"], 1);
        const unitPrice = readFirstNum(row, ["price", "unitPrice"], 0);
        const lineTotal = readFirstNum(
          row,
          ["lineTotal", "total"],
          unitPrice * quantity,
        );

        const meta =
          (productId && productMeta.get(productId)) ||
          [...productMeta.values()].find((p) => p.sku && p.sku === sku);
        const key = productId || sku || productName;
        if (!key) return;
        const current = totals.get(key);
        if (!current) {
          totals.set(key, {
            qty: quantity,
            revenue: lineTotal,
            name: meta?.title ?? productName,
            category: meta?.category ?? "Catalog",
          });
          return;
        }
        totals.set(key, {
          ...current,
          qty: current.qty + quantity,
          revenue: current.revenue + lineTotal,
        });
      });
    });

    return [...totals.values()]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        category: item.category,
        revenue: `${item.qty} orders`,
        img: "🧴",
      }));
  }, [orders, products, topProductsRange]);

  const productSalesCategories = React.useMemo(() => {
    const cutoff = getCutoffTime(categoryRange);
    const soldProductIdsByCategory = new Map<string, Set<string>>();
    const allCategoryNames = [
      ...new Set(
        categories
          .map((row) => toText(row.title ?? row.name))
          .filter((name) => name.length > 0),
      ),
    ];
    const productCategoryById = new Map(
      products.map((row) => [
        toText(row.id),
        toText(
          toRecord(toRecord(row.subcategory).category).title ??
            toRecord(row.subcategory).title,
          "Uncategorized",
        ),
      ]),
    );

    orders.forEach((order) => {
      const created = new Date(
        toText(order.createdAt ?? order.placedAt),
      ).getTime();
      if (Number.isNaN(created) || created < cutoff) return;
      const orderItemsRaw =
        (Array.isArray(order.items) && order.items) ||
        (Array.isArray(order.orderItems) && order.orderItems) ||
        (Array.isArray(order.products) && order.products) ||
        [];
      orderItemsRaw.forEach((item) => {
        const row = toRecord(item);
        const nestedProduct = toRecord(row.product);
        const id = readFirstText({ ...nestedProduct, ...row }, [
          "productId",
          "id",
        ]);
        const fallbackCategory = toText(
          toRecord(toRecord(nestedProduct.subcategory).category).title ??
            toRecord(nestedProduct.subcategory).title,
          "Uncategorized",
        );
        const category =
          (id && productCategoryById.get(id)) || fallbackCategory;
        if (!category || !id) return;
        if (!allCategoryNames.includes(category)) allCategoryNames.push(category);
        const set = soldProductIdsByCategory.get(category) ?? new Set<string>();
        set.add(id);
        soldProductIdsByCategory.set(category, set);
      });
    });

    const categoryCounts = new Map<string, number>(
      allCategoryNames.map((category) => [category, 0]),
    );
    soldProductIdsByCategory.forEach((ids, category) => {
      categoryCounts.set(category, ids.size);
    });

    const total = [...categoryCounts.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    return [...categoryCounts.entries()].map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [categories, products, orders, categoryRange]);

  const visitorRows = React.useMemo(() => {
    const now = currentTime;
    const cutoff =
      visitorsRange === "today"
        ? new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
          ).getTime()
        : now - (visitorsRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000;
    const combined = [
      ...((inquiryQuery.data as { data?: unknown[] } | undefined)?.data ?? []),
      ...((siteInquiryQuery.data as { data?: unknown[] } | undefined)?.data ??
        []),
    ] as ReadonlyArray<Record<string, unknown>>;
    const buckets = new Map<string, number>();
    combined.forEach((row) => {
      const created = new Date(toText(row.createdAt)).getTime();
      if (Number.isNaN(created) || created < cutoff) return;
      const countryRaw = toText(
        row.country ?? row.address ?? row.location,
        "Others",
      );
      const country = countryRaw.split(",").pop()?.trim() || "Others";
      buckets.set(country, (buckets.get(country) ?? 0) + 1);
    });
    const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({
        country,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
  }, [inquiryQuery.data, siteInquiryQuery.data, visitorsRange, currentTime]);
  const categoryBandPaths = React.useMemo(() => {
    const total = productSalesCategories.reduce((sum, item) => sum + item.count, 0);
    if (total <= 0) return [] as ReadonlyArray<{ d: string; share: number }>;
    let startLeft = 0;
    let startRight = 0;
    return productSalesCategories.map((item) => {
      const share = item.count / total;
      const bandHeight = share * 100;
      const endLeft = startLeft + bandHeight;
      const endRight = startRight + bandHeight;
      const d = `M 0,${startLeft} C 189,${startLeft} 351,${endRight} 540,${endRight} L 540,${startRight} C 351,${startRight} 189,${startLeft} 0,${startLeft} Z`;
      startLeft = endLeft;
      startRight = endRight;
      return { d, share };
    });
  }, [productSalesCategories]);
  const revenueCount = useCountUp(revenue);
  const totalOrdersCount = useCountUp(totalOrders);
  const deliveredCountAnimated = useCountUp(deliveredCount);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => setAnimateRows(true), 30);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const rowAnimation = React.useCallback(
    (delayMs: number): React.CSSProperties | undefined =>
      animateRows ? { animationDelay: `${delayMs}ms` } : undefined,
    [animateRows],
  );

  const recentOrders = React.useMemo(
    () =>
      orders.slice(0, 6).map((row) => ({
        id: toText(row.orderNumber ?? row.id, "—"),
        customer: toText(row.customerName ?? row.fullname, "Customer"),
        email: toText(row.customerEmail ?? row.email, "—"),
        amount: formatNpr(toNum(row.total ?? row.totalAmount)),
        status: ([
          "Processing",
          "Shipped",
          "Pending",
          "Delivered",
          "Cancelled",
        ].includes(toText(row.status))
          ? toText(row.status)
          : "Pending") as
          | "Processing"
          | "Shipped"
          | "Pending"
          | "Delivered"
          | "Cancelled",
        date: formatDate(row.createdAt ?? row.placedAt),
      })),
    [orders],
  );
  return (
    <div className="space-y-4 bg-(--bg) p-[34px] text-(--text)">
      {/* ── Row 1: 4 stat cards ── */}
      <div
        className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(0)}
      >

        {/* Total Orders */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:border-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <RotateCcw size={15} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-(--text-tertiary)">
              Total Orders
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-(--text)">
              {totalOrdersCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5 rounded-full bg-(--badge-success-bg) px-1.5 py-0.5 text-[11px] font-semibold text-(--badge-success-text)">
              <TrendingUp size={9} /> +2.34%
            </span>
          </div>
        </div>

        {/* Total Sales */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:border-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50">
              <ShoppingCart size={15} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-(--text-tertiary)">
              Total Sales
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-(--text)">
              {deliveredCountAnimated.toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5 rounded-full bg-(--badge-success-bg) px-1.5 py-0.5 text-[11px] font-semibold text-(--badge-success-text)">
              <TrendingUp size={9} /> +8.12%
            </span>
          </div>
        </div>

        {/* Customer Growth */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:border-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
              <BarChart2 size={15} className="text-amber-600" />
            </div>
            <span className="text-xs font-medium text-(--text-tertiary)">
              Customer Growth
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-(--text)">
              {customerCount.toLocaleString()}
            </span>
            <span
              className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${growthPct >= 0 ? "bg-(--badge-success-bg) text-(--badge-success-text)" : "bg-(--badge-danger-bg) text-(--badge-danger-text)"}`}
            >
              {growthPct >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {growthPct >= 0 ? "+" : "-"}
              {Math.abs(growthPct)}%
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:border-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <CoinIcon />
            </div>
            <span className="text-xs font-medium text-(--text-tertiary)">
              Total Revenue
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums text-(--text)">
              {formatNpr(revenueCount)}
            </span>
            <span className="flex items-center gap-0.5 rounded-full bg-(--badge-success-bg) px-1.5 py-0.5 text-[11px] font-semibold text-(--badge-success-text)">
              <TrendingUp size={9} /> +2.34%
            </span>
          </div>
        </div>

      </div>

      {/* ── Row 2: Sales Overview | Activity+Growth | Distribution ── */}
      <div
        className={`grid grid-cols-12 gap-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(90)}
      >
        {/* Sales Overview */}
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm lg:col-span-6">
          <div className="flex items-start justify-between">
            <h2 className="text-base font-semibold text-(--text)">
              Sales Overview
            </h2>
            <div className="flex items-center overflow-hidden rounded-lg border border-(--line) bg-(--surface-soft) text-xs">
              <button
                type="button"
                onClick={() => setSalesRange("7d")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${salesRange === "7d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setSalesRange("1m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${salesRange === "1m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                1M
              </button>
              <button
                type="button"
                onClick={() => setSalesRange("6m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${salesRange === "6m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                6M
              </button>
              <button
                type="button"
                onClick={() => setSalesRange("12m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${salesRange === "12m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                12M
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-8">
            <div>
              <p className="text-xs text-(--text-tertiary)">Total Earnings</p>
              <p className="text-2xl font-bold text-(--text)">
                {formatNpr(paymentRevenue)}
              </p>
              <p className="flex items-center gap-0.5 text-xs font-medium text-(--badge-success-text)">
                <TrendingUp size={10} /> +2.34%
              </p>
            </div>
            <div className="ml-auto flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-(--text-secondary)">
                <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                Earnings
              </div>
            </div>
          </div>

          <div className="mt-2">
            <SalesLineChart
              months={paymentMonthly.map((m) => m.label)}
              values={paymentMonthly.map((m) => m.value)}
            />
          </div>
        </div>

        {/* Middle column: Sales Activity */}
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-3">
          {/* Sales Activity */}
          <div className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-(--text)">
                Sales Activity
              </h2>
              <button className="text-(--text-tertiary) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <MoreHorizontal size={15} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft)">
                  <Package size={16} className="text-(--text-secondary)" />
                </div>
                <div>
                  <p className="text-xs text-(--text-tertiary)">Packed</p>
                  <p className="text-base font-bold text-(--text)">
                    {pendingCount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_16%,white)]">
                  <CheckCircle2 size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-(--text-tertiary)">Delivered</p>
                  <p className="text-base font-bold text-(--text)">
                    {deliveredCount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft)">
                  <Truck size={16} className="text-(--text-secondary)" />
                </div>
                <div>
                  <p className="text-xs text-(--text-tertiary)">Shipped</p>
                  <p className="text-base font-bold text-(--text)">
                    {shippedCount.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft)">
                  <FileText size={16} className="text-(--text-secondary)" />
                </div>
                <div>
                  <p className="text-xs text-(--text-tertiary)">Invoiced</p>
                  <p className="text-base font-bold text-(--text)">
                    {formatNpr(revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-(--line) px-5 py-4">
            <h2 className="text-sm font-semibold text-(--text)">
              Top Products
            </h2>
            <div className="flex items-center overflow-hidden rounded-lg border border-(--line) bg-(--surface-soft) text-xs">
              <button
                type="button"
                onClick={() => setTopProductsRange("7d")}
                className={`px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${topProductsRange === "7d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setTopProductsRange("30d")}
                className={`px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${topProductsRange === "30d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                30D
              </button>
            </div>
          </div>
          <div className="divide-y divide-(--line)">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-3">
                <span className="w-4 shrink-0 text-xs text-(--text-tertiary)">
                  {i + 1}
                </span>
                <span className="text-lg leading-none">{p.img}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-(--text)">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-(--text-tertiary)">
                    {p.category}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-(--text)">
                  {p.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Product Category | Map | Visitors ── */}
      <div
        className={`grid grid-cols-12 gap-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(180)}
      >
        {/* Product Sales Category */}
        <div className="col-span-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:col-span-8">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h2 className="text-sm font-semibold text-(--text)">
              Product Sales Category
            </h2>
            <div className="flex items-center overflow-hidden rounded-lg border border-(--line) bg-(--surface-soft) text-xs">
              <button
                type="button"
                onClick={() => setCategoryRange("7d")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${categoryRange === "7d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setCategoryRange("1m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${categoryRange === "1m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                1M
              </button>
              <button
                type="button"
                onClick={() => setCategoryRange("6m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${categoryRange === "6m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                6M
              </button>
              <button
                type="button"
                onClick={() => setCategoryRange("12m")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${categoryRange === "12m" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                12M
              </button>
            </div>
          </div>

          {/* Category column headers */}
          <div className="px-5">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  productSalesCategories.length,
                  1,
                )}, minmax(0, 1fr))`,
              }}
            >
              {productSalesCategories.map((item, index) => (
                <button
                  type="button"
                  key={item.name}
                  onMouseEnter={() => setActiveCategoryBand(index)}
                  onMouseLeave={() => setActiveCategoryBand(null)}
                  onFocus={() => setActiveCategoryBand(index)}
                  onBlur={() => setActiveCategoryBand(null)}
                  className={`flex flex-col gap-0.5 px-2 py-2 text-left transition-colors ${index === 0 ? "rounded-t-lg" : ""} ${index > 0 ? "border-l border-(--line)" : ""} ${activeCategoryBand === index ? "bg-[color-mix(in_srgb,var(--primary)_10%,white)]" : "bg-transparent"}`}
                >
                <Users size={17} className="text-(--text-tertiary)" />
                <span
                  className={`text-base font-bold leading-tight ${activeCategoryBand === index || index === 0 ? "text-primary" : "text-(--text)"}`}
                >
                  {item.pct}%
                </span>
                <span className="text-[10px] leading-snug text-(--text-secondary)">
                  {item.name}
                </span>
                <span className="mt-0.5 text-[10px] text-(--text-tertiary)">
                  <span className="font-semibold text-(--text-secondary)">
                    {item.count}
                  </span>{" "}
                  Products
                </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-3">
            <svg
              viewBox="0 0 540 100"
              className="w-full"
              style={{ height: 100, display: "block" }}
              preserveAspectRatio="none"
              onMouseLeave={() => setActiveCategoryBand(null)}
            >
              {productSalesCategories.length > 1
                ? Array.from(
                    { length: productSalesCategories.length - 1 },
                    (_, idx) => (
                      <line
                        key={`divider-${idx}`}
                        x1={((idx + 1) * 540) / productSalesCategories.length}
                        y1={0}
                        x2={((idx + 1) * 540) / productSalesCategories.length}
                        y2={100}
                        stroke="var(--line)"
                        strokeWidth="1"
                        opacity="0.9"
                      />
                    ),
                  )
                : null}
              {categoryBandPaths.length === 0 ? (
                <rect x={0} y={94} width={540} height={6} fill="#bfdbfe" />
              ) : (
                categoryBandPaths.map((band, index) => {
                  const blueBands = [
                    "#1d4ed8",
                    "#2563eb",
                    "#3b82f6",
                    "#60a5fa",
                    "#93c5fd",
                    "#1e40af",
                    "#0ea5e9",
                    "#38bdf8",
                  ];
                  const isActive =
                    activeCategoryBand === null || activeCategoryBand === index;
                  return (
                    <path
                      key={`band-${index}`}
                      d={band.d}
                      fill={blueBands[index % blueBands.length]}
                      fillOpacity={isActive ? 0.95 : 0.35}
                      className="cursor-pointer transition-opacity duration-200"
                      onMouseEnter={() => setActiveCategoryBand(index)}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </div>

        {/* Visitors */}
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-(--text)">Visitors</h2>
            <div className="flex items-center overflow-hidden rounded-lg border border-(--line) bg-(--surface-soft) text-xs">
              <button
                type="button"
                onClick={() => setVisitorsRange("today")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${visitorsRange === "today" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setVisitorsRange("7d")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${visitorsRange === "7d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setVisitorsRange("30d")}
                className={`px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${visitorsRange === "30d" ? "bg-primary text-white" : "text-(--text-secondary) hover:bg-(--surface)"}`}
              >
                30D
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {visitorRows.map(({ country, count, pct }) => (
              <div key={country}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">🌐</span>
                    <span className="text-sm font-medium text-(--text-secondary)">
                      {country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-(--text-secondary)">
                      {count.toLocaleString()}
                    </span>
                    <span className="text-xs text-(--text-tertiary)">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-(--surface-soft)">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      background: "var(--primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Recent Orders | Inquiries ── */}
      <div
        className={`grid grid-cols-12 gap-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(270)}
      >
        {/* Recent Orders */}
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-(--line) px-5 py-4">
            <h2 className="text-sm font-semibold text-(--text)">
              Recent Orders
            </h2>
            <button className="text-sm font-medium text-primary hover:text-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--line) bg-(--bg)">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Order
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--line)">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="transition-colors hover:bg-(--bg)">
                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-(--text-secondary)">
                      {o.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-(--text)">{o.customer}</p>
                      <p className="text-[10px] text-(--text-tertiary)">
                        {o.email}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-(--text)">
                      {o.amount}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${orderStatusStyle[o.status]}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-(--text-secondary)">
                      {o.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inquiries */}
        <div className="col-span-12 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between border-b border-(--line) px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-(--text)">Inquiries</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {inquiries.filter((i) => i.status === "New").length} new
              </span>
            </div>
            <button className="text-sm font-medium text-primary hover:text-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--line) bg-(--bg)">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Subject
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Type
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--line)">
                {inquiries.map((inq) => (
                  <tr
                    key={inq.id}
                    className="transition-colors hover:bg-(--bg)"
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-(--text)">
                        {inq.name}
                      </p>
                      <p className="text-[10px] text-(--text-tertiary)">
                        {inq.email}
                      </p>
                    </td>
                    <td className="max-w-[140px] px-5 py-3">
                      <p className="truncate text-xs text-(--text-secondary)">
                        {inq.subject}
                      </p>
                      <p className="text-[10px] text-(--text-tertiary)">
                        {inq.date}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${inquiryTypeStyle[inq.type]}`}
                      >
                        {inq.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${inquiryStatusStyle[inq.status]}`}
                      >
                        {inq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
