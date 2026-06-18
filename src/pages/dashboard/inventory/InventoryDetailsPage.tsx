import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, Package } from "lucide-react";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";
import { parseApiError } from "@/shared/utils/apiError";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";

const schema = z.object({
  stockQuantity: z.coerce.number().min(0, "Must be >= 0"),
  reservedQuantity: z.coerce.number().min(0, "Must be >= 0"),
  lowStockThreshold: z.coerce.number().min(0, "Must be >= 0"),
});

type Form = Readonly<{
  productId: string;
  productVariantId: string;
  stockQuantity: string;
  reservedQuantity: string;
  lowStockThreshold: string;
}>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): string => (typeof v === "number" ? String(v) : "0");
const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

export const InventoryDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const isCreate = !id;
  const prefillProductId = searchParams.get("productId") ?? "";
  const prefillProductName = searchParams.get("productName") ?? "";
  const prefillProductVariantId = searchParams.get("productVariantId") ?? "";
  // returnPath is passed from ProductCreatePage so we can go back to the right subcategory
  const returnPath = searchParams.get("returnPath") ?? "";

  const [form, setForm] = React.useState<Form>({
    productId: "",
    productVariantId: "",
    stockQuantity: "0",
    reservedQuantity: "0",
    lowStockThreshold: "0",
  });

  const getQuery = catalogApi.inventory.hooks.useGet(id, Boolean(id));
  const productQuery = catalogApi.products.hooks.useGet(
    prefillProductId || undefined,
    Boolean(prefillProductId) && isCreate,
  );
  const variantGetQuery = catalogApi.productVariants.hooks.useGet(
    form.productVariantId || undefined,
    Boolean(form.productVariantId),
  );
  const variantsQuery = catalogApi.productVariants.hooks.useList(
    {
      page: 1,
      limit: 200,
      product: form.productId || undefined,
    },
    Boolean(form.productId),
  );
  const createMutation = catalogApi.inventory.hooks.useCreate();
  const updateMutation = catalogApi.inventory.hooks.useUpdate();

  // Pre-fill productId from URL on create
  React.useEffect(() => {
    if (!isCreate) return;
    setForm((prev) => ({
      ...prev,
      productId: prefillProductId || prev.productId,
      productVariantId: prefillProductVariantId || prev.productVariantId,
    }));
  }, [isCreate, prefillProductId, prefillProductVariantId]);

  // Load existing inventory for edit
  React.useEffect(() => {
    if (isCreate || !getQuery.data) return;
    const row = getQuery.data as Record<string, unknown>;
    // Backend returns product/productVariant as nested objects
    const pId = str((row.product as Record<string, unknown>)?.id ?? row.productId);
    const vId = str((row.productVariant as Record<string, unknown>)?.id ?? row.productVariantId);
    setForm({
      productId: pId,
      productVariantId: vId,
      stockQuantity: num(row.stockQuantity ?? row.stock ?? row.quantity),
      reservedQuantity: num(row.reservedQuantity ?? row.reserved),
      lowStockThreshold: num(row.lowStockThreshold),
    });
  }, [getQuery.data, isCreate]);

  React.useEffect(() => {
    const variant = variantGetQuery.data as Record<string, unknown> | undefined;
    if (!variant || form.productId) return;
    const variantProductId = str((variant.product as Record<string, unknown> | undefined)?.id);
    if (!variantProductId) return;
    setForm((prev) => ({ ...prev, productId: variantProductId }));
  }, [form.productId, variantGetQuery.data]);

  const saving = createMutation.isPending || updateMutation.isPending;

  // Product name display from multiple API envelope shapes
  const productData = productQuery.data as Record<string, unknown> | undefined;
  const inventoryData = getQuery.data as Record<string, unknown> | undefined;
  const variantData = variantGetQuery.data as Record<string, unknown> | undefined;
  const inventoryProduct = toRecord(inventoryData?.product);
  const variantProduct = toRecord(variantData?.product);
  const productEntity = React.useMemo(() => {
    const root = toRecord(productData);
    const nestedProduct = toRecord(root.product);
    const nestedData = toRecord(root.data);
    const nestedItem = toRecord(root.item);
    return nestedProduct.id
      ? nestedProduct
      : nestedData.id
      ? nestedData
      : nestedItem.id
      ? nestedItem
      : root;
  }, [productData]);
  const productName =
    str(
      inventoryProduct.title ??
      inventoryProduct.name ??
      variantProduct.title ??
      variantProduct.name ??
      productEntity.title ??
      productEntity.name,
    ) || prefillProductName || prefillProductId || form.productId;

  const variantRows = (variantsQuery.data?.data ?? []) as ReadonlyArray<Record<string, unknown>>;

  const backPath = returnPath || "/dashboard/inventory";

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;
    if (!form.productVariantId) {
      toast.error("Please select a variant.");
      return;
    }
    if (parsed.reservedQuantity > parsed.stockQuantity) {
      toast.error("Reserved quantity must be less than or equal to stock quantity.");
      return;
    }

    const dto = {
      productVariantId: form.productVariantId.trim(),
      stockQuantity: parsed.stockQuantity,
      reservedQuantity: parsed.reservedQuantity,
      lowStockThreshold: parsed.lowStockThreshold,
    };

    try {
      if (isCreate) {
        await createMutation.mutateAsync(dto);
      } else if (id) {
        await updateMutation.mutateAsync({ id, dto });
      }
      toast.success(isCreate ? "Inventory created." : "Inventory updated.");
      navigate(backPath, { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (!isCreate && getQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isCreate ? "Create Inventory" : "Edit Inventory"}
      subtitle={isCreate ? "Set stock levels for a product." : "Update stock quantities and thresholds."}
      onBack={() => navigate(backPath)}
    >
      <form onSubmit={onSubmit} className="space-y-[21px]">

        {/* Product context */}
        <div className="grid gap-[13px] md:grid-cols-2">
          <div>
            <label className="mb-[6px] block text-[13px] font-medium text-[#1d1d1f]">Product</label>
            <div className="flex h-11 w-full items-center gap-[10px] rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-4">
              <Package size={14} className="shrink-0 text-[#86868b]" />
              <span className="text-[14px] text-[#1d1d1f]">{productName || "—"}</span>
            </div>
          </div>
          <FormField label="Variant" required>
            <select
              value={form.productVariantId}
              onChange={(e) => setForm((p) => ({ ...p, productVariantId: e.target.value }))}
              className={inputClass}
              disabled={!form.productId || variantsQuery.isLoading}
            >
              <option value="">
                {!form.productId
                  ? "No product context"
                  : variantsQuery.isLoading
                  ? "Loading variants..."
                  : "Select variant"}
              </option>
              {variantRows.map((variant) => {
                const variantId = str(variant.id);
                const variantTitle = str(variant.title);
                const variantSku = str(variant.sku);
                return (
                  <option key={variantId} value={variantId}>
                    {variantTitle} {variantSku ? `(${variantSku})` : ""}
                  </option>
                );
              })}
            </select>
          </FormField>
        </div>

        {/* Stock levels */}
        <FormSection title="Stock Levels" description="Enter quantities. Reserved must not exceed stock.">
          <div className="grid gap-[13px] md:grid-cols-3">
            <FormField label="Stock Quantity" required>
              <input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(e) => setForm((p) => ({ ...p, stockQuantity: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Reserved Quantity">
              <input
                type="number"
                min={0}
                value={form.reservedQuantity}
                onChange={(e) => setForm((p) => ({ ...p, reservedQuantity: e.target.value }))}
                className={inputClass}
              />
            </FormField>
            <FormField label="Low Stock Threshold">
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                className={inputClass}
              />
            </FormField>
          </div>

        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isCreate ? "Create Inventory" : "Update Inventory"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate(backPath)}
        />
      </form>
    </ModernFormLayout>
  );
};
