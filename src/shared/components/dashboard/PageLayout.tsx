import React from "react";
import { ArrowLeft, Download, Loader2, Plus, Search } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showExport?: boolean;
  onNew?: () => void;
  newButtonLabel?: string;
  onBack?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
};

export const PageLayout: React.FC<Props> = ({
  title,
  subtitle,
  children,
  actions,
  showExport = false,
  onNew,
  newButtonLabel = "New",
  onBack,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
}) => {
  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    if (!onSearchChange) return;
    if (!searchValue?.trim()) { setShowSpinner(false); return; }
    setShowSpinner(true);
    const id = window.setTimeout(() => setShowSpinner(false), 2000);
    return () => window.clearTimeout(id);
  }, [searchValue, onSearchChange]);

  return (
    <div className="space-y-[21px] p-[34px]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-[13px]">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="mb-[8px] flex items-center gap-[5px] text-[12px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
            >
              <ArrowLeft size={12} strokeWidth={2} />
              Back
            </button>
          )}
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#1d1d1f]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-[5px] text-[14px] leading-[22px] text-[#6e6e73]">
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
                className="h-[34px] w-[220px] rounded-full border border-[#d2d2d7] bg-white pl-[34px] pr-[34px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
              />
              {showSpinner && (
                <Loader2
                  size={12}
                  strokeWidth={2}
                  className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 animate-spin text-[#0071e3]"
                />
              )}
            </div>
          )}
          {showExport && (
            <button className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
              <Download size={13} strokeWidth={2} />
              Export
            </button>
          )}
          {onNew && (
            <button
              onClick={onNew}
              className="flex h-[34px] items-center gap-[8px] rounded-full bg-[#0071e3] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] active:scale-[0.982]"
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
