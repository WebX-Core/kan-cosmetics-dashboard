import React from "react";
import { ArrowLeft, Bell, Loader2, Pencil, RefreshCw, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deliveryApi } from "@/features/delivery";
import { commerceApi } from "@/features/commerce";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { getOrderDetail, normalizeOrderRow } from "@/shared/utils/orderMapping";
import {
  formatShipmentStatusLabel,
  getShipmentStatusBadgeStatus,
  normalizeShipmentStatus,
} from "@/shared/utils/shipmentStatus";

type ShipmentRecord = Readonly<Record<string, unknown>>;

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

const formatDateTime = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const readRecord = (value: unknown): ShipmentRecord =>
  value && typeof value === "object" ? (value as ShipmentRecord) : {};

const toRecords = (value: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as ReadonlyArray<Record<string, unknown>>;
  }

  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return Array.isArray(record.data)
    ? (record.data.filter((item) => item && typeof item === "object") as ReadonlyArray<Record<string, unknown>>)
    : [];
};

const SectionTitle: React.FC<Readonly<{ title: string; description?: string }>> = ({ title, description }) => (
  <div className="space-y-1">
    <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</h2>
    {description ? <p className="text-[11px] leading-5 text-[#787774]">{description}</p> : null}
  </div>
);

const FieldRow: React.FC<Readonly<{ label: string; value: React.ReactNode }>> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-[#e7e5e4] py-3 last:border-b-0">
    <span className="text-[11px] font-medium text-[#787774]">{label}</span>
    <span className="text-right text-[12px] font-medium text-[#1d1d1f]">{value}</span>
  </div>
);

export const ShipmentViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const qc = useQueryClient();

  const shipmentQuery = deliveryApi.shipments.hooks.useGet(id);
  const shipment = readRecord(shipmentQuery.data);
  const orderId = text(shipment.orderId);
  const courierId = text(shipment.courierId);
  const trackingNumber = text(shipment.trackingNumber);
  const status = normalizeShipmentStatus(shipment.status);

  const orderQuery = useQuery({
    queryKey: ["commerce", "order", orderId],
    queryFn: () => commerceApi.orders.get(orderId),
    enabled: orderId.length > 0,
    staleTime: 60_000,
  });

  const courierQuery = deliveryApi.couriers.hooks.useGet(courierId);
  const trackingQuery = deliveryApi.shipmentTracking.hooks.useList({ page: 1, limit: 200 }, Boolean(id));

  const orderDetail = React.useMemo(() => getOrderDetail(orderQuery.data), [orderQuery.data]);
  const normalizedOrder = React.useMemo(() => normalizeOrderRow(orderDetail), [orderDetail]);
  const courier = readRecord(courierQuery.data);

  const latestTracking = React.useMemo(() => {
    const rows = toRecords(trackingQuery.data?.data)
      .filter((row) => {
        const shipmentIdValue = text(row.shipmentId);
        const trackingValue = text(row.trackingNumber);
        return shipmentIdValue === id || (trackingNumber.length > 0 && trackingValue === trackingNumber);
      })
      .sort((a, b) => {
        const aTime = new Date(text(a.eventTime ?? a.createdAt, "")).getTime();
        const bTime = new Date(text(b.eventTime ?? b.createdAt, "")).getTime();
        return bTime - aTime;
      });

    return rows[0] ?? null;
  }, [id, trackingNumber, trackingQuery.data?.data]);

  const syncDelivery = useMutation({
    mutationFn: () => commerceApi.orders.syncDelivery(orderId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["commerce", "order", orderId] }),
        qc.invalidateQueries({ queryKey: ["delivery", "shipments", id] }),
        qc.invalidateQueries({ queryKey: ["shipmentTracking", "list"] }),
      ]);
      toast.success("Delivery synced.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const pickupNotification = useMutation({
    mutationFn: () => commerceApi.orders.pickupNotification(orderId),
    onSuccess: () => toast.success("Pickup notification sent."),
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const refresh = async () => {
    await Promise.all([
      shipmentQuery.refetch(),
      orderQuery.refetch(),
      courierQuery.refetch(),
      trackingQuery.refetch(),
    ]);
    toast.success("Shipment refreshed.");
  };

  if (!id) {
    return <div className="min-h-screen bg-[#f5f5f7] px-6 py-8 text-sm text-[#6e6e73]">Shipment ID missing.</div>;
  }

  if (shipmentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-6 py-8 text-sm text-[#6e6e73]">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading shipment...
        </div>
      </div>
    );
  }

  if (!shipment || Object.keys(shipment).length === 0) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">Shipment not found</h1>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/delivery/shipments")}>
          <ArrowLeft size={14} />
          Back to shipments
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-[#e7e5e4] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard/delivery/shipments")}
              className="inline-flex items-center gap-2 text-[12px] font-medium text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
            >
              <ArrowLeft size={13} />
              Back
            </button>
            <div className="space-y-1">
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                Shipment {text(shipment.id, id)}
              </h1>
              <p className="text-[13px] leading-6 text-[#6e6e73]">
                Order {normalizedOrder.orderNumber}, {text(courier.name, "Courier unavailable")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={getShipmentStatusBadgeStatus(status)}
              label={formatShipmentStatusLabel(status)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-[8px]"
              onClick={() => void refresh()}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-[8px]"
              onClick={() => void syncDelivery.mutateAsync()}
              disabled={syncDelivery.isPending || orderId.length === 0}
            >
              {syncDelivery.isPending ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
              Sync delivery
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-[8px]"
              onClick={() => void pickupNotification.mutateAsync()}
              disabled={pickupNotification.isPending || orderId.length === 0}
            >
              {pickupNotification.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              Pickup notification
            </Button>
            <Button asChild variant="default" size="sm" className="h-9 rounded-[8px]">
              <Link to={`/dashboard/delivery/shipments/${id}/edit`}>
                <Pencil size={14} />
                Edit
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <SectionTitle title="Shipment" description="Only the fields staff need at a glance." />
            <div>
              <FieldRow label="Tracking number" value={trackingNumber || "—"} />
              <FieldRow
                label="Shipment status"
                value={
                  <StatusBadge
                    status={getShipmentStatusBadgeStatus(status)}
                    label={formatShipmentStatusLabel(status)}
                  />
                }
              />
              <FieldRow label="Courier" value={text(courier.name, "—")} />
              <FieldRow label="Updated" value={formatDateTime(shipment.updatedAt ?? shipment.createdAt)} />
            </div>
          </div>

          <div className="space-y-4">
            <SectionTitle title="Order" description="Linked order snapshot." />
            <div>
              <FieldRow label="Order number" value={normalizedOrder.orderNumber} />
              <FieldRow label="Customer" value={normalizedOrder.customerName} />
              <FieldRow label="Order status" value={<StatusBadge status={normalizedOrder.status} />} />
              <FieldRow label="Total" value={`Rs ${numberText(normalizedOrder.total)}`} />
            </div>
          </div>
        </section>

        <section className="border-t border-[#e7e5e4] pt-6">
          <SectionTitle
            title="Latest tracking update"
            description="The most recent shipment-tracking event, if available."
          />
          <div className="mt-4">
            {latestTracking ? (
              <div className="flex flex-col gap-2 text-[13px] leading-6 text-[#1d1d1f] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={getShipmentStatusBadgeStatus(
                      latestTracking.providerStatus ?? latestTracking.status,
                    )}
                    label={formatShipmentStatusLabel(
                      latestTracking.providerStatus ?? latestTracking.status,
                    )}
                  />
                  <span>{text(latestTracking.message ?? latestTracking.comments, "Tracking update available")}</span>
                </div>
                <span className="text-[#6e6e73]">
                  {formatDateTime(latestTracking.eventTime ?? latestTracking.createdAt)}
                </span>
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-[#6e6e73]">No tracking events have been recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
