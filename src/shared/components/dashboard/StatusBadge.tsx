import React from "react";

const statusMap: Record<string, { dot: string; text: string; bg: string }> = {
  /* positive */
  active:         { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  completed:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  fulfilled:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  delivered:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  shipped:        { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  success:        { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  published:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  paid:           { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  recovered:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  converted:      { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  instock:        { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  "in stock":     { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  /* warning / in-progress */
  pending:        { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  processing:     { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  scheduled:      { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  queued:         { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  expiring:       { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  unpaid:         { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  partial:        { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  lowstock:       { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  "low stock":    { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  /* info */
  confirmed:      { dot: "bg-[var(--primary)]",   text: "text-[var(--primary)]",   bg: "bg-[var(--primary)]/10" },
  open:           { dot: "bg-[var(--primary)]",   text: "text-[var(--primary)]",   bg: "bg-[var(--primary)]/10" },
  packed:         { dot: "bg-[var(--primary)]",   text: "text-[var(--primary)]",   bg: "bg-[var(--primary)]/10" },
  /* negative */
  cancelled:      { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  failed:         { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  expired:        { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  returned:       { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  refunded:       { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  unfulfilled:    { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  abandoned:      { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  outofstock:     { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  "out of stock": { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
  /* neutral */
  inactive:       { dot: "bg-[#86868b]",   text: "text-[#6e6e73]",   bg: "bg-[#f5f5f7]" },
  draft:          { dot: "bg-[#86868b]",   text: "text-[#6e6e73]",   bg: "bg-[#f5f5f7]" },
  closed:         { dot: "bg-[#86868b]",   text: "text-[#6e6e73]",   bg: "bg-[#f5f5f7]" },
};

const fallback = { dot: "bg-[#86868b]", text: "text-[#6e6e73]", bg: "bg-[#f5f5f7]" };

type Props = {
  status: string;
  label?: string;
};

export const StatusBadge: React.FC<Props> = ({ status, label }) => {
  const key = status.toLowerCase().trim();
  const style = statusMap[key] ?? statusMap[key.replace(/\s+/g, "")] ?? fallback;

  return (
    <span className={`inline-flex items-center gap-[5px] rounded-full px-[8px] py-[3px] text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${style.dot}`} />
      {label ?? status}
    </span>
  );
};
