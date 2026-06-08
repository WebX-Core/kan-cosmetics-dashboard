type OrderRecord = Record<string, unknown>;

export type NormalizedOrderRow = Readonly<{
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

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const toRecord = (value: unknown): OrderRecord =>
  value && typeof value === "object" ? (value as OrderRecord) : {};

const firstRecord = (value: unknown): OrderRecord => {
  if (!Array.isArray(value) || value.length === 0) return {};
  return toRecord(value[0]);
};

const getNestedRecord = (
  row: OrderRecord,
  keys: ReadonlyArray<string>,
): OrderRecord => {
  for (const key of keys) {
    const nested = row[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as OrderRecord;
    }
  }
  return {};
};

const extractOrderRecord = (payload: unknown): OrderRecord => {
  const root = toRecord(payload);
  const nestedOrder = getNestedRecord(root, ["order", "data"]);
  if (Object.keys(nestedOrder).length > 0) {
    const nestedDirectOrder = getNestedRecord(nestedOrder, ["order"]);
    if (Object.keys(nestedDirectOrder).length > 0) return nestedDirectOrder;
    if (Object.keys(nestedOrder).some((key) => key === "orderNumber" || key === "orderStatus" || key === "customer")) {
      return nestedOrder;
    }
  }

  if (Object.keys(root).some((key) => key === "orderNumber" || key === "orderStatus" || key === "customer")) {
    return root;
  }

  return nestedOrder;
};

const extractName = (row: OrderRecord): string => {
  const parts = [row.firstname, row.middlename, row.lastname]
    .map((part) => text(part))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");

  const fullName = text(row.fullname ?? row.name ?? row.customerName);
  if (fullName) return fullName;

  return "";
};

const extractCustomerRecord = (row: OrderRecord): OrderRecord =>
  getNestedRecord(row, [
    "customer",
    "customerInfo",
    "customerDetails",
    "buyer",
    "user",
    "account",
  ]);

const collectOrderRows = (payload: unknown): ReadonlyArray<OrderRecord> => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is OrderRecord => typeof item === "object" && item !== null,
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = toRecord(payload);
  const nestedCandidates = [
    record.orders,
    record.items,
    record.results,
    record.data,
  ];

  for (const candidate of nestedCandidates) {
    const rows = collectOrderRows(candidate);
    if (rows.length > 0) return rows;
  }

  return [];
};

const normalizeStatus = (value: unknown): string => {
  const raw = text(value, "PENDING");
  if (!raw) return "PENDING";

  const lower = raw.toLowerCase();
  if (lower.includes("deliver")) return "DELIVERED";
  if (lower.includes("ship")) return "SHIPPED";
  if (lower.includes("process")) return "PROCESSING";
  if (lower.includes("confirm")) return "CONFIRMED";
  if (lower.includes("pack")) return "PACKED";
  if (lower.includes("return")) return "RETURNED";
  if (lower.includes("cancel")) return "CANCELLED";
  if (lower.includes("pend")) return "PENDING";

  return raw.toUpperCase();
};

export const getOrderRows = (payload: unknown): ReadonlyArray<OrderRecord> =>
  collectOrderRows(payload);

export const getOrderCustomerName = (record: unknown): string => {
  const row = extractOrderRecord(record);
  const customer = extractCustomerRecord(row);
  const nestedName = extractName(customer);
  if (nestedName) return nestedName;

  const directName = extractName(row);
  if (directName) return directName;

  return text(row.customerName ?? row.fullname ?? row.name, "Customer");
};

export const getOrderCustomerEmail = (record: unknown): string => {
  const row = extractOrderRecord(record);
  const customer = extractCustomerRecord(row);
  return text(
    customer.email ?? row.customerEmail ?? row.email ?? "",
    "—",
  );
};

export const normalizeOrderRow = (record: unknown): NormalizedOrderRow => {
  const row = extractOrderRecord(record);
  const customer = extractCustomerRecord(row);
  const primaryPayment = firstRecord(row.payments);
  const paymentRecord = toRecord(row.payment);

  return {
    id: text(row.id, crypto.randomUUID()),
    orderNumber: text(row.orderNumber ?? row.orderId ?? row.id, "—"),
    customerName: getOrderCustomerName(row),
    customerEmail: getOrderCustomerEmail(row),
    paymentMethod: text(
      primaryPayment.paymentMethod ??
        row.paymentMethod ??
        customer.paymentMethod ??
        "",
      "—",
    ),
    paymentStatus: text(
      primaryPayment.status ??
        primaryPayment.paymentStatus ??
        row.paymentStatus ??
        paymentRecord.status ??
        "",
      "—",
    ),
    total: text(row.totalAmount ?? row.total ?? "0.00", "0.00"),
    placedAt: text(row.placedAt ?? row.createdAt ?? "", "—"),
    status: normalizeStatus(row.orderStatus ?? row.status),
  };
};

export const getOrderDetail = (payload: unknown): OrderRecord =>
  extractOrderRecord(payload);
