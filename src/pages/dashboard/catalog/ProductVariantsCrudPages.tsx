import React from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, FilePenLine, Globe2, Layers, MoreHorizontal, PackagePlus, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
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
import { PublicationStatusBadge, PublicationTabs, type PublicationView } from "@/shared/components/catalog/PublicationLifecycle";
import { readPublicationStatus } from "@/shared/components/catalog/publicationLifecycle.utils";
import { PublicationStatusSelector } from "@/shared/components/catalog/PublicationStatusSelector";
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
  weightUnit: string;
  colorHex: string;
  isDefault: boolean;
  isTryOn: boolean;
  isVatIncluded: boolean;
  vatRate: string;
  maxOrderQuantity: string;
  maxCustomerPurchaseQuantity: string;
  purchaseLimitStartsAt: string;
  purchaseLimitEndsAt: string;
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
  weightUnit: "g",
  colorHex: "",
  isDefault: false,
  isTryOn: false,
  isVatIncluded: true,
  vatRate: "13",
  maxOrderQuantity: "",
  maxCustomerPurchaseQuantity: "",
  purchaseLimitStartsAt: "",
  purchaseLimitEndsAt: "",
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
  weightUnit: z.enum(["g", "kg", "mg", "ml", "l", "oz", "lb"]),
  colorHex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{6})$/, "Use HEX like #FF3366")
    .optional()
    .or(z.literal("")),
  isDefault: z.boolean(),
  isTryOn: z.boolean(),
  isVatIncluded: z.boolean(),
  vatRate: z.coerce.number().min(0, "VAT rate cannot be negative").max(100, "VAT rate cannot exceed 100"),
  maxOrderQuantity: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0),
      "Max quantity per order must be a whole number",
    ),
  maxCustomerPurchaseQuantity: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0),
      "Max quantity per customer must be a whole number",
    ),
  purchaseLimitStartsAt: z.string().trim().optional(),
  purchaseLimitEndsAt: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
}).superRefine((value, ctx) => {
  if (!value.purchaseLimitStartsAt || !value.purchaseLimitEndsAt) return;
  const startsAt = new Date(value.purchaseLimitStartsAt).getTime();
  const endsAt = new Date(value.purchaseLimitEndsAt).getTime();
  if (Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt > endsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["purchaseLimitEndsAt"],
      message: "Limit end date must be after the start date",
    });
  }
});

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const MAX_VARIANT_IMAGES = 10;
const MAX_VARIANT_IMAGE_SIZE = 5 * 1024 * 1024;
const WEIGHT_UNIT_OPTIONS = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "mg", label: "mg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "oz", label: "oz" },
  { value: "lb", label: "lb" },
] as const;

const VariantImageCard: React.FC<Readonly<{ src: string; primary?: boolean; onRemove: () => void }>> = ({ src, primary, onRemove }) => (
  <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]">
    <img src={src} alt="Variant" className="h-full w-full object-cover" />
    <button type="button" onClick={onRemove} className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white transition hover:bg-[#1d1d1f]" aria-label="Remove image">
      <Trash2 size={14} />
    </button>
    {primary ? <span className="absolute bottom-1 left-1 rounded-full bg-[#1d1d1f]/85 px-2 py-1 text-[10px] font-semibold text-white">Primary</span> : null}
  </div>
);

const VariantImageDropArea: React.FC<Readonly<{ compact?: boolean; onFiles: (files: FileList | null) => void }>> = ({ compact, onFiles }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFiles(event.dataTransfer.files); }} className={compact ? "flex h-28 w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] p-2 text-center transition hover:border-[var(--primary)]" : "rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-8 text-center transition hover:border-[var(--primary)]"}>
      <UploadCloud size={compact ? 18 : 26} className="mx-auto text-[#86868b]" />
      {!compact ? <><p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Choose images or drag and drop them here.</p><p className="mt-1 text-[12px] text-[#86868b]">Images up to 5MB · Maximum {MAX_VARIANT_IMAGES}</p></> : null}
      <button type="button" onClick={() => inputRef.current?.click()} className={compact ? "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]" : "mt-3 inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"}>
        {compact ? <Plus size={14} /> : "Browse files"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" aria-label="Variant images" onChange={(event) => { onFiles(event.target.files); event.currentTarget.value = ""; }} />
    </div>
  );
};

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
  status: PublicationStatus;
}>;

const toVariantRows = (rows: ReadonlyArray<Readonly<Record<string, unknown>>>): ReadonlyArray<VariantRow> =>
  rows.map((row) => ({
    id: String(row.id ?? crypto.randomUUID()),
    title: String(row.title ?? "—"),
    sku: String(row.sku ?? "—"),
    productId: String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? "—"),
    status: readPublicationStatus(row.status),
  }));

const readString = (value: unknown): string => (typeof value === "string" ? value : "");
const readDateTimeLocal = (value: unknown): string => readString(value).slice(0, 16);
const optionalLimitNumber = (
  value: string | undefined,
  clearEmpty = false,
): number | "" | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return clearEmpty ? "" : undefined;
  return Number(trimmed);
};
const optionalIsoDate = (
  value: string | undefined,
  clearEmpty = false,
): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return clearEmpty ? "" : undefined;
  return new Date(trimmed).toISOString();
};

const readStringArray = (...values: ReadonlyArray<unknown>): string[] =>
  Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    ),
  ).slice(0, MAX_VARIANT_IMAGES);

const readKeyIngredients = (value: unknown): string[] => {
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return {};
          }
        })()
      : value;
  if (!parsed || typeof parsed !== "object") return [];
  const raw = (parsed as Record<string, unknown>).keyIngredients;
  return Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];
};

const StringListInput: React.FC<{
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}> = ({ label, placeholder, items, onChange }) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const update = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const add = () => {
    onChange([...items, ""]);
    setTimeout(() => inputRefs.current[items.length]?.focus(), 0);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (index === items.length - 1) add();
      else inputRefs.current[index + 1]?.focus();
    }
    if (event.key === "Backspace" && items[index] === "" && items.length > 0) {
      event.preventDefault();
      remove(index);
      setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-[#1d1d1f]">{label}</p>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-[12px] text-[#86868b] select-none">
              {index + 1}.
            </span>
            <input
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              value={item}
              onChange={(event) => update(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              placeholder={placeholder}
              className="h-[38px] flex-1 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-[#d2d2d7] text-[#86868b] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Remove ingredient"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#d2d2d7] px-3 py-1.5 text-[12px] text-[#86868b] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <Plus size={12} />
          Add ingredient
        </button>
      </div>
    </div>
  );
};

export const ProductVariantsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const publicationView = (searchParams.get("status") ?? "published") as PublicationView;
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
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
    publicationView === "published",
  );
  const draftQuery = catalogApi.productVariants.hooks.useDraft(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined, product: productFilter || undefined },
    publicationView === "draft",
  );
  const archivedQuery = catalogApi.productVariants.hooks.useArchived(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined, product: productFilter || undefined },
    publicationView === "archived",
  );
  const inventoryQuery = catalogApi.inventory.hooks.useList({ page: 1, limit: 1000 }, Boolean(productFilter));
  const softDelete = catalogApi.productVariants.hooks.useSoftDelete();
  const updateStatus = catalogApi.productVariants.hooks.useUpdate();

  const rows = React.useMemo(() => {
    const lifecycleQuery = publicationView === "draft" ? draftQuery : publicationView === "archived" ? archivedQuery : query;
    const source = lifecycleQuery.data?.data;
    const base = toVariantRows(toRows(source));
    if (!productFilter) return base;
    return base.filter((row) => row.productId === productFilter);
  }, [archivedQuery.data?.data, draftQuery.data?.data, productFilter, publicationView, query.data?.data]);
  const lifecycleQuery = publicationView === "draft" ? draftQuery : publicationView === "archived" ? archivedQuery : query;
  const totalPages = lifecycleQuery.data?.totalPages ?? 1;
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
  const openConfirm = (ids: ReadonlyArray<string>) => {
    if (!ids.length) return;
    setPendingIds(ids);
    setConfirmOpen(true);
  };
  const handleConfirmAction = async () => {
    if (!pendingIds.length) return;
    try {
      await Promise.all(pendingIds.map((entry) => softDelete.mutateAsync(entry)));
      await query.refetch();
      setSelectedIds((prev) => prev.filter((entry) => !pendingIds.includes(entry)));
      toast.success(
        pendingIds.length === 1
          ? "Variant deleted."
          : `${pendingIds.length} variants deleted.`,
      );
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setConfirmOpen(false);
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
    { key: "status", label: "Status", render: (row: VariantRow) => <PublicationStatusBadge status={row.status} /> },
    ...(productFilter
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
    { key: "actions", label: "Actions", render: (row: VariantRow) => <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}><Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={15} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={(event) => { event.stopPropagation(); navigate(`/dashboard/product-variants/${row.id}/edit${location.search}`); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.status !== "PUBLISHED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "PUBLISHED"); }}><Globe2 className="mr-2 h-4 w-4" />Publish</DropdownMenuItem> : null}
        {row.status !== "DRAFT" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "DRAFT"); }}><FilePenLine className="mr-2 h-4 w-4" />Move to Draft</DropdownMenuItem> : null}
        {row.status !== "ARCHIVED" ? <DropdownMenuItem onClick={(event) => { event.stopPropagation(); void changeStatus(row.id, "ARCHIVED"); }}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem> : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]" onClick={(event) => { event.stopPropagation(); openConfirm([row.id]); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu> },
  ];

  return (
    <PageLayout
      title="Product Variants"
      subtitle={productFilter ? `Manage variants for ${productName || "selected product"}.` : "Size, color, and other variant options."}
      onBack={productFilter ? () => navigate(returnPath) : undefined}
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
      <div className="grid grid-cols-1 gap-4">
        <StatCardV2 label="Total Variants" value={rows.length} icon={Layers} colorVariant="blue" />
      </div>

      <DataTableV2
        toolbarLeading={<PublicationTabs value={publicationView} onChange={(status) => { const next = new URLSearchParams(searchParams); next.set("status", status); navigate(`${location.pathname}?${next.toString()}`); }} />}
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
        emptyMessage={lifecycleQuery.isLoading ? "Loading variants..." : "No product variants found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingIds.length > 1 ? "Delete variants?" : "Delete variant?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIds.length > 1
                ? `This permanently deletes ${pendingIds.length} variants and cannot be undone.`
                : "This permanently deletes this variant and cannot be undone."}
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
  const [keyIngredients, setKeyIngredients] = React.useState<string[]>([]);
  const [imageFiles, setImageFiles] = React.useState<ReadonlyArray<File>>([]);
  const [existingImages, setExistingImages] = React.useState<ReadonlyArray<string>>([]);
  const [removedUrls, setRemovedUrls] = React.useState<ReadonlyArray<string>>([]);
  const productQuery = catalogApi.products.hooks.useGet(
    form.productId,
    z.string().uuid().safeParse(form.productId).success,
  );
  const selectedProductType = readString((productQuery.data as Record<string, unknown> | undefined)?.productType);
  const isLipstickProduct = selectedProductType === "LIPSTICK";
  const previewImages = React.useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
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
      weightUnit: String(row.weightUnit ?? "g"),
      colorHex: String(row.colorHex ?? ""),
      isDefault: Boolean(row.isDefault),
      isTryOn: Boolean(row.isTryOn),
      isVatIncluded: typeof row.isVatIncluded === "boolean" ? row.isVatIncluded : true,
      vatRate: row.vatRate != null ? String(row.vatRate) : "13",
      maxOrderQuantity: row.maxOrderQuantity != null ? String(row.maxOrderQuantity) : "",
      maxCustomerPurchaseQuantity: row.maxCustomerPurchaseQuantity != null ? String(row.maxCustomerPurchaseQuantity) : "",
      purchaseLimitStartsAt: readDateTimeLocal(row.purchaseLimitStartsAt),
      purchaseLimitEndsAt: readDateTimeLocal(row.purchaseLimitEndsAt),
      status: readPublicationStatus(row.status),
    });
    setKeyIngredients(readKeyIngredients(row.descriptionJson));
    setExistingImages(readStringArray(row.images, row.image));
    setRemovedUrls([]);
    setImageFiles([]);
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
      previewImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewImages]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const totalVariantImages = existingImages.length + imageFiles.length;

  const addVariantImages = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    const validFiles = selectedFiles.filter((file) => file.type.startsWith("image/") && file.size <= MAX_VARIANT_IMAGE_SIZE);
    if (validFiles.length !== selectedFiles.length) {
      toast.error("Only image files up to 5MB are allowed.");
    }
    const availableSlots = MAX_VARIANT_IMAGES - totalVariantImages;
    if (availableSlots <= 0) {
      toast.error(`A product variant can have up to ${MAX_VARIANT_IMAGES} images.`);
      return;
    }
    if (validFiles.length > availableSlots) {
      toast.error(`Only ${availableSlots} more image${availableSlots === 1 ? "" : "s"} can be added.`);
    }
    setImageFiles((current) => [...current, ...validFiles.slice(0, availableSlots)]);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(variantSchema, form, toast);
    if (!parsed) return;

    try {
      const payload = {
        ...parsed,
        descriptionJson: {
          keyIngredients: keyIngredients.map((item) => item.trim()).filter(Boolean),
        },
        images: imageFiles.length ? imageFiles : undefined,
        removeUrls: removedUrls.length ? removedUrls : undefined,
        colorHex: isLipstickProduct && parsed.colorHex ? parsed.colorHex : undefined,
        isTryOn: isLipstickProduct ? parsed.isTryOn : undefined,
        maxOrderQuantity: optionalLimitNumber(parsed.maxOrderQuantity, isEdit),
        maxCustomerPurchaseQuantity: optionalLimitNumber(parsed.maxCustomerPurchaseQuantity, isEdit),
        purchaseLimitStartsAt: optionalIsoDate(parsed.purchaseLimitStartsAt, isEdit),
        purchaseLimitEndsAt: optionalIsoDate(parsed.purchaseLimitEndsAt, isEdit),
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
                placeholder="Product ID, e.g. f3a81922-9a95-4f9c-98fd-2f75f1961fd0"
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                className={`${inputClass} ${productFilter ? "bg-[#f5f5f7]" : ""}`}
              />
            </FormField>
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="Variant name, e.g. Cherry Red"
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="SKU" required>
              <input
                type="text"
                value={form.sku}
                placeholder="Unique SKU, e.g. KAN-LIP-CHERRY-01"
                onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Price" required>
              <input
                type="text"
                value={form.price}
                placeholder="Selling price, e.g. 1299"
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Variant Type" required>
              <input
                type="text"
                value={form.variantType}
                placeholder="Variant type, e.g. Color, Size, Volume"
                onChange={(e) => setForm((prev) => ({ ...prev, variantType: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Variant Value" required>
              <input
                type="text"
                value={form.variantValue}
                placeholder="Variant value, e.g. #FF3366"
                onChange={(e) => setForm((prev) => ({ ...prev, variantValue: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Compare At Price">
              <input
                type="text"
                value={form.compareAtPrice}
                placeholder="Original price before discount, e.g. 1499"
                onChange={(e) => setForm((prev) => ({ ...prev, compareAtPrice: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Package Weight">
              <div className="grid grid-cols-[1fr_112px] gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.weight}
                  placeholder="Weight, e.g. 3.5"
                  onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                  className={inputClass}
                />
                <select
                  value={form.weightUnit}
                  onChange={(e) => setForm((prev) => ({ ...prev, weightUnit: e.target.value }))}
                  className={inputClass}
                  aria-label="Weight unit"
                >
                  {WEIGHT_UNIT_OPTIONS.map((unit) => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>
            </FormField>
            <FormField label="VAT Rate (%)" required>
              <input type="number" min="0" max="100" step="0.01" value={form.vatRate} placeholder="VAT rate, e.g. 13" onChange={(e) => setForm((prev) => ({ ...prev, vatRate: e.target.value }))} className={inputClass} />
            </FormField>
            <FormField label="Max Quantity Per Order">
              <input
                type="number"
                min="0"
                step="1"
                value={form.maxOrderQuantity}
                placeholder="No per-order limit"
                onChange={(e) => setForm((prev) => ({ ...prev, maxOrderQuantity: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Max Quantity Per Customer">
              <input
                type="number"
                min="0"
                step="1"
                value={form.maxCustomerPurchaseQuantity}
                placeholder="No customer purchase limit"
                onChange={(e) => setForm((prev) => ({ ...prev, maxCustomerPurchaseQuantity: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Limit Starts At">
              <input
                type="datetime-local"
                value={form.purchaseLimitStartsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseLimitStartsAt: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Limit Ends At">
              <input
                type="datetime-local"
                value={form.purchaseLimitEndsAt}
                onChange={(e) => setForm((prev) => ({ ...prev, purchaseLimitEndsAt: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            {isLipstickProduct ? (
              <FormField label="Color HEX">
                <input
                  type="text"
                  value={form.colorHex}
                  placeholder="HEX color, e.g. #FF3366"
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

          <StringListInput
            label="Key Ingredients"
            placeholder="Ingredient, e.g. Shea Butter"
            items={keyIngredients}
            onChange={setKeyIngredients}
          />

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isVatIncluded} onChange={(e) => setForm((prev) => ({ ...prev, isVatIncluded: e.target.checked }))} />
              Price includes VAT
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Default
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

          <div className="mt-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-[#1d1d1f]">Variant Images</p>
                <p className="mt-0.5 text-[12px] text-[#86868b]">The first image is used as the primary variant image.</p>
              </div>
              <span className="text-[12px] font-medium text-[#86868b]">{totalVariantImages}/{MAX_VARIANT_IMAGES}</span>
            </div>

            {totalVariantImages === 0 ? (
              <VariantImageDropArea onFiles={addVariantImages} />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {existingImages.map((url, index) => (
                  <VariantImageCard
                    key={url}
                    src={url}
                    primary={index === 0}
                    onRemove={() => {
                      setExistingImages((current) => current.filter((entry) => entry !== url));
                      setRemovedUrls((current) => current.includes(url) ? current : [...current, url]);
                    }}
                  />
                ))}
                {previewImages.map((url, index) => (
                  <VariantImageCard
                    key={`${url}-${index}`}
                    src={url}
                    primary={existingImages.length === 0 && index === 0}
                    onRemove={() => setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  />
                ))}
                {totalVariantImages < MAX_VARIANT_IMAGES ? <VariantImageDropArea compact onFiles={addVariantImages} /> : null}
              </div>
            )}

            {totalVariantImages > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImageFiles([]);
                    setRemovedUrls((current) => Array.from(new Set([...current, ...existingImages])));
                    setExistingImages([]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d2d2d7] px-3 py-2 text-[12px] font-medium text-[#6e6e73] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={13} /> Remove all images
                </button>
                {removedUrls.length ? <span className="text-[12px] text-[#86868b]">Changes are applied when the variant is saved.</span> : null}
              </div>
            ) : null}

            <p className="mt-3 text-[12px] text-[#6e6e73]">
              {isLipstickProduct
                ? "Lipstick-specific fields are enabled."
                : selectedProductType
                  ? "Lipstick-specific fields are hidden for this product type."
                  : "Enter a valid product UUID to validate lipstick-specific fields."}
            </p>
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
