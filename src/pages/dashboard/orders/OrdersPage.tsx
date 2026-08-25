import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  ChevronDown,
  X,
  Plus,
  Printer,
  ReceiptText,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useOrders, useUpdateOrderStatus } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { getOrderRows, normalizeOrderRow } from "@/shared/utils/orderMapping";
import { orderStatusOptions } from "./orderStore";
import { formatPaymentStatusLabel, normalizePaymentStatus } from "@/shared/utils/paymentStatus";
import { billingApi, openBillPrintWindow, printBills, type BillType, type BulkBillPayload } from "@/features/billing";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { usePermission } from "@/shared/hooks/usePermission";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";

type OrderRow = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  placedAt: string;
  status: string;
}>;

const statusPillClass: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  PACKED: "bg-violet-100 text-violet-700",
  READY_FOR_SHIPMENT: "bg-indigo-100 text-indigo-700",
  SHIPPED: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-rose-100 text-rose-700",
};
const defaultStatusPillClass = "bg-gray-100 text-gray-700";

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const canCreateBill = usePermission("order-bill:create");
  const canUpdateBill = usePermission("order-bill:update");
  const [printing, setPrinting] = React.useState<BillType | null>(null);
  const [previewType, setPreviewType] = React.useState<BillType | null>(null);
  const [preview, setPreview] = React.useState<BulkBillPayload | null>(null);
  const [printedOrderIds, setPrintedOrderIds] = React.useState<ReadonlyArray<string>>([]);
  const updateStatus = useUpdateOrderStatus();
  const [statusUpdatingId, setStatusUpdatingId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>(
    [],
  );
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const ordersQuery = useOrders({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const orders = React.useMemo(() => {
    return getOrderRows(ordersQuery.data).map(
      (row) => normalizeOrderRow(row) as OrderRow,
    );
  }, [ordersQuery.data]);

  const totalPages =
    (ordersQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const totalOrders =
    (ordersQuery.data as { total?: number } | undefined)?.total ??
    orders.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return orders;
    return orders.filter((o) => o.status.toLowerCase() === activeTab);
  }, [orders, activeTab]);
  const visibleIds = React.useMemo(
    () => tabFiltered.map((row) => row.id),
    [tabFiltered],
  );
  const isAllVisibleSelected = React.useMemo(
    () =>
      visibleIds.length > 0 &&
      visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );

  const toggleSelectOne = (orderId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? prev.includes(orderId)
          ? prev
          : [...prev, orderId]
        : prev.filter((entry) => entry !== orderId),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(
    () => ({
      total: totalOrders,
      pending: orders.filter((o) => o.status === "PENDING").length,
      shipped: orders.filter((o) => o.status === "SHIPPED").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
    }),
    [orders, totalOrders],
  );

  const handleStatusChange = async (orderId: string, orderStatus: string) => {
    setStatusUpdatingId(orderId);
    try {
      await updateStatus.mutateAsync({ id: orderId, payload: { orderStatus } });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };
  const preparePrint = async (billType: BillType) => {
    if (!selectedIds.length) return;
    setPrinting(billType);
    try {
      const result = await billingApi.bills.bulk(selectedIds, billType);
      if (!result.bills.length) throw new Error("No printable orders were returned.");
      setPreviewType(billType); setPreview(result);
    } catch (error) { toast.error(parseApiError(error).message); } finally { setPrinting(null); }
  };
  const confirmBulkPrint = async () => {
    if (!preview || !previewType) return;
    const printWindow = openBillPrintWindow();
    if (!printWindow) return toast.error("Pop-up blocked. Allow pop-ups to print bills.");
    await printBills(preview.bills, previewType, printWindow);
    setPrintedOrderIds(preview.bills.map((bill) => String(bill.order.id)));
    setPreview(null);
  };
  const confirmMarkedPrinted = async () => {
    if (!previewType || !printedOrderIds.length) return;
    try { await Promise.all(printedOrderIds.map((orderId) => billingApi.bills.markPrinted(orderId, previewType))); toast.success(`${printedOrderIds.length} bill(s) marked as printed.`); }
    catch (error) { toast.error(parseApiError(error).message); }
    finally { setPrintedOrderIds([]); setPreviewType(null); }
  };

  const tabs = [
    { key: "all", label: "All" },
    ...orderStatusOptions.map((option) => ({
      key: option.value.toLowerCase(),
      label: option.label,
    })),
  ];

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all orders"
        />
      ),
      render: (row: OrderRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.id, event.target.checked)}
          aria-label={`Select ${row.orderNumber}`}
        />
      ),
      width: "44px",
    },
    {
      key: "orderNumber",
      label: "Order",
      render: (row: OrderRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.orderNumber}</div>
          <div className="text-xs text-gray-400">{row.placedAt}</div>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row: OrderRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-xs text-gray-400">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "payment",
      label: "Payment",
      render: (row: OrderRow) => (
        <div>
          <div className="text-gray-700">{row.paymentMethod}</div>
          <div className="mt-1">
            <StatusBadge
              status={normalizePaymentStatus(row.paymentStatus)}
              label={formatPaymentStatusLabel(row.paymentStatus)}
            />
          </div>
        </div>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (row: OrderRow) => (
        <span className="font-medium text-gray-900">{row.total}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: OrderRow) => (
        <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
          <select
            value={row.status}
            disabled={statusUpdatingId === row.id}
            onChange={(e) => void handleStatusChange(row.id, e.target.value)}
            aria-label={`Change status for order ${row.orderNumber}`}
            className={`cursor-pointer appearance-none rounded-full py-[3px] pl-[8px] pr-[18px] text-[11px] font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
              statusPillClass[row.status] ?? defaultStatusPillClass
            }`}
          >
            {orderStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {statusUpdatingId === row.id ? "Updating…" : option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={10} strokeWidth={2.5} className="pointer-events-none absolute right-[5px] top-1/2 -translate-y-1/2" />
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Orders"
      actions={
        <><ExportMenu basePath="/order" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="orders"/><button
          type="button"
          onClick={() => navigate("/dashboard/orders/create")}
          className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.982]"
        >
          <Plus size={14} /> New Order
        </button></>
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search orders..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Total Orders"
          value={stats.total}
          icon={ShoppingCart}
          colorVariant="blue"
        />
        <StatCardV2
          label="Pending"
          value={stats.pending}
          icon={Package}
          colorVariant="amber"
        />
        <StatCardV2
          label="Shipped"
          value={stats.shipped}
          icon={Truck}
          colorVariant="blue"
        />
        <StatCardV2
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          colorVariant="emerald"
        />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6e6e73]">
                {selectedIds.length} selected
              </span>
              {canCreateBill && <button disabled={Boolean(printing)} onClick={() => void preparePrint("SHIPPING_LABEL")} className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium hover:bg-[#f5f5f7] disabled:opacity-50"><Printer size={12}/> Labels</button>}
              {canCreateBill && <button disabled={Boolean(printing)} onClick={() => void preparePrint("VAT_BILL")} className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium hover:bg-[#f5f5f7] disabled:opacity-50"><ReceiptText size={12}/> VAT bills</button>}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                aria-label="Clear selected orders"
              >
                <X size={12} />
              </button>
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={(row) => navigate(`/dashboard/orders/${row.id}`)}
        onEdit={(row) => navigate(`/dashboard/orders/${row.id}`)}
        emptyMessage={
          ordersQuery.isLoading ? "Loading orders..." : "No orders found."
        }
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
      <AlertDialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) { setPreview(null); setPreviewType(null); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm bulk print</AlertDialogTitle><AlertDialogDescription>Preparing this preview creates immutable bill snapshots for orders that do not already have them.</AlertDialogDescription></AlertDialogHeader><div className="rounded-xl bg-[#f5f5f7] p-4 text-sm"><p><b>{preview?.bills.length ?? 0}</b> printable {previewType === "VAT_BILL" ? "VAT bills" : "shipping labels"}</p><p className="mt-1"><b>{preview?.missingOrderIds.length ?? 0}</b> missing orders</p>{preview?.missingOrderIds.length ? <p className="mt-2 break-all text-xs text-red-600">{preview.missingOrderIds.join(", ")}</p> : null}</div><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmBulkPrint(); }}>Open print preview</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={printedOrderIds.length > 0} onOpenChange={(open) => { if (!open) { setPrintedOrderIds([]); setPreviewType(null); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Did printing complete?</AlertDialogTitle><AlertDialogDescription>Only mark these bills printed if the browser print job was completed. Cancelling keeps print history unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Not printed</AlertDialogCancel>{canUpdateBill && <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirmMarkedPrinted(); }}>Mark as printed</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
    </PageLayout>
  );
};
