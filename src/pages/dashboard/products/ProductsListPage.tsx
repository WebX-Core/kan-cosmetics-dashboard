import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Tag, Layers, AlertTriangle, MoreHorizontal, Pencil, Trash2, MessageSquare, Boxes } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusToggle } from "@/shared/components/dashboard/StatusToggle";
import { catalogApi } from "@/features/catalog";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { confirmAction } from "@/shared/utils/confirm";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);
const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

type ProductRow = Readonly<{
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: "Active" | "Inactive";
  createdAt: string;
}>;

const fmtPrice = (n: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(n);

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

const toRows = (payload: unknown): ReadonlyArray<ProductRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item) => {
      const subcategory = (typeof item.subcategory === "object" && item.subcategory !== null
        ? item.subcategory
        : {}) as Record<string, unknown>;
      const category = (typeof subcategory.category === "object" && subcategory.category !== null
        ? subcategory.category
        : {}) as Record<string, unknown>;
      return {
        id: text(item.id, crypto.randomUUID()),
        name: text(item.name ?? item.title, "Untitled Product"),
        slug: text(item.slug, ""),
        sku: text(item.sku, "—"),
        price:
          toNumber(item.price) ??
          toNumber(item.basePrice) ??
          toNumber(item.sellingPrice) ??
          toNumber(item.mrp) ??
          0,
        stock: num(item.stock ?? item.totalStock),
        category: text(category.title ?? category.name ?? subcategory.title ?? subcategory.name, "—"),
        status: item.isDeleted === true ? "Inactive" : "Active",
        createdAt: text(item.createdAt, ""),
      };
    });
};

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = catalogApi.products.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = catalogApi.products.hooks.useSoftDelete();
  const updateProduct = catalogApi.products.hooks.useUpdate();
  const [statusOverrides, setStatusOverrides] = React.useState<Readonly<Record<string, ProductRow["status"]>>>({});
  const [pendingStatusIds, setPendingStatusIds] = React.useState<ReadonlySet<string>>(new Set());

  const rows = React.useMemo(
    () => toRows(query.data).map((row) => ({ ...row, status: statusOverrides[row.id] ?? row.status })),
    [query.data, statusOverrides]
  );
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (activeTab === "active") return rows.filter((r) => r.status === "Active");
    if (activeTab === "inactive") return rows.filter((r) => r.status === "Inactive");
    if (activeTab === "low-stock") return rows.filter((r) => r.stock > 0 && r.stock <= 5);
    if (activeTab === "out-of-stock") return rows.filter((r) => r.stock === 0);
    return rows;
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total,
    active: rows.filter((r) => r.status === "Active").length,
    lowStock: rows.filter((r) => r.stock > 0 && r.stock <= 5).length,
    outOfStock: rows.filter((r) => r.stock === 0).length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All Products", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "low-stock", label: "Low Stock", count: stats.lowStock },
    { key: "out-of-stock", label: "Out of Stock", count: stats.outOfStock },
  ];

  const handleStatusToggle = async (row: ProductRow, nextActive: boolean) => {
    const previousStatus = row.status;
    const nextStatus: ProductRow["status"] = nextActive ? "Active" : "Inactive";
    setStatusOverrides((prev) => ({ ...prev, [row.id]: nextStatus }));
    setPendingStatusIds((prev) => new Set(prev).add(row.id));
    try {
      await updateProduct.mutateAsync({ id: row.id, dto: { isDeleted: !nextActive } });
    } catch (error) {
      setStatusOverrides((prev) => ({ ...prev, [row.id]: previousStatus }));
      toast.error(parseApiError(error).message);
    } finally {
      setPendingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (r: ProductRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
        </div>
      ),
    },
    { key: "sku", label: "SKU", render: (r: ProductRow) => <span className="font-mono text-xs text-gray-500">{r.sku}</span> },
    { key: "category", label: "Category", render: (r: ProductRow) => <span className="text-gray-600">{r.category}</span> },
    {
      key: "price",
      label: "Price",
      render: (r: ProductRow) => <span className="font-medium text-gray-900">{fmtPrice(r.price)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r: ProductRow) => (
        <div className="inline-flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <StatusToggle
            checked={r.status === "Active"}
            disabled={pendingStatusIds.has(r.id)}
            onClick={(event) => event.stopPropagation()}
            onChange={(next) => handleStatusToggle(r, next)}
          />
          <span className={`text-xs font-medium ${r.status === "Active" ? "text-emerald-700" : "text-zinc-600"}`}>
            {r.status}
          </span>
        </div>
      ),
    },
    { key: "createdAt", label: "Created", render: (r: ProductRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (r: ProductRow) => (
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
                navigate(`/dashboard/products/${r.id}/edit`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/products/${r.id}/faqs`);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Manage FAQs
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/product-variants?product=${encodeURIComponent(r.id)}&productName=${encodeURIComponent(r.name)}`);
              }}
            >
              <Boxes className="mr-2 h-4 w-4" />
              Manage Variants
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={async (event) => {
                event.stopPropagation();
                const ok = await confirmAction("Delete this product?");
                if (!ok) return;
                await softDelete.mutateAsync(r.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="Products"
      subtitle="All products in the catalog."
      onNew={() => navigate("/dashboard/products/create")}
      newButtonLabel="New Product"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search products..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Products" value={stats.total} icon={Package} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={Tag} colorVariant="emerald" />
        <StatCardV2 label="Low Stock" value={stats.lowStock} icon={AlertTriangle} colorVariant="amber" />
        <StatCardV2 label="Out of Stock" value={stats.outOfStock} icon={Layers} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        onRowClick={(r) => navigate(`/dashboard/products/${r.id}`)}
        emptyMessage={query.isLoading ? "Loading products..." : "No products found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
