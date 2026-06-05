import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Package, Tag, Layers, AlertTriangle, MoreHorizontal, Pencil, Trash2, MessageSquare, Boxes, Globe, Star, RotateCcw } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { catalogApi } from "@/features/catalog";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useUserStore } from "@/store/UserStore";
import { usePermission } from "@/shared/hooks/usePermission";
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
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";

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
  productType: string;
  image: string;
  price: number;
  stock: number;
  category: string;
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
        productType: text(item.productType, ""),
        image: text(item.coverImage ?? item.mainImage ?? item.image ?? item.thumbnail ?? item.imageUrl, ""),
        price:
          toNumber(item.price) ??
          toNumber(item.basePrice) ??
          toNumber(item.sellingPrice) ??
          toNumber(item.mrp) ??
          0,
        stock: num(item.stock ?? item.totalStock),
        category: text(category.title ?? category.name ?? subcategory.title ?? subcategory.name, "—"),
        createdAt: text(item.createdAt, ""),
      };
    });
};

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isSudoAdmin = useUserStore((s) => s.user?.role === "SUDOADMIN");
  const isDeletedView = location.pathname === "/dashboard/products/deleted";

  const canProductUpdate  = usePermission("product:update");
  const canProductDelete  = usePermission("product:delete");
  const canReviewView     = usePermission("review:view");
  const canFaqView        = usePermission("faq:view");
  const canVariantView    = usePermission("product-variant:view");
  const canSeoView        = usePermission("seo:view");
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(new Set());
  const confirm = useConfirmAction();

  const query = catalogApi.products.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = catalogApi.products.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = catalogApi.products.hooks.useSoftDelete();
  const recover = catalogApi.products.hooks.useRecover();
  const destroy = catalogApi.products.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQuery.data : query.data;
  const rows = React.useMemo(() => toRows(sourceData), [sourceData]);
  const totalPages = (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (sourceData as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (isDeletedView) return rows;
    if (activeTab === "low-stock") return rows.filter((r) => r.stock > 0 && r.stock <= 5);
    if (activeTab === "out-of-stock") return rows.filter((r) => r.stock === 0);
    return rows;
  }, [rows, activeTab, isDeletedView]);

  const stats = React.useMemo(() => ({
    total,
    inStock: rows.filter((r) => r.stock > 0).length,
    lowStock: rows.filter((r) => r.stock > 0 && r.stock <= 5).length,
    outOfStock: rows.filter((r) => r.stock === 0).length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All Products", count: total },
    { key: "low-stock", label: "Low Stock", count: stats.lowStock },
    { key: "out-of-stock", label: "Out of Stock", count: stats.outOfStock },
  ];

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (!ids.length) return;
    try {
      if (action === "delete") await Promise.all(ids.map((id) => softDelete.mutateAsync(id)));
      if (action === "recover") await recover.mutateAsync({ ids });
      if (action === "destroy") await Promise.all(ids.map((id) => destroy.mutateAsync(id)));
      await query.refetch();
      await deletedQuery.refetch();
      setSelectedIds(new Set());
      toast.success(
        action === "recover" ? `${ids.length === 1 ? "Product" : `${ids.length} products`} recovered.`
          : action === "destroy" ? `${ids.length === 1 ? "Product" : `${ids.length} products`} permanently deleted.`
          : `${ids.length === 1 ? "Product" : `${ids.length} products`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (r: ProductRow) => (
        <div className="flex items-center gap-3">
          {r.image ? (
            <img src={r.image} alt={r.name} className="h-9 w-9 rounded-lg object-cover border border-[#e5e5ea] shrink-0" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7] text-[11px] font-semibold text-[#86868b] border border-[#e5e5ea]">
              {r.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{r.name}</div>
            <div className="text-xs text-gray-400">{r.slug}</div>
            {r.productType === "LIPSTICK" ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Lipstick
                </span>
                <span className="text-[11px] text-[#6e6e73]">
                  Variant image and try-on live in the variant editor
                </span>
              </div>
            ) : null}
          </div>
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
    { key: "createdAt", label: "Created", render: (r: ProductRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (r: ProductRow) => (
        isDeletedView ? (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => confirm.prompt("recover", [r.id])} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
              <RotateCcw size={11} /> Recover
            </button>
            <button type="button" onClick={() => confirm.prompt("destroy", [r.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
              <Trash2 size={11} /> Delete Permanently
            </button>
          </div>
        ) : (
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
              {canProductUpdate && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/products/${r.id}/edit`);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {canReviewView && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/products/${r.id}/reviews?name=${encodeURIComponent(r.name)}`);
                  }}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Reviews
                </DropdownMenuItem>
              )}
              {canFaqView && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/products/${r.id}/faqs`);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Manage FAQs
                </DropdownMenuItem>
              )}
              {canVariantView && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/product-variants?product=${encodeURIComponent(r.id)}&productName=${encodeURIComponent(r.name)}`);
                  }}
                >
                  <Boxes className="mr-2 h-4 w-4" />
                  Manage Variants
                </DropdownMenuItem>
              )}
              {canSeoView && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/dashboard/seo-metadata/create?entityType=PRODUCT&entityId=${encodeURIComponent(r.id)}&slug=${encodeURIComponent(r.slug)}`);
                  }}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  SEO
                </DropdownMenuItem>
              )}
              {canProductDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-[#b42318] focus:text-[#b42318]"
                    onClick={(event) => {
                      event.stopPropagation();
                      confirm.prompt("delete", [r.id]);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      ),
    },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Products" : "Products"}
      subtitle={isDeletedView ? "View soft-deleted products." : "All products in the catalog."}
      onBack={isDeletedView ? () => navigate("/dashboard/products") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/products/create") : undefined}
      newButtonLabel="New Product"
      actions={
        !isDeletedView && isSudoAdmin ? (
          <button type="button" onClick={() => navigate("/dashboard/products/deleted")} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]">
            <Trash2 size={13} strokeWidth={2} /> View Deleted
          </button>
        ) : undefined
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search products..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label="Total Products" value={stats.total} icon={Package} colorVariant="blue" />
          <StatCardV2 label="In Stock" value={stats.inStock} icon={Tag} colorVariant="emerald" />
          <StatCardV2 label="Low Stock" value={stats.lowStock} icon={AlertTriangle} colorVariant="amber" />
          <StatCardV2 label="Out of Stock" value={stats.outOfStock} icon={Layers} colorVariant="red" />
        </div>
      )}
      <DataTableV2
        tabs={!isDeletedView ? tabs : undefined}
        activeTab={!isDeletedView ? activeTab : undefined}
        onTabChange={!isDeletedView ? (t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); } : undefined}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        onRowClick={!isDeletedView ? (r) => navigate(`/dashboard/products/${r.id}`) : undefined}
        emptyMessage={(isDeletedView ? deletedQuery.isLoading : query.isLoading) ? "Loading products..." : isDeletedView ? "No deleted products." : "No products found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        rowId={(r) => r.id}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids)}
        bulkActions={(ids, _clear) => (
          <div className="flex items-center gap-2">
            {isDeletedView ? (
              <>
                <button
                  type="button"
                  onClick={() => confirm.prompt("recover", [...ids])}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <RotateCcw size={12} /> Recover ({ids.size})
                </button>
                <button
                  type="button"
                  onClick={() => confirm.prompt("destroy", [...ids])}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={12} /> Delete Permanently ({ids.size})
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => confirm.prompt("delete", [...ids])}
                className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
              >
                <Trash2 size={12} /> Delete ({ids.size})
              </button>
            )}
          </div>
        )}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover products?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete products?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover"
                ? `Recover ${confirm.ids.length === 1 ? "this product" : `${confirm.ids.length} products`}.`
                : confirm.action === "destroy"
                ? "This cannot be undone."
                : `Move ${confirm.ids.length === 1 ? "this product" : `${confirm.ids.length} products`} to trash.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm.action === "recover" ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700" : "rounded-full bg-red-600 text-white hover:bg-red-700"}
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "recover" ? "Recover" : confirm.action === "destroy" ? "Delete Permanently" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
