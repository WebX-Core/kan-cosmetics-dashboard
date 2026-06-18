import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Package, DollarSign, Loader2, Clock3, User2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { commerceApi, useAbandonedCartAggregate, useCartAggregate } from "@/features/commerce";

type CustomerInfo = Readonly<{
  name: string;
  email: string;
  phone?: string;
  type?: "active" | "abandoned";
}>;

type CartSummaryRow = Readonly<{
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemCount: number;
  totalAmount: number;
  lastCartActivityAt: string;
  status: "Active" | "Abandoned";
}>;

type CartItem = Readonly<{
  id: string;
  coverImage: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
}>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatDateTime = (value: unknown): string => {
  const raw = text(value);
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const buildFullName = (
  firstName: unknown,
  middleName: unknown,
  lastName: unknown,
): string => {
  const parts = [firstName, middleName, lastName]
    .map((part) => text(part))
    .filter(Boolean);
  return parts.join(" ") || "Customer";
};

const getObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toSummaryRow = (value: unknown): CartSummaryRow => {
  const row = getObject(value);
  return {
    customerId: text(row.customerId, crypto.randomUUID()),
    customerName: buildFullName(row.firstname, row.middlename, row.lastname),
    customerEmail: text(row.email, "—"),
    customerPhone: text(row.phone, "—"),
    itemCount: toNumber(row.itemCount ?? row.itemsCount ?? row.abandonedItemCount),
    totalAmount: toNumber(row.totalAmount ?? row.abandonedTotalAmount ?? row.total),
    lastCartActivityAt: text(
      row.lastCartActivityAt ?? row.lastAbandonedAt ?? row.updatedAt ?? row.createdAt,
    ),
    status: text(row.abandonedItemCount ?? row.abandonedTotalAmount ? "Abandoned" : "Active", "Active") as CartSummaryRow["status"],
  };
};

const extractRows = (payload: unknown): ReadonlyArray<CartSummaryRow> => {
  const root = getObject(payload);
  const candidates = [
    payload,
    root.data,
    root.rows,
    root.items,
    getObject(root.data).rows,
    getObject(root.data).items,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map(toSummaryRow);
  }

  return [];
};

const toCartItem = (raw: unknown): CartItem => {
  const row = getObject(raw);
  const coverImage = text(row.coverImage ?? row.image ?? row.productImage);
  const quantity = toNumber(row.quantity, 0);
  const price = toNumber(row.price, 0);
  return {
    id: text(row.id, crypto.randomUUID()),
    coverImage,
    productId: text(row.productId),
    quantity,
    price,
    subtotal: toNumber(row.subtotal ?? row.lineTotal ?? (price * quantity)),
  };
};

const extractItems = (payload: unknown): ReadonlyArray<CartItem> => {
  const root = getObject(payload);
  const candidates = [
    payload,
    root.data,
    root.items,
    root.rows,
    getObject(root.data).items,
    getObject(root.data).rows,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map(toCartItem);
  }

  return [];
};

const itemCurrency = (amount: number): string => `Rs ${amount.toFixed(2)}`;

export const CartDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const customer = (location.state as { customer?: CustomerInfo } | null)?.customer;

  const activeSummaryQuery = useCartAggregate();
  const abandonedSummaryQuery = useAbandonedCartAggregate();

  const activeSummaryRows = React.useMemo(() => extractRows(activeSummaryQuery.data), [activeSummaryQuery.data]);
  const abandonedSummaryRows = React.useMemo(() => extractRows(abandonedSummaryQuery.data), [abandonedSummaryQuery.data]);
  const allSummaryRows = React.useMemo(
    () => [...activeSummaryRows, ...abandonedSummaryRows],
    [activeSummaryRows, abandonedSummaryRows],
  );

  const summary = React.useMemo(
    () => allSummaryRows.find((row) => row.customerId === customerId),
    [allSummaryRows, customerId],
  );

  const inferredType = customer?.type ?? summary?.status?.toLowerCase();
  const isAbandoned = inferredType === "abandoned";

  const query = useQuery({
    queryKey: ["cart", isAbandoned ? "abandoned" : "active", "customer", customerId],
    queryFn: () =>
      isAbandoned
        ? commerceApi.carts.abandonedByCustomer(customerId!)
        : commerceApi.carts.byCustomer(customerId!),
    enabled: Boolean(customerId),
    staleTime: 30_000,
  });

  const payload = React.useMemo(() => {
    const data = getObject(query.data);
    return (data.data ?? data) as Record<string, unknown> | undefined;
  }, [query.data]);

  const items = React.useMemo(() => extractItems(payload), [payload]);

  const displayName = customer?.name ?? summary?.customerName ?? "Customer";
  const displayEmail = customer?.email ?? summary?.customerEmail ?? "—";
  const displayPhone = customer?.phone ?? summary?.customerPhone ?? "—";
  const cartType = isAbandoned ? "Abandoned Cart" : "Cart";

  const totalItems = summary?.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = summary?.totalAmount ?? items.reduce((sum, item) => sum + item.subtotal, 0);
  const lastActivity = summary?.lastCartActivityAt ?? "";

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row: CartItem) => (
        <div className="flex items-center gap-3">
          {row.coverImage ? (
            <img
              src={row.coverImage}
              alt="Product"
              className="h-10 w-10 rounded-lg object-cover border border-[#e5e5e7] bg-[#f5f5f7]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e7] bg-[#f5f5f7]">
              <Package size={16} className="text-[#86868b]" />
            </div>
          )}
          <span className="font-mono text-xs text-[#86868b]">{row.productId || "—"}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      render: (row: CartItem) => <span className="font-medium text-[#1d1d1f]">{row.quantity}</span>,
    },
    {
      key: "price",
      label: "Unit Price",
      render: (row: CartItem) => <span className="text-[#1d1d1f]">{itemCurrency(row.price)}</span>,
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (row: CartItem) => <span className="font-semibold text-[#1d1d1f]">{itemCurrency(row.subtotal)}</span>,
    },
  ];

  return (
    <PageLayout
      title={`${displayName}'s ${cartType}`}
      subtitle={`${displayEmail}${displayPhone !== "—" ? ` · ${displayPhone}` : ""}`}
      onBack={() => navigate("/dashboard/carts")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Items" value={totalItems} icon={ShoppingCart} colorVariant="blue" compact />
        <StatCardV2 label="Total" value={itemCurrency(totalAmount)} icon={DollarSign} colorVariant="emerald" compact />
        <StatCardV2 label="Last Activity" value={lastActivity ? formatDateTime(lastActivity) : "—"} icon={Clock3} colorVariant="amber" compact />
        <StatCardV2 label="Type" value={isAbandoned ? "Abandoned" : "Active"} icon={User2} colorVariant={isAbandoned ? "amber" : "emerald"} compact />
      </div>

      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#86868b]">
              Cart Summary
            </p>
            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              {displayName}
            </h2>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              {isAbandoned ? "Abandoned cart" : "Active cart"}
            </p>
          </div>
          <div className="text-right text-[13px] text-[#6e6e73]">
            <p>{displayPhone}</p>
            <p className="mt-1">
              {lastActivity ? `Updated ${formatDateTime(lastActivity)}` : "No activity yet"}
            </p>
          </div>
        </div>
      </div>

      <DataTableV2
        title="Cart Items"
        subtitle="Products currently in this cart."
        columns={columns}
        data={items}
        emptyMessage={
          query.isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading cart...
            </span>
          ) : (
            "This cart is empty."
          )
        }
        showPagination={false}
      />
    </PageLayout>
  );
};
