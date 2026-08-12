import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  Bell,
  CircleDot,
  Cog,
  Package,
  PackageCheck,
  Truck,
  BadgeCheck,
  Tag,
  Clock,
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle,
  MapPin,
  CreditCard,
  Banknote,
  Building2,
  Hash,
  FileText,
  Wallet,
  Map,
  UserRound,
  ShoppingBag,
  CalendarCheck,
  Layers,
  Printer,
  ReceiptText,
} from "lucide-react";
import { z } from "zod";
import {
  useOrderGet,
  usePaymentUpdate,
  usePaymentsByOrder,
  useUpdateOrderStatus,
  useSyncOrderDelivery,
} from "@/features/commerce";
import { commerceApi } from "@/features/commerce";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { resolveProfileImageUrl } from "@/shared/utils/profileImage";
import { parseApiError } from "@/shared/utils/apiError";
import {
  formatPaymentStatusLabel,
  formatSettlementStatusLabel,
  normalizePaymentStatus,
  normalizeSettlementStatus,
} from "@/shared/utils/paymentStatus";
import { validateOrToast } from "@/shared/utils/validation";
import { billingApi, openBillPrintWindow, printBills, type BillPayload, type BillType } from "@/features/billing";
import { usePermission } from "@/shared/hooks/usePermission";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { ModernFormLayout } from "@/shared/components/forms/ModernFormLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { getOrderDetail, normalizeOrderRow } from "@/shared/utils/orderMapping";
import {
  formatOrderStatusLabel,
  orderFlowStages,
  orderStatusOptions,
  orderStatuses,
} from "./orderStore";

const orderStatusSchema = z.enum(orderStatuses);
const paymentStatusOptions = ["UNPAID", "PAID", "FAILED"] as const;

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);
const boolText = (v: unknown, fb = "—"): string =>
  typeof v === "boolean" ? (v ? "Yes" : "No") : fb;
const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const toArray = (value: unknown): ReadonlyArray<unknown> =>
  Array.isArray(value) ? value : [];
const formatDateTime = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const formatMoney = (value: unknown): string => {
  if (typeof value === "number") return `Rs ${value.toLocaleString("en-NP")}`;
  if (typeof value === "string" && value)
    return `Rs ${Number(value).toLocaleString("en-NP")}`;
  return "—";
};
const compactAddress = (parts: ReadonlyArray<string>): string =>
  parts.filter(Boolean).join(", ");
const firstItemRecord = (
  items: ReadonlyArray<unknown>,
): Record<string, unknown> => {
  if (items.length === 0) return {};
  return toRecord(items[0]);
};
const getOrderCustomer = (
  order: Record<string, unknown>,
): Record<string, unknown> => toRecord(order.customer);
const getShippingAddress = (
  addresses: ReadonlyArray<unknown>,
): Record<string, unknown> => {
  const shipping = addresses.find(
    (address) => text(toRecord(address).type).toLowerCase() === "shipping",
  );
  return toRecord(shipping ?? addresses[0]);
};
const getBillingAddress = (
  addresses: ReadonlyArray<unknown>,
): Record<string, unknown> => {
  const billing = addresses.find(
    (address) => text(toRecord(address).type).toLowerCase() === "billing",
  );
  return toRecord(billing);
};
const sumQuantity = (items: ReadonlyArray<unknown>): number =>
  items.reduce<number>((sum, item) => sum + num(toRecord(item).quantity, 0), 0);
const getItemImageCandidates = (
  item: Record<string, unknown>,
): ReadonlyArray<string> => {
  const product = toRecord(item.product);
  const variant = toRecord(item.productVariant);

  return [
    variant.image,
    product.coverImage,
    product.hoverImage,
    product.image,
    product.thumbnail,
    product.url,
    product.path,
  ]
    .map((candidate) => resolveProfileImageUrl(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));
};
const getItemTitle = (item: Record<string, unknown>): string =>
  text(
    item.productTitleSnapshot ??
      toRecord(item.product).title ??
      item.productName ??
      item.name ??
      "Product",
    "Product",
  );

const getItemFallbackLabel = (item: Record<string, unknown>): string =>
  getItemTitle(item)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "P";

type IconField = Readonly<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}>;

type OrderRecord = Readonly<Record<string, unknown>>;

const ProductThumbnail: React.FC<{
  sources: ReadonlyArray<string>;
  alt: string;
  fallbackLabel: string;
}> = ({ sources, alt, fallbackLabel }) => {
  const [failed, setFailed] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const sourceKey = sources.join("|");

  React.useEffect(() => {
    setFailed(false);
    setIndex(0);
  }, [sourceKey]);

  const src = sources[index] ?? "";
  const hasMoreSources = index < sources.length - 1;
  const handleError = () => {
    if (hasMoreSources) {
      setIndex((current) => current + 1);
      return;
    }
    setFailed(true);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent">
      {!failed && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleError}
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[12px] font-medium tracking-[0.08em] text-[#9a948d]">
          {fallbackLabel}
        </div>
      )}
    </div>
  );
};

const IconFieldList: React.FC<{ fields: ReadonlyArray<IconField> }> = ({ fields }) => {
  const pairs = React.useMemo(() => {
    const result: Array<Array<IconField>> = [];
    for (let i = 0; i < fields.length; i += 2) {
      result.push(fields.slice(i, i + 2) as Array<IconField>);
    }
    return result;
  }, [fields]);

  return (
    <div>
      {pairs.map((pair, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-2 gap-x-6 py-3.5 ${rowIdx < pairs.length - 1 ? "border-b border-[#f3f2f0]" : ""}`}
        >
          {pair.map((field) => (
            <div key={field.label} className="flex min-w-0 items-start gap-2.5">
              <div className="mt-0.5 shrink-0 text-[#b0aaa3]">{field.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9a948d]">
                  {field.label}
                </p>
                <div className="mt-0.5 text-[13px] font-medium leading-5 text-[#1d1d1f]">
                  {field.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const SectionIconHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  bg: string;
}> = ({ title, icon, bg }) => (
  <div className="flex items-center gap-3">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}
    >
      {icon}
    </div>
    <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
      {title}
    </h2>
  </div>
);


const statusColors = (
  status: string,
): { border: string; bg: string; text: string; dot: string } => {
  const key = status.toLowerCase().replace(/[\s_]+/g, "");
  if (["delivered", "shipped", "paid", "fulfilled", "active"].includes(key))
    return { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
  if (["pending", "processing", "packed", "readyforshipment", "unpaid", "partial", "scheduled"].includes(key))
    return { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };
  if (["cancelled", "failed", "returned", "refunded", "expired"].includes(key))
    return { border: "border-red-200", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" };
  return { border: "border-[#d2d2d7]", bg: "bg-white", text: "text-[#6e6e73]", dot: "bg-[#86868b]" };
};

const getOrderProgressStages = (status: string): ReadonlyArray<string> =>
  status === "CANCELLED" || status === "RETURNED"
    ? [...orderFlowStages, status]
    : orderFlowStages;

const getOrderProgressIndex = (
  status: string,
  stages: ReadonlyArray<string>,
): number => {
  const normalized = status.toLowerCase();
  const index = stages.findIndex((stage) => stage.toLowerCase() === normalized);
  return index >= 0 ? index : 0;
};

const getStageState = (
  index: number,
  currentIndex: number,
): "complete" | "current" | "upcoming" => {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
};

const getStageTone = (state: "complete" | "current" | "upcoming"): string => {
  if (state === "current") return "border-[#1d1d1f] bg-[#1d1d1f] text-white";
  if (state === "complete") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-[#d2d2d7] bg-[#f5f5f7] text-[#6e6e73]";
};

const getStageIcon = (stage: string): React.ReactNode => {
  switch (stage) {
    case "PENDING":            return <CircleDot size={14} strokeWidth={2.25} />;
    case "PROCESSING":         return <Cog size={14} strokeWidth={2.25} />;
    case "PACKED":             return <Package size={14} strokeWidth={2.25} />;
    case "READY_FOR_SHIPMENT": return <PackageCheck size={14} strokeWidth={2.25} />;
    case "SHIPPED":            return <Truck size={14} strokeWidth={2.25} />;
    case "DELIVERED":          return <BadgeCheck size={14} strokeWidth={2.25} />;
    default:                   return <CircleDot size={14} strokeWidth={2.25} />;
  }
};

const ProgressTimeline: React.FC<{ status: string }> = ({ status }) => {
  const stages = React.useMemo(() => getOrderProgressStages(status), [status]);
  const currentIndex = React.useMemo(
    () => getOrderProgressIndex(status, stages),
    [stages, status],
  );

  return (
    <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
      <div className="overflow-x-auto">
        <ol className="flex min-w-max items-start px-0 py-1">
          {stages.map((stage, index) => {
            const state = getStageState(index, currentIndex);
            const isLast = index === stages.length - 1;
            const connectorTone =
              state === "complete" || state === "current"
                ? "bg-[#d2d2d7]"
                : "bg-[#e7e5e4]";

            return (
              <li
                key={stage}
                className="relative flex min-w-40 flex-1 flex-col items-center text-center"
              >
                {!isLast && (
                  <span
                    className={`absolute left-[calc(50%+18px)] right-[-50%] top-4.5 h-px ${connectorTone}`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${getStageTone(state)}`}
                >
                  <span className={state === "current" ? "text-white" : "text-current"}>
                    {state === "complete"
                      ? <BadgeCheck size={14} strokeWidth={2.25} />
                      : getStageIcon(stage)}
                  </span>
                </span>
                <div className="mt-2.5 min-w-0">
                  <p className="text-[12px] font-medium tracking-[-0.01em] text-[#1d1d1f]">
                    {formatOrderStatusLabel(stage)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9a948d]">
                    {state === "complete" ? "Done" : state === "current" ? "Current" : "Upcoming"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export const OrderDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const canViewBill = usePermission("order-bill:view");
  const canCreateBill = usePermission("order-bill:create");
  const canUpdateBill = usePermission("order-bill:update");

  const query = useOrderGet(id, Boolean(id));
  const updateOrderStatus = useUpdateOrderStatus();
  const syncDelivery = useSyncOrderDelivery();
  const paymentQuery = usePaymentsByOrder(id, Boolean(id));
  const updatePayment = usePaymentUpdate();

  const [orderStatus, setOrderStatus] = React.useState("PENDING");
  const [paymentStatus, setPaymentStatus] = React.useState("UNPAID");
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [syncingPickup, setSyncingPickup] = React.useState(false);
  const [printing, setPrinting] = React.useState<BillType | null>(null);
  const [billHistory, setBillHistory] = React.useState<Partial<Record<BillType, BillPayload["bill"]>>>({});
  const [pendingPrintedType, setPendingPrintedType] = React.useState<BillType | null>(null);
  const handlePrint = async (billType: BillType) => {
    if (!id) return;
    const printWindow = openBillPrintWindow();
    if (!printWindow) return toast.error("Pop-up blocked. Allow pop-ups to print bills.");
    printWindow.document.write("<p style='font-family:Arial;padding:24px'>Preparing bill...</p>");
    setPrinting(billType);
    try {
      const bill = await billingApi.bills.get(id, billType);
      setBillHistory((current) => ({ ...current, [billType]: bill.bill }));
      await printBills([bill], billType, printWindow);
      setPendingPrintedType(billType);
    } catch (error) { printWindow.close(); toast.error(parseApiError(error).message); } finally { setPrinting(null); }
  };
  React.useEffect(() => {
    if (!id || (!canViewBill && !canCreateBill)) return;
    let active = true;
    void Promise.allSettled((["SHIPPING_LABEL", "VAT_BILL"] as const).map(async (billType) => ({ billType, payload: await billingApi.bills.get(id, billType) }))).then((results) => {
      if (!active) return;
      const next: Partial<Record<BillType, BillPayload["bill"]>> = {};
      results.forEach((result) => { if (result.status === "fulfilled") next[result.value.billType] = result.value.payload.bill; });
      setBillHistory(next);
    });
    return () => { active = false; };
  }, [canCreateBill, canViewBill, id]);
  const markSinglePrinted = async () => {
    if (!id || !pendingPrintedType) return;
    try { const result = await billingApi.bills.markPrinted(id, pendingPrintedType); const response = toRecord(result); const updated = toRecord(response.bill); setBillHistory((current) => ({ ...current, [pendingPrintedType]: { ...(current[pendingPrintedType] as BillPayload["bill"]), ...updated } as BillPayload["bill"] })); toast.success("Bill marked as printed."); }
    catch (error) { toast.error(parseApiError(error).message); }
    finally { setPendingPrintedType(null); }
  };

  const record = React.useMemo(() => {
    const p = query.data;
    if (!p || typeof p !== "object") return null;
    return p as OrderRecord;
  }, [query.data]);

  const orderDetail = React.useMemo(
    () => getOrderDetail(record ?? {}),
    [record],
  );
  const order = React.useMemo(
    () => normalizeOrderRow(orderDetail),
    [orderDetail],
  );

  React.useEffect(() => {
    if (!record) return;
    setOrderStatus(text(orderDetail.orderStatus ?? order.status, order.status));
    const paymentPayload = paymentQuery.data;
    const paymentRecord = Array.isArray(paymentPayload)
      ? firstItemRecord(paymentPayload)
      : toRecord(paymentPayload);
    const paymentItems = toArray(paymentRecord.data ?? paymentRecord.payments);
    const resolvedPayment = paymentItems.length > 0 ? firstItemRecord(paymentItems) : paymentRecord;
    const resolvedPaymentWithNested = resolvedPayment as {
      id?: unknown;
      paymentId?: unknown;
      payment?: { id?: unknown } | null;
      paymentStatus?: unknown;
      status?: unknown;
    };
    const resolvedPaymentId = text(
      resolvedPaymentWithNested.id ??
        resolvedPaymentWithNested.paymentId ??
        resolvedPaymentWithNested.payment?.id ??
        null,
      null as unknown as string,
    );
    if (resolvedPaymentId) {
      setPaymentId(resolvedPaymentId);
      setPaymentStatus(
        normalizePaymentStatus(
          resolvedPayment.paymentStatus ?? resolvedPayment.status ?? order.paymentStatus,
        ),
      );
      return;
    }
    const payments = toArray(record.payments);
    if (payments.length > 0) {
      const pm = firstItemRecord(payments);
      setPaymentStatus(
        normalizePaymentStatus(pm.paymentStatus ?? pm.status ?? order.paymentStatus),
      );
      setPaymentId(text(pm.id, null as unknown as string) || null);
    }
  }, [order.paymentStatus, order.status, orderDetail.orderStatus, paymentQuery.data, record]);

  if (!id) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        Order ID missing.
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading order...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        Order not found.
      </div>
    );
  }

  const handleSyncDelivery = async () => {
    try {
      await syncDelivery.mutateAsync(id);
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const handlePickupNotification = async () => {
    setSyncingPickup(true);
    try {
      await commerceApi.orders.pickupNotification(id);
      toast.success("Pickup notification sent");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSyncingPickup(false);
    }
  };

  const customer = getOrderCustomer(orderDetail);
  const payments = toArray(record?.payments);
  const payment = firstItemRecord(payments);
  const addresses = toArray(record?.addresses);
  const shippingAddress = getShippingAddress(addresses);
  const billingAddress = getBillingAddress(addresses);
  const items = toArray(record?.items);
  const canUpdatePayment = Boolean(paymentId);
  const itemCount = items.length;
  const quantityCount = sumQuantity(items);
  const addressLine = compactAddress([
    text(shippingAddress.addressLine1),
    text(shippingAddress.addressLine2),
  ]);
  const cityLine = compactAddress([
    text(shippingAddress.city),
    text(shippingAddress.state),
    text(shippingAddress.postalCode),
    text(shippingAddress.country),
  ]);
  const billingAddressLine = compactAddress([
    text(billingAddress.addressLine1),
    text(billingAddress.addressLine2),
  ]);
  const billingCityLine = compactAddress([
    text(billingAddress.city),
    text(billingAddress.state),
    text(billingAddress.postalCode),
    text(billingAddress.country),
  ]);
  const customerAddress = text(customer.address, "—");
  const orderSource = text(orderDetail.orderSource, "");
  const paymentStatusValue = normalizePaymentStatus(
    payment.paymentStatus ?? payment.status ?? order.paymentStatus ?? paymentStatus,
  );

  return (
    <ModernFormLayout
      title={order.orderNumber}
      subtitle={
        <>
          <span>Created on {formatDateTime(orderDetail.createdAt)}</span>
          {orderSource && (
            <>
              <span className="text-[#c4c4c8]">•</span>
              <span>Source: {orderSource}</span>
            </>
          )}
        </>
      }
      titleMeta={
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            {canCreateBill && <button type="button" disabled={Boolean(printing)} onClick={() => void handlePrint("SHIPPING_LABEL")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-semibold hover:bg-[#f5f5f7] disabled:opacity-50"><Printer size={13}/> Print label</button>}
            {canCreateBill && <button type="button" disabled={Boolean(printing)} onClick={() => void handlePrint("VAT_BILL")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1d1d1f] px-3 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"><ReceiptText size={13}/> Print VAT bill</button>}
          </div>
          {Object.entries(billHistory).map(([type, bill]) => bill && <p key={type} className="text-[10px] text-[#86868b]">{type === "VAT_BILL" ? "VAT" : "Label"}: {bill.billNumber} · printed {bill.printCount} time(s){bill.lastPrintedAt ? ` · last ${formatDateTime(bill.lastPrintedAt)}` : ""}</p>)}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors ${statusColors(orderStatus).border} ${statusColors(orderStatus).bg}`}>
              <span className={statusColors(orderStatus).text}>Order status</span>
              <select
                value={orderStatus}
                onChange={async (e) => {
                  const nextStatus = e.target.value;
                  const previousStatus = orderStatus;
                  setOrderStatus(nextStatus);
                  const parsed = validateOrToast(
                    orderStatusSchema,
                    nextStatus,
                    toast,
                    "Invalid order status",
                  );
                  if (!parsed) {
                    setOrderStatus(previousStatus);
                    return;
                  }
                  try {
                    await updateOrderStatus.mutateAsync({
                      id,
                      payload: { orderStatus: parsed },
                    });
                    await query.refetch();
                  } catch (error) {
                    setOrderStatus(previousStatus);
                    toast.error(parseApiError(error).message);
                  }
                }}
                disabled={updateOrderStatus.isPending}
                className={`bg-transparent text-[11px] font-semibold outline-none disabled:opacity-60 ${statusColors(orderStatus).text}`}
              >
                {orderStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {canUpdatePayment && (
              <label className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors ${statusColors(paymentStatus).border} ${statusColors(paymentStatus).bg}`}>
                <span className={statusColors(paymentStatus).text}>Payment</span>
                <select
                  value={paymentStatus}
                  onChange={async (e) => {
                    const nextStatus = e.target.value;
                    const previousStatus = paymentStatus;
                    setPaymentStatus(nextStatus);
                    if (!paymentId) {
                      setPaymentStatus(previousStatus);
                      return;
                    }
                    try {
                      await updatePayment.mutateAsync({
                        id: paymentId,
                        payload: {
                          paymentStatus: nextStatus,
                        },
                      });
                      await paymentQuery.refetch();
                      await query.refetch();
                      toast.success("Payment status updated");
                    } catch (error) {
                      setPaymentStatus(previousStatus);
                      toast.error(parseApiError(error).message);
                    }
                  }}
                  disabled={!paymentId}
                  className={`bg-transparent text-[11px] font-semibold outline-none disabled:opacity-60 ${statusColors(paymentStatus).text}`}
                >
                  {paymentStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatPaymentStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => void handleSyncDelivery()}
              disabled={syncDelivery.isPending}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              {syncDelivery.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Sync delivery
            </button>
            <button
              type="button"
              onClick={() => void handlePickupNotification()}
              disabled={syncingPickup}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              {syncingPickup ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Bell size={12} />
              )}
              Pickup notification
            </button>
          </div>
        </div>
      }
      onBack={() => navigate("/dashboard/orders")}
    >
      <div className="space-y-3">
        <ProgressTimeline status={orderStatus} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          {/* Left column */}
          <div className="space-y-3">
            <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
              <SectionIconHeader
                title="Order Summary"
                icon={<FileText size={18} className="text-white" strokeWidth={2} />}
                bg="bg-blue-500"
              />
              <div className="my-4 rounded-xl bg-blue-50 p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-blue-400">
                  Total Amount
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[26px] font-bold tracking-[-0.03em] text-blue-600">
                    {formatMoney(orderDetail.totalAmount)}
                  </p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                    <Wallet size={16} className="text-blue-500" />
                  </div>
                </div>
              </div>
              <IconFieldList
                fields={[
                  { label: "Subtotal", value: formatMoney(orderDetail.subtotalAmount), icon: <Tag size={13} /> },
                  { label: "Shipping", value: formatMoney(orderDetail.shippingAmount), icon: <Truck size={13} /> },
                  { label: "Discount", value: formatMoney(orderDetail.discountAmount), icon: <Tag size={13} /> },
                  { label: "Item count", value: String(itemCount), icon: <ShoppingBag size={13} /> },
                  { label: "Quantity total", value: String(quantityCount), icon: <Layers size={13} /> },
                  { label: "Created at", value: formatDateTime(orderDetail.createdAt), icon: <Calendar size={13} /> },
                  { label: "Editable until", value: formatDateTime(orderDetail.editableUntil), icon: <Clock size={13} /> },
                  { label: "Updated at", value: formatDateTime(orderDetail.updatedAt), icon: <Calendar size={13} /> },
                ]}
              />
            </section>

            <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
              <SectionIconHeader
                title="Customer"
                icon={<UserRound size={18} className="text-white" strokeWidth={2} />}
                bg="bg-violet-500"
              />
              <div className="mt-4">
                <IconFieldList
                  fields={[
                    {
                      label: "Name",
                      value: text(
                        customer.firstname
                          ? `${text(customer.firstname)} ${text(customer.lastname)}`.trim()
                          : (customer.fullname ?? customer.name),
                        order.customerName,
                      ),
                      icon: <User size={13} />,
                    },
                    { label: "Email", value: text(customer.email, order.customerEmail), icon: <Mail size={13} /> },
                    { label: "Phone", value: text(customer.phone, "—"), icon: <Phone size={13} /> },
                    { label: "Gender", value: text(customer.gender, "—"), icon: <User size={13} /> },
                    { label: "Verified", value: boolText(customer.isVerified), icon: <CheckCircle size={13} /> },
                    { label: "Address", value: customerAddress, icon: <MapPin size={13} /> },
                  ]}
                />
              </div>
            </section>

            {Object.keys(billingAddress).length > 0 && (
              <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
                <SectionIconHeader
                  title="Billing Address"
                  icon={<FileText size={18} className="text-white" strokeWidth={2} />}
                  bg="bg-violet-500"
                />
                <div className="mt-4">
                  <IconFieldList
                    fields={[
                      { label: "Name", value: text(billingAddress.fullName, "—"), icon: <User size={13} /> },
                      { label: "Phone", value: text(billingAddress.phone, "—"), icon: <Phone size={13} /> },
                      { label: "Buyer PAN", value: text(billingAddress.panNumber, "—"), icon: <Hash size={13} /> },
                      { label: "Address line", value: billingAddressLine || "—", icon: <Map size={13} /> },
                      { label: "Location", value: billingCityLine || "—", icon: <MapPin size={13} /> },
                    ]}
                  />
                </div>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-3">
            <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
              <SectionIconHeader
                title="Payment"
                icon={<CreditCard size={18} className="text-white" strokeWidth={2} />}
                bg="bg-emerald-500"
              />
              <div className="mt-4">
                <IconFieldList
                  fields={[
                    { label: "Method", value: text(payment.paymentMethod, order.paymentMethod), icon: <CreditCard size={13} /> },
                    { label: "Source", value: text(payment.paymentSource, "—"), icon: <Building2 size={13} /> },
                    {
                      label: "Status",
                      value: (
                        <StatusBadge
                          status={paymentStatusValue}
                          label={formatPaymentStatusLabel(paymentStatusValue)}
                        />
                      ),
                      icon: <CheckCircle size={13} />,
                    },
                    {
                      label: "Settlement",
                      value: (
                        <StatusBadge
                          status={normalizeSettlementStatus(payment.settlementStatus)}
                          label={formatSettlementStatusLabel(payment.settlementStatus)}
                        />
                      ),
                      icon: <Wallet size={13} />,
                    },
                    { label: "Amount", value: formatMoney(payment.amount ?? order.total), icon: <Banknote size={13} /> },
                    { label: "Provider", value: text(payment.providerName, "—"), icon: <Building2 size={13} /> },
                    { label: "Transaction ID", value: text(payment.transactionId, "—"), icon: <Hash size={13} /> },
                    { label: "Paid at", value: formatDateTime(payment.paidAt), icon: <CalendarCheck size={13} /> },
                    { label: "Settlement Due", value: formatDateTime(payment.settlementDueAt), icon: <Calendar size={13} /> },
                    { label: "Settled At", value: formatDateTime(payment.settledAt), icon: <CalendarCheck size={13} /> },
                    { label: "Reference", value: text(payment.settlementReference, "—"), icon: <Hash size={13} /> },
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
              <SectionIconHeader
                title="Delivery"
                icon={<Truck size={18} className="text-white" strokeWidth={2} />}
                bg="bg-sky-500"
              />
              <div className="mt-4">
                <IconFieldList
                  fields={[
                    { label: "Recipient", value: text(shippingAddress.fullName, "—"), icon: <User size={13} /> },
                    { label: "Phone", value: text(shippingAddress.phone, "—"), icon: <Phone size={13} /> },
                    { label: "Address line", value: addressLine || "—", icon: <Map size={13} /> },
                    { label: "Location", value: cityLine || "—", icon: <MapPin size={13} /> },
                    { label: "Auto assigned", value: boolText(orderDetail.deliveryAutoAssigned), icon: <CheckCircle size={13} /> },
                    { label: "Assigned at", value: formatDateTime(orderDetail.deliveryAssignedAt), icon: <Calendar size={13} /> },
                  ]}
                />
              </div>
            </section>
          </div>
        </div>

        {items.length > 0 && (
          <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
            <SectionIconHeader
              title="Items"
              icon={<Package size={18} className="text-white" strokeWidth={2} />}
              bg="bg-orange-500"
            />
            <p className="mt-0.5 pl-13 text-[11px] text-[#9a948d]">
              {itemCount} product{itemCount !== 1 ? "s" : ""} · {quantityCount} unit{quantityCount !== 1 ? "s" : ""}
            </p>
            <div className="mt-4 border-t border-[#f3f2f0]">
              {items.map((item, index) => {
                const row = toRecord(item);
                const images = getItemImageCandidates(row);
                const title = getItemTitle(row);
                const isLast = index === items.length - 1;

                return (
                  <div
                    key={text(row.id, `${index}`)}
                    className={`flex items-center gap-4 py-3.5 ${!isLast ? "border-b border-[#f3f2f0]" : ""}`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                      {images.length > 0 ? (
                        <ProductThumbnail
                          sources={images}
                          alt={title}
                          fallbackLabel={getItemFallbackLabel(row)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[#9a948d]">
                          {getItemFallbackLabel(row)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{title}</p>
                          <p className="mt-0.5 text-[11px] text-[#9a948d]">
                            Qty {num(row.quantity, 0)} · {formatMoney(row.price)} each
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[#1d1d1f]">
                          {formatMoney(row.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <AlertDialog open={Boolean(pendingPrintedType)} onOpenChange={(open) => { if (!open) setPendingPrintedType(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Did printing complete?</AlertDialogTitle><AlertDialogDescription>Only update print history if the browser print job completed. Choose “Not printed” if you cancelled it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Not printed</AlertDialogCancel>{canUpdateBill && <AlertDialogAction onClick={(event) => { event.preventDefault(); void markSinglePrinted(); }}>Mark as printed</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </ModernFormLayout>
  );
};
