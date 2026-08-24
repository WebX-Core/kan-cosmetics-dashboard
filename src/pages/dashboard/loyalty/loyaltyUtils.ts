export const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

export const number = (value: unknown) =>
  typeof value === "number" ? value : Number(value ?? 0) || 0;

export const date = (value: unknown) => {
  const raw = text(value, "");
  if (!raw) return "—";

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(parsed);
};

export const customerName = (value: unknown) => {
  const row =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return (
    [row.firstname, row.middlename, row.lastname]
      .map((item) => text(item, ""))
      .filter(Boolean)
      .join(" ") || text(row.name, "Unknown customer")
  );
};
