import React from "react";
import { CreditCard, CheckCircle, Clock, XCircle, DollarSign, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { usePaymentsList } from "@/features/commerce";
import { commerceApi } from "@/features/commerce";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
  formatPaymentStatusLabel,
  formatSettlementStatusLabel,
  normalizePaymentStatus,
  normalizeSettlementStatus,
} from "@/shared/utils/paymentStatus";

type PaymentRow = Readonly<{
  id: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  amount: number;
  method: string;
  status: string;
  settlementStatus: string;
  paymentSource: string;
  providerName: string;
  providerTransactionId: string;
  providerStatusRaw: string;
  paidAt: string;
  settlementDueAt: string;
  settledAt: string;
  settlementReference: string;
  settlementNote: string;
  date: string;
}>;

const toText = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};
const toOptionalText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const getOrderCustomer = (orderRef: Record<string, unknown>): Record<string, unknown> => {
  const directCustomer = orderRef.customer;
  if (directCustomer && typeof directCustomer === "object" && !Array.isArray(directCustomer)) {
    return directCustomer as Record<string, unknown>;
  }

  const nestedData = orderRef.data;
  if (nestedData && typeof nestedData === "object" && !Array.isArray(nestedData)) {
    const nestedCustomer = (nestedData as Record<string, unknown>).customer;
    if (nestedCustomer && typeof nestedCustomer === "object" && !Array.isArray(nestedCustomer)) {
      return nestedCustomer as Record<string, unknown>;
    }
  }

  return {};
};

const getCustomerName = (orderRef: Record<string, unknown>): string => {
  const customer = getOrderCustomer(orderRef);
  const shippingAddress =
    orderRef.shippingAddress && typeof orderRef.shippingAddress === "object" && !Array.isArray(orderRef.shippingAddress)
      ? orderRef.shippingAddress as Record<string, unknown>
      : {};
  const firstName = toText(customer.firstname, "");
  const lastName = toText(customer.lastname, "");
  const directName = [firstName, lastName].filter(Boolean).join(" ");
  if (directName) return directName;

  return toText(
    customer.fullname ?? customer.name ?? orderRef.customerName ?? shippingAddress.fullName ?? orderRef.fullname ?? orderRef.name,
    "Unknown",
  );
};

const getCustomerEmail = (orderRef: Record<string, unknown>): string => {
  const customer = getOrderCustomer(orderRef);
  return toText(
    customer.email ?? orderRef.customerEmail ?? orderRef.guestEmail ?? orderRef.email,
    "—",
  );
};

const toPaymentRows = (payload: unknown, orderRef: Record<string, unknown>): ReadonlyArray<PaymentRow> => {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(record.payments)
      ? (record.payments as unknown[])
      : Array.isArray((record.data as Record<string, unknown> | undefined)?.payments)
        ? (((record.data as Record<string, unknown> | undefined)?.payments as unknown[]) ?? [])
        : [];

  return rows.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: toText(item.id, ""),
      transactionId: toText(item.transactionId ?? item.reference, "—"),
      customerName: getCustomerName(orderRef),
      customerEmail: getCustomerEmail(orderRef),
      orderNumber: toText(orderRef.orderNumber ?? orderRef.orderId, "—"),
      amount: toNumber(item.amount ?? item.totalAmount),
      method: toText(item.method ?? item.paymentMethod, "—"),
      status: normalizePaymentStatus(item.paymentStatus ?? item.status),
      settlementStatus: normalizeSettlementStatus(item.settlementStatus),
      paymentSource: toText(item.paymentSource, "—"),
      providerName: toOptionalText(item.providerName),
      providerTransactionId: toOptionalText(item.providerTransactionId),
      providerStatusRaw: toOptionalText(item.providerStatusRaw),
      paidAt: toOptionalText(item.paidAt),
      settlementDueAt: toOptionalText(item.settlementDueAt),
      settledAt: toOptionalText(item.settledAt),
      settlementReference: toOptionalText(item.settlementReference),
      settlementNote: toOptionalText(item.settlementNote),
      date: toText(item.date ?? item.createdAt, "—"),
    };
  });
};
const formatDateTime = (value: string): string => {
  if (!value || value === "—") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="space-y-1.5 border-t border-[#f0f0f2] pt-4 first:border-t-0 first:pt-0">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a1a1aa]">{label}</p>
    <div className="text-[14px] font-medium text-[#1d1d1f]">{value}</div>
  </div>
);

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id: paymentId } = useParams<{ id?: string }>();
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [settlementFilter, setSettlementFilter] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const debouncedSearch = useDebouncedValue(search, 400);
  const query = usePaymentsList({ page: paymentId ? 1 : page, limit: paymentId ? 10000 : limit, search: paymentId ? undefined : debouncedSearch || undefined, paymentStatus: paymentId ? undefined : activeTab !== "all" ? activeTab.toUpperCase() : undefined, settlementStatus: paymentId ? undefined : settlementFilter || undefined, paymentSource: paymentId ? undefined : sourceFilter || undefined });
  const [settling, setSettling] = React.useState(false);

  const payments = React.useMemo(
    () =>
      (Array.isArray((query.data as Record<string, unknown> | undefined)?.payments) ? ((query.data as Record<string, unknown>).payments as unknown[]) : []).flatMap((entry) => { const item = typeof entry === "object" && entry !== null ? entry as Record<string, unknown> : {}; const order = typeof item.order === "object" && item.order !== null ? item.order as Record<string, unknown> : {}; return toPaymentRows([item], order); }),
    [query.data]
  );

  const filtered = payments;
  const visibleIds = React.useMemo(() => filtered.map((row) => row.id), [filtered]);
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );

  const toggleSelectOne = (paymentId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? (prev.includes(paymentId) ? prev : [...prev, paymentId])
        : prev.filter((entry) => entry !== paymentId),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const totalPages = typeof (query.data as Record<string, unknown> | undefined)?.totalPages === "number" ? Number((query.data as Record<string, unknown>).totalPages) : 1;
  const pageData = filtered;
  const backendTotal = typeof (query.data as Record<string, unknown> | undefined)?.total === "number" ? Number((query.data as Record<string, unknown>).total) : payments.length;

  const stats = React.useMemo(() => ({
    total: backendTotal,
    paid: payments.filter((p) => p.status === "PAID").length,
    unpaid: payments.filter((p) => p.status === "UNPAID").length,
    failed: payments.filter((p) => p.status === "FAILED").length,
    totalAmount: payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0),
  }), [backendTotal, payments]);

  const selectedPayment = React.useMemo(
    () => payments.find((payment) => payment.id === paymentId) ?? null,
    [paymentId, payments],
  );

  const tabs = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
    { key: "failed", label: "Failed" },
  ];

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all payments"
        />
      ),
      render: (row: PaymentRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.id, event.target.checked)}
          aria-label={`Select ${row.transactionId}`}
        />
      ),
      width: "44px",
    },
    { key: "transactionId", label: "Transaction ID", sortValue: (row: PaymentRow) => row.transactionId, render: (row: PaymentRow) => (
      <span className="font-medium text-gray-900">{row.transactionId}</span>
    )},
    { key: "customer", label: "Customer", sortValue: (row: PaymentRow) => row.customerName, render: (row: PaymentRow) => (
      <div>
        <div className="font-medium text-gray-900">{row.customerName}</div>
        <div className="text-xs text-gray-400">{row.customerEmail}</div>
      </div>
    )},
    { key: "orderNumber", label: "Order", sortValue: (row: PaymentRow) => row.orderNumber, render: (row: PaymentRow) => (
      <span className="text-gray-700">{row.orderNumber}</span>
    )},
    { key: "amount", label: "Amount", sortValue: (row: PaymentRow) => row.amount, render: (row: PaymentRow) => (
      <span className="font-medium text-gray-900">Rs {row.amount.toFixed(2)}</span>
    )},
    { key: "method", label: "Method", sortValue: (row: PaymentRow) => row.method, render: (row: PaymentRow) => (
      <span className="text-gray-700">{row.method}</span>
    )},
    {
      key: "status",
      label: "Status",
      render: (row: PaymentRow) => (
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={row.status} label={formatPaymentStatusLabel(row.status)} />
          <StatusBadge
            status={row.settlementStatus}
            label={formatSettlementStatusLabel(row.settlementStatus)}
          />
        </div>
      ),
    },
  ];

  if (paymentId) {
    if (query.isLoading) {
      return (
        <PageLayout
          title="Payment"
          subtitle="Loading payment details..."
          onBack={() => navigate("/dashboard/payments")}
        >
          <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6 text-[#6e6e73]">
            Loading payment...
          </div>
        </PageLayout>
      );
    }

    if (!selectedPayment) {
      return (
        <PageLayout
          title="Payment"
          subtitle="Payment details"
          onBack={() => navigate("/dashboard/payments")}
        >
          <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
            <p className="text-sm text-[#6e6e73]">No payment found for this record.</p>
          </div>
        </PageLayout>
      );
    }

    return (
      <PageLayout
        title="Payment"
        subtitle={`Order ${selectedPayment.orderNumber}`}
        onBack={() => navigate("/dashboard/payments")}
      >
        {selectedPayment.settlementStatus !== "SETTLED" && selectedPayment.settlementStatus !== "NOT_REQUIRED" ? (
          <div className="mb-4 flex justify-end">
            <button type="button" disabled={settling} onClick={async () => { setSettling(true); try { await commerceApi.payments.settle(selectedPayment.id); toast.success("Payment settled."); await query.refetch(); } catch (error) { toast.error(parseApiError(error).message); } finally { setSettling(false); } }} className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{settling ? "Settling..." : "Mark Settled"}</button>
          </div>
        ) : null}
        <div className="rounded-[24px] border border-[#e5e5e7] bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Payment</h2>
              <p className="text-[13px] text-[#6e6e73]">
                {selectedPayment.customerName} · {selectedPayment.orderNumber}
              </p>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            <DetailField label="Method" value={selectedPayment.method} />
            <DetailField label="Source" value={selectedPayment.paymentSource} />
            <DetailField label="Customer" value={selectedPayment.customerName} />
            <DetailField label="Customer Email" value={selectedPayment.customerEmail} />
            <DetailField
              label="Status"
              value={<StatusBadge status={selectedPayment.status} label={formatPaymentStatusLabel(selectedPayment.status)} />}
            />
            <DetailField
              label="Settlement"
              value={<StatusBadge status={selectedPayment.settlementStatus} label={formatSettlementStatusLabel(selectedPayment.settlementStatus)} />}
            />
            <DetailField label="Amount" value={`Rs ${selectedPayment.amount.toLocaleString()}`} />
            <DetailField label="Provider" value={selectedPayment.providerName || "—"} />
            <DetailField label="Transaction ID" value={selectedPayment.transactionId} />
            <DetailField label="Paid At" value={formatDateTime(selectedPayment.paidAt || selectedPayment.date)} />
            <DetailField label="Settlement Due" value={formatDateTime(selectedPayment.settlementDueAt)} />
            <DetailField label="Settled At" value={formatDateTime(selectedPayment.settledAt)} />
            <DetailField label="Reference" value={selectedPayment.settlementReference || "—"} />
            <DetailField label="Settlement Note" value={selectedPayment.settlementNote || "—"} />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Payments"
      subtitle="Track payment status and transaction details."
      actions={<div className="flex flex-wrap gap-2"><select value={settlementFilter} onChange={(e) => { setSettlementFilter(e.target.value); setPage(1); }} className="h-[34px] rounded-full border border-[#d2d2d7] bg-white px-3 text-xs"><option value="">All settlements</option><option value="PENDING">Pending settlement</option><option value="DUE">Due</option><option value="SETTLED">Settled</option><option value="FAILED">Failed settlement</option><option value="NOT_REQUIRED">Not required</option></select><select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="h-[34px] rounded-full border border-[#d2d2d7] bg-white px-3 text-xs"><option value="">All sources</option><option value="IN_HOUSE">In house</option><option value="COURIER">Courier</option></select><ExportMenu basePath="/payment" params={{ search: debouncedSearch || undefined, paymentStatus: activeTab !== "all" ? activeTab.toUpperCase() : undefined, settlementStatus: settlementFilter || undefined, paymentSource: sourceFilter || undefined, limit: 10000 }} filename="payments"/></div>}
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder="Search payments..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCardV2 label="Total Payments" value={stats.total} icon={CreditCard} colorVariant="blue" />
        <StatCardV2 label="Paid on Page" value={stats.paid} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Unpaid on Page" value={stats.unpaid} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Failed on Page" value={stats.failed} icon={XCircle} colorVariant="red" />
        <StatCardV2 label="Page Revenue" value={`Rs ${stats.totalAmount.toFixed(2)}`} icon={DollarSign} colorVariant="blue" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setPage(1); }}
        columns={columns}
        data={pageData}
        actions={selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              aria-label="Clear selected payments"
            >
              <X size={12} />
            </button>
          </div>
        ) : undefined}
        searchValue={search}
        emptyMessage={query.isLoading ? "Loading payments..." : "No payments found."}
        showPagination={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={limit}
        onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
        onRowClick={(row) => navigate(`/dashboard/payments/${row.id}`)}
      />
    </PageLayout>
  );
};
