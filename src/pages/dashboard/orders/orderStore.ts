export const orderStatuses = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const orderFlowStages = [
  "PENDING",
  "PROCESSING",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
] as const;

export const shipmentStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
  "Failed",
] as const;

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  READY_FOR_SHIPMENT: "Ready for Shipment",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const orderStatusOptions = orderStatuses.map((value) => ({
  value,
  label: orderStatusLabels[value],
}));

export const formatOrderStatusLabel = (value: unknown): string => {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "Pending";

  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized in orderStatusLabels) {
    return orderStatusLabels[normalized as OrderStatus];
  }
  return raw
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Pending";
};

const STORAGE_KEY = "dashboard.orders.statuses";

type StoredStatuses = Readonly<Record<string, OrderStatus>>;

export const readStoredOrderStatuses = (): StoredStatuses => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredStatuses) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveStoredOrderStatus = (orderId: string, status: OrderStatus) => {
  if (typeof window === "undefined") return;

  const current = readStoredOrderStatuses();
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...current,
      [orderId]: status,
    })
  );
};
