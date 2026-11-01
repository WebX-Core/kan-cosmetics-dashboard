export const text = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value : fallback;

export const number = (value: unknown) =>
  typeof value === "number" ? value : Number(value ?? 0) || 0;

export const rs = (value: unknown) =>
  `Rs. ${number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// Yearly and lifetime values count rupees 1:1. Wallet points need the redeem rate.
export const walletRs = (points: unknown, pointsPerNpr: unknown) =>
  rs(number(points) / (number(pointsPerNpr) || 10));

export const signedRs = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${rs(Math.abs(value))}`;

export const sourceLabel = (source: string) =>
  source.replaceAll("_", " ").replace("POINT REDEMPTION", "REWARD REDEMPTION");

// ponytail: reasons are stored on ledger rows, so old rows are reworded at display time.
export const reasonText = (reason: unknown) =>
  text(reason)
    .replace(/\s*loyalty points$/i, "")
    .replace(/\bReward points\b|\bPoints\b/g, "Rewards")
    .replace(/\bpoints\b/g, "rewards");

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
