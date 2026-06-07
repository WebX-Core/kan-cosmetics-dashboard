import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Archive,
  Search,
  Edit2,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { catalogApi } from "@/features/catalog";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useUserStore } from "@/store/UserStore";

/* ─── types ─────────────────────────────────────────── */

type ProductRow = Readonly<{
  id: string;
  name: string;
  sku: string;
  coverImage: string;
  price: string;
  inventoryId: string | undefined;
  stockQty: number | undefined;
  reservedQty: number | undefined;
  available: number | undefined;
  isInStock: boolean | undefined;
  lowStockThreshold: number | undefined;
  status: string;
}>;

type DeletedInventoryRow = Readonly<{
  id: string;
  productName: string;
  sku: string;
  coverImage: string;
  stockQty: number;
  reservedQty: number;
  available: number;
  status: string;
}>;

/* ─── helpers ────────────────────────────────────────── */

const str = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const toId = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
};
const toObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const getInventoryId = (record: unknown): string => {
  const row = toObject(record);
  return (
    toId(row.id) ||
    toId(row._id) ||
    toId(row.inventoryId) ||
    toId(row.inventory_id)
  );
};

const getProductIdFromInventory = (record: unknown): string => {
  const row = toObject(record);
  const direct =
    toId(row.productId) ||
    toId(row.product_id) ||
    toId(row.productID) ||
    toId((toObject(row.product) as Record<string, unknown>).id) ||
    toId((toObject(row.productVariant).product as Record<string, unknown> | undefined)?.id);
  if (direct) return direct;

  const variant = toObject(row.productVariant);
  return (
    toId(variant.productId) ||
    toId(variant.product_id) ||
    toId((toObject(variant.product) as Record<string, unknown>).id) ||
    ""
  );
};

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
  const id = toId(product.id);
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
    inventoryId: inv ? getInventoryId(inv) : undefined,
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

const toDeletedInventoryRows = (payload: unknown): ReadonlyArray<DeletedInventoryRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((inv) => {
      const product = (
        typeof inv.product === "object" && inv.product !== null ? inv.product : {}
      ) as Record<string, unknown>;
      const stockQty = num(inv.stockQuantity);
      const reservedQty = num(inv.reservedQuantity);
      return {
        id: toId(inv.id, crypto.randomUUID()),
        productName: str(product.title ?? product.name, "Untitled Product"),
        sku: str(product.sku ?? inv.sku, "—"),
        coverImage: str(product.coverImage ?? product.image, ""),
        stockQty,
        reservedQty,
        available: stockQty - reservedQty,
        status: inv.isInStock === false ? "Out of Stock" : "In Stock",
      };
    });
};

/* ─── component ──────────────────────────────────────── */

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isSudoAdmin = useUserStore((s) => s.user?.role === "SUDOADMIN");
  const isDeletedView = location.pathname === "/dashboard/inventory/deleted";

  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [activeTab, setActiveTab] = React.useState("all");
  const confirm = useConfirmAction();

  // Normal view queries
  const productsQuery = catalogApi.products.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const inventoryQuery = catalogApi.inventory.hooks.useList(
    { limit: 500 },
    !isDeletedView,
  );

  // Deleted view query
  const deletedQuery = catalogApi.inventory.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );

  // Mutations
  const softDelete = catalogApi.inventory.hooks.useSoftDelete();
  const recover = catalogApi.inventory.hooks.useRecover();
  const destroy = catalogApi.inventory.hooks.useDestroy();

  // Build productId → inventory record map (normal view only)
  const inventoryMap = React.useMemo(() => {
    if (isDeletedView) return new Map<string, Record<string, unknown>>();
    const map = new Map<string, Record<string, unknown>>();
    for (const entry of inventoryQuery.data?.data ?? []) {
      const inv = entry as Record<string, unknown>;
      const productId = getProductIdFromInventory(inv);
      if (productId) {
        map.set(productId, inv);
      }
    }
    return map;
  }, [inventoryQuery.data?.data, isDeletedView]);

  const allRows = React.useMemo(
    () =>
      isDeletedView
        ? []
        : (productsQuery.data?.data ?? []).map((p) =>
            toProductRow(p as Record<string, unknown>, inventoryMap),
          ),
    [productsQuery.data?.data, inventoryMap, isDeletedView],
  );

  const deletedRows = React.useMemo(
    () => (isDeletedView ? toDeletedInventoryRows(deletedQuery.data) : []),
    [deletedQuery.data, isDeletedView],
  );

  const totalPages = isDeletedView
    ? (deletedQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1
    : productsQuery.data?.totalPages ?? 1;
  const totalProducts = isDeletedView
    ? (deletedQuery.data as { total?: number } | undefined)?.total ?? deletedRows.length
    : productsQuery.data?.total ?? allRows.length;

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [state.page, totalPages]);

  // Tab filtering (client-side, normal view only)
  const rows = React.useMemo(() => {
    if (isDeletedView) return [];
    if (activeTab === "all") return allRows;
    if (activeTab === "noinventory") return allRows.filter((r) => !r.inventoryId);
    if (activeTab === "outofstock") return allRows.filter((r) => r.status === "Out of Stock");
    if (activeTab === "lowstock") return allRows.filter((r) => r.status === "Low Stock");
    if (activeTab === "instock") return allRows.filter((r) => r.status === "In Stock");
    return allRows;
  }, [allRows, activeTab, isDeletedView]);

  const loading = isDeletedView ? deletedQuery.isLoading : productsQuery.isLoading;
  const displayRows = isDeletedView ? deletedRows : rows;

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (!ids.length) return;
    try {
      if (action === "delete") {
        await softDelete.mutateAsync(ids.join(","));
        await inventoryQuery.refetch();
      }
      if (action === "recover") {
        await recover.mutateAsync({ ids });
        await deletedQuery.refetch();
      }
      if (action === "destroy") {
        await destroy.mutateAsync(ids.join(","));
        await deletedQuery.refetch();
      }
      toast.success(
        action === "recover"
          ? `${ids.length === 1 ? "Inventory record" : `${ids.length} inventory records`} recovered.`
          : action === "destroy"
          ? `${ids.length === 1 ? "Inventory record" : `${ids.length} inventory records`} permanently deleted.`
          : `${ids.length === 1 ? "Inventory record" : `${ids.length} inventory records`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

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

  const tabs = [
    { key: "all", label: "All" },
    { key: "instock", label: "In Stock" },
    { key: "lowstock", label: "Low Stock" },
    { key: "outofstock", label: "Out of Stock" },
    { key: "noinventory", label: "No Inventory" },
  ];

  const searchQuery = state.search.trim().toLowerCase();
  const [showDebounceSpinner, setShowDebounceSpinner] = React.useState(false);
  const [revealRows, setRevealRows] = React.useState(false);

  React.useEffect(() => {
    if (!state.search.trim()) {
      setShowDebounceSpinner(false);
      return;
    }
    setShowDebounceSpinner(true);
    const timeoutId = window.setTimeout(() => setShowDebounceSpinner(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [state.search]);

  React.useEffect(() => {
    if (loading) {
      setRevealRows(false);
      return;
    }
    if (displayRows.length === 0) return;
    const timeoutId = window.setTimeout(() => setRevealRows(true), 30);
    return () => window.clearTimeout(timeoutId);
  }, [loading, displayRows.length, activeTab, state.page, isDeletedView]);

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

  const colCount = isDeletedView ? 6 : 7;

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Inventory" : "Inventory"}
      subtitle={
        isDeletedView
          ? "View soft-deleted inventory records."
          : "Manage stock levels for all products."
      }
      onBack={isDeletedView ? () => navigate("/dashboard/inventory") : undefined}
      actions={
        <div className="flex items-center gap-[8px]">
          {!isDeletedView && isSudoAdmin && (
            <button
              type="button"
              onClick={() => navigate("/dashboard/inventory/deleted")}
              className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              <Trash2 size={13} strokeWidth={2} /> View Deleted
            </button>
          )}
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
        </div>
      }
    >
      {/* Stat cards — normal view only */}
      {!isDeletedView && (
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
      )}

      {/* Table card */}
      <div className="rounded-xl border border-[#e5e5e7] bg-white">
        {/* Tabs — normal view only */}
        {!isDeletedView && (
          <div className="border-b border-[#e5e5e7] px-[21px] py-[10px]">
            <div
              className="flex items-center gap-[8px] overflow-x-auto pb-px [scrollbar-width:none]"
              style={{ msOverflowStyle: "none" }}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setState((p) => ({ ...p, page: 1 }));
                    }}
                    aria-pressed={isActive}
                    className={`flex shrink-0 items-center rounded-full border px-[13px] py-[4px] text-[13px] font-medium transition-colors ${
                      isActive
                        ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                        : "border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#b8bcc2] hover:bg-[#f5f5f7]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                {!isDeletedView && (
                  <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                    Status
                  </th>
                )}
                <th className="px-[21px] py-[10px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  {isDeletedView ? "Actions" : "Action"}
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
                    {!isDeletedView && (
                      <td className="px-[21px] py-[13px]">
                        <div className="h-[20px] w-[70px] animate-pulse rounded-full bg-[#f3f3f5]" />
                      </td>
                    )}
                    <td className="px-[21px] py-[13px]">
                      <div className="ml-auto h-[28px] w-[80px] animate-pulse rounded-full bg-[#f3f3f5]" />
                    </td>
                  </tr>
                ))
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-[21px] py-[55px] text-center">
                    <div className="flex flex-col items-center gap-[13px]">
                      <div className="flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#f5f5f7]">
                        <Package size={22} className="text-[#86868b]" />
                      </div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {isDeletedView ? "No deleted inventory records." : "No products found"}
                      </p>
                      <p className="text-[13px] text-[#6e6e73]">
                        {isDeletedView
                          ? "Deleted inventory records will appear here."
                          : "Try adjusting your search or filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : isDeletedView ? (
                deletedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#f5f5f7] transition-colors hover:bg-[#fafafa] last:border-0 ${revealRows ? "table-row-reveal" : "opacity-0"}`}
                    style={revealRows ? { animationDelay: `${idx * 45}ms` } : undefined}
                  >
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0f0f2] bg-white">
                          {row.coverImage ? (
                            <img
                              src={row.coverImage}
                              alt={row.productName}
                              className="max-h-[36px] w-auto object-contain"
                            />
                          ) : (
                            <Package size={16} className="text-[#d2d2d7]" />
                          )}
                        </div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">
                          {row.productName}
                        </p>
                      </div>
                    </td>
                    <td className="px-[21px] py-[13px] text-[13px] text-[#6e6e73]">
                      {row.sku}
                    </td>
                    <td className="px-[21px] py-[13px] text-[14px] font-medium text-[#1d1d1f]">
                      {row.stockQty}
                    </td>
                    <td className="px-[21px] py-[13px] text-[14px] text-[#6e6e73]">
                      {row.reservedQty}
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <span
                        className={`text-[14px] font-medium ${row.available <= 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {row.available}
                      </span>
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => confirm.prompt("recover", [row.id])}
                          className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <RotateCcw size={11} /> Recover
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm.prompt("destroy", [row.id])}
                          className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          <Trash2 size={11} /> Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#f5f5f7] transition-colors hover:bg-[#fafafa] last:border-0 ${revealRows ? "table-row-reveal" : "opacity-0"}`}
                    style={
                      revealRows ? { animationDelay: `${idx * 45}ms` } : undefined
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
                                navigate(`/dashboard/inventory/${row.inventoryId}`)
                              }
                              className="flex h-[28px] items-center gap-[5px] rounded-full border border-[#d2d2d7] bg-white px-[13px] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                            >
                              <Edit2 size={11} strokeWidth={2} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                confirm.prompt("delete", [row.inventoryId!])
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
                    <span className="px-[2px] text-[12px] text-[#86868b]">…</span>
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
                    <span className="px-[2px] text-[12px] text-[#86868b]">…</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setState((p) => ({ ...p, page: totalPages }))}
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

      {/* Confirm dialog */}
      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover"
                ? "Recover inventory?"
                : confirm.action === "destroy"
                ? "Delete permanently?"
                : "Delete inventory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover"
                ? `Recover ${confirm.ids.length === 1 ? "this inventory record" : `${confirm.ids.length} inventory records`}.`
                : confirm.action === "destroy"
                ? "This cannot be undone."
                : `Move ${confirm.ids.length === 1 ? "this inventory record" : `${confirm.ids.length} inventory records`} to trash.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm.action === "recover"
                  ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  : "rounded-full bg-red-600 text-white hover:bg-red-700"
              }
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "recover"
                ? "Recover"
                : confirm.action === "destroy"
                ? "Delete Permanently"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
