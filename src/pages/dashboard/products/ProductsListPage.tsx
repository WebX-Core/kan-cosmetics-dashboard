import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  FilePenLine,
  Package,
  PackagePlus,
  Tag,
  Layers,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  Boxes,
  Globe,
  Star,
  SlidersHorizontal,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { catalogApi } from "@/features/catalog";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { usePermission } from "@/shared/hooks/usePermission";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
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
import type { PublicationStatus } from "@/features/catalog/catalog.types";
import {
  PublicationStatusBadge,
  PublicationTabs,
  type PublicationView,
} from "@/shared/components/catalog/PublicationLifecycle";

const readPublicationStatus = (value: unknown): PublicationStatus =>
  value === "DRAFT" || value === "ARCHIVED" || value === "PUBLISHED"
    ? value
    : "PUBLISHED";

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
  status: PublicationStatus;
  publishedAt: string;
}>;

const fmtPrice = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(n);

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d);
};

const toRows = (payload: unknown): ReadonlyArray<ProductRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter(
      (i): i is Record<string, unknown> => typeof i === "object" && i !== null,
    )
    .map((item) => {
      const subcategory = (
        typeof item.subcategory === "object" && item.subcategory !== null
          ? item.subcategory
          : {}
      ) as Record<string, unknown>;
      const category = (
        typeof subcategory.category === "object" &&
        subcategory.category !== null
          ? subcategory.category
          : {}
      ) as Record<string, unknown>;
      return {
        id: text(item.id, crypto.randomUUID()),
        name: text(item.name ?? item.title, "Untitled Product"),
        slug: text(item.slug, ""),
        sku: text(item.sku, "—"),
        productType: text(item.productType, ""),
        image: text(
          item.coverImage ??
            item.mainImage ??
            item.image ??
            item.thumbnail ??
            item.imageUrl,
          "",
        ),
        price:
          toNumber(item.price) ??
          toNumber(item.basePrice) ??
          toNumber(item.sellingPrice) ??
          toNumber(item.mrp) ??
          0,
        stock: num(item.stock ?? item.totalStock),
        category: text(
          category.title ??
            category.name ??
            subcategory.title ??
            subcategory.name,
          "—",
        ),
        createdAt: text(item.createdAt, ""),
        status: readPublicationStatus(item.status),
        publishedAt: text(item.publishedAt, ""),
      };
    });
};

const getProductIdFromVariant = (value: unknown): string => {
  const row = (
    typeof value === "object" && value !== null ? value : {}
  ) as Record<string, unknown>;
  const direct = text(row.productId ?? row.product_id);
  if (direct) return direct;
  const product = (
    typeof row.product === "object" && row.product !== null ? row.product : {}
  ) as Record<string, unknown>;
  return text(product.id);
};

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const publicationView = (searchParams.get("status") ??
    "published") as PublicationView;
  const categoryId = searchParams.get("categoryId") ?? "";
  const subcategoryId = searchParams.get("subcategoryId") ?? "";
  const showAddProductButton = Boolean(categoryId && subcategoryId);

  const canProductUpdate = usePermission("product:update");
  const canProductDelete = usePermission("product:delete");
  const canReviewView = usePermission("review:view");
  const canFaqView = usePermission("faq:view");
  const canVariantView = usePermission("product-variant:view");
  const canSeoView = usePermission("seo:view");
  const canInventoryCreate = usePermission("inventory:create");
  const canInventoryUpdate = usePermission("inventory:update");
  const canInventoryManage = canInventoryCreate || canInventoryUpdate;
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const confirm = useConfirmAction();
  const returnPath = `${location.pathname}${location.search}`;

  const query = catalogApi.products.hooks.useList(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    publicationView === "published",
  );
  const draftQuery = catalogApi.products.hooks.useDraft(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    publicationView === "draft",
  );
  const archivedQuery = catalogApi.products.hooks.useArchived(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    publicationView === "archived",
  );
  const inventoryQuery = catalogApi.inventory.hooks.useList(
    { page: 1, limit: 1000 },
    canInventoryManage,
  );
  const variantsQuery = catalogApi.productVariants.hooks.useList(
    { page: 1, limit: 1000 },
    canInventoryManage,
  );
  const draftVariantsQuery = catalogApi.productVariants.hooks.useDraft(
    { page: 1, limit: 1000 },
    canInventoryManage,
  );
  const archivedVariantsQuery = catalogApi.productVariants.hooks.useArchived(
    { page: 1, limit: 1000 },
    canInventoryManage,
  );
  const softDelete = catalogApi.products.hooks.useSoftDelete();
  const updateProduct = catalogApi.products.hooks.useUpdate();

  const lifecycleQuery =
    publicationView === "draft"
      ? draftQuery
      : publicationView === "archived"
        ? archivedQuery
        : query;
  const sourceData = lifecycleQuery.data;
  const rows = React.useMemo(() => toRows(sourceData), [sourceData]);
  const totalPages =
    (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total =
    (sourceData as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (activeTab === "low-stock")
      return rows.filter((r) => r.stock > 0 && r.stock <= 5);
    if (activeTab === "out-of-stock") return rows.filter((r) => r.stock === 0);
    return rows;
  }, [rows, activeTab]);

  const stats = React.useMemo(
    () => ({
      total,
      inStock: rows.filter((r) => r.stock > 0).length,
      lowStock: rows.filter((r) => r.stock > 0 && r.stock <= 5).length,
      outOfStock: rows.filter((r) => r.stock === 0).length,
    }),
    [rows, total],
  );
  const productInventoryByProductId = React.useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    const source = (inventoryQuery.data?.data ?? []) as ReadonlyArray<
      Record<string, unknown>
    >;
    source.forEach((entry) => {
      const product = entry.product as Record<string, unknown> | undefined;
      const variant = entry.productVariant as
        | Record<string, unknown>
        | undefined;
      const productId = text(
        product?.id ?? entry.productId ?? entry.product_id,
      );
      const variantId = text(
        variant?.id ?? entry.productVariantId ?? entry.product_variant_id,
      );
      if (productId && !variantId) map.set(productId, entry);
    });
    return map;
  }, [inventoryQuery.data?.data]);
  const productIdsWithVariants = React.useMemo(() => {
    const ids = new Set<string>();
    [
      ...(variantsQuery.data?.data ?? []),
      ...(draftVariantsQuery.data?.data ?? []),
      ...(archivedVariantsQuery.data?.data ?? []),
    ].forEach((entry) => {
      const productId = getProductIdFromVariant(entry);
      if (productId) ids.add(productId);
    });
    return ids;
  }, [
    archivedVariantsQuery.data?.data,
    draftVariantsQuery.data?.data,
    variantsQuery.data?.data,
  ]);
  const navigateProductInventory = React.useCallback(
    (row: ProductRow) => {
      const existing = productInventoryByProductId.get(row.id);
      const encodedReturnPath = encodeURIComponent(returnPath);
      const existingId = typeof existing?.id === "string" ? existing.id : "";
      if (existingId) {
        navigate(
          `/dashboard/inventory/${encodeURIComponent(existingId)}?returnPath=${encodedReturnPath}`,
        );
        return;
      }
      navigate(
        `/dashboard/inventory/create?productId=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(
          row.name,
        )}&returnPath=${encodedReturnPath}`,
      );
    },
    [navigate, productInventoryByProductId, returnPath],
  );

  const tabs = [
    { key: "all", label: "All Products", count: total },
    { key: "low-stock", label: "Low Stock", count: stats.lowStock },
    { key: "out-of-stock", label: "Out of Stock", count: stats.outOfStock },
  ];

  const handleConfirm = async () => {
    const { ids } = confirm;
    if (!ids.length) return;
    try {
      await Promise.all(ids.map((id) => softDelete.mutateAsync(id)));
      await query.refetch();
      setSelectedIds(new Set());
      toast.success(
        `${ids.length === 1 ? "Product" : `${ids.length} products`} deleted.`,
      );
    } finally {
      confirm.dismiss();
    }
  };

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await updateProduct.mutateAsync({ id, dto: { status } });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      sortValue: (r: ProductRow) => r.name,
      render: (r: ProductRow) => (
        <div className="flex items-center gap-3">
          {r.image ? (
            <img
              src={r.image}
              alt={r.name}
              className="h-9 w-9 rounded-lg object-cover border border-[#e5e5ea] shrink-0"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7] text-[11px] font-semibold text-[#86868b] border border-[#e5e5ea]">
              {r.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{r.name}</div>
            <div className="text-xs text-gray-400">{r.slug}</div>
            {/* {r.productType === "LIPSTICK" ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700">
                  Lipstick
                </span>
                <span className="text-[11px] text-[#6e6e73]">
                  Variant image and try-on live in the variant editor
                </span>
              </div>
            ) : null} */}
          </div>
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      sortValue: (r: ProductRow) => r.sku,
      render: (r: ProductRow) => (
        <span className="font-mono text-xs text-gray-500">{r.sku}</span>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortValue: (r: ProductRow) => r.category,
      render: (r: ProductRow) => (
        <span className="text-gray-600">{r.category}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      sortValue: (r: ProductRow) => r.price,
      render: (r: ProductRow) => (
        <span className="font-medium text-gray-900">{fmtPrice(r.price)}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (r: ProductRow) => r.createdAt,
      render: (r: ProductRow) => (
        <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r: ProductRow) => r.status,
      render: (r: ProductRow) => <PublicationStatusBadge status={r.status} />,
    },
    {
      key: "inventory",
      label: "Inventory",
      render: (r: ProductRow) => {
        if (!canInventoryManage || productIdsWithVariants.has(r.id)) {
          return <span className="text-[#86868b]">—</span>;
        }

        const existing = productInventoryByProductId.get(r.id);
        const hasInventory =
          typeof existing?.id === "string" && existing.id.length > 0;

        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateProductInventory(r);
            }}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
          >
            {!hasInventory ? <PackagePlus size={12} /> : null}
            {hasInventory ? "Edit" : "Set"}
          </button>
        );
      },
    },
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
                  navigate(
                    `/dashboard/products/${r.id}/reviews?name=${encodeURIComponent(r.name)}`,
                  );
                }}
              >
                <Star className="mr-2 h-4 w-4" />
                Reviews
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(
                  `/dashboard/product-tags?productId=${encodeURIComponent(r.id)}&productName=${encodeURIComponent(r.name)}`,
                );
              }}
            >
              <Tag className="mr-2 h-4 w-4" />
              Edit Tags
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(
                  `/dashboard/product-attributes?productId=${encodeURIComponent(r.id)}&productName=${encodeURIComponent(r.name)}`,
                );
              }}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Edit Attributes
            </DropdownMenuItem>
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
                  navigate(
                    `/dashboard/product-variants?product=${encodeURIComponent(r.id)}&productName=${encodeURIComponent(r.name)}`,
                  );
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
                  navigate(
                    `/dashboard/seo-metadata/create?entityType=PRODUCT&entityId=${encodeURIComponent(r.id)}&slug=${encodeURIComponent(r.slug)}`,
                  );
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                SEO
              </DropdownMenuItem>
            )}
            {canProductUpdate ? <DropdownMenuSeparator /> : null}
            {canProductUpdate && r.status !== "PUBLISHED" ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  void changeStatus(r.id, "PUBLISHED");
                }}
              >
                <Globe className="mr-2 h-4 w-4" />
                Publish
              </DropdownMenuItem>
            ) : null}
            {canProductUpdate && r.status !== "DRAFT" ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  void changeStatus(r.id, "DRAFT");
                }}
              >
                <FilePenLine className="mr-2 h-4 w-4" />
                Move to Draft
              </DropdownMenuItem>
            ) : null}
            {canProductUpdate && r.status !== "ARCHIVED" ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  void changeStatus(r.id, "ARCHIVED");
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            ) : null}
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
      ),
    },
  ];

  return (
    <PageLayout
      title="Products"
      subtitle="All products in the catalog."
      onNew={
        showAddProductButton
          ? () =>
              navigate(
                `/dashboard/products/create?categoryId=${encodeURIComponent(categoryId)}&subcategoryId=${encodeURIComponent(subcategoryId)}&next=inventory`,
              )
          : undefined
      }
      newButtonLabel="Add Product"
      actions={
        <ExportMenu
          basePath="/product"
          params={{
            page: state.page,
            limit: state.limit,
            search: debouncedSearch || undefined,
            subcategory: subcategoryId || undefined,
          }}
          filename="products"
        />
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search products..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label={`${publicationView[0].toUpperCase()}${publicationView.slice(1)} Products`}
          value={stats.total}
          icon={Package}
          colorVariant="blue"
        />
        <StatCardV2
          label="In Stock"
          value={stats.inStock}
          icon={Tag}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Low Stock"
          value={stats.lowStock}
          icon={AlertTriangle}
          colorVariant="amber"
        />
        <StatCardV2
          label="Out of Stock"
          value={stats.outOfStock}
          icon={Layers}
          colorVariant="red"
        />
      </div>
      <DataTableV2
        toolbarLeading={
          <PublicationTabs
            value={publicationView}
            onChange={(status) => {
              const next = new URLSearchParams(location.search);
              next.set("status", status);
              navigate(`${location.pathname}?${next.toString()}`);
            }}
          />
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setState((p) => ({ ...p, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        onRowClick={(r) => navigate(`/dashboard/products/${r.id}`)}
        emptyMessage={
          lifecycleQuery.isLoading
            ? "Loading products..."
            : `No ${publicationView} products found.`
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((prev) => ({ ...prev, page: 1, limit: size }))}
        rowId={(r) => r.id}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids)}
        bulkActions={(ids) => (
          <button
            type="button"
            onClick={() => confirm.prompt("delete", [...ids])}
            className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={12} /> Delete ({ids.size})
          </button>
        )}
      />

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.dismiss()}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete products?</AlertDialogTitle>
            <AlertDialogDescription>
              Move{" "}
              {confirm.ids.length === 1
                ? "this product"
                : `${confirm.ids.length} products`}{" "}
              to trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              onClick={confirm.dismiss}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirm()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
