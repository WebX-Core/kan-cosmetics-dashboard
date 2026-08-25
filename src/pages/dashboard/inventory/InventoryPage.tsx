import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  Edit2,
  MoreHorizontal,
  Package,
  Search,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [activeTab, setActiveTab] = React.useState("all");
  const confirm = useConfirmAction();

  const inventoryQuery = catalogApi.inventory.hooks.useList({
    page: 1,
    limit: 500,
    search: debouncedSearch || undefined,
  });

  const softDelete = catalogApi.inventory.hooks.useSoftDelete();

  const inventoryRows = React.useMemo<ReadonlyArray<InventoryRow>>(
    () => toRows(inventoryQuery.data).map(normalizeInventoryRow),
    [inventoryQuery.data],
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

  const loading = inventoryQuery.isLoading;
  const totalPages = (inventoryQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;

  const handleConfirm = async () => {
    const { ids } = confirm;
    if (!ids.length) return;

    try {
      await softDelete.mutateAsync(ids.join(","));
      await inventoryQuery.refetch();
      toast.success("Inventory record deleted.");
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

  const productColumn = (row: InventoryRow) => (
    <div className="flex items-center gap-[10px]">
      <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#f0f0f2] bg-white">
        {row.coverImage ? (
          <img src={row.coverImage} alt={row.productName} className="max-h-[36px] w-auto object-contain" />
        ) : (
          <Package size={16} className="text-[#d2d2d7]" />
        )}
      </div>
      <div>
        <p className="text-[14px] font-medium text-[#1d1d1f]">{row.productName}</p>
        <p className="text-[12px] text-[#86868b]">
          {row.isLimitedStock ? "Limited stock" : row.isLowStock ? "Low stock" : "Inventory record"}
        </p>
      </div>
    </div>
  );

  const activeColumns = [
    { key: "product", label: "Product / Variant", render: productColumn },
    { key: "sku", label: "SKU", render: (row: InventoryRow) => <span className="text-[13px] text-[#6e6e73]">{row.sku}</span> },
    { key: "stock", label: "Stock", render: (row: InventoryRow) => <span className="text-[14px] font-medium text-[#1d1d1f]">{row.stockQty}</span> },
    { key: "reserved", label: "Reserved", render: (row: InventoryRow) => <span className="text-[14px] text-[#6e6e73]">{row.reservedQty}</span> },
    {
      key: "available",
      label: "Available",
      render: (row: InventoryRow) => (
        <span className={`text-[14px] font-medium ${row.available <= 0 ? "text-red-600" : row.status === "Low Stock" ? "text-amber-600" : "text-emerald-600"}`}>
          {row.available}
        </span>
      ),
    },
    { key: "status", label: "Status", render: (row: InventoryRow) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PageLayout
      title="Inventory"
      subtitle="Manage stock levels for all inventory records."
      actions={
        <div className="flex items-center gap-[8px]">
          <ExportMenu basePath="/inventory" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="inventory"/>
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
      <div className="grid grid-cols-1 gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Records" value={stats.total} icon={Package} colorVariant="blue" />
        <StatCardV2 label="In Stock" value={stats.inStock} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Low Stock" value={stats.lowStock} icon={AlertTriangle} colorVariant="amber" />
        <StatCardV2 label="Out of Stock" value={stats.outOfStock} icon={Archive} colorVariant="rose" />
      </div>

      <DataTableV2
        columns={activeColumns}
        data={visibleRows}
        rowId={(row) => row.id}
        onRowClick={(row) => navigate(`/dashboard/inventory/${row.id}`)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setState((current) => ({ ...current, page: 1 }));
        }}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/dashboard/inventory/${row.id}`);
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  confirm.prompt("delete", [row.id]);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage={loading ? "Loading inventory..." : "No inventory records found."}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((p) => ({ ...p, page }))}
        showPagination
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inventory?</AlertDialogTitle>
            <AlertDialogDescription>Move the selected inventory record(s) to trash.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void handleConfirm()}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
