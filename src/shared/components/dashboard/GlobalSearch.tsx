import React from "react";
import { Package, Search, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { catalogApi } from "@/features/catalog";
import { useOrders } from "@/features/commerce";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

type ResultItem = {
  id: string;
  label: string;
  sublabel: string;
  path: string;
  type: "product" | "order";
  imageUrl?: string;
};

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const isEnabled = debouncedQuery.length >= 2;

  const productsQuery = catalogApi.products.hooks.useList(
    { search: debouncedQuery, page: 1, limit: 6 },
    isEnabled
  );

  const ordersQuery = useOrders(
    { search: debouncedQuery, page: 1, limit: 6 },
    isEnabled
  );

  const results = React.useMemo((): ResultItem[] => {
    if (!isEnabled) return [];
    const items: ResultItem[] = [];

    const rawProducts = productsQuery.data?.data ?? [];
    for (const p of rawProducts) {
      const id = String(p.id ?? "");
      const label = String(p.title ?? p.name ?? "Untitled");
      const sublabel = p.sku ? `SKU: ${p.sku}` : p.price ? `$${p.price}` : "";
      const imageUrl = String(p.coverImage ?? p.image ?? p.thumbnail ?? "") || undefined;
      if (!id) continue;
      items.push({ id, label, sublabel, imageUrl, path: `/dashboard/products/${id}`, type: "product" });
    }

    const rawOrders = (() => {
      const payload = ordersQuery.data as unknown;
      if (Array.isArray(payload)) return payload;
      const nested = (payload as { data?: unknown } | null)?.data;
      return Array.isArray(nested) ? nested : [];
    })();
    for (const o of rawOrders) {
      const ord = o as Record<string, unknown>;
      const id = String(ord.id ?? "");
      const num = String(ord.orderNumber ?? ord.orderId ?? id.slice(0, 8));
      const customer = String(
        ord.customerName ?? ord.fullname ?? ord.customerEmail ?? ord.email ?? ""
      );
      const status = String(ord.status ?? "");
      if (!id) continue;
      items.push({
        id,
        label: `Order ${num}`,
        sublabel: [customer, status].filter(Boolean).join(" · "),
        path: `/dashboard/orders/${id}`,
        type: "order",
      });
    }

    return items;
  }, [isEnabled, productsQuery.data, ordersQuery.data]);

  const isLoading = isEnabled && (productsQuery.isLoading || ordersQuery.isLoading);
  const dropdownOpen = query.trim().length >= 2;

  React.useEffect(() => { setActiveIndex(0); }, [debouncedQuery]);

  React.useEffect(() => {
    if (!listRef.current) return;
    const child = listRef.current.children[activeIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = (path: string) => {
    navigate(path);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) commit(results[activeIndex].path);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  return (
    <div className="hidden xl:block" ref={containerRef}>
      <div className="relative">
        <Search
          size={13}
          strokeWidth={2}
          className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[#86868b]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search products, orders…"
          className="h-[34px] w-[320px] rounded-full border border-[#d2d2d7] bg-[#f5f5f7] pl-[34px] pr-[13px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition-all focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10"
          autoComplete="off"
          spellCheck={false}
        />

        {dropdownOpen && (
          <div className="absolute left-0 top-[42px] z-50 w-[380px] overflow-hidden rounded-xl border border-[#e5e5e7] bg-white shadow-lg">
            {isLoading ? (
              <div className="px-[21px] py-[21px] text-center text-[13px] text-[#6e6e73]">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-[21px] py-[21px] text-center text-[13px] text-[#6e6e73]">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div ref={listRef} className="max-h-[320px] overflow-auto py-[6px]">
                {results.map((item, i) => {
                  const Icon = item.type === "product" ? Package : ShoppingCart;
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); commit(item.path); }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-[13px] px-[16px] py-[10px] text-left transition-colors ${isActive ? "bg-[#f5f5f7]" : "hover:bg-[#fafafa]"}`}
                    >
                      <span className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center overflow-hidden rounded-lg transition-colors ${item.imageUrl ? "bg-[#f5f5f7]" : isActive ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.label} className="h-full w-full object-cover" />
                        ) : (
                          <Icon size={15} strokeWidth={2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#1d1d1f]">{item.label}</span>
                        {item.sublabel && (
                          <span className="block truncate text-[12px] text-[#86868b]">{item.sublabel}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded border border-[#e5e5e7] bg-[#f5f5f7] px-[5px] py-px text-[10px] text-[#86868b]">
                        {item.type === "product" ? "Product" : "Order"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="border-t border-[#f0f0f2] px-[16px] py-[8px]">
              <p className="flex flex-wrap items-center gap-x-[4px] text-[11px] text-[#86868b]">
                <kbd className="rounded border border-[#d2d2d7] bg-[#f5f5f7] px-[4px] py-px">↑</kbd>
                <kbd className="rounded border border-[#d2d2d7] bg-[#f5f5f7] px-[4px] py-px">↓</kbd>
                <span>navigate</span>
                <span>·</span>
                <kbd className="rounded border border-[#d2d2d7] bg-[#f5f5f7] px-[4px] py-px">↵</kbd>
                <span>go</span>
                <span>·</span>
                <kbd className="rounded border border-[#d2d2d7] bg-[#f5f5f7] px-[4px] py-px">Esc</kbd>
                <span>close</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
