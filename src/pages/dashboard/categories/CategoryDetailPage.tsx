import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Archive, FilePenLine, FolderOpen, Globe, Layers, MoreHorizontal, Pencil, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { catalogApi } from "@/features/catalog";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { PublicationTabs, type PublicationView } from "@/shared/components/catalog/PublicationLifecycle";
import { readPublicationStatus } from "@/shared/components/catalog/publicationLifecycle.utils";
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
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  products: number;
  status: "Active" | "Inactive";
  publicationStatus: "PUBLISHED" | "DRAFT" | "ARCHIVED";
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
  if (typeof nested !== "object" || nested === null) return "";
  return readString((nested as Record<string, unknown>).id);
};

const getSubcategoryIdFromProduct = (record: unknown): string => {
  const row = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const direct =
    (typeof row.subcategoryId === "string" ? row.subcategoryId : undefined) ??
    (typeof row.subcategory_id === "string" ? row.subcategory_id : undefined);
  if (direct) return direct;
  const nested = row.subcategory;
  if (typeof nested !== "object" || nested === null) return "";
  return readString((nested as Record<string, unknown>).id);
};

const toSubcategoryRow = (record: unknown, productCountMap: ReadonlyMap<string, number>): SubcategoryRow => {
  const row = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  const id = readString(row.id, crypto.randomUUID());
  const isDeleted = row.isDeleted === true;
  return {
    id,
    categoryId: getCategoryIdFromSubcategory(row),
    name: readString(row.title ?? row.name, "Untitled Subcategory"),
    slug: readString(row.slug),
    description: readString(row.description, "—"),
    coverImage: readString(row.coverImage ?? row.image ?? row.thumbnail),
    products: productCountMap.get(id) ?? 0,
    status: isDeleted ? "Inactive" : "Active",
    publicationStatus: readPublicationStatus(row.status),
    createdAt: readString(row.createdAt ?? row.created_at),
  };
};

export const CategoryDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const publicationView = (new URLSearchParams(location.search).get("status") ?? "published") as PublicationView;

  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const categoryQuery = catalogApi.categories.hooks.useGet(id);
  const subcategoriesQuery = catalogApi.subcategories.hooks.useList(
    { category: id, limit: 100 },
    Boolean(id) && publicationView === "published"
  );
  const draftSubcategoriesQuery = catalogApi.subcategories.hooks.useDraft(
    { category: id, limit: 100 },
    Boolean(id) && publicationView === "draft"
  );
  const archivedSubcategoriesQuery = catalogApi.subcategories.hooks.useArchived(
    { category: id, limit: 100 },
    Boolean(id) && publicationView === "archived"
  );
  const productsQuery = catalogApi.products.hooks.useList({ page: 1, limit: 1000 }, true);

  const softDeleteSubcategory = catalogApi.subcategories.hooks.useSoftDelete();
  const updateSubcategory = catalogApi.subcategories.hooks.useUpdate();

  const category = categoryQuery.data as Record<string, unknown> | undefined;
  const categoryName = readString(category?.title ?? category?.name, "Category");

  const productCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const products = productsQuery.data?.data ?? [];
    products.forEach((product) => {
      const subcategoryId = getSubcategoryIdFromProduct(product);
      if (!subcategoryId) return;
      map.set(subcategoryId, (map.get(subcategoryId) ?? 0) + 1);
    });
    return map;
  }, [productsQuery.data?.data]);

  const sourceRows = React.useMemo(() => {
    const lifecycleData = publicationView === "draft"
      ? draftSubcategoriesQuery.data?.data
      : publicationView === "archived"
        ? archivedSubcategoriesQuery.data?.data
        : subcategoriesQuery.data?.data;
    return (lifecycleData ?? []).filter((entry) => getCategoryIdFromSubcategory(entry) === id);
  }, [archivedSubcategoriesQuery.data?.data, draftSubcategoriesQuery.data?.data, id, publicationView, subcategoriesQuery.data?.data]);

  const rows = React.useMemo(
    () => sourceRows.map((entry) => toSubcategoryRow(entry, productCountMap)),
    [sourceRows, productCountMap]
  );

  const filteredRows = React.useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.name} ${row.slug} ${row.description}`.toLowerCase().includes(needle)
    );
  }, [rows, debouncedSearch]);

  const stats = React.useMemo(
    () => ({
      totalSubcategories: rows.length,
      activeSubcategories: rows.filter((row) => row.status === "Active").length,
      inactiveSubcategories: rows.filter((row) => row.status === "Inactive").length,
      totalProducts: rows.reduce((sum, row) => sum + row.products, 0),
    }),
    [rows]
  );

  const allVisibleIds = React.useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);
  const isAllVisibleSelected = React.useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every((entry) => selectedIds.includes(entry)),
    [allVisibleIds, selectedIds]
  );

  const toggleSelectOne = (subcategoryId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? (prev.includes(subcategoryId) ? prev : [...prev, subcategoryId])
        : prev.filter((entry) => entry !== subcategoryId)
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

  const changeStatus = async (
    subcategoryId: string,
    status: "PUBLISHED" | "DRAFT" | "ARCHIVED"
  ) => {
    try {
      await updateSubcategory.mutateAsync({ id: subcategoryId, dto: { status } });
      await Promise.all([
        subcategoriesQuery.refetch(),
        draftSubcategoriesQuery.refetch(),
        archivedSubcategoriesQuery.refetch(),
      ]);
      toast.success(
        status === "PUBLISHED"
          ? "Subcategory published."
          : status === "DRAFT"
          ? "Subcategory moved to draft."
          : "Subcategory archived."
      );
    } catch {
      toast.error("Could not update subcategory status.");
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingIds.length) return;

    try {
      await Promise.all(pendingIds.map((entry) => softDeleteSubcategory.mutateAsync(entry)));
      await subcategoriesQuery.refetch();
      setSelectedIds((prev) => prev.filter((entry) => !pendingIds.includes(entry)));

      toast.success(
        pendingIds.length === 1
          ? "Subcategory deleted."
          : `${pendingIds.length} subcategories deleted.`
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
              <FolderOpen size={14} className="text-blue-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-400">{row.slug ? `/${row.slug}` : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: SubcategoryRow) => <span className="line-clamp-1 text-gray-600">{row.description}</span>,
    },
    {
      key: "products",
      label: "Products",
      render: (row: SubcategoryRow) => <span className="font-medium text-gray-900">{row.products}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row: SubcategoryRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row: SubcategoryRow) => <span className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "rowActions",
      label: "Actions",
      render: (row: SubcategoryRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/categories/${id}/subcategories/${row.id}/edit`); }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/seo-metadata/create?entityType=SUBCATEGORY&entityId=${encodeURIComponent(row.id)}&slug=${encodeURIComponent(row.slug)}`); }}>
              <Globe className="mr-2 h-4 w-4" /> SEO
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.publicationStatus !== "PUBLISHED" ? (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "PUBLISHED"); }}>
                <Globe className="mr-2 h-4 w-4" /> Publish
              </DropdownMenuItem>
            ) : null}
            {row.publicationStatus !== "DRAFT" ? (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "DRAFT"); }}>
                <FilePenLine className="mr-2 h-4 w-4" /> Move to Draft
              </DropdownMenuItem>
            ) : null}
            {row.publicationStatus !== "ARCHIVED" ? (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void changeStatus(row.id, "ARCHIVED"); }}>
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={(e) => { e.stopPropagation(); openConfirm([row.id]); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title={categoryName}
      subtitle="Manage subcategories in this category."
      onBack={() => navigate("/dashboard/categories")}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/categories/${id}/subcategories/create`)}
            className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            <Plus size={13} strokeWidth={2} />
            New Subcategory
          </button>
          <button
            type="button"
            onClick={() => navigate(`/dashboard/categories/${id}/edit`)}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Pencil size={13} strokeWidth={2} />
            Edit Category
          </button>
        </div>
      }
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search subcategories..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Subcategories" value={stats.totalSubcategories} icon={Layers} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.activeSubcategories} icon={Tag} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactiveSubcategories} icon={Tag} colorVariant="cyan" />
        <StatCardV2 label="Total Products" value={stats.totalProducts} icon={ShoppingBag} colorVariant="cyan" />
      </div>

      <DataTableV2
        toolbarLeading={<PublicationTabs value={publicationView} onChange={(status) => navigate(`${location.pathname}?status=${status}`)} />}
        columns={columns}
        data={filteredRows}
        actions={selectedIds.length > 0 ? (
          <button
            type="button"
            onClick={() => openConfirm(selectedIds)}
            className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} />
            Delete ({selectedIds.length})
          </button>
        ) : undefined}
        searchValue={state.search}
        onRowClick={(row) => navigate(`/dashboard/categories/${id}/subcategories/${row.id}`)}
        emptyMessage={
          (publicationView === "draft"
            ? draftSubcategoriesQuery.isLoading
            : publicationView === "archived"
              ? archivedSubcategoriesQuery.isLoading
              : subcategoriesQuery.isLoading)
            ? "Loading subcategories..."
            : "No subcategories found."
        }
        showPagination={false}
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
