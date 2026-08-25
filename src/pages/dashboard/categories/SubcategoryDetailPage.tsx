import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit2, Package, PackagePlus, Plus, Trash2, Layers, CheckCircle, XCircle, MoreHorizontal, Pencil, MessageSquare, Boxes, Star, Tag, SlidersHorizontal } from "lucide-react";
import { catalogApi } from "@/features/catalog";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
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
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { PublicationTabs, type PublicationView } from "@/shared/components/catalog/PublicationLifecycle";

type ProductRow = Readonly<{
  id: string;
  identifier: string;
  subcategoryId: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  coverImage: string;
  status: "Active" | "Inactive";
  createdAt: string;
}>;

const toText = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const formatDateTime = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getSubcategoryIdFromProduct = (record: unknown): string => {
  const row = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const direct =
    (typeof row.subcategoryId === "string" ? row.subcategoryId : undefined) ??
    (typeof row.subcategory_id === "string" ? row.subcategory_id : undefined);
  if (direct) return direct;
  const nested = row.subcategory;
  if (typeof nested !== "object" || nested === null) return "";
  return toText((nested as Record<string, unknown>).id);
};

const toProductRow = (value: unknown): ProductRow => {
  const item = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    id: toText(item.id),
    identifier: toText(item.id ?? item.slug),
    subcategoryId: getSubcategoryIdFromProduct(item),
    name: toText(item.name ?? item.title, "Untitled Product"),
    slug: toText(item.slug),
    sku: toText(item.sku, "—"),
    price: toText(item.salePrice ?? item.price, "0"),
    coverImage: toText(item.coverImage ?? item.image ?? item.thumbnail, ""),
    status: item.isDeleted === true ? "Inactive" : "Active",
    createdAt: toText(item.createdAt ?? item.created_at),
  };
};

const getProductIdFromVariant = (value: unknown): string => {
  const row = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const direct = toText(row.productId ?? row.product_id);
  if (direct) return direct;
  const product = (typeof row.product === "object" && row.product !== null ? row.product : {}) as Record<string, unknown>;
  return toText(product.id);
};

export const SubcategoryDetailPage: React.FC = () => {
  const { id: categoryId, subcategoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const publicationView = (new URLSearchParams(location.search).get("status") ?? "published") as PublicationView;
  const returnPath = location.pathname;

  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const subcategoryQuery = catalogApi.subcategories.hooks.useGet(subcategoryId);
  const productsQuery = catalogApi.products.hooks.useList(
    { subcategory: subcategoryId, limit: 100 },
    Boolean(subcategoryId) && publicationView === "published"
  );
  const draftProductsQuery = catalogApi.products.hooks.useDraft(
    { subcategory: subcategoryId, limit: 100 },
    Boolean(subcategoryId) && publicationView === "draft"
  );
  const archivedProductsQuery = catalogApi.products.hooks.useArchived(
    { subcategory: subcategoryId, limit: 100 },
    Boolean(subcategoryId) && publicationView === "archived"
  );
  // Full-set fetches for per-product stock/variant lookup maps — backend
  // inventory/variant list endpoints filter by a single productId, not a
  // batch, so this can't be scoped to just the current page's products.
  const inventoryQuery = catalogApi.inventory.hooks.useList({ page: 1, limit: 1000 }, true);
  const publishedVariantsQuery = catalogApi.productVariants.hooks.useList({ page: 1, limit: 1000 }, true);

  const softDeleteProduct = catalogApi.products.hooks.useSoftDelete();

  const subcategory = subcategoryQuery.data as Record<string, unknown> | undefined;
  const subcategoryName = toText(subcategory?.title ?? subcategory?.name, "Subcategory");

  const sourceRows = React.useMemo(() => {
    const lifecycleData = publicationView === "draft"
      ? draftProductsQuery.data?.data
      : publicationView === "archived"
        ? archivedProductsQuery.data?.data
        : productsQuery.data?.data;
    return (lifecycleData ?? []).filter((entry) => getSubcategoryIdFromProduct(entry) === subcategoryId);
  }, [archivedProductsQuery.data?.data, draftProductsQuery.data?.data, productsQuery.data?.data, publicationView, subcategoryId]);

  const rows = React.useMemo(() => sourceRows.map(toProductRow), [sourceRows]);

  const filteredRows = React.useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.name} ${row.sku}`.toLowerCase().includes(needle));
  }, [rows, debouncedSearch]);
  const stats = React.useMemo(
    () => ({
      total: filteredRows.length,
      active: filteredRows.filter((row) => row.status === "Active").length,
      inactive: filteredRows.filter((row) => row.status === "Inactive").length,
      withImage: filteredRows.filter((row) => Boolean(row.coverImage)).length,
    }),
    [filteredRows],
  );
  const productInventoryByProductId = React.useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    const source = (inventoryQuery.data?.data ?? []) as ReadonlyArray<Record<string, unknown>>;
    source.forEach((entry) => {
      const product = entry.product as Record<string, unknown> | undefined;
      const variant = entry.productVariant as Record<string, unknown> | undefined;
      const productId = typeof product?.id === "string" ? product.id : "";
      const variantId = typeof variant?.id === "string" ? variant.id : "";
      if (productId && !variantId) map.set(productId, entry);
    });
    return map;
  }, [inventoryQuery.data?.data]);
  const productIdsWithVariants = React.useMemo(() => {
    const ids = new Set<string>();
    (publishedVariantsQuery.data?.data ?? []).forEach((entry) => {
      const productId = getProductIdFromVariant(entry);
      if (productId) ids.add(productId);
    });
    return ids;
  }, [publishedVariantsQuery.data?.data]);
  const navigateProductInventory = React.useCallback(
    (row: ProductRow) => {
      const existing = productInventoryByProductId.get(row.id);
      const encodedReturnPath = encodeURIComponent(returnPath);
      const existingId = typeof existing?.id === "string" ? existing.id : "";
      if (existingId) {
        navigate(`/dashboard/inventory/${encodeURIComponent(existingId)}?returnPath=${encodedReturnPath}`);
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

  const allVisibleIds = React.useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
  const isAllVisibleSelected = React.useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every((entry) => selectedIds.includes(entry)),
    [allVisibleIds, selectedIds]
  );

  const toggleSelectOne = (productId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(productId) ? prev : [...prev, productId]) : prev.filter((entry) => entry !== productId)
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !allVisibleIds.includes(entry));
      return Array.from(new Set([...prev, ...allVisibleIds]));
    });
  };

  const openConfirm = (ids: ReadonlyArray<string>) => {
    if (!ids.length) return;
    setPendingIds(ids);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingIds.length) return;

    try {
      await Promise.all(pendingIds.map((entry) => softDeleteProduct.mutateAsync(entry)));
      await productsQuery.refetch();
      setSelectedIds((prev) => prev.filter((entry) => !pendingIds.includes(entry)));

      toast.success(
        pendingIds.length === 1
          ? "Product deleted."
          : `${pendingIds.length} products deleted.`
      );
    } catch {
      toast.error("Action failed.");
    } finally {
      setConfirmOpen(false);
      setPendingIds([]);
    }
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all products"
        />
      ),
      render: (row: ProductRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.id, event.target.checked)}
          aria-label={`Select ${row.name}`}
        />
      ),
      width: "44px",
    },
    {
      key: "name",
      label: "Product",
      sortValue: (row: ProductRow) => row.name,
      render: (row: ProductRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
            {row.coverImage ? (
              <img src={row.coverImage} alt={row.name} className="max-h-9 w-auto object-contain" />
            ) : (
              <Package size={16} className="text-gray-300" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-400">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      sortValue: (row: ProductRow) => Number(row.price) || 0,
      render: (row: ProductRow) => <span className="font-medium text-gray-900">Rs {row.price}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row: ProductRow) => row.status,
      render: (row: ProductRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (row: ProductRow) => row.createdAt,
      render: (row: ProductRow) => <span className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "inventory",
      label: "Inventory",
      render: (row: ProductRow) => {
        if (productIdsWithVariants.has(row.id)) {
          return <span className="text-[#86868b]">—</span>;
        }

        const existing = productInventoryByProductId.get(row.id);
        const hasInventory = typeof existing?.id === "string" && existing.id.length > 0;

        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateProductInventory(row);
            }}
            className="inline-flex h-[28px] items-center gap-1 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
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
      render: (row: ProductRow) => (
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
                const identifier = row.identifier || row.id;
                if (!identifier) return;
                navigate(`/dashboard/products/${encodeURIComponent(identifier)}/edit?returnPath=${encodeURIComponent(returnPath)}`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/products/${row.id}/reviews?name=${encodeURIComponent(row.name)}`);
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              Reviews
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/product-tags?productId=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(row.name)}`);
              }}
            >
              <Tag className="mr-2 h-4 w-4" />
              Edit Tags
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/product-attributes?productId=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(row.name)}`);
              }}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Edit Attributes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/dashboard/products/${row.id}/faqs`);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Manage FAQs
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                navigate(
                  `/dashboard/product-variants?product=${encodeURIComponent(row.id)}&productName=${encodeURIComponent(row.name)}&returnPath=${encodeURIComponent(returnPath)}`
                );
              }}
            >
              <Boxes className="mr-2 h-4 w-4" />
              Manage Variants
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={(event) => {
                event.stopPropagation();
                openConfirm([row.id]);
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
      title={subcategoryName}
      subtitle="Manage products in this subcategory."
      onBack={() => navigate(`/dashboard/categories/${categoryId}`)}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/dashboard/products/create?categoryId=${encodeURIComponent(categoryId ?? "")}&subcategoryId=${encodeURIComponent(subcategoryId ?? "")}&next=inventory`
              )
            }
            className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            <Plus size={13} strokeWidth={2} />
            Add Product
          </button>
          <button
            type="button"
            onClick={() => navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}/edit`)}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Edit2 size={13} strokeWidth={2} />
            Edit Subcategory
          </button>
        </div>
      }
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search products..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Products" value={stats.total} icon={Package} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactive} icon={XCircle} colorVariant="red" />
        <StatCardV2 label="With Cover Image" value={stats.withImage} icon={Layers} colorVariant="cyan" />
      </div>

      <DataTableV2
        toolbarLeading={<PublicationTabs value={publicationView} onChange={(status) => navigate(`${location.pathname}?status=${status}`)} />}
        columns={columns}
        data={filteredRows}
        actions={
          selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => openConfirm(selectedIds)}
              className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              <Trash2 size={12} />
              Delete ({selectedIds.length})
            </button>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={(row) => {
          const identifier = row.identifier || row.id;
          if (!identifier) return;
          navigate(
            `/dashboard/products/${encodeURIComponent(identifier)}?returnPath=${encodeURIComponent(returnPath)}`
          );
        }}
        emptyMessage={
          (publicationView === "draft"
            ? draftProductsQuery.isLoading
            : publicationView === "archived"
              ? archivedProductsQuery.isLoading
              : productsQuery.isLoading)
            ? "Loading products..."
            : "No products found."
        }
        showPagination={false}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingIds.length > 1 ? "Delete products?" : "Delete product?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIds.length > 1
                ? `This permanently deletes ${pendingIds.length} products and cannot be undone.`
                : "This permanently deletes this product and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void handleConfirmAction()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
