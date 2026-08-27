import React from "react";
import { useNavigate } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  ChevronDown,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  FileText,
  CheckCircle2,
  RotateCcw,
  BarChart2,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";
import {
  useOrders,
  usePaymentsAggregate,
  useUpdateOrderStatus,
} from "@/features/commerce";
import { useDashboardOverview } from "@/features/dashboard";
import { catalogApi } from "@/features/catalog";
import { useAdminUsersList } from "@/features/adminUsers";
import { useContactList } from "@/features/contact";
import { useUserMetadataList } from "@/features/telemetry";
import {
  groupRowsByField,
  readTimestamp,
  toRecord,
  toTelemetryRows,
  toText,
  uniqueTextCount,
} from "@/features/telemetry/telemetry.utils";
import { getListRows, getOrderRows } from "@/shared/utils/orderMapping";
import FunnelChart from "@/shared/components/charts/FunnelChart";

const USE_FAKE_OVERVIEW_DATA = false;

type CategorySalesStat = Readonly<{
  name: string;
  count: number;
}>;

// ──────────────────────────────────────────────
// Sales Overview interactive line chart
// ──────────────────────────────────────────────
const SalesLineChart: React.FC<{ months: string[]; values: number[] }> = ({
  months,
  values,
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const chartRef = React.useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = React.useState(0);

  React.useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const updateWidth = () => setChartWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(...values, 1);
  const yMax = Math.ceil(maxValue / 1000) * 1000 || 1000;
  const yLevels = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const W = Math.max(chartWidth || 0, 520),
    H = 200,
    pL = 36,
    pR = 12,
    pT = 22,
    pB = 28;
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

  const areaD =
    pts.length > 0
      ? `${pathD} L ${pts[pts.length - 1].x} ${pT + cH} L ${pts[0].x} ${pT + cH} Z`
      : "";

  const colW = n > 1 ? cW / (n - 1) : cW;

  return (
    <div ref={chartRef} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{ height: 200 }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="salesLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Vertical hover line */}
        {hovered !== null && (
          <line
            x1={pts[hovered].x}
            y1={pT}
            x2={pts[hovered].x}
            y2={pT + cH}
            stroke="var(--primary)"
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
              <line
                x1={pL}
                y1={y}
                x2={W - pR}
                y2={y}
                stroke="var(--line-soft)"
                strokeWidth={1}
              />
              <text
                x={pL - 5}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="var(--text-tertiary)"
              >
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
            stroke="var(--primary)"
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
              <text
                x={pt.x}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--text-tertiary)"
              >
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
                fill={isHovered ? "var(--primary)" : "white"}
                stroke="var(--primary)"
                strokeWidth={2}
                style={{ transition: "r 100ms ease, fill 100ms ease" }}
                pointerEvents="none"
              />

              {/* Tooltip */}
              {isHovered && (
                <g pointerEvents="none">
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={76}
                    height={24}
                    rx={6}
                    fill="#1d1d1f"
                    opacity={0.88}
                  />
                  <text
                    x={tooltipX + 38}
                    y={tooltipY + 15}
                    textAnchor="middle"
                    fontSize={11}
                    fill="white"
                    fontWeight="600"
                  >
                    {values[i].toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ──────────────────────────────────────────────
// Stat card top icons (small SVG icons)
// ──────────────────────────────────────────────
const CoinIcon = () => (
  <img src="/logo/nrs.png" alt="NRS" className="h-4.5 w-4.5 object-contain" />
);

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

const formatTrendPercent = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? Math.abs(rounded).toLocaleString()
    : Math.abs(rounded).toFixed(2);
  return `${rounded >= 0 ? "+" : "-"}${formatted}%`;
};
const getCutoffTime = (range: "7d" | "1m" | "6m" | "12m" | "30d"): number => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (range === "7d") return now - 7 * day;
  if (range === "1m" || range === "30d") return now - 30 * day;
  if (range === "6m") return now - 183 * day;
  if (range === "12m") return now - 365 * day;
  return now - 30 * day;
};

const getCategoryName = (row: Record<string, unknown>): string =>
  toText(
    toRecord(toRecord(row.subcategory).category).title ??
      toRecord(row.subcategory).title ??
      row.title ??
      row.name,
    "Uncategorized",
  );

const getProductSalesCategories = (
  orders: ReadonlyArray<Record<string, unknown>>,
  products: ReadonlyArray<Record<string, unknown>>,
): ReadonlyArray<CategorySalesStat> => {
  const categoryCounts = new Map<string, number>();
  const productCategoryById = new Map(
    products.map((row) => [toText(row.id), getCategoryName(toRecord(row))]),
  );

  orders.forEach((order) => {
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
      const category =
        (productId && productCategoryById.get(productId)) ||
        getCategoryName(nestedProduct);
      if (!category || category === "Uncategorized") return;
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });
  });

  if (categoryCounts.size === 0) {
    products.forEach((row) => {
      const category = getCategoryName(toRecord(row));
      if (category === "Uncategorized") return;
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });
  }

  return [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
};

const viewAllButtonClassName =
  "inline-flex h-[24px] items-center  rounded-4xl  px-2 py-2 text-[13px] font-medium text-[var(--primary)] transition-colors hover:bg-[#f5f5f7] hover:border-[var(--primary)]/25 hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25 active:scale-[0.98]";

const statCardTones: ReadonlyArray<StatCardTone> = [
  {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    labelClassName: "text-blue-950",
    valueClassName: "text-slate-950",
    badgeClassName: "text-blue-700",
    cardClassName: "border-blue-200 bg-blue-50",
    glowClassName: "bg-transparent",
  },
  {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    labelClassName: "text-violet-950",
    valueClassName: "text-slate-950",
    badgeClassName: "text-violet-700",
    cardClassName: "border-violet-200 bg-violet-50",
    glowClassName: "bg-transparent",
  },
  {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    labelClassName: "text-amber-950",
    valueClassName: "text-slate-950",
    badgeClassName: "text-amber-700",
    cardClassName: "border-amber-200 bg-amber-50",
    glowClassName: "bg-transparent",
  },
  {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    labelClassName: "text-emerald-950",
    valueClassName: "text-slate-950",
    badgeClassName: "text-emerald-700",
    cardClassName: "border-emerald-200 bg-emerald-50",
    glowClassName: "bg-transparent",
  },
];

const orderStatusStyle: Record<
  | "PENDING"
  | "PROCESSING"
  | "PACKED"
  | "READY_FOR_SHIPMENT"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED",
  string
> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  PACKED: "bg-violet-100 text-violet-800",
  READY_FOR_SHIPMENT: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  RETURNED: "bg-red-100 text-red-800",
};

type OrderStatus = keyof typeof orderStatusStyle;

const orderStatusIndicatorStyle: Record<OrderStatus, string> = {
  PENDING: "bg-amber-400",
  PROCESSING: "bg-sky-400",
  PACKED: "bg-violet-400",
  READY_FOR_SHIPMENT: "bg-indigo-400",
  SHIPPED: "bg-blue-400",
  DELIVERED: "bg-emerald-400",
  CANCELLED: "bg-red-400",
  RETURNED: "bg-red-500",
};

const orderStatusOptions: ReadonlyArray<OrderStatus> = [
  "PENDING",
  "PROCESSING",
  "PACKED",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

const formatOrderStatusLabel = (status: string): OrderStatus => {
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized in orderStatusStyle) return normalized as OrderStatus;
  return "PENDING";
};

const formatOrderStatusLabelText = (status: OrderStatus): string =>
  status.replace(/_/g, " ");

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
  const rows = getListRows(payload);
  return rows.map((entry) => {
    const row = toRecord(entry);
    return {
      amount: toNum(row.amount ?? row.totalAmount),
      status: normalizePaymentStatus(row.status),
      date: toText(row.date ?? row.createdAt),
    };
  });
};

const textOrFallback = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

const getDashboardCustomerName = (row: Record<string, unknown>): string => {
  const customer = toRecord(row.customer);
  const name = [toText(customer.firstname), toText(customer.lastname)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return textOrFallback(
    name || row.customerName || row.fullName || row.fullname || row.name,
    "Customer",
  );
};

const getDashboardCustomerEmail = (row: Record<string, unknown>): string => {
  const customer = toRecord(row.customer);
  return textOrFallback(customer.email ?? row.customerEmail ?? row.email, "—");
};

type RecentOrderRow = Readonly<{
  createdAt: number;
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  amount: string;
  status: OrderStatus;
  date: string;
}>;

const toDashboardRecentOrderRow = (entry: unknown): RecentOrderRow => {
  const row = toRecord(entry);
  const createdAtText = toText(row.createdAt ?? row.updatedAt, "");
  const createdAt = new Date(createdAtText).getTime();

  return {
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt,
    id: textOrFallback(row.id, ""),
    orderNumber: textOrFallback(row.orderNumber ?? row.id, "—"),
    customer: getDashboardCustomerName(row),
    email: getDashboardCustomerEmail(row),
    amount: formatNpr(toNum(row.totalAmount ?? row.total ?? row.grandTotal)),
    status: formatOrderStatusLabel(
      toText(row.orderStatus ?? row.status, "PENDING"),
    ),
    date: formatDate(createdAtText),
  };
};

const useCountUp = (value: number, durationMs = 900): number => {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const target = Number.isFinite(value) ? Math.max(0, value) : 0;
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

type StatCardTone = Readonly<{
  iconBg: string;
  iconColor: string;
  labelClassName: string;
  valueClassName: string;
  badgeClassName: string;
  cardClassName: string;
  glowClassName: string;
}>;

type StatCardItem = Readonly<{
  label: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  tone: StatCardTone;
  icon: React.ReactNode;
}>;

type MockDashboardData = Readonly<{
  orders: ReadonlyArray<Record<string, unknown>>;
  products: ReadonlyArray<Record<string, unknown>>;
  categories: ReadonlyArray<Record<string, unknown>>;
  users: ReadonlyArray<Record<string, unknown>>;
  inquiries: ReadonlyArray<Record<string, unknown>>;
  siteInquiries: ReadonlyArray<Record<string, unknown>>;
  visitorRecords: ReadonlyArray<Record<string, unknown>>;
  payments: ReadonlyArray<
    Readonly<{
      paymentPayload: ReadonlyArray<
        Readonly<{ amount: number; status: string; date: string }>
      >;
    }>
  >;
}>;

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const createMockDashboardData = (): MockDashboardData => {
  const products = [
    {
      id: "prod-velvet-tint",
      title: "Velvet Lip Tint",
      sku: "KLT-01",
      subcategory: { title: "Lips", category: { title: "Face" } },
    },
    {
      id: "prod-radiance-base",
      title: "Radiance Base Cream",
      sku: "KBC-02",
      subcategory: { title: "Skincare", category: { title: "Skincare" } },
    },
    {
      id: "prod-cream-blush",
      title: "Cream Blush",
      sku: "KCB-03",
      subcategory: { title: "Face", category: { title: "Face" } },
    },
    {
      id: "prod-kajal",
      title: "Precision Kajal",
      sku: "KPK-04",
      subcategory: { title: "Eyes", category: { title: "Eyes" } },
    },
    {
      id: "prod-brush",
      title: "Blend Brush Set",
      sku: "KBS-05",
      subcategory: { title: "Tools", category: { title: "Tools" } },
    },
  ];
  const categories = [
    { id: "cat-face", title: "Face" },
    { id: "cat-lips", title: "Lips" },
    { id: "cat-eyes", title: "Eyes" },
    { id: "cat-skin", title: "Skincare" },
    { id: "cat-tools", title: "Tools" },
  ];

  const makeOrder = (
    id: string,
    orderNumber: string,
    customerName: string,
    customerEmail: string,
    status: string,
    total: number,
    daysOffset: number,
    items: ReadonlyArray<Readonly<Record<string, unknown>>>,
  ): Record<string, unknown> => ({
    id,
    orderNumber,
    customerName,
    customerEmail,
    paymentMethod: "Cash on Delivery",
    paymentStatus: status === "DELIVERED" ? "PAID" : "PENDING",
    total: total.toFixed(2),
    placedAt: daysAgo(daysOffset),
    createdAt: daysAgo(daysOffset),
    status,
    items,
  });

  const featuredOrders = [
    makeOrder(
      "order-1001",
      "KAN-1001",
      "Sofia Shah",
      "sofia@example.com",
      "DELIVERED",
      2800,
      1,
      [
        {
          productId: "prod-velvet-tint",
          quantity: 1,
          price: 2800,
          lineTotal: 2800,
          product: products[0],
        },
      ],
    ),
    makeOrder(
      "order-1002",
      "KAN-1002",
      "Anita Karki",
      "anita@example.com",
      "SHIPPED",
      2450,
      3,
      [
        {
          productId: "prod-radiance-base",
          quantity: 1,
          price: 2450,
          lineTotal: 2450,
          product: products[1],
        },
      ],
    ),
    makeOrder(
      "order-1003",
      "KAN-1003",
      "Mira Gurung",
      "mira@example.com",
      "PROCESSING",
      2600,
      5,
      [
        {
          productId: "prod-kajal",
          quantity: 1,
          price: 2600,
          lineTotal: 2600,
          product: products[3],
        },
      ],
    ),
    makeOrder(
      "order-1004",
      "KAN-1004",
      "Priya Rana",
      "priya@example.com",
      "PENDING",
      2350,
      8,
      [
        {
          productId: "prod-velvet-tint",
          quantity: 1,
          price: 2350,
          lineTotal: 2350,
          product: products[0],
        },
      ],
    ),
    makeOrder(
      "order-1005",
      "KAN-1005",
      "Nisha Thapa",
      "nisha@example.com",
      "DELIVERED",
      2950,
      12,
      [
        {
          productId: "prod-cream-blush",
          quantity: 1,
          price: 2950,
          lineTotal: 2950,
          product: products[2],
        },
      ],
    ),
    makeOrder(
      "order-1006",
      "KAN-1006",
      "Kabir Lama",
      "kabir@example.com",
      "DELIVERED",
      2700,
      18,
      [
        {
          productId: "prod-brush",
          quantity: 1,
          price: 2700,
          lineTotal: 2700,
          product: products[4],
        },
      ],
    ),
  ];

  const orderStatusCycle = [
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "DELIVERED",
    "SHIPPED",
    "SHIPPED",
    "PROCESSING",
    "PENDING",
  ] as const;

  const generatedOrders = Array.from({ length: 394 }, (_, index) => {
    const product = products[index % products.length];
    const orderNumber = 1007 + index;
    const total = 2200 + (index % 6) * 140;
    const status = orderStatusCycle[index % orderStatusCycle.length];

    return makeOrder(
      `order-${orderNumber}`,
      `KAN-${orderNumber}`,
      `Customer ${orderNumber}`,
      `customer${orderNumber}@example.com`,
      status,
      total,
      19 + index,
      [
        {
          productId: product.id,
          quantity: 1,
          price: total,
          lineTotal: total,
          product,
        },
      ],
    );
  });

  const orders = [...featuredOrders, ...generatedOrders];

  const currentUsers = Array.from({ length: 60 }, (_, index) => ({
    id: `user-current-${index + 1}`,
    role: "USER",
    createdAt: daysAgo(index % 30),
  }));
  const previousUsers = Array.from({ length: 48 }, (_, index) => ({
    id: `user-previous-${index + 1}`,
    role: "USER",
    createdAt: daysAgo(31 + (index % 29)),
  }));
  const admins = [
    { id: "user-admin-1", role: "ADMIN", createdAt: daysAgo(12) },
    { id: "user-admin-2", role: "ADMIN", createdAt: daysAgo(44) },
  ];
  const users = [...currentUsers, ...previousUsers, ...admins];

  const inquiries = [
    {
      id: "inq-1",
      customerName: "Sita",
      email: "sita@example.com",
      subject: "Need shade recommendation",
      message: "Looking for a daily nude lip tint.",
      status: "New",
      createdAt: daysAgo(0),
    },
    {
      id: "inq-2",
      customerName: "Aarav",
      email: "aarav@example.com",
      subject: "Order delayed",
      message: "My order has not arrived yet.",
      status: "Resolved",
      createdAt: daysAgo(1),
    },
    {
      id: "inq-3",
      customerName: "Nirjala",
      email: "nirjala@example.com",
      subject: "Product ingredients",
      message: "Is this fragrance-free?",
      status: "New",
      createdAt: daysAgo(2),
    },
    {
      id: "inq-4",
      customerName: "Rohan",
      email: "rohan@example.com",
      subject: "Exchange request",
      message: "I received the wrong shade.",
      status: "New",
      createdAt: daysAgo(4),
    },
    {
      id: "inq-5",
      customerName: "Deepa",
      email: "deepa@example.com",
      subject: "Bulk order",
      message: "Need 20 sets for an event.",
      status: "Resolved",
      createdAt: daysAgo(5),
    },
  ];

  const siteInquiries = [
    {
      id: "site-1",
      customerName: "Maya",
      email: "maya@example.com",
      subject: "Website feedback",
      message: "Checkout is smooth.",
      status: "New",
      createdAt: daysAgo(1),
    },
    {
      id: "site-2",
      customerName: "Tara",
      email: "tara@example.com",
      subject: "Broken link",
      message: "Footer contact link 404s.",
      status: "Resolved",
      createdAt: daysAgo(3),
    },
    {
      id: "site-3",
      customerName: "Suresh",
      email: "suresh@example.com",
      subject: "Mobile issue",
      message: "Menu overlaps on smaller phones.",
      status: "New",
      createdAt: daysAgo(4),
    },
  ];

  const visitorRecords = [
    {
      sessionId: "sess-1",
      userId: "user-1",
      country: "Nepal",
      region: "Bagmati",
      city: "Kathmandu",
      createdAt: daysAgo(0),
    },
    {
      sessionId: "sess-2",
      userId: "user-2",
      country: "Nepal",
      region: "Bagmati",
      city: "Lalitpur",
      createdAt: daysAgo(0),
    },
    {
      sessionId: "sess-3",
      userId: "user-3",
      country: "Nepal",
      region: "Gandaki",
      city: "Pokhara",
      createdAt: daysAgo(1),
    },
    {
      sessionId: "sess-4",
      userId: "user-4",
      country: "India",
      region: "Delhi",
      city: "New Delhi",
      createdAt: daysAgo(1),
    },
    {
      sessionId: "sess-5",
      userId: "user-5",
      country: "UAE",
      region: "Dubai",
      city: "Dubai",
      createdAt: daysAgo(2),
    },
    {
      sessionId: "sess-6",
      userId: "user-6",
      country: "Nepal",
      region: "Lumbini",
      city: "Butwal",
      createdAt: daysAgo(3),
    },
    {
      sessionId: "sess-7",
      userId: "user-7",
      country: "Nepal",
      region: "Koshi",
      city: "Biratnagar",
      createdAt: daysAgo(5),
    },
    {
      sessionId: "sess-8",
      userId: "user-8",
      country: "Bangladesh",
      region: "Dhaka",
      city: "Dhaka",
      createdAt: daysAgo(6),
    },
  ];

  const payments = [
    {
      paymentPayload: [
        { amount: 200000, status: "Completed", date: daysAgo(1) },
        { amount: 18000, status: "Pending", date: daysAgo(2) },
      ],
    },
    {
      paymentPayload: [
        { amount: 180000, status: "Completed", date: daysAgo(4) },
        { amount: 6000, status: "Refunded", date: daysAgo(5) },
      ],
    },
    {
      paymentPayload: [
        { amount: 170000, status: "Completed", date: daysAgo(8) },
        { amount: 12000, status: "Pending", date: daysAgo(9) },
      ],
    },
    {
      paymentPayload: [
        { amount: 220000, status: "Completed", date: daysAgo(12) },
        { amount: 15000, status: "Pending", date: daysAgo(13) },
      ],
    },
    {
      paymentPayload: [
        { amount: 230000, status: "Completed", date: daysAgo(18) },
        { amount: 9000, status: "Refunded", date: daysAgo(19) },
      ],
    },
  ];

  return {
    orders,
    products,
    categories,
    users,
    inquiries,
    siteInquiries,
    visitorRecords,
    payments,
  };
};

const MOCK_OVERVIEW_DATA = createMockDashboardData();

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
  const [animateRows, setAnimateRows] = React.useState(false);
  const navigate = useNavigate();
  const [visitorsRange, setVisitorsRange] = React.useState<
    "today" | "7d" | "30d"
  >("today");
  const dashboardOverviewQuery = useDashboardOverview();
  const dashboardOverview = dashboardOverviewQuery.data;
  const ordersQuery = useOrders(
    { page: 1, limit: 200 },
    !USE_FAKE_OVERVIEW_DATA,
  );
  const productsQuery = catalogApi.products.hooks.useList(
    {
      page: 1,
      limit: 200,
    },
    !USE_FAKE_OVERVIEW_DATA,
  );
  const categoriesQuery = catalogApi.categories.hooks.useList(
    {
      page: 1,
      limit: 200,
    },
    !USE_FAKE_OVERVIEW_DATA,
  );
  const paymentsQuery = usePaymentsAggregate(!USE_FAKE_OVERVIEW_DATA);
  const usersQuery = useAdminUsersList(
    { page: 1, limit: 500 },
    !USE_FAKE_OVERVIEW_DATA,
  );
  const userMetadataQuery = useUserMetadataList(
    { page: 1, limit: 200 },
    !USE_FAKE_OVERVIEW_DATA,
  );

  const orders = React.useMemo(() => {
    return USE_FAKE_OVERVIEW_DATA
      ? MOCK_OVERVIEW_DATA.orders
      : getOrderRows(ordersQuery.data);
  }, [ordersQuery.data]);

  const products = React.useMemo(
    () =>
      USE_FAKE_OVERVIEW_DATA
        ? MOCK_OVERVIEW_DATA.products
        : getListRows(productsQuery.data),
    [productsQuery.data],
  );
  const categories = React.useMemo(
    () =>
      USE_FAKE_OVERVIEW_DATA
        ? MOCK_OVERVIEW_DATA.categories
        : getListRows(categoriesQuery.data),
    [categoriesQuery.data],
  );
  const users = React.useMemo(
    () =>
      USE_FAKE_OVERVIEW_DATA
        ? MOCK_OVERVIEW_DATA.users
        : getListRows(usersQuery.data),
    [usersQuery.data],
  );
  const contactsQuery = useContactList({ page: 1, limit: 10 }, !USE_FAKE_OVERVIEW_DATA);
  const contacts = React.useMemo(() => {
    const raw = (contactsQuery.data as { data?: unknown } | undefined)?.data;
    const rows = (Array.isArray(raw) ? raw : []) as ReadonlyArray<
      Record<string, unknown>
    >;
    return rows
      .map((r) => ({
        id: String(r.id ?? r._id ?? crypto.randomUUID()),
        name: String(r.name ?? r.fullname ?? r.fullName ?? "").trim() || "Unknown",
        email: String(r.email ?? "").trim() || "—",
        message: String(r.message ?? r.details ?? "").trim() || "—",
        isView: r.isView === true || r.isViewed === true,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 10);
  }, [contactsQuery.data]);

  const payments = React.useMemo(
    () =>
      USE_FAKE_OVERVIEW_DATA
        ? MOCK_OVERVIEW_DATA.payments.flatMap((entry) =>
            toPaymentRows(entry.paymentPayload),
          )
        : (paymentsQuery.data ?? []).flatMap((entry) => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry))
              return [];
            return toPaymentRows(
              (entry as { paymentPayload?: unknown }).paymentPayload,
            );
          }),
    [paymentsQuery.data],
  );

  const paymentRevenue = React.useMemo(() => {
    if (dashboardOverview?.summary)
      return dashboardOverview.summary.totalRevenue;

    return payments
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [dashboardOverview, payments]);
  const paymentMonthly = React.useMemo(() => {
    const apiPoints = dashboardOverview?.salesOverview?.[salesRange];
    if (apiPoints && apiPoints.length > 0) {
      return apiPoints.map((point) => ({
        label: point.label,
        value: point.value,
      }));
    }

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
  }, [dashboardOverview?.salesOverview, payments, salesRange]);

  const revenue = React.useMemo(() => paymentRevenue, [paymentRevenue]);
  const totalOrders = dashboardOverview?.summary.totalOrders ?? orders.length;
  const totalSales =
    dashboardOverview?.summary.totalSales ??
    orders.filter((row) => toText(row.status).toLowerCase() === "delivered")
      .length;
  const shippedCount =
    dashboardOverview?.salesActivity.shipped ??
    orders.filter((row) =>
      ["shipped", "in_transit"].includes(toText(row.status).toLowerCase()),
    ).length;
  const deliveredCount =
    dashboardOverview?.salesActivity.delivered ??
    orders.filter((row) => toText(row.status).toLowerCase() === "delivered")
      .length;
  const pendingCount =
    dashboardOverview?.salesActivity.packed ??
    orders.filter((row) =>
      ["processing", "ready_for_shipment"].includes(
        toText(row.status).toLowerCase(),
      ),
    ).length;
  const customerCount =
    dashboardOverview?.summary.customerGrowth ??
    users.filter((row) => toText(row.role).toUpperCase() === "USER").length;
  const [currentTime] = React.useState(() => Date.now());

  const growthPct = React.useMemo(() => {
    if (dashboardOverview?.summary) {
      return dashboardOverview.summary.customerGrowthPercent;
    }

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
  }, [dashboardOverview?.summary, users, currentTime]);

  const topProducts = React.useMemo(() => {
    const apiProducts =
      dashboardOverview?.topProducts?.[topProductsRange] ?? [];
    if (apiProducts.length > 0) {
      return apiProducts.map((item) => ({
        name: item.name,
        category: item.category,
        revenue: `${item.orderCount.toLocaleString()} orders`,
        img: item.image ?? "",
      }));
    }

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
  }, [dashboardOverview?.topProducts, orders, products, topProductsRange]);

  const categorySalesCategories = React.useMemo(
    () => getProductSalesCategories(orders, products),
    [orders, products],
  );
  const categorySalesCountByName = React.useMemo(
    () =>
      new Map(
        categorySalesCategories.map((category) => [
          category.name,
          category.count,
        ]),
      ),
    [categorySalesCategories],
  );
  const currentCategories = React.useMemo(() => {
    const apiCategories = dashboardOverview?.categorySales ?? [];
    if (apiCategories.length > 0) {
      return apiCategories
        .map((category) => ({ name: category.name, count: category.count }))
        .filter((category) => category.name.length > 0)
        .slice(0, 5);
    }

    return (Array.isArray(categories) ? categories : [])
      .map((row) => ({
        name: toText(row.title ?? row.name, "Category"),
        count:
          categorySalesCountByName.get(
            toText(row.title ?? row.name, "Category"),
          ) ?? 0,
      }))
      .filter((category) => category.name.length > 0)
      .slice(0, 5);
  }, [categories, categorySalesCountByName, dashboardOverview?.categorySales]);
  const funnelStages = React.useMemo(
    () =>
      currentCategories.length > 0
        ? currentCategories.map((category) => ({
            label: category.name,
            value: category.count,
          }))
        : [{ label: "Category", value: 0 }],
    [currentCategories],
  );

  const visitorRecords = React.useMemo(
    () =>
      USE_FAKE_OVERVIEW_DATA
        ? MOCK_OVERVIEW_DATA.visitorRecords
        : toTelemetryRows(userMetadataQuery.data),
    [userMetadataQuery.data],
  );

  const visibleVisitorRecords = React.useMemo(() => {
    const hasTimeData = visitorRecords.some(
      (row) => readTimestamp(row) !== null,
    );
    if (!hasTimeData) return visitorRecords;

    const now = currentTime;
    const cutoff =
      visitorsRange === "today"
        ? new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate(),
          ).getTime()
        : now - (visitorsRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000;

    return visitorRecords.filter((row) => {
      const timestamp = readTimestamp(row);
      if (timestamp === null) return true;
      return timestamp >= cutoff;
    });
  }, [currentTime, visitorRecords, visitorsRange]);

  const visitorRows = React.useMemo(() => {
    const apiVisitors = dashboardOverview?.visitors?.[visitorsRange];
    if (apiVisitors) {
      return apiVisitors.countries.map((country) => ({
        label: country.country,
        count: country.sessions,
        percentage: country.percentage,
      }));
    }

    return groupRowsByField(
      visibleVisitorRecords,
      ["country", "region", "city"],
      "Unknown",
    ).map((row) => ({ ...row, percentage: undefined }));
  }, [dashboardOverview?.visitors, visibleVisitorRecords, visitorsRange]);

  const visitorMetrics = React.useMemo(() => {
    const apiVisitors = dashboardOverview?.visitors?.[visitorsRange];
    if (apiVisitors) {
      return {
        sessions: apiVisitors.sessions,
        usersCount: apiVisitors.users,
        locations: apiVisitors.countries.length,
      };
    }

    const sessions = uniqueTextCount(visibleVisitorRecords, ["sessionId"]);
    const usersCount = uniqueTextCount(visibleVisitorRecords, [
      "userId",
      "customerId",
    ]);
    const locations = uniqueTextCount(visibleVisitorRecords, [
      "country",
      "region",
      "city",
    ]);
    return { sessions, usersCount, locations };
  }, [dashboardOverview?.visitors, visibleVisitorRecords, visitorsRange]);
  const revenueCount = useCountUp(revenue);
  const totalOrdersCount = useCountUp(totalOrders);
  const totalSalesCount = useCountUp(totalSales);

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
      (dashboardOverviewQuery.data?.recentOrders ?? [])
        .map((row) => toDashboardRecentOrderRow(row))
        .filter((order) => order.id.length > 0)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20),
    [dashboardOverviewQuery.data],
  );

  const displayedRecentOrders = React.useMemo(
    () => recentOrders.slice(0, 5),
    [recentOrders],
  );

  const displayedContacts = React.useMemo(
    () => contacts.slice(0, 5),
    [contacts],
  );
  const updateOrderStatus = useUpdateOrderStatus();
  const [updatingRecentOrderId, setUpdatingRecentOrderId] = React.useState<
    string | null
  >(null);
  // Optimistic status overrides keyed by order id; anything not overridden
  // falls back to the server value. Derived — no effect needed to resync.
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, OrderStatus>
  >({});

  const recentOrderStatuses = React.useMemo(
    () =>
      Object.fromEntries(
        recentOrders.map((order) => [
          order.id,
          statusOverrides[order.id] ?? order.status,
        ]),
      ) as Record<string, OrderStatus>,
    [recentOrders, statusOverrides],
  );

  const updateRecentOrderStatus = React.useCallback(
    async (orderId: string, status: OrderStatus) => {
      const previousStatus =
        recentOrderStatuses[orderId] ??
        recentOrders.find((order) => order.id === orderId)?.status;

      if (!orderId || status === previousStatus) return;

      setUpdatingRecentOrderId(orderId);
      setStatusOverrides((current) => ({ ...current, [orderId]: status }));

      try {
        await updateOrderStatus.mutateAsync({
          id: orderId,
          payload: { orderStatus: status },
        });
        await dashboardOverviewQuery.refetch();
        // Server now reflects the new status — drop the local override.
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
      } catch {
        setStatusOverrides((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
      } finally {
        setUpdatingRecentOrderId(null);
      }
    },
    [
      dashboardOverviewQuery,
      recentOrderStatuses,
      recentOrders,
      updateOrderStatus,
    ],
  );

  const statCards: ReadonlyArray<StatCardItem> = [
    {
      label: "Total Orders",
      value: totalOrdersCount.toLocaleString(),
      trend: formatTrendPercent(
        dashboardOverview?.summary.orderTrendPercent ?? 0,
      ),
      trendPositive: (dashboardOverview?.summary.orderTrendPercent ?? 0) >= 0,
      tone: statCardTones[0],
      icon: <RotateCcw size={18} strokeWidth={2.25} />,
    },
    {
      label: "Total Sales",
      value: totalSalesCount.toLocaleString(),
      trend: formatTrendPercent(
        dashboardOverview?.summary.salesTrendPercent ?? 0,
      ),
      trendPositive: (dashboardOverview?.summary.salesTrendPercent ?? 0) >= 0,
      tone: statCardTones[1],
      icon: <ShoppingCart size={18} strokeWidth={2.25} />,
    },
    {
      label: "Customer Growth",
      value: customerCount.toLocaleString(),
      trend: formatTrendPercent(growthPct),
      trendPositive: growthPct >= 0,
      tone: statCardTones[2],
      icon: <BarChart2 size={18} strokeWidth={2.25} />,
    },
    {
      label: "Total Revenue",
      value: formatNpr(revenueCount),
      trend: formatTrendPercent(
        dashboardOverview?.summary.revenueTrendPercent ?? 0,
      ),
      trendPositive: (dashboardOverview?.summary.revenueTrendPercent ?? 0) >= 0,
      tone: statCardTones[3],
      icon: <CoinIcon />,
    },
  ];

  return (
    <div className="space-y-4 bg-(--bg) p-8.5 text-(--text)">
      {/* ── Row 1: 4 stat cards ── */}
      <div
        className={`grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(0)}
      >
        {statCards.map((card) => {
          const trendBadgeClassName = card.trendPositive
            ? card.tone.badgeClassName
            : "text-red-700";
          const TrendIcon = card.trendPositive ? TrendingUp : TrendingDown;

          return (
            <div
              key={card.label}
              className={`relative min-h-34 overflow-hidden rounded-2xl border border-zinc-200 p-4 transition-transform duration-300 ease-out hover:-translate-y-0.5 bg-white`}
            >
              <div className="relative flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${card.tone.iconBg}`}
                    >
                      <span className={card.tone.iconColor}>{card.icon}</span>
                    </div>
                    <span
                      className={`text-xs font-medium ${card.tone.labelClassName}`}
                    >
                      {card.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <span
                    className={`text-2xl font-semibold leading-none tabular-nums ${card.tone.valueClassName}`}
                  >
                    {card.value}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold  ${trendBadgeClassName}`}
                  >
                    <TrendIcon size={12} strokeWidth={2.4} />
                    {card.trend}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* ── Row 3: Sales Overview ── */}
      <div
        className={`grid grid-cols-12 gap-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(180)}
      >
        <div className="col-span-12">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mt-3 flex flex-wrap items-start gap-8">
              <div>
                <p className="text-xs text-(--text-tertiary)">Total Earnings</p>
                <p className="text-2xl font-bold text-(--text)">
                  {formatNpr(paymentRevenue)}
                </p>
                {(() => {
                  const revenueTrend =
                    dashboardOverview?.summary.revenueTrendPercent ?? 0;
                  const RevenueTrendIcon =
                    revenueTrend >= 0 ? TrendingUp : TrendingDown;

                  return (
                    <p
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        revenueTrend >= 0
                          ? "text-(--badge-success-text)"
                          : "text-red-700"
                      }`}
                    >
                      <RevenueTrendIcon size={10} />
                      {formatTrendPercent(revenueTrend)}
                    </p>
                  );
                })()}
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
        </div>
      </div>

      {/* ── Row 2: Recent Orders | Inquiries ── */}
      <div
        className={`grid grid-cols-12 gap-4 mt-8 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(90)}
      >
        <div className="col-span-12 lg:col-span-7">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-semibold text-(--text)">
              Recent Orders
            </h2>
            <button
              type="button"
              onClick={() => navigate("/dashboard/orders")}
              className={viewAllButtonClassName}
            >
              <span>View all</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50">
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
                  {dashboardOverviewQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-xs font-medium text-(--text-secondary)"
                      >
                        Loading recent orders...
                      </td>
                    </tr>
                  ) : dashboardOverviewQuery.isError ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-xs font-medium text-red-600"
                      >
                        Unable to load recent orders.
                      </td>
                    </tr>
                  ) : displayedRecentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-xs font-medium text-(--text-secondary)"
                      >
                        No recent orders found.
                      </td>
                    </tr>
                  ) : (
                    displayedRecentOrders.map((o) => {
                      const currentStatus =
                        recentOrderStatuses[o.id] ?? o.status;
                      const isUpdatingStatus = updatingRecentOrderId === o.id;

                      return (
                        <tr
                          key={o.id}
                          className="transition-colors hover:bg-(--bg)"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs font-medium text-(--text-secondary)">
                            {o.orderNumber}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-(--text)">
                              {o.customer}
                            </p>
                            <p className="text-[10px] text-(--text-tertiary)">
                              {o.email}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-(--text)">
                            {o.amount}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button
                                  type="button"
                                  disabled={isUpdatingStatus}
                                  className={`inline-flex w-30 items-center justify-center gap-1 rounded-md px-3 py-1 font-medium leading-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${orderStatusStyle[currentStatus]}`}
                                  style={{ fontSize: "12px", lineHeight: 1 }}
                                >
                                  <span className="truncate">
                                    {isUpdatingStatus
                                      ? "UPDATING"
                                      : formatOrderStatusLabelText(
                                          currentStatus,
                                        )}
                                  </span>
                                  <ChevronDown size={11} />
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  align="center"
                                  sideOffset={6}
                                  className="z-50 min-w-35 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                                >
                                  {orderStatusOptions.map((status) => (
                                    <DropdownMenu.Item
                                      key={status}
                                      disabled={isUpdatingStatus}
                                      onSelect={() => {
                                        void updateRecentOrderStatus(
                                          o.id,
                                          status,
                                        );
                                      }}
                                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:bg-slate-50"
                                    >
                                      <span
                                        className={`h-2.5 w-2.5 rounded-full ${orderStatusIndicatorStyle[status]}`}
                                      />
                                      {formatOrderStatusLabelText(status)}
                                    </DropdownMenu.Item>
                                  ))}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-(--text-secondary)">
                            {o.date}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-(--text-secondary)" />
              <h2 className="text-sm font-semibold text-(--text)">Contacts</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                {contacts.filter((c) => !c.isView).length} new
              </span>
              <button
                type="button"
                onClick={() => navigate("/dashboard/support/contacts")}
                className={viewAllButtonClassName}
              >
                <span>View all</span>
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-x-2 border-b border-(--line) bg-(--bg) px-5 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                Contact
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                Message
              </div>
            </div>
            <div className="divide-y divide-(--line)">
              {contactsQuery.isLoading ? (
                <div className="px-5 py-8 text-center text-xs font-medium text-(--text-secondary)">
                  Loading contacts...
                </div>
              ) : contactsQuery.isError ? (
                <div className="px-5 py-8 text-center text-xs font-medium text-red-600">
                  Unable to load contacts.
                </div>
              ) : displayedContacts.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs font-medium text-(--text-secondary)">
                  No recent contacts found.
                </div>
              ) : (
                displayedContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-x-2 px-5 py-3.5 transition-colors hover:bg-(--bg)"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-(--text)">
                        {contact.name}
                      </p>
                      <p className="truncate text-[10px] text-(--text-tertiary)">
                        {contact.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-(--text-secondary)">
                        {contact.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Product Sales Category ── */}
      <div
        className={`grid grid-cols-12 gap-4 ${animateRows ? "overview-rise" : "opacity-0"}`}
        style={rowAnimation(270)}
      >
        <div className="col-span-12">
          <div className="relative overflow-hidden rounded-[28px]  bg-white">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(currentCategories.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {(currentCategories.length > 0
                ? currentCategories
                : [{ name: "Category", count: 0 }]
              ).map((category) => (
                <div
                  key={category.name}
                  className="flex min-h-25.5 flex-col justify-start px-6 pb-5 pt-5"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-(--primary)/20 ring-1 ring-(--primary)/20" />
                    <p className="text-[14px] font-medium leading-none text-slate-600">
                      {category.name}
                    </p>
                  </div>
                  <p className="mt-3 text-[32px] font-semibold leading-none tracking-[-0.045em] text-slate-950">
                    {category.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-28 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />

            <div className=" ">
              <FunnelChart
                data={funnelStages}
                height={236}
                className="w-full"
                card={false}
                startColor={[220, 237, 253]}
                endColor={[31, 95, 229]}
                showStageLabels={false}
              />
            </div>
          </div>
        </div>

        {/* ── Row 5: Sales Activity | Top Products | Visitors ── */}
        <div
          className={`col-span-12 grid w-full grid-cols-1 gap-4 lg:grid-cols-3 ${animateRows ? "overview-rise" : "opacity-0"}`}
          style={rowAnimation(360)}
        >
          <div className="flex w-full min-w-0 flex-col  gap-2">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-semibold text-(--text)">
                Sales Activity
              </h2>
              <button className="text-(--text-tertiary) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                <MoreHorizontal size={15} />
              </button>
            </div>
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-slate-50 p-5">
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

          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
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
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-slate-50">
              {topProducts.length > 0 ? (
                <div className="divide-y divide-(--line)">
                  {topProducts.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span className="w-4 shrink-0 text-xs text-(--text-tertiary)">
                        {i + 1}
                      </span>
                      {p.img && /^https?:\/\//.test(p.img) ? (
                        <img
                          src={p.img}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-lg leading-none">
                          {p.img || "🧴"}
                        </span>
                      )}
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
              ) : (
                <div className="flex min-h-65 flex-col items-center justify-center px-6 text-center">
                  <p className="text-sm font-medium text-(--text)">
                    No top products yet
                  </p>
                  <p className="mt-1 text-xs text-(--text-tertiary)">
                    Top-selling items will appear here once orders exist.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
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
            <div className="h-full w-full rounded-2xl border border-slate-200 bg-slate-50 p-5">
              {visitorRows.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-widest text-(--text-tertiary)">
                        Sessions
                      </p>
                      <p className="mt-1 text-lg font-semibold text-(--text)">
                        {visitorMetrics.sessions.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-widest text-(--text-tertiary)">
                        Users
                      </p>
                      <p className="mt-1 text-lg font-semibold text-(--text)">
                        {visitorMetrics.usersCount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {visitorRows.map(({ label, count, percentage }) => {
                      const total = visibleVisitorRecords.length;
                      const pct =
                        typeof percentage === "number"
                          ? percentage
                          : total > 0
                            ? Math.round((count / total) * 100)
                            : 0;
                      return (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">🌐</span>
                              <span className="text-sm font-medium text-(--text-secondary)">
                                {label}
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
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-65 flex-col items-center justify-center px-2 text-center">
                  <p className="text-sm font-medium text-(--text)">
                    No visitor data yet
                  </p>
                  <p className="mt-1 text-xs text-(--text-tertiary)">
                    Visitor metadata will appear here once the backend returns
                    user-metadata records.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
