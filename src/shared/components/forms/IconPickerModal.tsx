import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import {
  Check,
  Search,
  Sparkles,
  Trash2,
  X,
  Palette,
  RotateCcw,
} from "lucide-react";

export type IconPickerModalProps = Readonly<{
  isOpen: boolean;
  value?: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
  onClear?: () => void;
  title?: string;
}>;

const QUICK_TAGS = [
  { label: "Makeup", query: "makeup" },
  { label: "Lipstick", query: "lipstick" },
  { label: "Beauty", query: "beauty" },
  { label: "Vegan", query: "vegan" },
  { label: "Natural", query: "leaf" },
  { label: "Safety", query: "shield" },
  { label: "Hydrating", query: "drop" },
  { label: "Sparkles", query: "sparkle" },
  { label: "Chemical-Free", query: "chemical" },
  { label: "Cruelty-Free", query: "rabbit" },
  { label: "SPF / Sun", query: "sun" },
  { label: "Floral", query: "flower" },
  { label: "Serum / Bottle", query: "bottle" },
  { label: "Clean", query: "clean" },
  { label: "Loved", query: "heart" },
  { label: "Certified", query: "check" },
];

const searchCache = new Map<string, string[]>();

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  value,
  onSelect,
  onClose,
  onClear,
  title = "Choose Feature Icon",
}) => {
  const [search, setSearch] = React.useState("makeup");
  const [debouncedSearch, setDebouncedSearch] = React.useState("makeup");
  const [icons, setIcons] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Focus search input on open
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key to close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch icons when query changes
  React.useEffect(() => {
    if (!isOpen) return;
    const query = debouncedSearch || "makeup";

    if (searchCache.has(query)) {
      setIcons(searchCache.get(query) || []);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(
      query,
    )}&limit=64`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { icons?: string[] };
      })
      .then((data) => {
        if (!isMounted) return;
        const results = Array.isArray(data?.icons) ? data.icons : [];
        searchCache.set(query, results);
        setIcons(results);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to fetch icons. Please try again.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen, debouncedSearch]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex h-[85vh] max-h-160 w-full max-w-2xl flex-col overflow-hidden  border border-[#e5e5ea] bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f2f2f4] px-5 py-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--primary)/10 text-(--primary)">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-[15.5px] font-semibold text-[#1d1d1f] tracking-tight">
                {title}
              </h2>
              <p className="text-[12px] text-[#86868b]">
                Search from 200,000+ icons for your product attributes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Suggestions Bar */}
        <div className="space-y-2.5 border-b border-[#f2f2f4] bg-[#fafafc] px-5 py-3.5 shrink-0">
          {/* Input Box */}
          <div className="relative">
            <Search
              size={15}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#86868b] pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (e.g. lipstick, vegan, shield, leaf, rabbit)..."
              className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white pr-9 pl-10 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/15"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#86868b] transition hover:bg-[#f2f2f4] hover:text-[#1d1d1f]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#86868b] shrink-0 mr-0.5">
              <Sparkles size={11} className="text-(--primary)" /> Suggestions:
            </span>
            {QUICK_TAGS.map((tag) => {
              const isActive =
                search.toLowerCase().trim() === tag.query.toLowerCase().trim();
              return (
                <button
                  key={tag.query}
                  type="button"
                  onClick={() => setSearch(tag.query)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition active:scale-95 ${isActive
                      ? "bg-[#1d1d1f] text-white shadow-xs"
                      : "border border-[#e5e5ea] bg-white text-[#48484a] hover:border-[#d2d2d7] hover:bg-[#f5f5f7]"
                    }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Icons Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#fafafa]/50">
          {loading ? (
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-[#e5e5ea] bg-white p-2 animate-pulse"
                >
                  <div className="h-7 w-7 rounded-lg bg-[#f0f0f2]" />
                  <div className="h-2 w-10 rounded bg-[#f0f0f2]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2.5 text-center text-[#86868b]">
              <span className="text-[26px]">⚠️</span>
              <p className="text-[13px] font-medium text-[#1d1d1f]">{error}</p>
              <button
                type="button"
                onClick={() => setSearch((s) => s + " ")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                <RotateCcw size={12} />
                Try again
              </button>
            </div>
          ) : icons.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-[#86868b]">
              <span className="text-[30px]">🔍</span>
              <p className="text-[14px] font-medium text-[#1d1d1f]">
                No icons found for &ldquo;{debouncedSearch}&rdquo;
              </p>
              <p className="max-w-xs text-[12px] text-[#86868b]">
                Try searching for &ldquo;leaf&rdquo;, &ldquo;lipstick&rdquo;, &ldquo;shield&rdquo;, &ldquo;sparkle&rdquo;, or reset the library filter.
              </p>
              <button
                type="button"
                onClick={() => setSearch("makeup")}
                className="mt-2 rounded-lg border border-[#d2d2d7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                Reset to Popular Icons
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-8">
              {icons.map((iconName) => {
                const isSelected = value === iconName;
                const shortName = iconName.split(":").pop() || iconName;
                const prefixName = iconName.split(":")[0];
                return (
                  <button
                    key={iconName}
                    type="button"
                    title={`${iconName} (${prefixName})`}
                    onClick={() => {
                      onSelect(iconName);
                      onClose();
                    }}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all cursor-pointer ${isSelected
                        ? "border-(--primary) bg-(--primary)/10 text-(--primary) ring-2 ring-(--primary)/20 shadow-xs"
                        : "border-[#e5e5ea] bg-white text-[#1d1d1f] hover:border-(--primary)/60 hover:bg-white hover:shadow-sm hover:-translate-y-0.5"
                      }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center transition-transform group-hover:scale-115">
                      <Icon icon={iconName} className="h-6.5 w-6.5" />
                    </div>
                    <span className="w-full truncate text-center text-[10.5px] font-medium text-[#6e6e73] group-hover:text-[#1d1d1f]">
                      {shortName}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--primary) text-white shadow-xs">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#f2f2f4] bg-white px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            {value ? (
              <div className="flex items-center gap-2 rounded-lg bg-[#f5f5f7] px-2.5 py-1.5">
                <Icon
                  icon={value}
                  className="h-4.5 w-4.5 shrink-0 text-(--primary)"
                />
                <span className="text-[12px] font-medium text-[#1d1d1f] truncate max-w-[200px]">
                  {value}
                </span>
              </div>
            ) : (
              <span className="text-[12px] text-[#86868b]">
                Click any icon to select
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {value && onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-[#d2d2d7] bg-white px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 size={12} />
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#d2d2d7] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export type IconPickerButtonProps = Readonly<{
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
  showLabel?: boolean;
}>;

export const IconPickerButton: React.FC<IconPickerButtonProps> = ({
  value,
  onChange,
  className = "",
  showLabel = false,
}) => {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title={value ? `Icon: ${value} (click to change)` : "Select icon"}
        className={`group relative flex h-9.5 shrink-0 items-center justify-center rounded-lg border transition ${
          showLabel ? "gap-2 px-2.5" : "w-9.5"
        } ${
          value
            ? "border-[#d2d2d7] bg-[#f9f9fb] text-[#1d1d1f] hover:border-(--primary) hover:bg-white"
            : "border-dashed border-[#d2d2d7] bg-white text-[#86868b] hover:border-(--primary) hover:text-(--primary)"
        } ${className}`}
      >
        {value ? (
          <>
            <Icon
              icon={value}
              className="h-5 w-5 shrink-0 text-(--primary)"
            />
            {showLabel && (
              <span className="max-w-[85px] truncate text-[11.5px] text-[#48484a] sm:max-w-[110px]">
                {value.split(":").pop()}
              </span>
            )}
          </>
        ) : (
          <>
            <Sparkles
              size={15}
              className="shrink-0 text-[#86868b] group-hover:text-(--primary)"
            />
            {showLabel && <span className="text-[11.5px]">Select icon</span>}
          </>
        )}
      </button>

      <IconPickerModal
        isOpen={modalOpen}
        value={value}
        onSelect={onChange}
        onClear={() => onChange("")}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
