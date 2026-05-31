import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Archive,
  Search,
  Edit2,
  Loader2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { catalogApi } from "@/features/catalog";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

/* ─── types ─────────────────────────────────────────── */

type ProductRow = Readonly<{
  id: string;
  name: string;
  sku: string;
  coverImage: string;
  price: string;
  // inventory fields (undefined = no inventory record yet)
  inventoryId: string | undefined;
  stockQty: number | undefined;
  reservedQty: number | undefined;
  available: number | undefined;
  isInStock: boolean | undefined;
  lowStockThreshold: number | undefined;
  status: string;
}>;

/* ─── helpers ────────────────────────────────────────── */

const str = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);

const resolveStatus = (row: ProductRow): string => {
  if (row.inventoryId === undefined) return "No Inventory";
  if (!row.isInStock) return "Out of Stock";
  const threshold = row.lowStockThreshold ?? 0;
  const avail = row.available ?? 0;
  if (threshold > 0 && avail <= threshold) return "Low Stock";
  if (avail <= 0) return "Out of Stock";
  return "In Stock";
};

const toProductRow = (
  product: Record<string, unknown>,
  inventoryMap: Map<string, Record<string, unknown>>,
): ProductRow => {
  const id = str(product.id);
  const inv = inventoryMap.get(id);

  const stockQty = inv ? num(inv.stockQuantity) : undefined;
  const reservedQty = inv ? num(inv.reservedQuantity) : undefined;
  const available =
    stockQty !== undefined && reservedQty !== undefined
      ? stockQty - reservedQty
      : undefined;

  const partial: Omit<ProductRow, "status"> = {
    id,
    name: str(product.title ?? product.name, "Untitled Product"),
    sku: str(product.sku, "—"),
    coverImage: str(product.coverImage ?? product.image, ""),
    price: str(product.price, "0"),
    inventoryId: inv ? str(inv.id) : undefined,
    stockQty,
    reservedQty,
    available,
    isInStock: inv
      ? typeof inv.isInStock === "boolean"
        ? inv.isInStock
        : undefined
      : undefined,
    lowStockThreshold: inv ? num(inv.lowStockThreshold) : undefined,
  };

  return { ...partial, status: resolveStatus(partial as ProductRow) };
};

/* ─── component ──────────────────────────────────────── */

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [activeTab, setActiveTab] = React.useState("all");

  // Products are the primary list — server-side search by name/SKU
  const productsQuery = catalogApi.products.hooks.useList(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    true,
  );

  // Fetch all inventory records (high limit, no pagination needed for the join)
  const inventoryQuery = catalogApi.inventory.hooks.useList(
    { limit: 500 },
    true,
  );

  // Build productId → inventory record map
  const inventoryMap = React.useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const entry of inventoryQuery.data?.data ?? []) {
      const inv = entry as Record<string, unknown>;
      // Only map product-level inventory (not variant-level)
      const product = inv.product as Record<string, unknown> | null | undefined;
      if (product?.id && typeof product.id === "string") {
        map.set(product.id, inv);
      }
    }
    return map;
  }, [inventoryQuery.data?.data]);

  const allRows = React.useMemo(
    () =>
      (productsQuery.data?.data ?? []).map((p) =>
        toProductRow(p as Record<string, unknown>, inventoryMap),
      ),
    [productsQuery.data?.data, inventoryMap],
  );

  const totalPages = productsQuery.data?.totalPages ?? 1;
  const totalProducts = productsQuery.data?.total ?? allRows.length;
  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [state.page, totalPages]);

  // Tab filtering (client-side on current page)
  const rows = React.useMemo(() => {
    if (activeTab === "all") return allRows;
    if (activeTab === "noinventory")
      return allRows.filter((r) => !r.inventoryId);
    if (activeTab === "outofstock")
      return allRows.filter((r) => r.status === "Out of Stock");
    if (activeTab === "lowstock")
      return allRows.filter((r) => r.status === "Low Stock");
    if (activeTab === "instock")
      return allRows.filter((r) => r.status === "In Stock");
    return allRows;
  }, [allRows, activeTab]);
  const loading = productsQuery.isLoading;
  const softDelete = catalogApi.inventory.hooks.useSoftDelete();

  const stats = React.useMemo(
    () => ({
      total: totalProducts,
      inStock: allRows.filter((r) => r.status === "In Stock").length,
      lowStock: allRows.filter((r) => r.status === "Low Stock").length,
      outOfStock: allRows.filter(
        (r) => r.status === "Out of Stock" || r.status === "No Inventory",
      ).length,
    }),
    [allRows, totalProducts],
  );

  const handleDeleteInventory = async (inventoryId: string) => {
    const ok = await confirmAction("Delete this inventory record?");
    if (!ok) return;
    try {
      await softDelete.mutateAsync(inventoryId);
      void inventoryQuery.refetch();
      toast.success("Inventory deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "instock", label: "In Stock" },
    { key: "lowstock", label: "Low Stock" },
    { key: "outofstock", label: "Out of Stock" },
    { key: "noinventory", label: "No Inventory" },
  ];
  const activeTabIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeTab),
  );
  const searchQuery = state.search.trim().toLowerCase();
  const [showDebounceSpinner, setShowDebounceSpinner] = React.useState(false);
  const [revealRows, setRevealRows] = React.useState(false);

  React.useEffect(() => {
    if (!state.search.trim()) {
      setShowDebounceSpinner(false);
      return;
    }
    setShowDebounceSpinner(true);
    const timeoutId = window.setTimeout(
      () => setShowDebounceSpinner(false),
      2000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [state.search]);

  React.useEffect(() => {
    if (loading) {
      setRevealRows(false);
      return;
    }
    if (rows.length === 0) return;
    const timeoutId = window.setTimeout(() => setRevealRows(true), 30);
    return () => window.clearTimeout(timeoutId);
  }, [loading, rows.length, activeTab, state.page]);

  const highlightText = React.useCallback(
    (value: string): React.ReactNode => {
      if (!searchQuery) return value;
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "ig");
      const parts = value.split(regex);
      if (parts.length > 1) {
        return parts.map((part, idx) =>
          part.toLowerCase() === searchQuery ? (
            <mark
              key={`${part}-${idx}`}
              className="rounded bg-[#ffe08a] px-px text-[#1d1d1f]"
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
          ),
        );
      }

      const letters = new Set(searchQuery.split(""));
      return Array.from(value).map((char, idx) =>
        letters.has(char.toLowerCase()) ? (
          <mark
            key={`${char}-${idx}`}
            className="rounded bg-[#ffe08a] px-px text-[#1d1d1f]"
          >
            {char}
          </mark>
        ) : (
          <React.Fragment key={`${char}-${idx}`}>{char}</React.Fragment>
        ),
      );
    },
    [searchQuery],
  );

  return (
    <PageLayout
      title="Inventory"
      subtitle="Manage stock levels for all products."
      actions={
        <div className="relative">
          <Search
            size={13}
            strokeWidth={2}
            className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[#86868b]"
          />
          <input
            value={state.search}
            onChange={(e) =>
              setState((p) => ({ ...p, page: 1, search: e.target.value }))
            }
            placeholder="Search product by name or SKU…"
            className="h-[34px] w-[260px] rounded-full border border-[#d2d2d7] bg-white pl-[34px] pr-[34px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
          />
          {showDebounceSpinner ? (
            <Loader2
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute right-[13px] top-1/2 -translate-y-1/2 animate-spin text-[#0071e3]"
            />
          ) : null}
        </div>
      }
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Total Products"
          value={stats.total}
          icon={Package}
          colorVariant="blue"
        />
        <StatCardV2
          label="In Stock"
          value={stats.inStock}
          icon={CheckCircle}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Low Stock"
          value={stats.lowStock}
          icon={AlertTriangle}
          colorVariant="amber"
        />
        <StatCardV2
          label="Out of Stock / No Inventory"
          value={stats.outOfStock}
          icon={Archive}
          colorVariant="rose"
        />
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[#e5e5e7] bg-white">
        {/* Tabs */}
        <div className="border-b border-[#e5e5e7] px-[21px] pt-[6px]">
          <div className="relative flex items-center">
            <span
              className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-[#0071e3] transition-transform duration-300 ease-out"
              style={{
                width: `${100 / tabs.length}%`,
                transform: `translateX(${activeTabIndex * 100}%)`,
              }}
            />
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setState((p) => ({ ...p, page: 1 }));
                }}
                className={`h-[40px] flex-1 px-[10px] text-center text-[13px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-[#1d1d1f]"
                    : "text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f0f2]">
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Product
                </th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  SKU
                </th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Stock
                </th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Reserved
                </th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Available
                </th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Status
                </th>
                <th className="px-[21px] py-[10px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr
                    key={`inventory-skeleton-${rowIndex}`}
                    className="border-b border-[#f5f5f7] last:border-0"
                  >
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="h-[40px] w-[40px] animate-pulse rounded-lg bg-[#f3f3f5]" />
                        <div className="w-full">
                          <div className="mb-2 h-[14px] w-[160px] animate-pulse rounded bg-[#f3f3f5]" />
                          <div className="h-[12px] w-[90px] animate-pulse rounded bg-[#f3f3f5]" />
                        </div>
                      </div>
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="h-[14px] w-[140px] animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="h-[14px] w-[40px] animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="h-[14px] w-[40px] animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="h-[14px] w-[40px] animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="h-[20px] w-[70px] animate-pulse rounded-full bg-[#f3f3f5]" />
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="ml-auto h-[28px] w-[80px] animate-pulse rounded-full bg-[#f3f3f5]" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-[21px] py-[55px] text-center">
                    <div className="flex flex-col items-center gap-[13px]">
                      <div className="flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#f5f5f7]">
                        <Package size={22} className="text-[#86868b]" />
                      </div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        No products found
                      </p>
                      <p className="text-[13px] text-[#6e6e73]">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#f5f5f7] transition-colors hover:bg-[#fafafa] last:border-0 ${revealRows ? "table-row-reveal" : "opacity-0"}`}
                    style={
                      revealRows
                        ? { animationDelay: `${idx * 45}ms` }
                        : undefined
                    }
                  >
                    {/* Product */}
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0f0f2] bg-white">
                          {row.coverImage ? (
                            <img
                              src={row.coverImage}
                              alt={row.name}
                              className="max-h-[36px] w-auto object-contain"
                            />
                          ) : (
                            <Package size={16} className="text-[#d2d2d7]" />
                          )}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">
                            {highlightText(row.name)}
                          </p>
                          <p className="text-[12px] text-[#86868b]">
                            Rs {highlightText(row.price)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-[21px] py-[13px] text-[13px] text-[#6e6e73]">
                      {highlightText(row.sku)}
                    </td>

                    {/* Stock */}
                    <td className="px-[21px] py-[13px] text-[14px] font-medium text-[#1d1d1f]">
                      {row.stockQty !== undefined ? (
                        row.stockQty
                      ) : (
                        <span className="text-[#86868b]">—</span>
                      )}
                    </td>

                    {/* Reserved */}
                    <td className="px-[21px] py-[13px] text-[14px] text-[#6e6e73]">
                      {row.reservedQty !== undefined ? (
                        row.reservedQty
                      ) : (
                        <span className="text-[#86868b]">—</span>
                      )}
                    </td>

                    {/* Available */}
                    <td className="px-[21px] py-[13px]">
                      {row.available !== undefined ? (
                        <span
                          className={`text-[14px] font-medium ${row.available <= 0 ? "text-red-600" : row.available <= (row.lowStockThreshold ?? 0) && (row.lowStockThreshold ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          {row.available}
                        </span>
                      ) : (
                        <span className="text-[#86868b]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-[21px] py-[13px]">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Action */}
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center justify-end gap-[8px]">
                        {row.inventoryId ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/dashboard/inventory/${row.inventoryId}`,
                                )
                              }
                              className="flex h-[28px] items-center gap-[5px] rounded-full border border-[#d2d2d7] bg-white px-[13px] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                            >
                              <Edit2 size={11} strokeWidth={2} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteInventory(row.inventoryId!)
                              }
                              className="flex h-[28px] items-center rounded-full border border-[#d2d2d7] bg-white px-[13px] text-[12px] font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/dashboard/inventory/create?productId=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(row.name)}`,
                              )
                            }
                            className="flex h-[28px] items-center gap-[5px] rounded-full bg-[#0071e3] px-[13px] text-[12px] font-medium text-white transition-colors hover:bg-[#0066cc]"
                          >
                            Set Inventory
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f0f0f2] px-[21px] py-[13px]">
            <p className="text-[13px] text-[#86868b]">
              Page {state.page} of {totalPages}
            </p>
            <div className="flex items-center gap-[5px]">
              <button
                type="button"
                disabled={state.page <= 1}
                onClick={() => setState((p) => ({ ...p, page: p.page - 1 }))}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers[0] > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setState((p) => ({ ...p, page: 1 }))}
                    className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[11px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                  >
                    1
                  </button>
                  {pageNumbers[0] > 2 ? (
                    <span className="px-[2px] text-[12px] text-[#86868b]">
                      …
                    </span>
                  ) : null}
                </>
              ) : null}
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, page }))}
                  className={`flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[11px] font-medium transition-colors ${
                    state.page === page
                      ? "border-[#0071e3] bg-[#0071e3] text-white"
                      : "border-[#d2d2d7] text-[#6e6e73] hover:bg-[#f5f5f7]"
                  }`}
                >
                  {page}
                </button>
              ))}
              {pageNumbers[pageNumbers.length - 1] < totalPages ? (
                <>
                  {pageNumbers[pageNumbers.length - 1] < totalPages - 1 ? (
                    <span className="px-[2px] text-[12px] text-[#86868b]">
                      …
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setState((p) => ({ ...p, page: totalPages }))
                    }
                    className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[11px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                  >
                    {totalPages}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={state.page >= totalPages}
                onClick={() => setState((p) => ({ ...p, page: p.page + 1 }))}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
