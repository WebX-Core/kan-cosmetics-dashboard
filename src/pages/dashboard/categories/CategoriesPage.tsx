import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Archive, FilePenLine, FolderTree, Tag, Layers, RotateCcw, Trash2, MoreHorizontal, Pencil, Globe } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { catalogApi, useCategoryList } from "@/features/catalog";
import type { PublicationStatus } from "@/features/catalog/catalog.types";
import { PublicationStatusBadge, PublicationTabs, type PublicationView } from "@/shared/components/catalog/PublicationLifecycle";
import { readPublicationStatus } from "@/shared/components/catalog/publicationLifecycle.utils";
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

type CategoryRow = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  subcategories: number;
  products: number;
  status: PublicationStatus;
  publishedAt: string;
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
const getCategoryIdFromSubcategory = (record: unknown): string => {
  const row = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const direct =
    (typeof row.categoryId === "string" ? row.categoryId : undefined) ??
    (typeof row.category_id === "string" ? row.category_id : undefined);
  if (direct) return direct;
  const nested = row.category;
  if (typeof nested === "object" && nested !== null) {
    const nestedId = (nested as Record<string, unknown>).id;
    return typeof nestedId === "string" ? nestedId : "";
  }
  return "";
};
const getCategoryIdFromProduct = (record: unknown): string => {
  const row = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const subcategory = row.subcategory;
  if (typeof subcategory !== "object" || subcategory === null) return "";
  const category = (subcategory as Record<string, unknown>).category;
  if (typeof category !== "object" || category === null) return "";
  const categoryId = (category as Record<string, unknown>).id;
  return typeof categoryId === "string" ? categoryId : "";
};

const toCategoryRow = (
  record: unknown,
  subcategoryCountMap: ReadonlyMap<string, number>,
  productCountMap: ReadonlyMap<string, number>
): CategoryRow => {
  const item = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const id = readString(item.id, crypto.randomUUID());
  return {
    id,
    name: readString(item.title ?? item.name, "Untitled Category"),
    slug: readString(item.slug, ""),
    description: readString(item.description, "—"),
    coverImage: readString(item.coverImage ?? item.image ?? item.thumbnail, ""),
    subcategories: subcategoryCountMap.get(id) ?? 0,
    products: productCountMap.get(id) ?? 0,
    status: readPublicationStatus(item.status),
    publishedAt: readString(item.publishedAt),
    createdAt: readString(item.createdAt, "—"),
  };
};

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isDeletedView = location.pathname === "/dashboard/categories/deleted";
  const publicationView = (new URLSearchParams(location.search).get("status") ?? "published") as PublicationView;
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<null | "delete" | "recover" | "destroy">(null);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const categoriesQuery = useCategoryList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView && publicationView === "published"
  );
  const draftCategoriesQuery = catalogApi.categories.hooks.useDraft(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView && publicationView === "draft"
  );
  const archivedCategoriesQuery = catalogApi.categories.hooks.useArchived(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView && publicationView === "archived"
  );
  const deletedCategoriesQuery = catalogApi.categories.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView
  );
  const softDeleteCategory = catalogApi.categories.hooks.useSoftDelete();
  const recoverCategory = catalogApi.categories.hooks.useRecover();
  const destroyCategory = catalogApi.categories.hooks.useDestroy();
  const updateCategory = catalogApi.categories.hooks.useUpdate();
  const subcategoriesQuery = catalogApi.subcategories.hooks.useList({ page: 1, limit: 1000 }, true);
  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 }, true);

  const subcategoryCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const rows = subcategoriesQuery.data?.data ?? [];
    rows.forEach((row) => {
      const categoryId = getCategoryIdFromSubcategory(row);
      if (!categoryId) return;
      map.set(categoryId, (map.get(categoryId) ?? 0) + 1);
    });
    return map;
  }, [subcategoriesQuery.data?.data]);

  const productCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const rows = productsQuery.data?.data ?? [];
    rows.forEach((row) => {
      const categoryId = getCategoryIdFromProduct(row);
      if (!categoryId) return;
      map.set(categoryId, (map.get(categoryId) ?? 0) + 1);
    });
    return map;
  }, [productsQuery.data?.data]);

  const lifecycleQuery = publicationView === "draft" ? draftCategoriesQuery : publicationView === "archived" ? archivedCategoriesQuery : categoriesQuery;
  const sourceRows = isDeletedView ? deletedCategoriesQuery.data?.data : lifecycleQuery.data?.data;
  const rows = React.useMemo(
    () => (sourceRows ?? []).map((row) => toCategoryRow(row, subcategoryCountMap, productCountMap)),
    [sourceRows, subcategoryCountMap, productCountMap]
  );
  const totalPages = (isDeletedView ? deletedCategoriesQuery.data?.totalPages : lifecycleQuery.data?.totalPages) ?? 1;
  const totalCategories = (isDeletedView ? deletedCategoriesQuery.data?.total : lifecycleQuery.data?.total) ?? rows.length;

  const stats = React.useMemo(() => ({
    total: totalCategories,
    active: rows.filter((c) => c.status === "PUBLISHED").length,
    totalSubcategories: rows.reduce((sum, c) => sum + c.subcategories, 0),
    totalProducts: rows.reduce((sum, c) => sum + c.products, 0),
  }), [rows, totalCategories]);

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
      await softDeleteCategory.mutateAsync(pendingIds.join(","));
    }
    if (pendingAction === "recover") {
      await recoverCategory.mutateAsync({ ids: pendingIds });
    }
    if (pendingAction === "destroy") {
      await destroyCategory.mutateAsync(pendingIds.join(","));
    }
    await categoriesQuery.refetch();
    await deletedCategoriesQuery.refetch();
    setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    const count = pendingIds.length;
    toast.success(
      pendingAction === "delete"
        ? count === 1
          ? "Category deleted."
          : `${count} categories deleted.`
        : pendingAction === "recover"
        ? count === 1
          ? "Category recovered."
          : `${count} categories recovered.`
        : count === 1
        ? "Category permanently deleted."
        : `${count} categories permanently deleted.`
    );
    setConfirmOpen(false);
    setPendingAction(null);
    setPendingIds([]);
  };

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await updateCategory.mutateAsync({ id, dto: { status } });
    setSelectedIds((prev) => prev.filter((entry) => entry !== id));
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all categories"
        />
      ),
      render: (row: CategoryRow) => (
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
    { key: "name", label: "Category", render: (row: CategoryRow) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
          {row.coverImage ? (
            <img src={row.coverImage} alt={row.name} className="max-h-8 w-auto object-contain" />
          ) : (
            <FolderTree size={14} className="text-blue-500" />
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-400">{row.slug}</div>
        </div>
      </div>
    )},
    { key: "description", label: "Description", render: (row: CategoryRow) => (
      <span className="text-gray-600 line-clamp-1">{row.description}</span>
    )},
    { key: "subcategories", label: "Subcategories", render: (row: CategoryRow) => (
      <span className="font-medium text-gray-900">{row.subcategories}</span>
    )},
    { key: "products", label: "Products", render: (row: CategoryRow) => (
      <span className="font-medium text-gray-900">{row.products}</span>
    )},
    { key: "status", label: "Status", render: (row: CategoryRow) => <PublicationStatusBadge status={row.status} /> },
    { key: "publishedAt", label: "Published", render: (row: CategoryRow) => <span className="text-gray-500 text-xs">{formatDateTime(row.publishedAt)}</span> },
    { key: "createdAt", label: "Created", render: (row: CategoryRow) => (
      <span className="text-gray-500 text-xs">{formatDateTime(row.createdAt)}</span>
    )},
    {
      key: "rowActions",
      label: "Actions",
      render: (row: CategoryRow) => (
        isDeletedView ? (
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
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/categories/${row.id}/edit`); }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/seo-metadata/create?entityType=CATEGORY&entityId=${encodeURIComponent(row.id)}&slug=${encodeURIComponent(row.slug)}`); }}>
                <Globe className="mr-2 h-4 w-4" /> SEO
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status !== "PUBLISHED" ? <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "PUBLISHED"); }}><Globe className="mr-2 h-4 w-4" />Publish</DropdownMenuItem> : null}
              {row.status !== "DRAFT" ? <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "DRAFT"); }}><FilePenLine className="mr-2 h-4 w-4" />Move to Draft</DropdownMenuItem> : null}
              {row.status !== "ARCHIVED" ? <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "ARCHIVED"); }}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem> : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[#b42318] focus:text-[#b42318]"
                onClick={(e) => { e.stopPropagation(); openConfirm("delete", [row.id]); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      ),
    },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Categories" : "Categories"}
      subtitle={
        isDeletedView
          ? "View soft-deleted categories."
          : "Manage product categories and catalog structure."
      }
      onBack={isDeletedView ? () => navigate("/dashboard/categories") : undefined}
      onNew={!isDeletedView ? () => navigate("/dashboard/categories/create") : undefined}
      newButtonLabel="New Category"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search categories..."
    >
      {!isDeletedView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardV2 label={`${publicationView[0].toUpperCase()}${publicationView.slice(1)} Categories`} value={stats.total} icon={FolderTree} colorVariant="blue" />
          <StatCardV2 label="Published on this page" value={stats.active} icon={Tag} colorVariant="emerald" />
          <StatCardV2 label="Subcategories" value={stats.totalSubcategories} icon={Layers} colorVariant="blue" />
          <StatCardV2 label="Total Products" value={stats.totalProducts} icon={Tag} colorVariant="cyan" />
        </div>
      ) : null}
      <DataTableV2
        toolbarLeading={!isDeletedView ? <PublicationTabs value={publicationView} onChange={(status) => navigate(`/dashboard/categories?status=${status}`)} /> : undefined}
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
        onRowClick={!isDeletedView ? (row) => navigate(`/dashboard/categories/${row.id}`) : undefined}
        emptyMessage={
          (isDeletedView ? deletedCategoriesQuery.isLoading : lifecycleQuery.isLoading)
            ? "Loading categories..."
            : isDeletedView
            ? "No deleted categories found."
            : "No categories found."
        }
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? "Recover categories?"
                  : "Recover category?"
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? "Delete categories permanently?"
                  : "Delete category permanently?"
                : pendingIds.length > 1
                ? "Delete categories?"
                : "Delete category?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? `This will recover ${pendingIds.length} categories.`
                  : "This will recover this category."
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? `This will permanently delete ${pendingIds.length} categories. This cannot be undone.`
                  : "This will permanently delete this category. This cannot be undone."
                : pendingIds.length > 1
                ? `This permanently deletes ${pendingIds.length} categories and cannot be undone.`
                : "This permanently deletes this category and cannot be undone."}
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
              {pendingAction === "recover" ? "Recover" : pendingAction === "destroy" ? "Delete Permanently" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
