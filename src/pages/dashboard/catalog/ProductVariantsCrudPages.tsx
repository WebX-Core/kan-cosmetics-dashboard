import React from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, FilePenLine, Globe2, Layers, MoreHorizontal, PackagePlus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { z } from "zod";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { parseApiError } from "@/shared/utils/apiError";
import type { PublicationStatus } from "@/features/catalog/catalog.types";
import { PublicationStatusBadge, PublicationTabs, readPublicationStatus, type PublicationView } from "@/shared/components/catalog/PublicationLifecycle";
import { PublicationStatusSelector } from "@/shared/components/catalog/PublicationStatusSelector";
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

type VariantForm = Readonly<{
  productId: string;
  title: string;
  sku: string;
  variantType: string;
  variantValue: string;
  price: string;
  compareAtPrice: string;
  weight: string;
  colorHex: string;
  isDefault: boolean;
  isActive: boolean;
  isTryOn: boolean;
  status: PublicationStatus;
}>;

const initialForm: VariantForm = {
  productId: "",
  title: "",
  sku: "",
  variantType: "",
  variantValue: "",
  price: "",
  compareAtPrice: "",
  weight: "",
  colorHex: "",
  isDefault: false,
  isActive: true,
  isTryOn: false,
  status: "DRAFT",
};

const variantSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  title: z.string().trim().min(1, "Title is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  variantType: z.string().trim().min(1, "Variant type is required"),
  variantValue: z.string().trim().min(1, "Variant value is required"),
  price: z.string().trim().min(1, "Price is required"),
  compareAtPrice: z.string().trim().optional(),
  weight: z.string().trim().optional(),
  colorHex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{6})$/, "Use HEX like #FF3366")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isTryOn: z.boolean(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const toRows = (value: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> => {
  if (Array.isArray(value)) return value as ReadonlyArray<Readonly<Record<string, unknown>>>;
  if (!value || typeof value !== "object") return [];
  const nested = Object.values(value as Record<string, unknown>).find(Array.isArray);
  return Array.isArray(nested) ? (nested as ReadonlyArray<Readonly<Record<string, unknown>>>) : [];
};

type VariantRow = Readonly<{
  id: string;
  title: string;
  sku: string;
  productId: string;
  isActive: boolean;
  status: PublicationStatus;
}>;

const toVariantRows = (rows: ReadonlyArray<Readonly<Record<string, unknown>>>): ReadonlyArray<VariantRow> =>
  rows.map((row) => ({
    id: String(row.id ?? crypto.randomUUID()),
    title: String(row.title ?? "—"),
    sku: String(row.sku ?? "—"),
    productId: String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? "—"),
    isActive: row.isActive !== false,
    status: readPublicationStatus(row.status),
  }));

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

export const ProductVariantsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const userRole = useUserStore((state) => state.user?.role ?? null);
  const isSudoAdmin = userRole === "SUDOADMIN";
  const isDeletedView = location.pathname.endsWith("/deleted");
  const publicationView = (searchParams.get("status") ?? "published") as PublicationView;
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<null | "delete" | "recover" | "destroy">(null);
  const [pendingIds, setPendingIds] = React.useState<ReadonlyArray<string>>([]);

  const productFilter = searchParams.get("product") ?? "";
  const productName = searchParams.get("productName") ?? "";
  const returnPath = searchParams.get("returnPath") ?? "/dashboard/categories";

  const query = catalogApi.productVariants.hooks.useList(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
      product: productFilter || undefined,
    },
    !isDeletedView && publicationView === "published",
  );
  const draftQuery = catalogApi.productVariants.hooks.useDraft(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined, product: productFilter || undefined },
    !isDeletedView && publicationView === "draft",
  );
  const archivedQuery = catalogApi.productVariants.hooks.useArchived(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined, product: productFilter || undefined },
    !isDeletedView && publicationView === "archived",
  );
  const deletedQuery = catalogApi.productVariants.hooks.useDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const inventoryQuery = catalogApi.inventory.hooks.useList({ page: 1, limit: 1000 }, Boolean(productFilter));
  const softDelete = catalogApi.productVariants.hooks.useSoftDelete();
  const recover = catalogApi.productVariants.hooks.useRecover();
  const destroy = catalogApi.productVariants.hooks.useDestroy();
  const updateStatus = catalogApi.productVariants.hooks.useUpdate();

  const rows = React.useMemo(() => {
    const lifecycleQuery = publicationView === "draft" ? draftQuery : publicationView === "archived" ? archivedQuery : query;
    const source = isDeletedView ? deletedQuery.data?.data : lifecycleQuery.data?.data;
    const base = toVariantRows(toRows(source));
    if (!productFilter) return base;
    return base.filter((row) => row.productId === productFilter);
  }, [archivedQuery.data?.data, deletedQuery.data?.data, draftQuery.data?.data, isDeletedView, productFilter, publicationView, query.data?.data]);
  const lifecycleQuery = publicationView === "draft" ? draftQuery : publicationView === "archived" ? archivedQuery : query;
  const totalPages = isDeletedView ? (deletedQuery.data?.totalPages ?? 1) : (lifecycleQuery.data?.totalPages ?? 1);
  const inventoryByVariantId = React.useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    const source = (inventoryQuery.data?.data ?? []) as ReadonlyArray<Record<string, unknown>>;
    source.forEach((entry) => {
      const variant = entry.productVariant as Record<string, unknown> | undefined;
      const variantId = typeof variant?.id === "string" ? variant.id : "";
      if (variantId) map.set(variantId, entry);
    });
    return map;
  }, [inventoryQuery.data?.data]);

  const allVisibleIds = React.useMemo(() => rows.map((row) => row.id), [rows]);
  const isAllVisibleSelected = React.useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every((entry) => selectedIds.includes(entry)),
    [allVisibleIds, selectedIds],
  );
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !allVisibleIds.includes(entry));
      return Array.from(new Set([...prev, ...allVisibleIds]));
    });
  };
  const toggleSelectOne = (variantId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(variantId) ? prev : [...prev, variantId]) : prev.filter((entry) => entry !== variantId),
    );
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
        await Promise.all(pendingIds.map((entry) => softDelete.mutateAsync(entry)));
      }
      if (pendingAction === "recover") {
        await recover.mutateAsync({ ids: pendingIds });
      }
      if (pendingAction === "destroy") {
        await Promise.all(pendingIds.map((entry) => destroy.mutateAsync(entry)));
      }
      await query.refetch();
      await deletedQuery.refetch();
      setSelectedIds((prev) => prev.filter((entry) => !pendingIds.includes(entry)));
      toast.success(
        pendingAction === "delete"
          ? pendingIds.length === 1
            ? "Variant deleted."
            : `${pendingIds.length} variants deleted.`
          : pendingAction === "recover"
          ? pendingIds.length === 1
            ? "Variant recovered."
            : `${pendingIds.length} variants recovered.`
          : pendingIds.length === 1
          ? "Variant permanently deleted."
          : `${pendingIds.length} variants permanently deleted.`,
      );
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
      setPendingIds([]);
    }
  };
  const changeStatus = async (id: string, status: PublicationStatus) => {
    await updateStatus.mutateAsync({ id, dto: { status } });
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
          aria-label="Select all variants"
        />
      ),
      render: (row: VariantRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.id, event.target.checked)}
          aria-label={`Select ${row.title}`}
        />
      ),
      width: "44px",
    },
    {
      key: "variant",
      label: "Variant",
      render: (row: VariantRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="text-xs text-gray-400">SKU: {row.sku}</div>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Active",
      render: (row: VariantRow) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    { key: "status", label: "Status", render: (row: VariantRow) => <PublicationStatusBadge status={row.status} /> },
    ...(!isDeletedView ? [{ key: "actions", label: "Actions", render: (row: VariantRow) => <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}><Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={15} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={(event) => { event.stopPropagation(); navigate(`/dashboard/product-variants/${row.id}/edit${location.search}`); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.status !== "PUBLISHED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "PUBLISHED"); }}><Globe2 className="mr-2 h-4 w-4" />Publish</DropdownMenuItem> : null}
        {row.status !== "DRAFT" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "DRAFT"); }}><FilePenLine className="mr-2 h-4 w-4" />Move to Draft</DropdownMenuItem> : null}
        {row.status !== "ARCHIVED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "ARCHIVED"); }}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]" onClick={(event) => { event.stopPropagation(); openConfirm("delete", [row.id]); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu> }] : []),
    ...(!isDeletedView && productFilter
      ? [
          {
            key: "stockQuantity",
            label: "Stock",
            render: (row: VariantRow) => {
              const inventory = inventoryByVariantId.get(row.id);
              if (!inventory) return <span className="text-[#86868b]">—</span>;
              return <span className="font-medium text-[#1d1d1f]">{Number(inventory.stockQuantity ?? 0)}</span>;
            },
          },
          {
            key: "reservedQuantity",
            label: "Reserved",
            render: (row: VariantRow) => {
              const inventory = inventoryByVariantId.get(row.id);
              if (!inventory) return <span className="text-[#86868b]">—</span>;
              return <span className="text-[#1d1d1f]">{Number(inventory.reservedQuantity ?? 0)}</span>;
            },
          },
          {
            key: "availableQuantity",
            label: "Available",
            render: (row: VariantRow) => {
              const inventory = inventoryByVariantId.get(row.id);
              if (!inventory) return <span className="text-[#86868b]">—</span>;
              const stock = Number(inventory.stockQuantity ?? 0);
              const reserved = Number(inventory.reservedQuantity ?? 0);
              const available = stock - reserved;
              return <span className="font-medium text-[#1d1d1f]">{available}</span>;
            },
          },
          {
            key: "inventoryStatus",
            label: "Inventory Status",
            render: (row: VariantRow) => {
              const inventory = inventoryByVariantId.get(row.id);
              if (!inventory) return <span className="text-[#86868b]">Not set</span>;
              const stock = Number(inventory.stockQuantity ?? 0);
              const reserved = Number(inventory.reservedQuantity ?? 0);
              const available = stock - reserved;
              const threshold = Number(inventory.lowStockThreshold ?? 0);
              const status =
                available <= 0
                  ? "Out"
                  : threshold > 0 && available <= threshold
                  ? "Low"
                  : "In";
              return (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    status === "In"
                      ? "bg-emerald-50 text-emerald-700"
                      : status === "Low"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {status}
                </span>
              );
            },
          },
          {
            key: "inventory",
            label: "Inventory",
            render: (row: VariantRow) => {
              const inventory = inventoryByVariantId.get(row.id);
              if (!inventory) {
                return (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(
                        `/dashboard/inventory/create?productId=${encodeURIComponent(productFilter)}&productName=${encodeURIComponent(
                          productName,
                        )}&productVariantId=${encodeURIComponent(row.id)}&returnPath=${encodeURIComponent(
                          `/dashboard/product-variants?product=${productFilter}&productName=${encodeURIComponent(
                            productName,
                          )}&returnPath=${encodeURIComponent(returnPath)}`,
                        )}`,
                      );
                    }}
                    className="inline-flex h-[28px] items-center gap-1 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                  >
                    <PackagePlus size={12} />
                    Set
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    const inventoryId = String(inventory.id ?? "");
                    if (!inventoryId) return;
                    navigate(
                      `/dashboard/inventory/${encodeURIComponent(inventoryId)}?returnPath=${encodeURIComponent(
                        `/dashboard/product-variants?product=${productFilter}&productName=${encodeURIComponent(
                          productName,
                        )}&returnPath=${encodeURIComponent(returnPath)}`,
                      )}`,
                    );
                  }}
                  className="inline-flex h-[28px] items-center gap-1 rounded-full border border-[#d2d2d7] bg-white px-3 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                >
                  Edit
                </button>
              );
            },
          },
        ]
      : []),
    ...(isDeletedView
      ? [
          {
            key: "deletedActions",
            label: "Actions",
            render: (row: VariantRow) => (
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
      : []),
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title="Product Variants"
      subtitle={productFilter ? `Manage variants for ${productName || "selected product"}.` : "Size, color, and other variant options."}
      onBack={productFilter ? () => navigate(returnPath) : undefined}
      actions={
        <div className="flex items-center gap-2">
          {!isDeletedView && isSudoAdmin ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/dashboard/product-variants/deleted?product=${encodeURIComponent(productFilter)}&productName=${encodeURIComponent(
                    productName,
                  )}&returnPath=${encodeURIComponent(returnPath)}`,
                )
              }
              className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              <Trash2 size={13} strokeWidth={2} />
              View Deleted
            </button>
          ) : null}
          {isDeletedView ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/dashboard/product-variants?product=${encodeURIComponent(productFilter)}&productName=${encodeURIComponent(
                    productName,
                  )}&returnPath=${encodeURIComponent(returnPath)}`,
                )
              }
              className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
            >
              Back to Variants
            </button>
          ) : null}
        </div>
      }
      onNew={() =>
        navigate(
          `/dashboard/product-variants/create${
            productFilter
              ? `?product=${encodeURIComponent(productFilter)}&productName=${encodeURIComponent(productName)}&returnPath=${encodeURIComponent(
                  returnPath,
                )}`
              : ""
          }`,
        )
      }
      newButtonLabel="New Variant"
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search title, SKU..."
    >
      {!isDeletedView ? <PublicationTabs value={publicationView} onChange={(status) => { const next = new URLSearchParams(searchParams); next.set("status", status); navigate(`${location.pathname}?${next.toString()}`); }} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardV2 label="Total Variants" value={rows.length} icon={Layers} colorVariant="blue" />
        <StatCardV2 label="Active" value={rows.filter((row) => row.isActive).length} icon={Layers} colorVariant="emerald" />
      </div>

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
        emptyMessage={
          (isDeletedView ? deletedQuery.isLoading : lifecycleQuery.isLoading)
            ? "Loading variants..."
            : isDeletedView
            ? "No deleted variants found."
            : "No product variants found."
        }
        showPagination
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
                  ? "Recover variants?"
                  : "Recover variant?"
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? "Delete variants permanently?"
                  : "Delete variant permanently?"
                : pendingIds.length > 1
                ? "Delete variants?"
                : "Delete variant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "recover"
                ? pendingIds.length > 1
                  ? `This will recover ${pendingIds.length} variants.`
                  : "This will recover this variant."
                : pendingAction === "destroy"
                ? pendingIds.length > 1
                  ? `This will permanently delete ${pendingIds.length} variants. This cannot be undone.`
                  : "This will permanently delete this variant. This cannot be undone."
                : pendingIds.length > 1
                ? `This will move ${pendingIds.length} variants to trash.`
                : "This will move this variant to trash."}
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

const VariantFormPage: React.FC<Readonly<{ mode: "create" | "edit" }>> = ({ mode }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const productFilter = searchParams.get("product") ?? "";
  const productName = searchParams.get("productName") ?? "";
  const returnPath = searchParams.get("returnPath") ?? "/dashboard/product-variants";

  const isEdit = mode === "edit";
  const getQuery = catalogApi.productVariants.hooks.useGet(id, isEdit);
  const createMutation = catalogApi.productVariants.hooks.useCreate();
  const updateMutation = catalogApi.productVariants.hooks.useUpdate();
  const [form, setForm] = React.useState<VariantForm>({ ...initialForm, productId: productFilter });
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [existingImage, setExistingImage] = React.useState<string>("");
  const [removedUrls, setRemovedUrls] = React.useState<ReadonlyArray<string>>([]);
  const productQuery = catalogApi.products.hooks.useGet(
    form.productId,
    z.string().uuid().safeParse(form.productId).success,
  );
  const selectedProductType = readString((productQuery.data as Record<string, unknown> | undefined)?.productType);
  const isLipstickProduct = selectedProductType === "LIPSTICK";
  const previewImage = React.useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );

  React.useEffect(() => {
    if (!isEdit) return;
    const row = (getQuery.data ?? {}) as Record<string, unknown>;
    if (!row.id) return;

    setForm({
      productId: String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? productFilter),
      title: String(row.title ?? ""),
      sku: String(row.sku ?? ""),
      variantType: String(row.variantType ?? ""),
      variantValue: String(row.variantValue ?? ""),
      price: String(row.price ?? ""),
      compareAtPrice: String(row.compareAtPrice ?? ""),
      weight: String(row.weight ?? ""),
      colorHex: String(row.colorHex ?? ""),
      isDefault: Boolean(row.isDefault),
      isActive: row.isActive !== false,
      isTryOn: Boolean(row.isTryOn),
      status: readPublicationStatus(row.status),
    });
    setExistingImage(readString(row.image));
    setRemovedUrls([]);
    setImageFile(null);
  }, [getQuery.data, isEdit, productFilter]);

  React.useEffect(() => {
    if (isLipstickProduct) return;
    if (!form.colorHex && !form.isTryOn) return;
    setForm((prev) => ({
      ...prev,
      colorHex: "",
      isTryOn: false,
    }));
  }, [form.colorHex, form.isTryOn, isLipstickProduct]);

  React.useEffect(() => {
    return () => {
      if (previewImage) URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(variantSchema, form, toast);
    if (!parsed) return;

    try {
      const payload = {
        ...parsed,
        image: imageFile ?? undefined,
        removeUrls: removedUrls.length ? removedUrls : undefined,
        colorHex: isLipstickProduct && parsed.colorHex ? parsed.colorHex : undefined,
        isTryOn: isLipstickProduct ? parsed.isTryOn : undefined,
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      navigate(
        productFilter
          ? `/dashboard/product-variants?product=${encodeURIComponent(productFilter)}&productName=${encodeURIComponent(
              productName,
            )}&returnPath=${encodeURIComponent(returnPath)}`
          : "/dashboard/product-variants",
      );
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return <div className="p-6 text-sm text-[#6e6e73]">Loading variant...</div>;
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Product Variant" : "New Product Variant"}
      subtitle={isEdit ? "Update variant details for this product." : "Add a new variant to this product."}
      onBack={() => navigate(returnPath)}
    >
      <form onSubmit={onSubmit} className="space-y-[21px]">
        <FormSection title="Variant Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Product" required>
              <input
                type="text"
                value={productName || form.productId}
                readOnly={Boolean(productFilter)}
                placeholder="Product UUID"
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                className={`${inputClass} ${productFilter ? "bg-[#f5f5f7]" : ""}`}
              />
            </FormField>
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="e.g. Matte All On"
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="SKU" required>
              <input
                type="text"
                value={form.sku}
                placeholder="e.g. KAN-LIP-001"
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Price" required>
              <input
                type="text"
                value={form.price}
                placeholder="e.g. 1299"
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Variant Type" required>
              <input
                type="text"
                value={form.variantType}
                placeholder="e.g. Shade"
                onChange={(e) => setForm((prev) => ({ ...prev, variantType: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Variant Value" required>
              <input
                type="text"
                value={form.variantValue}
                placeholder="e.g. Ruby Red"
                onChange={(e) => setForm((prev) => ({ ...prev, variantValue: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Compare At Price">
              <input
                type="text"
                value={form.compareAtPrice}
                placeholder="e.g. 1499"
                onChange={(e) => setForm((prev) => ({ ...prev, compareAtPrice: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Weight">
              <input
                type="text"
                value={form.weight}
                placeholder="e.g. 3.5"
                onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {isLipstickProduct ? (
              <FormField label="Color HEX">
                <input
                  type="text"
                  value={form.colorHex}
                  placeholder="#FF3366"
                  onChange={(e) => setForm((prev) => ({ ...prev, colorHex: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#1d1d1f]">Publication status</p>
            <PublicationStatusSelector value={form.status} onChange={(status) => setForm((prev) => ({ ...prev, status }))} disabled={saving} />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Default
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Active
            </label>
            {isLipstickProduct ? (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isTryOn}
                  onChange={(e) => setForm((prev) => ({ ...prev, isTryOn: e.target.checked }))}
                />
                Try On
              </label>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
            <FormField
              label="Variant Image"
              hint="Optional. Replaces the current image on update."
            >
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setImageFile(file);
                    if (file) {
                      setRemovedUrls((prev) => prev.filter((entry) => entry !== "image"));
                    }
                    event.currentTarget.value = "";
                  }}
                  className={inputClass}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      if (existingImage) {
                        setRemovedUrls((prev) => (prev.includes("image") ? prev : [...prev, "image"]));
                        setExistingImage("");
                      }
                    }}
                    className="inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"
                  >
                    Remove Image
                  </button>
                  {removedUrls.includes("image") ? (
                    <span className="text-xs text-[#86868b]">Image will be removed on save.</span>
                  ) : null}
                </div>
              </div>
            </FormField>
            <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Preview
              </p>
              {imageFile || existingImage ? (
                <img
                  src={previewImage || existingImage}
                  alt="Variant preview"
                  className="h-40 w-full rounded-lg border border-[#e5e5e7] bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[#d2d2d7] bg-white text-sm text-[#86868b]">
                  No image selected
                </div>
              )}
              <p className="mt-2 text-xs text-[#6e6e73]">
                {isLipstickProduct
                  ? "Lipstick-specific fields are enabled."
                  : selectedProductType
                    ? "Lipstick-specific fields are hidden for this product type."
                    : "Enter a valid product UUID to validate lipstick-specific fields."}
              </p>
            </div>
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : isEdit ? "Update Variant" : form.status === "PUBLISHED" ? "Create & Publish" : form.status === "ARCHIVED" ? "Create as Archived" : "Save as Draft"}
          isSubmitting={saving}
          onCancel={() => navigate(returnPath)}
        />
      </form>
    </ModernFormLayout>
  );
};

export const ProductVariantCreatePage: React.FC = () => <VariantFormPage mode="create" />;

export const ProductVariantEditPage: React.FC = () => <VariantFormPage mode="edit" />;
