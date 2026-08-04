import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit2, Package, Plus, RotateCcw, Trash2, Layers, CheckCircle, XCircle, MoreHorizontal, Pencil, MessageSquare, Boxes, Star, Tag, SlidersHorizontal } from "lucide-react";
import { catalogApi } from "@/features/catalog";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useUserStore } from "@/store/UserStore";
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

export const SubcategoryDetailPage: React.FC = () => {
  const { id: categoryId, subcategoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const userRole = useUserStore((state) => state.user?.role ?? null);
  const isSudoAdmin = userRole === "SUDOADMIN";
  const isDeletedView = location.pathname.endsWith("/deleted-products");
  const returnPath = location.pathname;

  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<null | "delete" | "recover" | "destroy">(null);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const subcategoryQuery = catalogApi.subcategories.hooks.useGet(subcategoryId);
  const productsQuery = catalogApi.products.hooks.useList(
    { subcategory: subcategoryId, limit: 100 },
    !isDeletedView && Boolean(subcategoryId)
  );
  const deletedProductsQuery = catalogApi.products.hooks.useDeleted(
    { page: 1, limit: 1000 },
    isDeletedView
  );

  const softDeleteProduct = catalogApi.products.hooks.useSoftDelete();
  const recoverProduct = catalogApi.products.hooks.useRecover();
  const destroyProduct = catalogApi.products.hooks.useDestroy();

  const subcategory = subcategoryQuery.data as Record<string, unknown> | undefined;
  const subcategoryName = toText(subcategory?.title ?? subcategory?.name, "Subcategory");

  const sourceRows = React.useMemo(() => {
    if (!isDeletedView) return productsQuery.data?.data ?? [];
    const deletedRows = deletedProductsQuery.data?.data ?? [];
    return deletedRows.filter((entry) => getSubcategoryIdFromProduct(entry) === subcategoryId);
  }, [isDeletedView, productsQuery.data?.data, deletedProductsQuery.data?.data, subcategoryId]);

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

  const openConfirm = (action: "delete" | "recover" | "destroy", ids: ReadonlyArray<string>) => {
    if (!ids.length) return;
    setPendingAction(action);
    setPendingIds(ids);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || !pendingIds.length) return;

    try {
      if (pendingAction === "delete") {
        await Promise.all(pendingIds.map((entry) => softDeleteProduct.mutateAsync(entry)));
      }
      if (pendingAction === "recover") {
        await recoverProduct.mutateAsync({ ids: pendingIds });
      }
      if (pendingAction === "destroy") {
        await Promise.all(pendingIds.map((entry) => destroyProduct.mutateAsync(entry)));
      }

      await productsQuery.refetch();
      await deletedProductsQuery.refetch();
      setSelectedIds((prev) => prev.filter((entry) => !pendingIds.includes(entry)));

      toast.success(
        pendingAction === "delete"
          ? pendingIds.length === 1
            ? "Product deleted."
            : `${pendingIds.length} products deleted.`
          : pendingAction === "recover"
          ? pendingIds.length === 1
            ? "Product recovered."
            : `${pendingIds.length} products recovered.`
          : pendingIds.length === 1
          ? "Product permanently deleted."
          : `${pendingIds.length} products permanently deleted.`
      );
    } catch {
      toast.error("Action failed.");
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
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
      render: (row: ProductRow) => <span className="font-medium text-gray-900">Rs {row.price}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row: ProductRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row: ProductRow) => <span className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</span>,
    },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (row: ProductRow) => (
              <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openConfirm("recover", [row.id])}
                  className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <RotateCcw size={11} />
                  Recover
                </button>
                <button
                  type="button"
                  onClick={() => openConfirm("destroy", [row.id])}
                  className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={11} />
                  Delete Permanently
                </button>
              </div>
            ),
          },
        ]
      : [
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
                      openConfirm("delete", [row.id]);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]),
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={subcategoryName}
      subtitle={isDeletedView ? "View deleted products in this subcategory." : "Manage products in this subcategory."}
      onBack={() => navigate(isDeletedView ? `/dashboard/categories/${categoryId}/subcategories/${subcategoryId}` : `/dashboard/categories/${categoryId}`)}
      actions={
        <div className="flex items-center gap-2">
          {!isDeletedView ? (
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
          ) : null}
          {!isDeletedView && isSudoAdmin ? (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}/deleted-products`)}
              className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              <Trash2 size={13} strokeWidth={2} />
              View Deleted
            </button>
          ) : null}
          {!isDeletedView ? (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}/edit`)}
              className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              <Edit2 size={13} strokeWidth={2} />
              Edit Subcategory
            </button>
          ) : null}
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
        columns={columns}
        data={filteredRows}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              {isDeletedView ? (
                <>
                  <button
                    type="button"
                    onClick={() => openConfirm("recover", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <RotateCcw size={12} />
                    Recover ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openConfirm("destroy", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Trash2 size={12} />
                    Delete Permanently ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openConfirm("delete", selectedIds)}
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  <Trash2 size={12} />
                  Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={
          !isDeletedView
            ? (row) => {
                const identifier = row.identifier || row.id;
                if (!identifier) return;
                navigate(
                  `/dashboard/products/${encodeURIComponent(identifier)}?returnPath=${encodeURIComponent(returnPath)}`
                );
              }
            : undefined
        }
        emptyMessage={
          (isDeletedView ? deletedProductsQuery.isLoading : productsQuery.isLoading)
            ? "Loading products..."
            : isDeletedView
            ? "No deleted products found."
            : "No products found."
        }
        showPagination={false}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? "Recover products?"
                  : "Recover product?"
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? "Delete products permanently?"
                  : "Delete product permanently?"
                : pendingIds.length > 1
                ? "Delete products?"
                : "Delete product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? `This will recover ${pendingIds.length} products.`
                  : "This will recover this product."
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? `This will permanently delete ${pendingIds.length} products. This cannot be undone.`
                  : "This will permanently delete this product. This cannot be undone."
                : pendingIds.length > 1
                ? `This will move ${pendingIds.length} products to trash.`
                : "This will move this product to trash."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction === "recover"
                  ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  : "rounded-full bg-red-600 text-white hover:bg-red-700"
              }
              onClick={() => void handleConfirmAction()}
            >
              {pendingAction === "recover"
                ? "Recover"
                : pendingAction === "destroy"
                ? "Delete Permanently"
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
