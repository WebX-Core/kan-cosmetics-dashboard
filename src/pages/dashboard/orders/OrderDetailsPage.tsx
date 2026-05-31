import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, Truck, Bell } from "lucide-react";
import { z } from "zod";
import { useOrderGet, useUpdateOrderStatus, useSyncOrderDelivery } from "@/features/commerce";
import { commerceApi } from "@/features/commerce";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { ModernFormLayout, FormSection, FormField } from "@/shared/components/forms/ModernFormLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";

const orderStatusSchema = z.enum(["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"]);
const paymentStatusOptions = ["Pending", "Completed", "Failed", "Refunded"];
const inputClass = "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

type OrderRecord = Readonly<Record<string, unknown>>;

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

  React.useEffect(() => {
    if (!record) return;
    setOrderStatus(text(record.status, "Pending"));
    const payments = Array.isArray(record.payments) ? record.payments : [];
    if (payments.length > 0) {
      const pm = payments[0] as Record<string, unknown>;
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

  const handleUpdateStatus = async () => {
    const parsed = validateOrToast(orderStatusSchema, orderStatus, toast, "Invalid order status");
    if (!parsed) return;
    try {
      await updateOrderStatus.mutateAsync({ id, payload: { orderStatus: parsed } });
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const handleUpdatePayment = async () => {
    if (!paymentId) { toast.error("No payment record found"); return; }
    try {
      await commerceApi.payments.update(paymentId, { paymentStatus });
      toast.success("Payment status updated");
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

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

  const items = Array.isArray(record.items) ? (record.items as Record<string, unknown>[]) : [];
  const addresses = Array.isArray(record.addresses) ? (record.addresses as Record<string, unknown>[]) : [];

  return (
    <ModernFormLayout
      title={text(record.orderNumber ?? record.orderId, "Order")}
      subtitle={`Customer: ${text(record.customerName ?? record.fullname, "Unknown")} · ${text(record.customerEmail ?? record.email, "—")}`}
      onBack={() => navigate("/dashboard/orders")}
    >
      <div className="space-y-8">
        {/* Summary */}
        <FormSection title="Order Summary">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
              <p className="mt-1 text-xl font-bold text-gray-900">Rs {text(record.total ?? record.totalAmount, "0")}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Order Status</p>
              <div className="mt-1"><StatusBadge status={text(record.status, "Pending")} /></div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Payment Method</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{text(record.paymentMethod, "—")}</p>
            </div>
          </div>
        </FormSection>

        {/* Items */}
        {items.length > 0 && (
          <FormSection title="Items">
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Product</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Qty</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">{text(item.productName ?? item.name ?? item.title, "—")}</td>
                      <td className="px-5 py-3">{num(item.quantity, 1)}</td>
                      <td className="px-5 py-3">Rs {text(item.price ?? item.salePrice, "0")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        )}

        {/* Addresses */}
        {addresses.length > 0 && (
          <FormSection title="Delivery Address">
            {addresses.map((addr, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700 space-y-0.5">
                <p className="font-medium">{text(addr.fullName)}</p>
                <p>{text(addr.phone)}</p>
                <p>{text(addr.addressLine1)}{addr.addressLine2 ? `, ${text(addr.addressLine2)}` : ""}</p>
                <p>{text(addr.city)}, {text(addr.state)} {text(addr.postalCode)}</p>
                <p>{text(addr.country)}</p>
              </div>
            ))}
          </FormSection>
        )}

        {/* Update Order Status */}
        <FormSection title="Update Order Status">
          <div className="flex items-end gap-3">
            <FormField label="Status">
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className={inputClass} style={{ maxWidth: 280 }}>
                {["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>
            <button
              type="button"
              onClick={() => void handleUpdateStatus()}
              disabled={updateOrderStatus.isPending}
              className="flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50 shrink-0"
            >
              {updateOrderStatus.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Save Status
            </button>
          </div>
        </FormSection>

        {/* Update Payment Status */}
        {paymentId && (
          <FormSection title="Update Payment Status">
            <div className="flex items-end gap-3">
              <FormField label="Payment Status">
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass} style={{ maxWidth: 280 }}>
                  {paymentStatusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>
              <button
                type="button"
                onClick={() => void handleUpdatePayment()}
                className="flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0066cc] shrink-0"
              >
                Save Payment
              </button>
            </div>
          </FormSection>
        )}

        {/* Actions */}
        <FormSection title="Actions">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSyncDelivery()}
              disabled={syncDelivery.isPending}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {syncDelivery.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Delivery
            </button>
            <button
              type="button"
              onClick={() => void handlePickupNotification()}
              disabled={syncingPickup}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {syncingPickup ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              Send Pickup Notification
            </button>
            <button
              type="button"
              onClick={() => void commerceApi.orders.syncBranches().then(() => toast.success("Branches synced")).catch((e: unknown) => toast.error(parseApiError(e).message))}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Truck size={14} />
              Sync Branches
            </button>
          </div>
        </FormSection>
      </div>
    </ModernFormLayout>
  );
};
