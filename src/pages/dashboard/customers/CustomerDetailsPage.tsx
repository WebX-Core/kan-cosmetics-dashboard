import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Package, History, UserCheck, ShieldOff } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useOrders, usePurchaseHistoryByCustomer } from "@/features/commerce";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type CustomerState = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  isVerified: boolean;
  profilePicture: string;
  createdAt: string;
}>;

type OrderRow = Readonly<{ id: string; orderNumber: string; total: string; status: string; date: string }>;
type PurchaseRow = Readonly<{
  id: string;
  orderNumber: string;
  product: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  status: string;
  purchasedAt: string;
}>;

const toOrderRow = (o: unknown): OrderRow => {
  const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
  return {
    id: text(r.id, crypto.randomUUID()),
    orderNumber: text(r.orderNumber ?? r.orderId, "—"),
    total: text(r.total ?? r.totalAmount, "0"),
    status: text(r.status, "Pending"),
    date: text(r.createdAt ?? r.date, "—"),
  };
};

const toPurchaseRow = (p: unknown): PurchaseRow => {
  const r = (typeof p === "object" && p !== null ? p : {}) as Record<string, unknown>;
  const unitPrice = parseFloat(text(r.unitPrice ?? r.price, "0")) || 0;
  const qty = typeof r.quantity === "number" ? r.quantity : parseInt(text(r.quantity, "1"), 10) || 1;
  const lineTotal = parseFloat(text(r.lineTotal ?? r.totalPrice, String(unitPrice * qty))) || unitPrice * qty;
  return {
    id: text(r.id, crypto.randomUUID()),
    orderNumber: text(r.orderNumberSnapshot ?? r.orderNumber, "—"),
    product: text(r.productTitleSnapshot ?? r.productName ?? r.title, "—"),
    qty,
    unitPrice: unitPrice.toFixed(2),
    lineTotal: lineTotal.toFixed(2),
    status: text(r.orderStatus ?? r.status, "—"),
    purchasedAt: text(r.purchasedAt ?? r.createdAt, ""),
  };
};

const toOrderRows = (payload: unknown, customerId: string): OrderRow[] => {
  const p = payload as Record<string, unknown> | undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(p?.orders)
    ? (p.orders as unknown[])
    : ((p as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((o) => {
      const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
      return text(r.customerId) === customerId;
    })
    .map(toOrderRow);
};

const toPurchaseRows = (payload: unknown): PurchaseRow[] => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[]; purchases?: unknown[] } | undefined)?.purchases ?? (payload as { data?: unknown[] } | undefined)?.data ?? []);
  return (items as unknown[]).map(toPurchaseRow);
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start gap-4 py-3 border-b border-[#f5f5f7] last:border-0">
    <span className="w-28 shrink-0 text-xs font-medium text-[#86868b]">{label}</span>
    <span className="text-sm text-[#1d1d1f]">{value || "—"}</span>
  </div>
);

export const CustomerDetailsPage: React.FC = () => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const customer = (location.state as { customer?: CustomerState } | null)?.customer;

  const ordersQuery = useOrders(undefined, true);
  const purchaseQuery = usePurchaseHistoryByCustomer(customerId, Boolean(customerId));

  const customerOrders = React.useMemo(
    () => toOrderRows(ordersQuery.data, customerId ?? ""),
    [ordersQuery.data, customerId],
  );

  const purchaseRows = React.useMemo(() => toPurchaseRows(purchaseQuery.data), [purchaseQuery.data]);

  const totalSpent = customerOrders.reduce((s, o) => s + parseFloat(o.total || "0"), 0);

  const displayName = customer?.name ?? "Customer";
  const displaySub = customer ? `${customer.email}${customer.phone !== "—" ? ` · ${customer.phone}` : ""}` : (customerId ?? "");

  return (
    <PageLayout
      title={displayName}
      subtitle={displaySub}
      onBack={() => navigate("/dashboard/customers")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Orders" value={customerOrders.length} icon={ShoppingBag} colorVariant="blue" />
        <StatCardV2 label="Total Spent" value={`Rs ${totalSpent.toFixed(0)}`} icon={Package} colorVariant="emerald" />
        <StatCardV2
          label="Verified"
          value={customer?.isVerified ? "Yes" : "No"}
          icon={customer?.isVerified ? UserCheck : ShieldOff}
          colorVariant={customer?.isVerified ? "emerald" : "amber"}
        />
      </div>

      {customer && (
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">Profile</p>
          <InfoRow label="Name" value={customer.name} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Gender" value={customer.gender !== "—" ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : "—"} />
          <InfoRow label="Address" value={customer.address} />
          <InfoRow label="Joined" value={fmt(customer.createdAt)} />
        </div>
      )}

      <DataTableV2
        title="Orders"
        columns={[
          { key: "orderNumber", label: "Order #", render: (r: OrderRow) => <span className="font-medium text-gray-900">{r.orderNumber}</span> },
          { key: "total", label: "Total", render: (r: OrderRow) => <span>Rs {r.total}</span> },
          { key: "status", label: "Status", render: (r: OrderRow) => <StatusBadge status={r.status} /> },
          { key: "date", label: "Date", render: (r: OrderRow) => <span className="text-xs text-gray-500">{fmt(r.date)}</span> },
        ]}
        data={customerOrders}
        emptyMessage={ordersQuery.isLoading ? "Loading orders…" : "No orders found for this customer."}
        showPagination={false}
      />

      <DataTableV2
        title="Purchase History"
        columns={[
          { key: "orderNumber", label: "Order #", render: (r: PurchaseRow) => <span className="font-medium text-gray-900">{r.orderNumber}</span> },
          { key: "product", label: "Product", render: (r: PurchaseRow) => <span className="text-gray-700">{r.product}</span> },
          { key: "qty", label: "Qty", render: (r: PurchaseRow) => <span className="text-gray-600">{r.qty}</span> },
          { key: "unitPrice", label: "Unit Price", render: (r: PurchaseRow) => <span className="text-gray-600">Rs {r.unitPrice}</span> },
          { key: "lineTotal", label: "Total", render: (r: PurchaseRow) => <span className="font-medium text-gray-900">Rs {r.lineTotal}</span> },
          { key: "status", label: "Status", render: (r: PurchaseRow) => <StatusBadge status={r.status} /> },
          { key: "purchasedAt", label: "Date", render: (r: PurchaseRow) => <span className="text-xs text-gray-500">{fmt(r.purchasedAt)}</span> },
        ]}
        data={purchaseRows}
        emptyMessage={purchaseQuery.isLoading ? "Loading purchase history…" : "No purchase history found."}
        showPagination={false}
      />
    </PageLayout>
  );
};
