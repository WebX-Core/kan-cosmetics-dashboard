import React from "react";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onNew?: () => void;
  newButtonLabel?: string;
  onBack?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  variant?: "default" | "deleted";
};

export const PageLayout: React.FC<Props> = ({
  title,
  subtitle,
  children,
  actions,
  onNew,
  newButtonLabel = "New",
  onBack,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  variant = "default",
}) => {
  const [showSpinner, setShowSpinner] = React.useState(false);
  const isDeleted = variant === "deleted";

  React.useEffect(() => {
    if (!onSearchChange) return;
    if (!searchValue?.trim()) { setShowSpinner(false); return; }
    setShowSpinner(true);
    const id = window.setTimeout(() => setShowSpinner(false), 2000);
    return () => window.clearTimeout(id);
  }, [searchValue, onSearchChange]);

  return (
    <div className={`space-y-[21px] p-[34px] ${isDeleted ? "bg-rose-50/40 min-h-screen" : ""}`}>
      {onBack && (
        <button
          onClick={onBack}
          className={`flex items-center gap-[5px] text-[12px] transition-colors ${isDeleted ? "text-red-400 hover:text-red-600" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
        >
          <ArrowLeft size={12} strokeWidth={2} />
          Back
        </button>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-[13px]">
        <div>
          <div className="flex items-center gap-[10px]">
            <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#1d1d1f]">
              {title}
            </h1>
            {isDeleted && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-[9px] py-[3px] text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                Deleted
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`mt-[5px] text-[14px] leading-[22px] ${isDeleted ? "text-red-400/80" : "text-[#6e6e73]"}`}>
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          {onSearchChange && (
            <div className="relative">
              <Search
                size={13}
                strokeWidth={2}
                className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[#86868b]"
              />
              <input
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-[34px] w-[220px] rounded-full border border-[#d2d2d7] bg-white pl-[34px] pr-[34px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
              {showSpinner && (
                <Loader2
                  size={12}
                  strokeWidth={2}
                  className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]"
                />
              )}
            </div>
          )}
          {onNew && (
            <button
              onClick={onNew}
              className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.982]"
            >
              <Plus size={13} strokeWidth={2.5} />
              {newButtonLabel}
            </button>
          )}
          {actions}
        </div>
      </div>

      {children}
    </div>
  );
};
