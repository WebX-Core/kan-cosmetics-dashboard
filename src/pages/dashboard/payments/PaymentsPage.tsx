import React from "react";
import { CreditCard, CheckCircle, Clock, XCircle, DollarSign, Loader2, X } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { usePaymentsAggregate, usePaymentUpdate } from "@/features/commerce";
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
  settlementDueAt: string;
  settledAt: string;
  settlementReference: string;
  settlementNote: string;
  date: string;
}>;

const toText = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toNumber = (value: unknown): number => (typeof value === "number" ? value : 0);
const toOptionalText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toPaymentRows = (payload: unknown, orderRef: Record<string, unknown>): ReadonlyArray<PaymentRow> => {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);

  return rows.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: toText(item.id, ""),
      transactionId: toText(item.transactionId ?? item.reference, "—"),
      customerName: toText(orderRef.customerName ?? orderRef.fullname, "Unknown"),
      customerEmail: toText(orderRef.customerEmail ?? orderRef.email, "—"),
      orderNumber: toText(orderRef.orderNumber ?? orderRef.orderId, "—"),
      amount: toNumber(item.amount ?? item.totalAmount),
      method: toText(item.method ?? item.paymentMethod, "—"),
      status: normalizePaymentStatus(item.paymentStatus ?? item.status),
      settlementStatus: normalizeSettlementStatus(item.settlementStatus),
      paymentSource: toText(item.paymentSource, "—"),
      providerName: toOptionalText(item.providerName),
      providerTransactionId: toOptionalText(item.providerTransactionId),
      providerStatusRaw: toOptionalText(item.providerStatusRaw),
      settlementDueAt: toOptionalText(item.settlementDueAt),
      settledAt: toOptionalText(item.settledAt),
      settlementReference: toOptionalText(item.settlementReference),
      settlementNote: toOptionalText(item.settlementNote),
      date: toText(item.date ?? item.createdAt, "—"),
    };
  });
};

const paymentStatusOptions = ["UNPAID", "PAID", "FAILED"] as const;
const settlementStatusOptions = [
  "NOT_REQUIRED",
  "PENDING",
  "DUE",
  "SETTLED",
  "FAILED",
] as const;
const paymentSourceOptions = ["COURIER", "IN_HOUSE"] as const;
const LIMIT = 20;

export const PaymentsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [editRow, setEditRow] = React.useState<PaymentRow | null>(null);
  const [editForm, setEditForm] = React.useState({
    paymentStatus: "UNPAID",
    paymentMethod: "",
    transactionId: "",
    paymentSource: "",
    providerName: "",
    providerTransactionId: "",
    providerStatusRaw: "",
    settlementStatus: "NOT_REQUIRED",
    settlementDueAt: "",
    settledAt: "",
    settlementReference: "",
    settlementNote: "",
  });

  const query = usePaymentsAggregate();
  const updatePayment = usePaymentUpdate();

  const payments = React.useMemo(
    () =>
      (query.data ?? []).flatMap((entry) => {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          return toPaymentRows(
            (entry as { paymentPayload?: unknown }).paymentPayload,
            (entry as { orderObj?: Record<string, unknown> }).orderObj ?? {},
          );
        }
        return [];
      }),
    [query.data]
  );

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return payments;
    return payments.filter((p) => p.status.toLowerCase() === activeTab);
  }, [payments, activeTab]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((p) =>
      [p.transactionId, p.customerName, p.customerEmail, p.orderNumber, p.method, p.status].some((v) => v.toLowerCase().includes(q))
    );
  }, [tabFiltered, search]);
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

  const totalPages = Math.ceil(filtered.length / LIMIT) || 1;
  const pageData = React.useMemo(() => filtered.slice((page - 1) * LIMIT, page * LIMIT), [filtered, page]);

  const stats = React.useMemo(() => ({
    total: payments.length,
    paid: payments.filter((p) => p.status === "PAID").length,
    unpaid: payments.filter((p) => p.status === "UNPAID").length,
    failed: payments.filter((p) => p.status === "FAILED").length,
    totalAmount: payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0),
  }), [payments]);

  const handleEdit = (row: PaymentRow) => {
    setEditRow(row);
    setEditForm({
      paymentStatus: row.status,
      paymentMethod: row.method,
      transactionId: row.transactionId === "—" ? "" : row.transactionId,
      paymentSource: row.paymentSource === "—" ? "" : row.paymentSource,
      providerName: row.providerName,
      providerTransactionId: row.providerTransactionId,
      providerStatusRaw: row.providerStatusRaw,
      settlementStatus: row.settlementStatus,
      settlementDueAt: row.settlementDueAt,
      settledAt: row.settledAt,
      settlementReference: row.settlementReference,
      settlementNote: row.settlementNote,
    });
  };

  const handleUpdate = async () => {
    if (!editRow?.id) return;
    await updatePayment.mutateAsync({
      id: editRow.id,
      payload: {
        paymentStatus: editForm.paymentStatus,
        paymentMethod: editForm.paymentMethod.trim() || undefined,
        transactionId: editForm.transactionId.trim() || undefined,
        paymentSource: editForm.paymentSource.trim() || undefined,
        providerName: editForm.providerName.trim() || undefined,
        providerTransactionId: editForm.providerTransactionId.trim() || undefined,
        providerStatusRaw: editForm.providerStatusRaw.trim() || undefined,
        settlementStatus: editForm.settlementStatus.trim() || undefined,
        settlementDueAt: editForm.settlementDueAt.trim() || undefined,
        settledAt: editForm.settledAt.trim() || undefined,
        settlementReference: editForm.settlementReference.trim() || undefined,
        settlementNote: editForm.settlementNote.trim() || undefined,
      },
    });
    setEditRow(null);
  };

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
    { key: "transactionId", label: "Transaction ID", render: (row: PaymentRow) => (
      <span className="font-medium text-gray-900">{row.transactionId}</span>
    )},
    { key: "customer", label: "Customer", render: (row: PaymentRow) => (
      <div>
        <div className="font-medium text-gray-900">{row.customerName}</div>
        <div className="text-xs text-gray-400">{row.customerEmail}</div>
      </div>
    )},
    { key: "orderNumber", label: "Order", render: (row: PaymentRow) => (
      <span className="text-gray-700">{row.orderNumber}</span>
    )},
    { key: "amount", label: "Amount", render: (row: PaymentRow) => (
      <span className="font-medium text-gray-900">Rs {row.amount.toFixed(2)}</span>
    )},
    { key: "method", label: "Method", render: (row: PaymentRow) => (
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

  return (
    <PageLayout
      title="Payments"
      subtitle="Track payment status and transaction details."
      showExport
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder="Search payments..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCardV2 label="Total Payments" value={stats.total} icon={CreditCard} colorVariant="blue" />
        <StatCardV2 label="Paid" value={stats.paid} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Unpaid" value={stats.unpaid} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Failed" value={stats.failed} icon={XCircle} colorVariant="red" />
        <StatCardV2 label="Total Revenue" value={`Rs ${stats.totalAmount.toFixed(2)}`} icon={DollarSign} colorVariant="blue" />
      </div>

      {/* Inline edit panel */}
      {editRow && (
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5">
          <p className="mb-3 text-sm font-medium text-gray-700">
            Update payment <span className="font-mono text-gray-900">{editRow.transactionId}</span>
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Payment Status</span>
                <select
                  value={editForm.paymentStatus}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, paymentStatus: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                >
                  {paymentStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatPaymentStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Settlement Status</span>
                <select
                  value={editForm.settlementStatus}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, settlementStatus: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                >
                  {settlementStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatSettlementStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Payment Source</span>
                <select
                  value={editForm.paymentSource}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, paymentSource: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Select source</option>
                  {paymentSourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Payment Method</span>
                <input
                  value={editForm.paymentMethod}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="COD, CARD, ESEWA, KHALTI"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Transaction ID</span>
                <input
                  value={editForm.transactionId}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, transactionId: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="Manual receipt or provider txn"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Provider Name</span>
                <input
                  value={editForm.providerName}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, providerName: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="PICKNDROP, WAREHOUSE..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Provider Txn ID</span>
                <input
                  value={editForm.providerTransactionId}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, providerTransactionId: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="Provider receipt/reference"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Provider Status Raw</span>
                <input
                  value={editForm.providerStatusRaw}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, providerStatusRaw: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="DELIVERED_PAID, PAYMENT_COLLECTED..."
                />
              </label>
            </div>
            <div className="grid gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Settlement Due At</span>
                <input
                  type="datetime-local"
                  value={editForm.settlementDueAt}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, settlementDueAt: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Settled At</span>
                <input
                  type="datetime-local"
                  value={editForm.settledAt}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, settledAt: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Settlement Reference</span>
                <input
                  value={editForm.settlementReference}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, settlementReference: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="Bank / ledger reference"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-[#6e6e73]">Settlement Note</span>
                <textarea
                  value={editForm.settlementNote}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, settlementNote: event.target.value }))}
                  className="min-h-[88px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[var(--primary)]"
                  placeholder="Internal reconciliation notes"
                />
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => void handleUpdate()}
                  disabled={updatePayment.isPending}
                  className="flex h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {updatePayment.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Save
                </button>
                <button
                  onClick={() => setEditRow(null)}
                  className="flex h-10 items-center rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        onEdit={handleEdit}
        emptyMessage={query.isLoading ? "Loading payments..." : "No payments found."}
        showPagination={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
};
