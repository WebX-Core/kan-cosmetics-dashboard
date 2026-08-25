import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, ShoppingBag, Package, UserCheck, ShieldOff } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useOrders, usePurchaseHistoryByCustomer, useCustomerProgress, useCustomerCoupons, useCustomerAddresses } from "@/features/commerce";
import { commerceApi } from "@/features/commerce";
import { useLoyaltyCustomer } from "@/features/loyalty";

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

type CompletionItem = Readonly<{
  label: string;
  filled: boolean;
  weight: number;
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
  const progressQuery = useCustomerProgress(customerId, Boolean(customerId));
  const couponsQuery = useCustomerCoupons(customerId, Boolean(customerId));
  const addressesQuery = useCustomerAddresses(customerId, Boolean(customerId));
  const loyaltyQuery = useLoyaltyCustomer(customerId);
  const bansQuery = commerceApi.customerBans.hooks.useList({ page: 1, limit: 10000 }, Boolean(customerId));

  const customerOrders = React.useMemo(
    () => toOrderRows(ordersQuery.data, customerId ?? ""),
    [ordersQuery.data, customerId],
  );

  const purchaseRows = React.useMemo(() => toPurchaseRows(purchaseQuery.data), [purchaseQuery.data]);

  const totalSpent = customerOrders.reduce((s, o) => s + parseFloat(o.total || "0"), 0);
  const profileCompletion = React.useMemo(() => {
    const progress = (progressQuery.data ?? {}) as Record<string, unknown>;
    const completedFields = Array.isArray(progress.completedFields) ? progress.completedFields.map(String) : [];
    const missingFields = Array.isArray(progress.missingFields) ? progress.missingFields.map(String) : [];
    if (completedFields.length || missingFields.length) {
      const fields = [...completedFields, ...missingFields];
      return {
        items: fields.map((field) => ({ label: field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), filled: completedFields.includes(field), weight: 1 })),
        percent: typeof progress.progress === "number" ? progress.progress : 0,
        completedWeight: completedFields.length,
        totalWeight: fields.length,
      };
    }
    const completionItems: ReadonlyArray<CompletionItem> = [
      { label: "Name", filled: Boolean(customer?.name?.trim()), weight: 20 },
      { label: "Email", filled: Boolean(customer?.email?.trim()), weight: 20 },
      { label: "Phone", filled: Boolean(customer?.phone?.trim() && customer.phone !== "—"), weight: 15 },
      { label: "Gender", filled: Boolean(customer?.gender?.trim() && customer.gender !== "—"), weight: 10 },
      { label: "Address", filled: Boolean(customer?.address?.trim() && customer.address !== "—"), weight: 20 },
      { label: "Profile photo", filled: Boolean(customer?.profilePicture?.trim()), weight: 15 },
    ];

    const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0);
    const completedWeight = completionItems.reduce(
      (sum, item) => sum + (item.filled ? item.weight : 0),
      0,
    );

    return {
      items: completionItems,
      percent: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
      completedWeight,
      totalWeight,
    };
  }, [customer, progressQuery.data]);

  const customerCouponRecord = React.useMemo(() => {
    const payload = couponsQuery.data as { customers?: unknown[] } | undefined;
    return (payload?.customers?.[0] ?? {}) as Record<string, unknown>;
  }, [couponsQuery.data]);
  const couponRows = React.useMemo(() => {
    const cards = Array.isArray(customerCouponRecord.cards) ? customerCouponRecord.cards : [];
    return cards.map((value) => {
      const item = value as Record<string, unknown>;
      return { id: text(item.id, crypto.randomUUID()), code: text(item.code, "—"), title: text(item.title, "—"), status: text(item.eligibilityStatus, "—"), used: Number(item.usedCountForCustomer ?? 0), expiresAt: text(item.expiresAt) };
    });
  }, [customerCouponRecord]);
  const addressRows = React.useMemo(() => {
    const values = Array.isArray(addressesQuery.data) ? addressesQuery.data : [];
    return values.map((value) => {
      const item = value as Record<string, unknown>;
      return { id: text(item.id, crypto.randomUUID()), type: text(item.type, "—"), name: text(item.fullName, "—"), phone: text(item.phone, "—"), address: [text(item.addressLine1), text(item.city), text(item.district)].filter(Boolean).join(", "), isDefault: item.isDefault === true };
    });
  }, [addressesQuery.data]);
  const activeBan = React.useMemo(() => {
    const payload = bansQuery.data as { data?: unknown[] } | unknown[] | undefined;
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
    return rows.find((value) => {
      const item = value as Record<string, unknown>;
      const related = typeof item.customer === "object" && item.customer !== null ? item.customer as Record<string, unknown> : {};
      return text(item.customerId ?? related.id) === customerId;
    }) as Record<string, unknown> | undefined;
  }, [bansQuery.data, customerId]);
  const loyalty = (loyaltyQuery.data ?? {}) as Record<string, unknown>;

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

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigate(`/dashboard/loyalty/customers/${customerId}`)} className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f5f5f7]">
          Loyalty details{typeof loyalty.currentPoints === "number" ? ` · ${loyalty.currentPoints} points` : ""}
        </button>
        {activeBan ? (
          <button type="button" onClick={() => navigate(`/dashboard/customers/bans/${text(activeBan.id)}/edit`)} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            View active ban
          </button>
        ) : (
          <button type="button" onClick={() => navigate("/dashboard/customers/bans/create", { state: { customer } })} className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f5f5f7]">
            Ban customer
          </button>
        )}
      </div>

      {customer && (
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[56ch]">
              <p className="text-[11px] font-medium tracking-[0.14em] text-[#6e6e73]">
                Customer profile completion
              </p>
              <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                {customer.name}
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-[#424245]">
                Calculated from the customer fields stored in the dashboard. Address counts only when a
                real value is present, so blank or placeholder address data lowers the score.
              </p>
              <p className="mt-2 text-[11px] text-[#6e6e73]">
                {profileCompletion.completedWeight} of {profileCompletion.totalWeight} weighted points filled
              </p>
            </div>

            <div className="text-left md:text-right">
              <div className="text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                {profileCompletion.percent}%
              </div>
              <div className="text-[11px] text-[#6e6e73]">
                {profileCompletion.percent === 100 ? "Complete" : "In progress"}
              </div>
            </div>
          </div>

          <div
            role="progressbar"
            aria-label="Customer profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profileCompletion.percent}
            className="mt-4 h-2 overflow-hidden rounded-full bg-[#ececf0]"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
              style={{ width: `${profileCompletion.percent}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profileCompletion.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-2xl border border-[#ececf0] bg-[#fafafa] px-3 py-2 text-[12px] text-[#424245]"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    item.filled ? "bg-emerald-50 text-emerald-600" : "bg-[#ececf0] text-[#8e8e93]"
                  }`}
                  aria-hidden="true"
                >
                  <CheckCircle2 size={13} strokeWidth={2.2} />
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[11px] text-[#6e6e73]">
                  {item.filled ? "Filled" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          { key: "orderNumber", label: "Order #", sortValue: (r: OrderRow) => r.orderNumber, render: (r: OrderRow) => <span className="font-medium text-gray-900">{r.orderNumber}</span> },
          { key: "total", label: "Total", sortValue: (r: OrderRow) => Number(r.total) || 0, render: (r: OrderRow) => <span>Rs {r.total}</span> },
          { key: "status", label: "Status", sortValue: (r: OrderRow) => r.status, render: (r: OrderRow) => <StatusBadge status={r.status} /> },
          { key: "date", label: "Date", sortValue: (r: OrderRow) => r.date, render: (r: OrderRow) => <span className="text-xs text-gray-500">{fmt(r.date)}</span> },
        ]}
        data={customerOrders}
        emptyMessage={ordersQuery.isLoading ? "Loading orders…" : "No orders found for this customer."}
        showPagination={false}
      />

      <DataTableV2
        title="Purchase History"
        columns={[
          { key: "orderNumber", label: "Order #", sortValue: (r: PurchaseRow) => r.orderNumber, render: (r: PurchaseRow) => <span className="font-medium text-gray-900">{r.orderNumber}</span> },
          { key: "product", label: "Product", sortValue: (r: PurchaseRow) => r.product, render: (r: PurchaseRow) => <span className="text-gray-700">{r.product}</span> },
          { key: "qty", label: "Qty", sortValue: (r: PurchaseRow) => r.qty, render: (r: PurchaseRow) => <span className="text-gray-600">{r.qty}</span> },
          { key: "unitPrice", label: "Unit Price", sortValue: (r: PurchaseRow) => Number(r.unitPrice) || 0, render: (r: PurchaseRow) => <span className="text-gray-600">Rs {r.unitPrice}</span> },
          { key: "lineTotal", label: "Total", sortValue: (r: PurchaseRow) => Number(r.lineTotal) || 0, render: (r: PurchaseRow) => <span className="font-medium text-gray-900">Rs {r.lineTotal}</span> },
          { key: "status", label: "Status", sortValue: (r: PurchaseRow) => r.status, render: (r: PurchaseRow) => <StatusBadge status={r.status} /> },
          { key: "purchasedAt", label: "Date", sortValue: (r: PurchaseRow) => r.purchasedAt, render: (r: PurchaseRow) => <span className="text-xs text-gray-500">{fmt(r.purchasedAt)}</span> },
        ]}
        data={purchaseRows}
        emptyMessage={purchaseQuery.isLoading ? "Loading purchase history…" : "No purchase history found."}
        showPagination={false}
      />

      <DataTableV2
        title="Coupons"
        columns={[
          { key: "code", label: "Code", sortValue: (r: typeof couponRows[number]) => r.code, render: (r: typeof couponRows[number]) => <span className="font-mono font-semibold">{r.code}</span> },
          { key: "title", label: "Coupon", sortValue: (r: typeof couponRows[number]) => r.title },
          { key: "status", label: "Eligibility", sortValue: (r: typeof couponRows[number]) => r.status, render: (r: typeof couponRows[number]) => <StatusBadge status={r.status} /> },
          { key: "used", label: "Times used", sortValue: (r: typeof couponRows[number]) => r.used },
          { key: "expiresAt", label: "Expires", sortValue: (r: typeof couponRows[number]) => r.expiresAt, render: (r: typeof couponRows[number]) => fmt(r.expiresAt) },
        ]}
        data={couponRows}
        emptyMessage={couponsQuery.isLoading ? "Loading coupons…" : "No coupons found for this customer."}
        showPagination={false}
      />

      <DataTableV2
        title="Saved Addresses"
        columns={[
          { key: "type", label: "Type", sortValue: (r: typeof addressRows[number]) => r.type },
          { key: "name", label: "Recipient", sortValue: (r: typeof addressRows[number]) => r.name },
          { key: "phone", label: "Phone", sortValue: (r: typeof addressRows[number]) => r.phone },
          { key: "address", label: "Address", sortValue: (r: typeof addressRows[number]) => r.address },
          { key: "isDefault", label: "Default", sortValue: (r: typeof addressRows[number]) => (r.isDefault ? 1 : 0), render: (r: typeof addressRows[number]) => r.isDefault ? "Yes" : "No" },
        ]}
        data={addressRows}
        emptyMessage={addressesQuery.isLoading ? "Loading addresses…" : "No saved addresses."}
        showPagination={false}
      />
    </PageLayout>
  );
};
