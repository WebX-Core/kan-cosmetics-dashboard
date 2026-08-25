import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Archive, FilePenLine, FolderTree, Globe2, Layers, MoreHorizontal, Pencil, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { catalogApi } from "@/features/catalog";
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

type SubcategoryRow = Readonly<{
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
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

  return {
    id,
    categoryId: readString(category.id),
    categoryName: readString(category.title ?? category.name, "—"),
    name: readString(item.title ?? item.name, "Untitled Subcategory"),
    slug: readString(item.slug),
    description: readString(item.description, "—"),
    coverImage: readString(item.coverImage ?? item.image ?? item.thumbnail),
    products: productCountMap.get(id) ?? 0,
    status: readPublicationStatus(item.status),
    publishedAt: readString(item.publishedAt),
    createdAt: readString(item.createdAt, "—"),
  };
};

export const SubcategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const publicationView = (new URLSearchParams(location.search).get("status") ?? "published") as PublicationView;

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const subcategoriesQuery = catalogApi.subcategories.hooks.useList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    publicationView === "published"
  );
  const draftSubcategoriesQuery = catalogApi.subcategories.hooks.useDraft(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    publicationView === "draft"
  );
  const archivedSubcategoriesQuery = catalogApi.subcategories.hooks.useArchived(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    publicationView === "archived"
  );

  const softDeleteSubcategory = catalogApi.subcategories.hooks.useSoftDelete();
  const updateSubcategory = catalogApi.subcategories.hooks.useUpdate();

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

  const lifecycleQuery = publicationView === "draft" ? draftSubcategoriesQuery : publicationView === "archived" ? archivedSubcategoriesQuery : subcategoriesQuery;
  const sourceRows = lifecycleQuery.data?.data;

  const rows = React.useMemo(
    () => (sourceRows ?? []).map((row) => toSubcategoryRow(row, productCountMap)),
    [sourceRows, productCountMap]
  );

  const totalPages = lifecycleQuery.data?.totalPages ?? 1;
  const totalSubcategories = lifecycleQuery.data?.total ?? rows.length;

  const stats = React.useMemo(
    () => ({
      total: totalSubcategories,
      active: rows.filter((row) => row.status === "PUBLISHED").length,
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

  const openConfirm = (ids: ReadonlyArray<string>) => {
    if (!ids.length) return;
    setPendingIds(ids);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!pendingIds.length) return;

    await softDeleteSubcategory.mutateAsync(pendingIds.join(","));
    await subcategoriesQuery.refetch();

    setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    const count = pendingIds.length;
    toast.success(count === 1 ? "Subcategory deleted." : `${count} subcategories deleted.`);

    setConfirmOpen(false);
    setPendingIds([]);
  };

  const changeStatus = async (id: string, status: PublicationStatus) => {
    await updateSubcategory.mutateAsync({ id, dto: { status } });
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
    {
      key: "status",
      label: "Status",
      render: (row: SubcategoryRow) => <PublicationStatusBadge status={row.status} />,
    },
    {
      key: "rowActions",
      label: "Actions",
      render: (row: SubcategoryRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={15} /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={(event) => { event.stopPropagation(); navigate(`/dashboard/categories/${row.categoryId}/subcategories/${row.id}/edit`); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status !== "PUBLISHED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "PUBLISHED"); }}><Globe2 className="mr-2 h-4 w-4" />Publish</DropdownMenuItem> : null}
            {row.status !== "DRAFT" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "DRAFT"); }}><FilePenLine className="mr-2 h-4 w-4" />Move to Draft</DropdownMenuItem> : null}
            {row.status !== "ARCHIVED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "ARCHIVED"); }}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem> : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]" onClick={(event) => { event.stopPropagation(); openConfirm([row.id]); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="Subcategories"
      subtitle="Manage product subcategories and hierarchy."
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search subcategories..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label={`${publicationView[0].toUpperCase()}${publicationView.slice(1)} Subcategories`} value={stats.total} icon={ShoppingBag} colorVariant="blue" />
        <StatCardV2 label="Published on this page" value={stats.active} icon={Tag} colorVariant="emerald" />
        <StatCardV2 label="Products" value={stats.totalProducts} icon={Layers} colorVariant="blue" />
        <StatCardV2 label="Categories" value={stats.totalCategories} icon={FolderTree} colorVariant="cyan" />
      </div>

      <DataTableV2
        toolbarLeading={<PublicationTabs value={publicationView} onChange={(status) => navigate(`/dashboard/subcategories?status=${status}`)} />}
        columns={columns}
        data={rows}
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
        onRowClick={(row) => navigate(`/dashboard/categories/${row.categoryId}/subcategories/${row.id}`)}
        emptyMessage={lifecycleQuery.isLoading ? "Loading subcategories..." : "No subcategories found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingIds.length > 1 ? "Delete subcategories?" : "Delete subcategory?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIds.length > 1
                ? `This permanently deletes ${pendingIds.length} subcategories and cannot be undone.`
                : "This permanently deletes this subcategory and cannot be undone."}
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
