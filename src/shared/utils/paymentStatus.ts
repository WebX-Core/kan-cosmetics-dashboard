const paymentFlowStatusLabels = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  FAILED: "Failed",
} as const;

const paymentSettlementStatusLabels = {
  NOT_REQUIRED: "Not required",
  PENDING: "Pending",
  DUE: "Due",
  SETTLED: "Settled",
  FAILED: "Failed",
} as const;

type LabelMap = Readonly<Record<string, string>>;

const normalizeEnumKey = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  return normalized;
};

const formatFromMap = (value: unknown, labels: LabelMap, fallback = "Pending"): string => {
  const key = normalizeEnumKey(value);
  if (!key) return fallback;
  return labels[key] ?? key;
};

export const normalizePaymentStatus = (value: unknown): string => {
  const key = normalizeEnumKey(value);
  return paymentFlowStatusLabels[key as keyof typeof paymentFlowStatusLabels]
    ? key
    : "UNPAID";
};

export const formatPaymentStatusLabel = (value: unknown): string =>
  formatFromMap(value, paymentFlowStatusLabels, "Unpaid");

export const normalizeSettlementStatus = (value: unknown): string => {
  const key = normalizeEnumKey(value);
  return paymentSettlementStatusLabels[key as keyof typeof paymentSettlementStatusLabels]
    ? key
    : key || "PENDING";
};

export const formatSettlementStatusLabel = (value: unknown): string =>
  formatFromMap(value, paymentSettlementStatusLabels, "Pending");
