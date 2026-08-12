import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  Edit2,
  Package,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
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

type InventoryRow = Readonly<{
  id: string;
  productName: string;
  sku: string;
  coverImage: string;
  stockQty: number;
  reservedQty: number;
  available: number;
  lowStockThreshold: number;
  isInStock: boolean;
  isLowStock: boolean;
  isLimitedStock: boolean;
  status: "In Stock" | "Low Stock" | "Limited Stock" | "Out of Stock";
}>;

type DeletedInventoryRow = Readonly<{
  id: string;
  productName: string;
  sku: string;
  coverImage: string;
  stockQty: number;
  reservedQty: number;
  available: number;
  status: "In Stock" | "Low Stock" | "Limited Stock" | "Out of Stock";
}>;

const toText = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  const record = toRecord(payload);
  const candidates = [record.data, record.inventories, record.items, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    const nested = toRecord(candidate);
    if (Array.isArray(nested.data)) {
      return nested.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    if (Array.isArray(nested.inventories)) {
      return nested.inventories.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
  }
  return [];
};

const getVariant = (row: Record<string, unknown>): Record<string, unknown> =>
  toRecord(row.productVariant);

const resolveStatus = (
  stockQty: number,
  reservedQty: number,
  lowStockThreshold: number,
  isInStock: boolean,
  isLowStock: boolean,
  isLimitedStock: boolean,
): InventoryRow["status"] => {
  if (!isInStock || stockQty - reservedQty <= 0) return "Out of Stock";
  if (isLowStock || (lowStockThreshold > 0 && stockQty - reservedQty <= lowStockThreshold)) return "Low Stock";
  if (isLimitedStock) return "Limited Stock";
  return "In Stock";
};

const normalizeInventoryRow = (row: Record<string, unknown>): InventoryRow => {
  const variant = getVariant(row);
  const product = toRecord(row.product);
  const stockQty = toNumber(row.stockQuantity);
  const reservedQty = toNumber(row.reservedQuantity);
  const lowStockThreshold = toNumber(row.lowStockThreshold);
  const isInStock = row.isInStock !== false;
  const isLowStock = row.isLowStock === true;
  const isLimitedStock = row.isLimitedStock === true;
  const available = stockQty - reservedQty;

  return {
    id: toText(row.id ?? row._id, crypto.randomUUID()),
    productName: toText(
      variant.title ?? variant.name ?? product.title ?? product.name,
      "Untitled inventory",
    ),
    sku: toText(variant.sku ?? product.sku, "—"),
    coverImage: toText(variant.image ?? product.coverImage ?? product.image, ""),
    stockQty,
    reservedQty,
    available,
    lowStockThreshold,
    isInStock,
    isLowStock,
    isLimitedStock,
    status: resolveStatus(
      stockQty,
      reservedQty,
      lowStockThreshold,
      isInStock,
      isLowStock,
      isLimitedStock,
    ),
  };
};

const normalizeDeletedInventoryRow = (row: Record<string, unknown>): DeletedInventoryRow => {
  const variant = getVariant(row);
  const product = toRecord(row.product);
  const stockQty = toNumber(row.stockQuantity);
  const reservedQty = toNumber(row.reservedQuantity);
  const available = stockQty - reservedQty;
  const status = resolveStatus(
    stockQty,
    reservedQty,
    toNumber(row.lowStockThreshold),
    row.isInStock !== false,
    row.isLowStock === true,
    row.isLimitedStock === true,
  );

  return {
    id: toText(row.id ?? row._id, crypto.randomUUID()),
    productName: toText(
      variant.title ?? variant.name ?? product.title ?? product.name,
      "Untitled inventory",
    ),
    sku: toText(variant.sku ?? product.sku, "—"),
    coverImage: toText(variant.image ?? product.coverImage ?? product.image, ""),
    stockQty,
    reservedQty,
    available,
    status,
  };
};

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

  const inventoryQuery = catalogApi.inventory.hooks.useList(
    { page: 1, limit: 500, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = catalogApi.inventory.hooks.useDeleted(
    { page: 1, limit: 500, search: debouncedSearch || undefined },
    isDeletedView,
  );

  const softDelete = catalogApi.inventory.hooks.useSoftDelete();
  const recover = catalogApi.inventory.hooks.useRecover();
  const destroy = catalogApi.inventory.hooks.useDestroy();

  const inventoryRows = React.useMemo<ReadonlyArray<InventoryRow>>(
    () => toRows(inventoryQuery.data).map(normalizeInventoryRow),
    [inventoryQuery.data],
  );
  const deletedRows = React.useMemo(
    () => toRows(deletedQuery.data).map(normalizeDeletedInventoryRow),
    [deletedQuery.data],
  );

  const visibleRows = React.useMemo<ReadonlyArray<InventoryRow>>(() => {
    const rows = activeTab === "all"
      ? inventoryRows
      : inventoryRows.filter((row) => row.status.toLowerCase().replace(/\s+/g, "") === activeTab);
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.productName, row.sku].some((value) => value.toLowerCase().includes(q)),
    );
  }, [activeTab, debouncedSearch, inventoryRows]);

  const stats = React.useMemo(
    () => ({
      total: inventoryRows.length,
      inStock: inventoryRows.filter((row) => row.status === "In Stock").length,
      lowStock: inventoryRows.filter((row) => row.status === "Low Stock").length,
      outOfStock: inventoryRows.filter((row) => row.status === "Out of Stock").length,
    }),
    [inventoryRows],
  );

  const loading = isDeletedView ? deletedQuery.isLoading : inventoryQuery.isLoading;
  const totalPages = isDeletedView
    ? (deletedQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1
    : (inventoryQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;

  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [state.page, totalPages]);

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
          ? "Inventory record recovered."
          : action === "destroy"
            ? "Inventory record permanently deleted."
            : "Inventory record deleted.",
      );
    } catch (error) {
      toast.error(String(error));
    } finally {
      confirm.dismiss();
    }
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "instock", label: "In Stock" },
    { key: "lowstock", label: "Low Stock" },
    { key: "outofstock", label: "Out of Stock" },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Inventory" : "Inventory"}
      subtitle={
        isDeletedView
          ? "View soft-deleted inventory records."
          : "Manage stock levels for all inventory records."
      }
      onBack={isDeletedView ? () => navigate("/dashboard/inventory") : undefined}
      actions={
        <div className="flex items-center gap-[8px]">
          {!isDeletedView && <ExportMenu basePath="/inventory" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="inventory"/>}
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
              onChange={(e) => setState((p) => ({ ...p, page: 1, search: e.target.value }))}
              placeholder="Search by variant or SKU…"
              className="h-[34px] w-[260px] rounded-full border border-[#d2d2d7] bg-white pl-[34px] pr-[34px] text-[13px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>
        </div>
      }
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label="Total Records" value={stats.total} icon={Package} colorVariant="blue" />
          <StatCardV2 label="In Stock" value={stats.inStock} icon={CheckCircle} colorVariant="emerald" />
          <StatCardV2 label="Low Stock" value={stats.lowStock} icon={AlertTriangle} colorVariant="amber" />
          <StatCardV2 label="Out of Stock" value={stats.outOfStock} icon={Archive} colorVariant="rose" />
        </div>
      )}

      <div className="rounded-xl border border-[#e5e5e7] bg-white">
        {!isDeletedView && (
          <div className="border-b border-[#e5e5e7] px-[21px] py-[10px]">
            <div className="flex items-center gap-[8px] overflow-x-auto pb-px [scrollbar-width:none]" style={{ msOverflowStyle: "none" }}>
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
                    className={`flex shrink-0 items-center rounded-full border px-[13px] py-[4px] text-[13px] font-medium transition-colors ${
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f0f2]">
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Product / Variant</th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">SKU</th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Stock</th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Reserved</th>
                <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Available</th>
                {!isDeletedView && (
                  <th className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">Status</th>
                )}
                <th className="px-[21px] py-[10px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  {isDeletedView ? "Actions" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`inventory-skeleton-${rowIndex}`} className="border-b border-[#f5f5f7] last:border-0">
                    <td className="px-[21px] py-[13px]" colSpan={isDeletedView ? 7 : 8}>
                      <div className="h-[14px] w-full animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                  </tr>
                ))
              ) : (isDeletedView ? deletedRows : visibleRows).length === 0 ? (
                <tr>
                  <td colSpan={isDeletedView ? 7 : 8} className="px-[21px] py-[55px] text-center">
                    <div className="flex flex-col items-center gap-[13px]">
                      <div className="flex h-[55px] w-[55px] items-center justify-center rounded-full bg-[#f5f5f7]">
                        <Package size={22} className="text-[#86868b]" />
                      </div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {isDeletedView ? "No deleted inventory records." : "No inventory records found."}
                      </p>
                      <p className="text-[13px] text-[#6e6e73]">
                        {isDeletedView ? "Deleted inventory records will appear here." : "Try adjusting your search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : isDeletedView ? (
                deletedRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f5f5f7] transition-colors hover:bg-[#fafafa] last:border-0">
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0f0f2] bg-white">
                          {row.coverImage ? <img src={row.coverImage} alt={row.productName} className="max-h-[36px] w-auto object-contain" /> : <Package size={16} className="text-[#d2d2d7]" />}
                        </div>
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{row.productName}</p>
                      </div>
                    </td>
                    <td className="px-[21px] py-[13px] text-[13px] text-[#6e6e73]">{row.sku}</td>
                    <td className="px-[21px] py-[13px] text-[14px] font-medium text-[#1d1d1f]">{row.stockQty}</td>
                    <td className="px-[21px] py-[13px] text-[14px] text-[#6e6e73]">{row.reservedQty}</td>
                    <td className="px-[21px] py-[13px]">
                      <span className={`text-[14px] font-medium ${row.available <= 0 ? "text-red-600" : "text-emerald-600"}`}>{row.available}</span>
                    </td>
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => confirm.prompt("recover", [row.id])} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                          <RotateCcw size={11} /> Recover
                        </button>
                        <button type="button" onClick={() => confirm.prompt("destroy", [row.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                          <Trash2 size={11} /> Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f5f5f7] transition-colors hover:bg-[#fafafa] last:border-0">
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0f0f2] bg-white">
                          {row.coverImage ? <img src={row.coverImage} alt={row.productName} className="max-h-[36px] w-auto object-contain" /> : <Package size={16} className="text-[#d2d2d7]" />}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{row.productName}</p>
                          <p className="text-[12px] text-[#86868b]">{row.isLimitedStock ? "Limited stock" : row.isLowStock ? "Low stock" : "Inventory record"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-[21px] py-[13px] text-[13px] text-[#6e6e73]">{row.sku}</td>
                    <td className="px-[21px] py-[13px] text-[14px] font-medium text-[#1d1d1f]">{row.stockQty}</td>
                    <td className="px-[21px] py-[13px] text-[14px] text-[#6e6e73]">{row.reservedQty}</td>
                    <td className="px-[21px] py-[13px]">
                      <span className={`text-[14px] font-medium ${row.available <= 0 ? "text-red-600" : row.status === "Low Stock" ? "text-amber-600" : "text-emerald-600"}`}>{row.available}</span>
                    </td>
                    {!isDeletedView && (
                      <td className="px-[21px] py-[13px]">
                        <StatusBadge status={row.status} />
                      </td>
                    )}
                    <td className="px-[21px] py-[13px]">
                      <div className="flex items-center justify-end gap-[8px]">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/inventory/${row.id}`)}
                          className="flex h-[28px] items-center gap-[5px] rounded-full border border-[#d2d2d7] bg-white px-[13px] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
                        >
                          <Edit2 size={11} strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm.prompt("delete", [row.id])}
                          className="flex h-[28px] items-center rounded-full border border-[#d2d2d7] bg-white px-[13px] text-[12px] font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f0f0f2] px-[21px] py-[13px]">
            <p className="text-[13px] text-[#86868b]">Page {state.page} of {totalPages}</p>
            <div className="flex items-center gap-[5px]">
              <button type="button" disabled={state.page <= 1} onClick={() => setState((p) => ({ ...p, page: p.page - 1 }))} className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-40">‹</button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, page }))}
                  className={`flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[11px] font-medium transition-colors ${state.page === page ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[#d2d2d7] text-[#6e6e73] hover:bg-[#f5f5f7]"}`}
                >
                  {page}
                </button>
              ))}
              <button type="button" disabled={state.page >= totalPages} onClick={() => setState((p) => ({ ...p, page: p.page + 1 }))} className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>

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
                ? "Recover the selected inventory record(s)."
                : confirm.action === "destroy"
                  ? "This cannot be undone."
                  : "Move the selected inventory record(s) to trash."}
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
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
