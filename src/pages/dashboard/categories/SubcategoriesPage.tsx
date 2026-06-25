import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FolderTree, Layers, RotateCcw, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { catalogApi } from "@/features/catalog";
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

type SubcategoryRow = Readonly<{
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  products: number;
  status: "Active" | "Inactive";
  createdAt: string;
}>;

const readString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
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
  if (typeof nested === "object" && nested !== null) {
    const nestedId = (nested as Record<string, unknown>).id;
    return typeof nestedId === "string" ? nestedId : "";
  }
  return "";
};

const toSubcategoryRow = (
  record: unknown,
  productCountMap: ReadonlyMap<string, number>
): SubcategoryRow => {
  const item = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const id = readString(item.id, crypto.randomUUID());
  const category = (typeof item.category === "object" && item.category !== null
    ? item.category
    : {}) as Record<string, unknown>;
  const isDeleted = item.isDeleted === true;

  return {
    id,
    categoryId: readString(category.id),
    categoryName: readString(category.title ?? category.name, "—"),
    name: readString(item.title ?? item.name, "Untitled Subcategory"),
    slug: readString(item.slug),
    description: readString(item.description, "—"),
    coverImage: readString(item.coverImage ?? item.image ?? item.thumbnail),
    products: productCountMap.get(id) ?? 0,
    status: isDeleted ? "Inactive" : "Active",
    createdAt: readString(item.createdAt, "—"),
  };
};

export const SubcategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const userRole = useUserStore((state) => state.user?.role ?? null);
  const isSudoAdmin = userRole === "SUDOADMIN";
  const isDeletedView = location.pathname === "/dashboard/subcategories/deleted";

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<null | "delete" | "recover" | "destroy">(null);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const subcategoriesQuery = catalogApi.subcategories.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView
  );
  const deletedSubcategoriesQuery = catalogApi.subcategories.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView
  );

  const softDeleteSubcategory = catalogApi.subcategories.hooks.useSoftDelete();
  const recoverSubcategory = catalogApi.subcategories.hooks.useRecover();
  const destroySubcategory = catalogApi.subcategories.hooks.useDestroy();

  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 }, true);

  const productCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const rows = productsQuery.data?.data ?? [];
    rows.forEach((row) => {
      const subcategoryId = getSubcategoryIdFromProduct(row);
      if (!subcategoryId) return;
      map.set(subcategoryId, (map.get(subcategoryId) ?? 0) + 1);
    });
    return map;
  }, [productsQuery.data?.data]);

  const sourceRows = isDeletedView
    ? deletedSubcategoriesQuery.data?.data
    : subcategoriesQuery.data?.data;

  const rows = React.useMemo(
    () => (sourceRows ?? []).map((row) => toSubcategoryRow(row, productCountMap)),
    [sourceRows, productCountMap]
  );

  const totalPages =
    (isDeletedView
      ? deletedSubcategoriesQuery.data?.totalPages
      : subcategoriesQuery.data?.totalPages) ?? 1;
  const totalSubcategories =
    (isDeletedView ? deletedSubcategoriesQuery.data?.total : subcategoriesQuery.data?.total) ??
    rows.length;

  const stats = React.useMemo(
    () => ({
      total: totalSubcategories,
      active: rows.filter((row) => row.status === "Active").length,
      totalProducts: rows.reduce((sum, row) => sum + row.products, 0),
      totalCategories: new Set(rows.map((row) => row.categoryId).filter(Boolean)).size,
    }),
    [rows, totalSubcategories]
  );

  const allVisibleIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const isAllVisibleSelected = React.useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id)),
    [allVisibleIds, selectedIds]
  );

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id)
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) {
        return prev.filter((id) => !allVisibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...allVisibleIds]));
    });
  };

  const openConfirm = (
    action: "delete" | "recover" | "destroy",
    ids: ReadonlyArray<string>
  ) => {
    if (!ids.length) return;
    setPendingAction(action);
    setPendingIds(ids);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction || !pendingIds.length) return;

    if (pendingAction === "delete") {
      await softDeleteSubcategory.mutateAsync(pendingIds.join(","));
    }
    if (pendingAction === "recover") {
      await recoverSubcategory.mutateAsync({ ids: pendingIds });
    }
    if (pendingAction === "destroy") {
      await destroySubcategory.mutateAsync(pendingIds.join(","));
    }

    await subcategoriesQuery.refetch();
    await deletedSubcategoriesQuery.refetch();

    setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    const count = pendingIds.length;
    toast.success(
      pendingAction === "delete"
        ? count === 1
          ? "Subcategory deleted."
          : `${count} subcategories deleted.`
        : pendingAction === "recover"
        ? count === 1
          ? "Subcategory recovered."
          : `${count} subcategories recovered.`
        : count === 1
        ? "Subcategory permanently deleted."
        : `${count} subcategories permanently deleted.`
    );

    setConfirmOpen(false);
    setPendingAction(null);
    setPendingIds([]);
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all subcategories"
        />
      ),
      render: (row: SubcategoryRow) => (
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
      label: "Subcategory",
      render: (row: SubcategoryRow) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
            {row.coverImage ? (
              <img src={row.coverImage} alt={row.name} className="max-h-8 w-auto object-contain" />
            ) : (
              <ShoppingBag size={14} className="text-blue-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-400">{row.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "categoryName",
      label: "Category",
      render: (row: SubcategoryRow) => <span className="text-gray-700">{row.categoryName}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (row: SubcategoryRow) => (
        <span className="line-clamp-1 text-gray-600">{row.description}</span>
      ),
    },
    {
      key: "products",
      label: "Products",
      render: (row: SubcategoryRow) => <span className="font-medium text-gray-900">{row.products}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row: SubcategoryRow) => (
        <span className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</span>
      ),
    },
    ...(isDeletedView
      ? [
          {
            key: "rowActions",
            label: "Actions",
            render: (row: SubcategoryRow) => (
              <div
                className="flex items-center justify-end gap-2"
                onClick={(event) => event.stopPropagation()}
              >
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
      : []),
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Subcategories" : "Subcategories"}
      subtitle={
        isDeletedView
          ? "View soft-deleted subcategories."
          : "Manage product subcategories and hierarchy."
      }
      onBack={isDeletedView ? () => navigate("/dashboard/subcategories") : undefined}
      actions={
        !isDeletedView && isSudoAdmin ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard/subcategories/deleted")}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Trash2 size={13} strokeWidth={2} />
            View Deleted
          </button>
        ) : undefined
      }
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search subcategories..."
    >
      {!isDeletedView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label="Total Subcategories" value={stats.total} icon={ShoppingBag} colorVariant="blue" />
          <StatCardV2 label="Active" value={stats.active} icon={Tag} colorVariant="emerald" />
          <StatCardV2 label="Products" value={stats.totalProducts} icon={Layers} colorVariant="blue" />
          <StatCardV2 label="Categories" value={stats.totalCategories} icon={FolderTree} colorVariant="cyan" />
        </div>
      ) : null}

      <DataTableV2
        columns={columns}
        data={rows}
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
            ? (row) =>
                navigate(`/dashboard/categories/${row.categoryId}/subcategories/${row.id}`)
            : undefined
        }
        onEdit={
          !isDeletedView
            ? (row) =>
                navigate(`/dashboard/categories/${row.categoryId}/subcategories/${row.id}/edit`)
            : undefined
        }
        onDelete={!isDeletedView ? (row) => openConfirm("delete", [row.id]) : undefined}
        emptyMessage={
          (isDeletedView ? deletedSubcategoriesQuery.isLoading : subcategoriesQuery.isLoading)
            ? "Loading subcategories..."
            : isDeletedView
            ? "No deleted subcategories found."
            : "No subcategories found."
        }
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? "Recover subcategories?"
                  : "Recover subcategory?"
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? "Delete subcategories permanently?"
                  : "Delete subcategory permanently?"
                : pendingIds.length > 1
                ? "Delete subcategories?"
                : "Delete subcategory?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? `This will recover ${pendingIds.length} subcategories.`
                  : "This will recover this subcategory."
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? `This will permanently delete ${pendingIds.length} subcategories. This cannot be undone.`
                  : "This will permanently delete this subcategory. This cannot be undone."
                : pendingIds.length > 1
                ? `This will move ${pendingIds.length} subcategories to trash.`
                : "This will move this subcategory to trash."}
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
