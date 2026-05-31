import React from "react";
import type { LucideIcon } from "lucide-react";

const iconStyles: Record<string, { iconBg: string; iconColor: string }> = {
  blue:    { iconBg: "bg-[#0071e3]/10", iconColor: "text-[#0071e3]" },
  sky:     { iconBg: "bg-sky-50",       iconColor: "text-sky-600" },
  indigo:  { iconBg: "bg-indigo-50",    iconColor: "text-indigo-600" },
  purple:  { iconBg: "bg-[#0071e3]/10", iconColor: "text-[#0071e3]" },
  violet:  { iconBg: "bg-[#0071e3]/10", iconColor: "text-[#0071e3]" },
  cyan:    { iconBg: "bg-cyan-50",      iconColor: "text-cyan-600" },
  emerald: { iconBg: "bg-emerald-50",   iconColor: "text-emerald-600" },
  teal:    { iconBg: "bg-teal-50",      iconColor: "text-teal-600" },
  rose:    { iconBg: "bg-rose-50",      iconColor: "text-rose-600" },
  amber:   { iconBg: "bg-amber-50",     iconColor: "text-amber-600" },
  red:     { iconBg: "bg-red-50",       iconColor: "text-red-600" },
  pink:    { iconBg: "bg-pink-50",      iconColor: "text-pink-600" },
  gray:    { iconBg: "bg-[#f5f5f7]",    iconColor: "text-[#6e6e73]" },
};

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorVariant?: keyof typeof iconStyles;
  subtitle?: string;
  forceCurrencyIcon?: boolean;
  compact?: boolean;
};

const useCountUp = (target: number, durationMs = 900): number => {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const value = Number.isFinite(target) ? Math.max(0, target) : 0;
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    let raf = 0;

    const tick = (ts: number) => {
      const progress = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
};

const parseNumericValue = (
  value: string | number,
): Readonly<{ target: number; decimals: number; prefix: string; suffix: string } | null> => {
  if (typeof value === "number") {
    return { target: value, decimals: Number.isInteger(value) ? 0 : 2, prefix: "", suffix: "" };
  }
  const match = value.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const raw = match[0];
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    target: numeric,
    decimals,
    prefix: value.slice(0, match.index ?? 0),
    suffix: value.slice((match.index ?? 0) + raw.length),
  };
};

export const StatCardV2: React.FC<Props> = ({
  label,
  value,
  icon: Icon,
  colorVariant = "blue",
  subtitle,
  forceCurrencyIcon = false,
  compact = false,
}) => {
  const { iconBg, iconColor } = iconStyles[colorVariant] ?? iconStyles.blue;
  const useCurrencyIcon =
    forceCurrencyIcon ||
    /(revenue|earning|sales|spent|value|amount|price|aov)/i.test(label);
  const parsed = React.useMemo(() => parseNumericValue(value), [value]);
  const animated = useCountUp(parsed?.target ?? 0);
  const displayValue = React.useMemo(() => {
    if (!parsed) return value;
    const formatted = animated.toLocaleString(undefined, {
      minimumFractionDigits: parsed.decimals,
      maximumFractionDigits: parsed.decimals,
    });
    return `${parsed.prefix}${formatted}${parsed.suffix}`;
  }, [animated, parsed, value]);

  return (
    <article className="rounded-xl border border-[#e5e5e7] bg-white p-[21px]">
      <div className="flex items-start justify-between gap-[13px]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b] truncate">
            {label}
          </p>
          <p className={`mt-[8px] font-semibold leading-none tracking-[-0.02em] text-[#1d1d1f] ${compact ? "text-[16px]" : "text-[28px]"}`}>
            {displayValue}
          </p>
          {subtitle && (
            <p className="mt-[5px] text-[12px] text-[#6e6e73]">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {useCurrencyIcon ? (
            <img src="/logo/nrs.png" alt="NRS" className="h-[16px] w-[16px] object-contain" />
          ) : (
            <Icon size={16} strokeWidth={2} className={iconColor} />
          )}
        </div>
      </div>
    </article>
  );
};
