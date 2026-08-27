export type InventoryBulkUploadHistoryRow = Readonly<{
  id: string;
  createdAt: string;
  fileName: string;
  status: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  note: string;
  uploadedByName: string;
  uploadedByEmail: string;
}>;

export type InventoryBulkUploadHistoryMeta = Readonly<{
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

export type InventoryBulkUploadDetailRow = Readonly<{
  id: string;
  rowNumber: number;
  targetType: string;
  targetId: string;
  sku: string;
  itemName: string;
  variantName: string;
  status: string;
  errorMessage: string;
  stockQuantity: number | null;
  reservedQuantity: number | null;
  lowStockThreshold: number | null;
  beforeStockQuantity: number | null;
  afterStockQuantity: number | null;
  note: string;
}>;

export type InventoryBulkUploadDetail = Readonly<{
  upload: InventoryBulkUploadHistoryRow;
  rows: ReadonlyArray<InventoryBulkUploadDetailRow>;
  meta: InventoryBulkUploadHistoryMeta;
}>;

const rec = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;

const num = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toHistoryRow = (item: Record<string, unknown>): InventoryBulkUploadHistoryRow => {
  const uploadedBy = rec(item.uploadedBy);
  const name = [str(uploadedBy.firstname), str(uploadedBy.lastname)]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: str(item.id),
    createdAt: str(item.createdAt),
    fileName: str(item.fileName, "inventory-upload.csv"),
    status: str(item.status, "COMPLETED"),
    totalRows: num(item.totalRows),
    createdRows: num(item.createdRows),
    updatedRows: num(item.updatedRows),
    skippedRows: num(item.skippedRows),
    failedRows: num(item.failedRows),
    note: str(item.note, "—"),
    uploadedByName: name || "—",
    uploadedByEmail: str(uploadedBy.email, "—"),
  };
};

const toMeta = (source: Record<string, unknown>): InventoryBulkUploadHistoryMeta => {
  const limit = Math.max(1, num(source.limit, 10));
  const total = Math.max(0, num(source.total, 0));
  return {
    total,
    page: Math.max(1, num(source.page, 1)),
    limit,
    totalPages: Math.max(1, num(source.totalPages, Math.ceil(total / limit) || 1)),
  };
};

export const toUploadHistoryRows = (
  payload: unknown,
): ReadonlyArray<InventoryBulkUploadHistoryRow> => {
  const record = rec(payload);
  const data = rec(record.data ?? payload);
  const source = Array.isArray(data.uploads)
    ? data.uploads
    : Array.isArray(record.uploads)
      ? record.uploads
      : [];

  return source
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map(toHistoryRow)
    .filter((item) => item.id.length > 0);
};

export const toUploadHistoryMeta = (
  payload: unknown,
): InventoryBulkUploadHistoryMeta => {
  const record = rec(payload);
  const data = rec(record.data ?? payload);
  return toMeta(Object.keys(data).length ? data : record);
};

export const toUploadDetail = (payload: unknown): InventoryBulkUploadDetail => {
  const record = rec(payload);
  const data = rec(record.data ?? payload);
  const rowsSource = Array.isArray(data.rows) ? data.rows : [];

  return {
    upload: toHistoryRow(rec(data.upload)),
    rows: rowsSource
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        id: str(item.id),
        rowNumber: num(item.rowNumber),
        targetType: str(item.targetType, "—"),
        targetId: str(item.targetId, "—"),
        sku: str(item.sku, "—"),
        itemName: str(item.itemName, "—"),
        variantName: str(item.variantName, "—"),
        status: str(item.status, "—"),
        errorMessage: str(item.errorMessage, "—"),
        stockQuantity: numOrNull(item.stockQuantity),
        reservedQuantity: numOrNull(item.reservedQuantity),
        lowStockThreshold: numOrNull(item.lowStockThreshold),
        beforeStockQuantity: numOrNull(item.beforeStockQuantity),
        afterStockQuantity: numOrNull(item.afterStockQuantity),
        note: str(item.note, "—"),
      })),
    meta: toMeta(data),
  };
};
