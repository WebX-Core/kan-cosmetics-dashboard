// Apple-inspired Design System — Golden Ratio spacing, clean white, brand navy accent

export const statCardColors = {
  blue:    { bg: "bg-brand/10", iconBg: "bg-brand/10", iconColor: "text-brand",  textColor: "text-[#1d1d1f]"  },
  sky:     { bg: "bg-sky-50",       iconBg: "bg-sky-50",       iconColor: "text-sky-600",    textColor: "text-sky-900"    },
  indigo:  { bg: "bg-indigo-50",    iconBg: "bg-indigo-50",    iconColor: "text-indigo-600", textColor: "text-indigo-900" },
  purple:  { bg: "bg-brand/10", iconBg: "bg-brand/10", iconColor: "text-brand",  textColor: "text-[#1d1d1f]"  },
  violet:  { bg: "bg-brand/10", iconBg: "bg-brand/10", iconColor: "text-brand",  textColor: "text-[#1d1d1f]"  },
  cyan:    { bg: "bg-cyan-50",      iconBg: "bg-cyan-50",      iconColor: "text-cyan-600",   textColor: "text-cyan-900"   },
  emerald: { bg: "bg-emerald-50",   iconBg: "bg-emerald-50",   iconColor: "text-emerald-600",textColor: "text-emerald-900"},
  teal:    { bg: "bg-teal-50",      iconBg: "bg-teal-50",      iconColor: "text-teal-600",   textColor: "text-teal-900"   },
  rose:    { bg: "bg-rose-50",      iconBg: "bg-rose-50",      iconColor: "text-rose-600",   textColor: "text-rose-900"   },
  amber:   { bg: "bg-amber-50",     iconBg: "bg-amber-50",     iconColor: "text-amber-600",  textColor: "text-amber-900"  },
} as const;

export const statusColors = {
  proposal:    "bg-brand/10 text-brand border-brand/20",
  qualified:   "bg-brand/10 text-brand border-brand/20",
  negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  closedWon:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  closedLost:  "bg-red-50 text-red-700 border-red-200",
  active:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:    "bg-[#f5f5f7] text-[#6e6e73] border-[#d2d2d7]",
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:   "bg-red-50 text-red-700 border-red-200",
  expired:     "bg-red-50 text-red-700 border-red-200",
  expiring:    "bg-amber-50 text-amber-700 border-amber-200",
} as const;

export const tableStyles = {
  container:       "rounded-xl border border-[#e5e5e7] bg-white",
  header:          "flex flex-wrap items-center justify-between gap-[13px] border-b border-[#e5e5e7] px-[21px] py-[13px]",
  title:           "text-[14px] font-semibold text-[#1d1d1f]",
  tabsContainer:   "flex flex-wrap gap-[2px] border-b border-[#e5e5e7] px-[21px] py-[8px]",
  tab:             "relative px-[13px] py-[8px] text-[13px] font-medium transition-colors rounded-lg",
  tabActive:       "bg-brand text-white",
  tabInactive:     "text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]",
  tableHeader:     "border-b border-[#f0f0f2]",
  tableHeaderCell: "px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]",
  tableRow:        "border-b border-[#f5f5f7] hover:bg-[#fafafa] transition-colors last:border-0",
  tableCell:       "px-[21px] py-[13px] text-[14px] leading-[22px]",
  pagination:      "flex items-center justify-between px-[21px] py-[13px] border-t border-[#f0f0f2]",
} as const;

export const buttonStyles = {
  primary:   "flex h-[34px] items-center rounded-full bg-brand px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-brand-hover",
  secondary: "flex h-[34px] items-center rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]",
  dark:      "flex h-[34px] items-center rounded-full bg-[#1d1d1f] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-brand",
  danger:    "flex h-[34px] items-center rounded-full bg-red-600 px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-red-700",
  icon:      "flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[#e5e5e7] text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]",
} as const;
