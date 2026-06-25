import React from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { deliveryApi } from "@/features/delivery";
import { commerceApi } from "@/features/commerce";
import { Button } from "@/shared/components/ui/button";
import { ModernFormLayout, FormActions, FormField } from "@/shared/components/forms/ModernFormLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { formatPaymentStatusLabel, normalizePaymentStatus } from "@/shared/utils/paymentStatus";
import {
  formatShipmentStatusLabel,
  getShipmentStatusBadgeStatus,
  normalizeShipmentStatus,
  shipmentStatusOptions,
} from "@/shared/utils/shipmentStatus";
import { validateOrToast } from "@/shared/utils/validation";
import { getOrderDetail, normalizeOrderRow } from "@/shared/utils/orderMapping";
import { formatOrderStatusLabel } from "@/pages/dashboard/orders/orderStore";

type ShipmentRecord = Readonly<Record<string, unknown>>;

const shipmentSchema = z.object({
  orderId: z.string().trim().min(1, "Order ID is required"),
  courierId: z.string().trim().min(1, "Courier ID is required"),
  trackingNumber: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().min(1, "Status is required"),
});

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const numberText = (value: unknown): string => {
  if (typeof value === "number") return value.toLocaleString("en-NP");
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed.toLocaleString("en-NP");
    return value;
  }
  return "—";
};

const prettyJson = (value: unknown): string => {
  if (!value || typeof value !== "object") return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
};

const readRecord = (value: unknown): ShipmentRecord =>
  value && typeof value === "object" ? (value as ShipmentRecord) : {};

const InfoRow: React.FC<Readonly<{ label: string; value: React.ReactNode }>> = ({ label, value }) => (
  <div className="rounded-[14px] border border-[#e7e5e4] bg-[#fafaf9] px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#787774]">{label}</p>
    <div className="mt-1 text-sm font-medium text-[#1d1d1f]">{value}</div>
  </div>
);

const SectionTitle: React.FC<Readonly<{ title: string; description?: string }>> = ({ title, description }) => (
  <div>
    <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</h2>
    {description ? <p className="mt-1 text-[11px] leading-5 text-[#787774]">{description}</p> : null}
  </div>
);

const KeyValue: React.FC<Readonly<{ label: string; value: React.ReactNode }>> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[#e7e5e4] py-3 last:border-b-0">
    <span className="text-[11px] font-medium text-[#787774]">{label}</span>
    <span className="text-right text-[12px] font-medium text-[#1d1d1f]">{value}</span>
  </div>
);

export const ShipmentDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const shipmentQuery = deliveryApi.shipments.hooks.useGet(id);
  const shipment = readRecord(shipmentQuery.data);
  const orderId = text(shipment.orderId);
  const courierId = text(shipment.courierId);
  const trackingNumber = text(shipment.trackingNumber);
  const currentStatus = normalizeShipmentStatus(shipment.status);

  const orderQuery = useQuery({
    queryKey: ["commerce", "order", orderId],
    queryFn: () => commerceApi.orders.get(orderId),
    enabled: orderId.length > 0,
    staleTime: 60_000,
  });

  const courierQuery = deliveryApi.couriers.hooks.useGet(courierId);
  const updateShipment = deliveryApi.shipments.hooks.useUpdate();

  const [formValues, setFormValues] = React.useState({
    orderId: "",
    courierId: "",
    trackingNumber: "",
    status: "PENDING",
  });

  React.useEffect(() => {
    if (!shipment || typeof shipment !== "object") return;
    setFormValues({
      orderId,
      courierId,
      trackingNumber,
      status: currentStatus,
    });
  }, [courierId, currentStatus, orderId, shipment, trackingNumber]);

  const orderDetail = React.useMemo(() => getOrderDetail(orderQuery.data), [orderQuery.data]);
  const normalizedOrder = React.useMemo(() => normalizeOrderRow(orderDetail), [orderDetail]);
  const courier = readRecord(courierQuery.data);

  const shipmentMeta = [
    { label: "Shipment ID", value: text(shipment.id, id ?? "—") },
    {
      label: "Status",
      value: (
        <StatusBadge
          status={getShipmentStatusBadgeStatus(currentStatus)}
          label={formatShipmentStatusLabel(currentStatus)}
        />
      ),
    },
    { label: "Tracking Number", value: trackingNumber || "—" },
    { label: "Provider Payload", value: shipment.providerPayload ? "Available" : "None" },
  ];

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(shipmentSchema, formValues, toast);
    if (!parsed || !id) return;

    const payload = {
      orderId: parsed.orderId,
      courierId: parsed.courierId,
      trackingNumber: parsed.trackingNumber || undefined,
      status: parsed.status,
      providerPayload: (shipment.providerPayload as Readonly<Record<string, unknown>> | null | undefined) ?? undefined,
    };

    try {
      await updateShipment.mutateAsync({ id, dto: payload });
      toast.success("Shipment updated.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (!id) {
    return <div className="rounded-[16px] border border-[#e7e5e4] bg-white p-6 text-sm text-[#6e6e73]">Shipment ID missing.</div>;
  }

  if (shipmentQuery.isLoading) {
    return (
      <div className="flex items-center justify-center rounded-[16px] border border-[#e7e5e4] bg-white p-10 text-sm text-[#6e6e73]">
        <Loader2 size={16} className="mr-2 animate-spin" />
        Loading shipment...
      </div>
    );
  }

  if (!shipment || Object.keys(shipment).length === 0) {
    return (
      <div className="rounded-[16px] border border-[#e7e5e4] bg-white p-6">
        <h1 className="text-[24px] font-semibold text-[#1d1d1f]">Shipment not found</h1>
        <Button variant="outline" className="mt-3" onClick={() => navigate("/dashboard/delivery/shipments")}>
          <ArrowLeft size={14} />
          Back to shipments
        </Button>
      </div>
    );
  }

  return (
    <ModernFormLayout
      title="Shipment Details"
      subtitle="Review the linked order, courier, and provider response before updating the shipment."
      onBack={() => navigate("/dashboard/delivery/shipments")}
      titleMeta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[11px] font-medium text-[#424245]">
            {text(shipment.id, id)}
          </span>
          <StatusBadge
            status={getShipmentStatusBadgeStatus(currentStatus)}
            label={formatShipmentStatusLabel(currentStatus)}
          />
        </div>
        }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <section className="rounded-[24px] border border-[#e7e5e4] bg-white p-5">
              <SectionTitle
                title="Core Shipment"
                description="Essential shipment data pulled from the response and ready for update."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {shipmentMeta.map((entry) => (
                  <InfoRow key={entry.label} label={entry.label} value={entry.value} />
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e7e5e4] bg-white p-5">
              <SectionTitle
                title="Update Shipment"
                description="Keep the linked records intact and update the operational fields only."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField label="Order ID" required>
                  <input
                    value={formValues.orderId}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, orderId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  />
                </FormField>
                <FormField label="Courier ID" required>
                  <input
                    value={formValues.courierId}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, courierId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  />
                </FormField>
                <FormField label="Tracking Number">
                  <input
                    value={formValues.trackingNumber}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, trackingNumber: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                    placeholder="Enter tracking number"
                  />
                </FormField>
                <FormField label="Status" required>
                  <select
                    value={formValues.status}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, status: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  >
                    {shipmentStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatShipmentStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="mt-4">
                <FormActions
                  submitLabel={updateShipment.isPending ? "Updating..." : "Update Shipment"}
                  submitIcon={updateShipment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  isSubmitting={updateShipment.isPending}
                  onCancel={() => navigate("/dashboard/delivery/shipments")}
                />
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-[#e7e5e4] bg-white p-5">
              <SectionTitle title="Linked Order" description="Fetched from the `/order/get/:id` response." />
              <div className="mt-4">
                <KeyValue label="Order Number" value={normalizedOrder.orderNumber} />
                <KeyValue label="Customer" value={normalizedOrder.customerName} />
                <KeyValue label="Email" value={normalizedOrder.customerEmail} />
                <KeyValue
                  label="Payment Status"
                  value={
                    <StatusBadge
                      status={normalizePaymentStatus(normalizedOrder.paymentStatus)}
                      label={formatPaymentStatusLabel(normalizedOrder.paymentStatus)}
                    />
                  }
                />
                <KeyValue label="Payment Method" value={normalizedOrder.paymentMethod} />
                <KeyValue label="Order Total" value={`Rs ${numberText(normalizedOrder.total)}`} />
                <KeyValue label="Placed At" value={normalizedOrder.placedAt} />
                <KeyValue
                  label="Order Status"
                  value={
                    <StatusBadge
                      status={normalizedOrder.status}
                      label={formatOrderStatusLabel(normalizedOrder.status)}
                    />
                  }
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e7e5e4] bg-white p-5">
              <SectionTitle title="Courier" description="The courier metadata associated with this shipment." />
              <div className="mt-4">
                <KeyValue label="Courier Name" value={text(courier.name, "—")} />
                <KeyValue label="Provider Code" value={text(courier.providerCode, "—")} />
                <KeyValue label="API Provider" value={text(courier.apiProvider, "—")} />
                <KeyValue label="Environment" value={text(courier.environment, "—")} />
                <KeyValue label="Tracking URL" value={text(courier.trackingUrl, "—")} />
                <KeyValue label="Active" value={courier.isActive === false ? "No" : "Yes"} />
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e7e5e4] bg-white p-5">
              <SectionTitle
                title="Provider Payload"
                description="Stored provider response or request payload for troubleshooting."
              />
              <pre className="mt-4 max-h-[360px] overflow-auto rounded-[16px] border border-[#e7e5e4] bg-[#fafaf9] p-4 text-[11px] leading-5 text-[#424245]">
                {prettyJson(shipment.providerPayload)}
              </pre>
            </section>
          </div>
        </div>
      </form>
    </ModernFormLayout>
  );
};
