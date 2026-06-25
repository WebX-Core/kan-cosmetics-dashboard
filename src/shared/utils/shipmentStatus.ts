const shipmentStatusLabels = {
  PENDING: "Pending",
  OPEN: "Open",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  PROCESSING: "Processing",
  PICKED: "Picked",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  FAILED: "Failed",
} as const;

const shipmentBadgeStatusMap: Readonly<Record<string, string>> = {
  PENDING: "pending",
  OPEN: "open",
  CONFIRMED: "confirmed",
  PACKED: "packed",
  PROCESSING: "processing",
  PICKED: "shipped",
  DISPATCHED: "shipped",
  IN_TRANSIT: "shipped",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RETURNED: "returned",
  FAILED: "failed",
};

export const shipmentStatusOptions = [
  "PENDING",
  "OPEN",
  "CONFIRMED",
  "PACKED",
  "PROCESSING",
  "PICKED",
  "DISPATCHED",
  "IN_TRANSIT",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
  "FAILED",
] as const;

const normalizeEnumKey = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/\s+/g, "_");
};

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const normalizeShipmentStatus = (value: unknown): string => {
  const key = normalizeEnumKey(value);
  if (!key) return "PENDING";
  if (key === "CANCELED") return "CANCELLED";
  return key;
};

export const formatShipmentStatusLabel = (value: unknown): string => {
  const key = normalizeShipmentStatus(value);
  return shipmentStatusLabels[key as keyof typeof shipmentStatusLabels] ?? toTitleCase(key);
};

export const getShipmentStatusBadgeStatus = (value: unknown): string => {
  const key = normalizeShipmentStatus(value);
  return shipmentBadgeStatusMap[key] ?? "pending";
};
