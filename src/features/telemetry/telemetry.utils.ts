export type TelemetryRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectArrayCandidates = (value: unknown, depth = 0): ReadonlyArray<unknown> => {
  if (depth > 5) return [];
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];

  const candidateKeys = ["data", "items", "results", "rows", "records", "list", "payload"];
  for (const key of candidateKeys) {
    const candidate = value[key];
    const rows = collectArrayCandidates(candidate, depth + 1);
    if (rows.length > 0) return rows;
  }

  for (const candidate of Object.values(value)) {
    const rows = collectArrayCandidates(candidate, depth + 1);
    if (rows.length > 0) return rows;
  }

  return [];
};

export const toRecord = (value: unknown): TelemetryRecord =>
  isRecord(value) ? value : {};

export const toTelemetryRows = (payload: unknown): ReadonlyArray<TelemetryRecord> =>
  collectArrayCandidates(payload).filter(isRecord);

export const toText = (value: unknown, fallback = "—"): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export const readFirstText = (
  row: Record<string, unknown>,
  keys: ReadonlyArray<string>,
  fallback = "—",
): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return fallback;
};

export const readTimestamp = (
  row: Record<string, unknown>,
  keys: ReadonlyArray<string> = ["occurredAt", "createdAt", "updatedAt", "timestamp"],
): number | null => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "string" || value.trim().length === 0) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }
  return null;
};

export const formatAnalyticsValue = (value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim().length > 0 ? value.trim() : "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const items = value.slice(0, 4).map((item) => formatAnalyticsValue(item)).filter((item) => item !== "—");
    return items.length > 0 ? items.join(", ") : "[]";
  }
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .slice(0, 4)
      .map(([key, nestedValue]) => `${key}: ${formatAnalyticsValue(nestedValue)}`);
    return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
  }
  return String(value);
};

export const formatDateTime = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
};

export const groupRowsByField = (
  rows: ReadonlyArray<TelemetryRecord>,
  keys: ReadonlyArray<string>,
  fallback = "Unknown",
): ReadonlyArray<Readonly<{ label: string; count: number }>> => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const label = readFirstText(row, keys, fallback);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }));
};

export const uniqueTextCount = (
  rows: ReadonlyArray<TelemetryRecord>,
  keys: ReadonlyArray<string>,
): number => {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = readFirstText(row, keys, "");
    if (value) values.add(value);
  });
  return values.size;
};
