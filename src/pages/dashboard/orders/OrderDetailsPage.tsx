import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, Truck, Bell } from "lucide-react";
import { z } from "zod";
import { useOrderGet, useUpdateOrderStatus, useSyncOrderDelivery } from "@/features/commerce";
import { commerceApi } from "@/features/commerce";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { resolveProfileImageUrl } from "@/shared/utils/profileImage";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { ModernFormLayout } from "@/shared/components/forms/ModernFormLayout";
import { getOrderDetail, normalizeOrderRow } from "@/shared/utils/orderMapping";

const orderStatusSchema = z.enum(["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"]);
const paymentStatusOptions = ["Pending", "Completed", "Failed", "Refunded"];

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
  if (typeof value === "string" && value) return `Rs ${Number(value).toLocaleString("en-NP")}`;
  return "—";
};
const compactAddress = (parts: ReadonlyArray<string>): string =>
  parts.filter(Boolean).join(", ");
const firstItemRecord = (items: ReadonlyArray<unknown>): Record<string, unknown> => {
  if (items.length === 0) return {};
  return toRecord(items[0]);
};
const getOrderCustomer = (order: Record<string, unknown>): Record<string, unknown> =>
  toRecord(order.customer);
const getShippingAddress = (addresses: ReadonlyArray<unknown>): Record<string, unknown> => {
  const shipping = addresses.find((address) => toRecord(address).type === "shipping");
  return toRecord(shipping ?? addresses[0]);
};
const sumQuantity = (items: ReadonlyArray<unknown>): number =>
  items.reduce((sum, item) => sum + num(toRecord(item).quantity, 0), 0);
const getItemImageCandidates = (item: Record<string, unknown>): ReadonlyArray<string> => {
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

type DetailField = Readonly<{
  label: string;
  value: React.ReactNode;
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
    <div className="flex h-full w-full items-center justify-center bg-[#fafaf9]">
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

const DetailGrid: React.FC<{ fields: ReadonlyArray<DetailField> }> = ({ fields }) => (
  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
    {fields.map((field) => (
      <div key={field.label} className="min-w-0">
        <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#787774]">
          {field.label}
        </dt>
        <dd className="mt-1 text-sm font-medium leading-6 text-[#1d1d1f]">{field.value}</dd>
      </div>
    ))}
  </dl>
);

const SectionHeader: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => (
  <div className="pb-4">
    <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
      {title}
    </h2>
    {description && (
      <p className="mt-1 text-[11px] leading-5 text-[#787774]">{description}</p>
    )}
  </div>
);

const SectionBlock: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="px-6 py-5 sm:px-8">
    <SectionHeader title={title} description={description} />
    {children}
  </section>
);

export const OrderDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const query = useOrderGet(id, Boolean(id));
  const updateOrderStatus = useUpdateOrderStatus();
  const syncDelivery = useSyncOrderDelivery();

  const [orderStatus, setOrderStatus] = React.useState("Pending");
  const [paymentStatus, setPaymentStatus] = React.useState("Pending");
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [syncingPickup, setSyncingPickup] = React.useState(false);

  const record = React.useMemo(() => {
    const p = query.data;
    if (!p || typeof p !== "object") return null;
    return p as OrderRecord;
  }, [query.data]);

  const orderDetail = React.useMemo(() => getOrderDetail(record ?? {}), [record]);
  const order = React.useMemo(() => normalizeOrderRow(orderDetail), [orderDetail]);

  React.useEffect(() => {
    if (!record) return;
    setOrderStatus(text(record.status, "Pending"));
    const payments = toArray(record.payments);
    if (payments.length > 0) {
      const pm = firstItemRecord(payments);
      setPaymentStatus(text(pm.status ?? pm.paymentStatus, "Pending"));
      setPaymentId(text(pm.id, null as unknown as string) || null);
    }
  }, [record]);

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

  const handleSyncBranches = async () => {
    try {
      await commerceApi.orders.syncBranches();
      toast.success("Branches synced");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const customer = getOrderCustomer(orderDetail);
  const payments = toArray(record?.payments);
  const payment = firstItemRecord(payments);
  const addresses = toArray(record?.addresses);
  const shippingAddress = getShippingAddress(addresses);
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
  const customerAddress = text(customer.address, "—");

  return (
    <ModernFormLayout
      title={order.orderNumber}
      titleMeta={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex min-h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245]">
            {order.customerName}
          </span>
          <span className="inline-flex min-h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245]">
            Rs {order.total}
          </span>
          <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#6e6e73]">
            <span>Order</span>
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
                  await updateOrderStatus.mutateAsync({ id, payload: { orderStatus: parsed } });
                  await query.refetch();
                } catch (error) {
                  setOrderStatus(previousStatus);
                  toast.error(parseApiError(error).message);
                }
              }}
              disabled={updateOrderStatus.isPending}
              className="bg-transparent text-[11px] font-medium text-[#1d1d1f] outline-none disabled:opacity-60"
            >
              {["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </label>
          {canUpdatePayment && (
            <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#6e6e73]">
              <span>Payment</span>
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
                    await commerceApi.payments.update(paymentId, { paymentStatus: nextStatus });
                    toast.success("Payment status updated");
                    await query.refetch();
                  } catch (error) {
                    setPaymentStatus(previousStatus);
                    toast.error(parseApiError(error).message);
                  }
                }}
                disabled={!paymentId}
                className="bg-transparent text-[11px] font-medium text-[#1d1d1f] outline-none disabled:opacity-60"
              >
                {paymentStatusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            {syncingPickup ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
            Pickup notification
          </button>
          <button
            type="button"
            onClick={() => void handleSyncBranches()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245] transition-colors hover:bg-[#f5f5f7]"
          >
            <Truck size={12} />
            Sync branches
          </button>
        </div>
      }
      onBack={() => navigate("/dashboard/orders")}
    >
      <div className="overflow-hidden rounded-[24px] border border-[#e7e5e4] bg-white">
        <div className="divide-y divide-[#e7e5e4]">
          <SectionBlock
            title="Order summary"
            description="Only the values that help staff review and process the order."
          >
            <DetailGrid
              fields={[
                { label: "Order source", value: text(orderDetail.orderSource, "—") },
                { label: "Total", value: formatMoney(orderDetail.totalAmount) },
                { label: "Subtotal", value: formatMoney(orderDetail.subtotalAmount) },
                { label: "Discount", value: formatMoney(orderDetail.discountAmount) },
                { label: "Shipping", value: formatMoney(orderDetail.shippingAmount) },
                { label: "Item count", value: String(itemCount) },
                { label: "Quantity total", value: String(quantityCount) },
                { label: "Editable until", value: formatDateTime(orderDetail.editableUntil) },
                { label: "Created at", value: formatDateTime(orderDetail.createdAt) },
                { label: "Updated at", value: formatDateTime(orderDetail.updatedAt) },
              ]}
            />
          </SectionBlock>

          <SectionBlock title="Customer">
            <DetailGrid
              fields={[
                {
                  label: "Name",
                  value: text(
                    customer.firstname
                      ? `${text(customer.firstname)} ${text(customer.lastname)}`.trim()
                      : customer.fullname ?? customer.name,
                    order.customerName,
                  ),
                },
                { label: "Email", value: text(customer.email, order.customerEmail) },
                { label: "Phone", value: text(customer.phone, "—") },
                { label: "Gender", value: text(customer.gender, "—") },
                { label: "Verified", value: boolText(customer.isVerified) },
                { label: "Address", value: customerAddress },
              ]}
            />
          </SectionBlock>

          <SectionBlock title="Payment">
            <DetailGrid
              fields={[
                { label: "Method", value: text(payment.paymentMethod, order.paymentMethod) },
                { label: "Status", value: text(payment.paymentStatus, order.paymentStatus) },
                { label: "Amount", value: formatMoney(payment.amount ?? order.total) },
                { label: "Source", value: text(payment.paymentSource, "—") },
                { label: "Provider", value: text(payment.providerName, "—") },
                { label: "Transaction ID", value: text(payment.transactionId, "—") },
                { label: "Paid at", value: formatDateTime(payment.paidAt) },
              ]}
            />
          </SectionBlock>

          <SectionBlock title="Delivery">
            <DetailGrid
              fields={[
                { label: "Recipient", value: text(shippingAddress.fullName, "—") },
                { label: "Phone", value: text(shippingAddress.phone, "—") },
                { label: "Address line", value: addressLine || "—" },
                { label: "Location", value: cityLine || "—" },
                { label: "Auto assigned", value: boolText(orderDetail.deliveryAutoAssigned) },
                { label: "Assigned at", value: formatDateTime(orderDetail.deliveryAssignedAt) },
              ]}
            />
          </SectionBlock>

          {items.length > 0 && (
            <SectionBlock
              title="Items"
              description="Product image, title, quantity, and subtotal."
            >
              <div className="divide-y divide-[#e7e5e4]">
                {items.map((item, index) => {
                  const row = toRecord(item);
                  const images = getItemImageCandidates(row);
                  const title = getItemTitle(row);

                  return (
                    <div
                      key={text(row.id, `${index}`)}
                      className="flex items-start gap-4 py-4"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e7e5e4] bg-white">
                        {images.length > 0 ? (
                          <ProductThumbnail
                            sources={images}
                            alt={title}
                            fallbackLabel={getItemFallbackLabel(row)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#787774]">
                            {getItemFallbackLabel(row)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#1d1d1f]">
                              {title}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-[#787774]">
                              Qty {num(row.quantity, 0)} · Unit {formatMoney(row.price)}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-[#1d1d1f]">
                            {formatMoney(row.subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBlock>
          )}
        </div>
      </div>
    </ModernFormLayout>
  );
};
