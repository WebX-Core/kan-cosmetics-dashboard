import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Boxes,
  Calendar,
  CircleDollarSign,
  MessageSquare,
  Edit2,
  FileText,
  ImageIcon,
  Info,
  Palette,
  Ruler,
  Tag,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { catalogApi } from "@/features/catalog";
import { engagementApi } from "@/features/engagement";
import { useQuery } from "@tanstack/react-query";

const readText = (value: unknown, fallback = ""): string =>
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

const parseObject = (value: unknown): Readonly<Record<string, unknown>> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Readonly<Record<string, unknown>>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Readonly<Record<string, unknown>>;
      }
    } catch {
      return {};
    }
  }
  return {};
};

const parseArray = (value: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatCurrency = (value: unknown): string => {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, "").trim())
        : NaN;
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const imageFromUnknown = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const row = value as Record<string, unknown>;
    return readText(
      row.fileUrl ??
        row.url ??
        row.imageUrl ??
        row.image ??
        row.path ??
        row.src,
    );
  }
  return "";
};
type ProductMediaType = "IMAGE" | "VIDEO";
type ProductMedia = Readonly<{ url: string; type: ProductMediaType }>;
const mediaTypeFromString = (value: string): ProductMediaType =>
  value.toUpperCase().includes("VIDEO") ? "VIDEO" : "IMAGE";
const isVideoUrl = (url: string): boolean =>
  /\.(mp4|webm|ogg|mov|m4v|avi)(\?.*)?$/i.test(url);
const mediaFromUnknown = (value: unknown): ProductMedia | null => {
  if (typeof value === "string") {
    return { url: value, type: isVideoUrl(value) ? "VIDEO" : "IMAGE" };
  }
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  const url = imageFromUnknown(row);
  if (!url) return null;
  const typeRaw = readText(row.type ?? row.mediaType ?? row.assetType);
  return {
    url,
    type: typeRaw ? mediaTypeFromString(typeRaw) : "IMAGE",
  };
};

const kvRowsFromJson = (
  value: unknown,
): ReadonlyArray<Readonly<{ key: string; value: string }>> => {
  const object = parseObject(value);
  return Object.entries(object)
    .map(([key, raw]) => ({
      key,
      value:
        typeof raw === "string"
          ? raw
          : typeof raw === "number" || typeof raw === "boolean"
            ? String(raw)
            : JSON.stringify(raw),
    }))
    .filter(
      (entry) =>
        entry.value && entry.value !== "undefined" && entry.value !== "null",
    );
};

const extractProductRecord = (
  value: unknown,
): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id === "string" ||
    typeof row.slug === "string" ||
    typeof row.title === "string"
  ) {
    return row;
  }
  const candidates = [row.product, row.data, row.item, row.result];
  for (const candidate of candidates) {
    const extracted = extractProductRecord(candidate);
    if (extracted) return extracted;
  }
  return null;
};

export const ProductDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const explicitReturnPath = searchParams.get("returnPath") ?? "";

  const query = catalogApi.products.hooks.useGet(id, Boolean(id));
  const [fallbackProduct, setFallbackProduct] = React.useState<Record<
    string,
    unknown
  > | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadFallback = async () => {
      if (!id) return;
      const current = extractProductRecord(query.data);
      if (current) return;
      try {
        const list = await catalogApi.products.service.list({
          page: 1,
          limit: 1000,
        });
        const matched = list.data.find((entry) => {
          if (typeof entry !== "object" || entry === null) return false;
          const row = entry as Record<string, unknown>;
          const rowId = readText(row.id);
          const rowSlug = readText(row.slug);
          return rowId === id || rowSlug === id;
        });
        if (!active) return;
        setFallbackProduct(
          typeof matched === "object" && matched !== null
            ? (matched as Record<string, unknown>)
            : null,
        );
      } catch {
        if (!active) return;
        setFallbackProduct(null);
      }
    };
    void loadFallback();
    return () => {
      active = false;
    };
  }, [id, query.data, query.isError]);

  const product = React.useMemo(
    () => extractProductRecord(query.data) ?? fallbackProduct,
    [query.data, fallbackProduct],
  );
  const resolvedProductId = React.useMemo(
    () => readText(product?.id ?? id),
    [product?.id, id],
  );
  const reviewsQuery = useQuery({
    queryKey: ["productReviews", resolvedProductId],
    queryFn: () =>
      engagementApi.reviews.byProduct(resolvedProductId, { page: 1, limit: 200 }),
    enabled: Boolean(resolvedProductId),
  });

  const title = readText(product?.title ?? product?.name, "Untitled Product");
  const sku = readText(product?.sku, "—");
  const slug = readText(product?.slug, "—");
  const price = readText(product?.price, "0");
  const salePrice = readText(product?.salePrice, price);
  const weight = readText(product?.weight, "—");
  const productType = readText(product?.productType, "—");
  const createdAt = formatDateTime(
    readText(product?.createdAt ?? product?.created_at),
  );
  const updatedAt = formatDateTime(
    readText(product?.updatedAt ?? product?.updated_at),
  );
  const status: "Active" | "Inactive" =
    product?.isDeleted === true ? "Inactive" : "Active";
  const productReviews = React.useMemo(() => {
    const payload = reviewsQuery.data;
    const envelope =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : undefined;
    const items: unknown[] = Array.isArray(payload)
      ? payload
      : Array.isArray(envelope?.data)
      ? (envelope!.data as unknown[])
      : [];
    return items.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null,
    );
  }, [reviewsQuery.data]);
  const reviewStats = React.useMemo(() => {
    const total = productReviews.length;
    if (!total) return { total: 0, avg: "0.0" };
    const sum = productReviews.reduce((acc, entry) => {
      const rating = entry.rating;
      return acc + (typeof rating === "number" ? rating : 0);
    }, 0);
    return { total, avg: (sum / total).toFixed(1) };
  }, [productReviews]);

  const subcategory =
    typeof product?.subcategory === "object" && product?.subcategory !== null
      ? (product.subcategory as Record<string, unknown>)
      : null;
  const category =
    subcategory &&
    typeof subcategory.category === "object" &&
    subcategory.category !== null
      ? (subcategory.category as Record<string, unknown>)
      : null;

  const categoryTitle = readText(category?.title ?? category?.name, "—");
  const subcategoryTitle = readText(
    subcategory?.title ?? subcategory?.name,
    "—",
  );
  const derivedReturnPath =
    readText(category?.id) && readText(subcategory?.id)
      ? `/dashboard/categories/${readText(category?.id)}/subcategories/${readText(subcategory?.id)}`
      : "";
  const backPath =
    explicitReturnPath || derivedReturnPath || "/dashboard/categories";

  const descriptionText = (() => {
    const direct = readText(product?.description);
    if (direct) return direct;
    // Backward compat: old records stored description inside descriptionJson.text
    const descJson = parseObject(product?.descriptionJson);
    return readText(descJson.text, "No description available.");
  })();

  const freeFromItems = parseArray(product?.keyFeatures)
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => readText(item.title))
    .filter(Boolean);

  const productDetailSections = (() => {
    const raw = product?.descriptionJson;
    const obj =
      typeof raw === "string"
        ? (() => { try { return JSON.parse(raw) as unknown; } catch { return null; } })()
        : raw;
    if (typeof obj !== "object" || obj === null) return [];
    const r = obj as Record<string, unknown>;
    const toStrArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const howToUse = typeof r.howToUse === "object" && r.howToUse !== null
      ? (r.howToUse as Record<string, unknown>)
      : {};
    const sections: Array<{ title: string; items: string[]; proTip?: string }> = [];
    const ps = toStrArr(r.problemItSolves);
    if (ps.length) sections.push({ title: "Problem It Solves", items: ps });
    const wf = toStrArr(r.whoItsFor);
    if (wf.length) sections.push({ title: "Who It's For", items: wf });
    const ki = toStrArr(r.keyIngredients);
    if (ki.length) sections.push({ title: "Key Ingredients", items: ki });
    const instructions = toStrArr(howToUse.instructions);
    const proTip = typeof howToUse.proTip === "string" ? howToUse.proTip : undefined;
    if (instructions.length || proTip) {
      sections.push({ title: "How To Use", items: instructions, proTip });
    }
    return sections;
  })();

  const additionalInfoRows = kvRowsFromJson(product?.additionalInformationJson);

  const coverImage = readText(
    product?.coverImage ?? product?.image ?? product?.thumbnail,
  );
  const hoverImage = readText(product?.hoverImage);

  const mediaAssetItems = parseArray(product?.mediaAssets)
    .map(mediaFromUnknown)
    .filter((item): item is ProductMedia => Boolean(item));
  const galleryItems = parseArray(product?.gallery)
    .map(mediaFromUnknown)
    .filter((item): item is ProductMedia => Boolean(item));
  const allGalleryItems = Array.from(
    new Map(
      [...mediaAssetItems, ...galleryItems].map((item) => [item.url, item]),
    ).values(),
  );
  const variantRows = parseArray(product?.variants).filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null,
  );
  const lipstickVariantRows = variantRows.filter(
    (entry) => Boolean(entry.isTryOn) || readText(entry.colorHex) || readText(entry.image),
  );
  const primaryLipstickVariant =
    lipstickVariantRows.find((entry) => Boolean(entry.isDefault)) ??
    lipstickVariantRows.find((entry) => Boolean(entry.isTryOn)) ??
    lipstickVariantRows[0] ??
    null;
  const variantImage = readText(primaryLipstickVariant?.image);
  const variantColorHex = readText(primaryLipstickVariant?.colorHex, "—");
  const variantIsTryOn = Boolean(primaryLipstickVariant?.isTryOn);
  const variantCount = variantRows.length;
  const heroImage = variantImage || coverImage;

  if (!id || (!query.isLoading && !query.isError && !product)) {
    return (
      <PageLayout
        title="Product Not Found"
        subtitle="The requested product does not exist or was removed."
        onBack={() => navigate(backPath)}
      >
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-8 text-sm text-[#6e6e73]">
          No product was found for this record.
        </div>
      </PageLayout>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
      </div>
    );
  }

  return (
    <PageLayout
      title={title}
      subtitle="Complete product information"
      onBack={() => navigate(backPath)}
      actions={
        <button
          type="button"
          onClick={() =>
            navigate(
              `/dashboard/products/${id}/edit?returnPath=${encodeURIComponent(backPath)}`,
            )
          }
          className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          <Edit2 size={13} strokeWidth={2} />
          Edit Product
        </button>
      }
    >
      <section className="overflow-hidden rounded-2xl border border-[#e5e5e7] bg-linear-to-b from-white to-[#f5f5f7]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between gap-6 p-6 lg:p-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                  Product Hero
                </span>
                {productType === "LIPSTICK" ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                    Lipstick Variant Focus
                  </span>
                ) : (
                  <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                    Product Overview
                  </span>
                )}
              </div>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f] sm:text-[34px]">
                  {title}
                </h2>
                <p className="max-w-xl text-[15px] leading-6 text-[#6e6e73]">
                  {productType === "LIPSTICK" && heroImage
                    ? "The primary variant image is surfaced here so the lipstick finish, shade, and presentation are visible before the rest of the catalog detail."
                    : "Core product identity, merchandising signals, and variant context are grouped here for a faster read."}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#e5e5e7] bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                  Product Type
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                  {productType}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e5e7] bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                  Primary Variant
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                  {readText(primaryLipstickVariant?.title, variantCount ? "Variant Available" : "None")}
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e5e7] bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                  Variant Count
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                  {variantCount}
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-[#e5e5e7] bg-white p-4 lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[#d2d2d7] bg-linear-to-b from-[#fbfbfc] to-[#f4f4f7] p-4">
              {heroImage ? (
                <div className="relative flex h-full w-full items-center justify-center">
                  <img
                    src={heroImage}
                    alt={`${title} hero`}
                    className="max-h-[380px] w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
                  />
                  {variantIsTryOn ? (
                    <span className="absolute left-4 top-4 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Try On Enabled
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#86868b] shadow-sm">
                    <ImageIcon size={22} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#1d1d1f]">
                    No hero image available
                  </p>
                  <p className="mt-1 text-xs text-[#6e6e73]">
                    Add a variant image to make the lipstick hero visible here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCardV2
          label="Status"
          value={status}
          icon={Tag}
          colorVariant="blue"
          compact
        />
        <StatCardV2
          label="Sale Price"
          value={`Rs ${salePrice}`}
          icon={CircleDollarSign}
          colorVariant="emerald"
          compact
        />
        <StatCardV2
          label="Category"
          value={categoryTitle}
          icon={Boxes}
          colorVariant="cyan"
          compact
        />
        <StatCardV2
          label="Subcategory"
          value={subcategoryTitle}
          icon={Tag}
          colorVariant="blue"
          compact
        />
        <StatCardV2
          label="Reviews"
          value={`${reviewStats.total} (${reviewStats.avg})`}
          icon={MessageSquare}
          colorVariant="amber"
          compact
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Info size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
              Core Details
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                SKU
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {sku}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Slug
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {slug}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Base Price
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                Rs {price}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Weight
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {weight}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Product Type
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {productType}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Variant Try On
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {variantIsTryOn ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Variant Color Hex
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Palette size={14} className="text-[#86868b]" />
                <p className="text-[14px] font-medium text-[#1d1d1f]">
                  {variantColorHex}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
              Timeline
            </h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Created
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {createdAt}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Updated
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {updatedAt}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Record State
              </p>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {variantRows.length ? (
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Boxes size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
              Variants
            </h2>
            <span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-[11px] font-medium text-[#6e6e73]">
              {variantCount}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-[#d2d2d7] bg-linear-to-b from-[#f8f9fb] to-[#eef2f7] p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Primary Variant
              </p>
              <div className="rounded-lg border border-[#e5e5e7] bg-white p-3">
                {variantImage ? (
                  <img
                    src={variantImage}
                    alt="Primary variant"
                    className="h-52 w-full rounded-md object-contain"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-md bg-[#f5f5f7] text-sm text-[#86868b]">
                    No variant image
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#1d1d1f]">
                      {readText(primaryLipstickVariant?.title, "Variant")}
                    </span>
                    {variantIsTryOn ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                        Try On
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                        Standard
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6e6e73]">
                    {readText(primaryLipstickVariant?.variantType, "Type")} ·{" "}
                    {readText(primaryLipstickVariant?.variantValue, "Value")}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#6e6e73]">Price</span>
                    <span className="font-medium text-[#1d1d1f]">
                      {formatCurrency(primaryLipstickVariant?.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#6e6e73]">Color</span>
                    <span className="font-mono text-[12px] font-medium text-[#1d1d1f]">
                      {variantColorHex}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {variantRows.map((variant, index) => {
                const isPrimary =
                  variant.id === primaryLipstickVariant?.id ||
                  (index === 0 && !primaryLipstickVariant);
                const variantImageUrl = readText(variant.image);
                return (
                  <div
                    key={readText(variant.id, String(index))}
                    className={`rounded-xl border bg-white p-3 ${
                      isPrimary ? "border-[#0071e3]/30 ring-1 ring-[#0071e3]/10" : "border-[#e5e5e7]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1d1d1f]">
                          {readText(variant.title, "Variant")}
                        </p>
                        <p className="text-xs text-[#6e6e73]">
                          {readText(variant.variantType, "Type")} · {readText(variant.variantValue, "Value")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {variant.isDefault ? (
                          <span className="rounded-full bg-[#f5f5f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                            Default
                          </span>
                        ) : null}
                        {variant.isTryOn ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                            Try On
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#e5e5e7] bg-[#f5f5f7]">
                      {variantImageUrl ? (
                        <img
                          src={variantImageUrl}
                          alt={readText(variant.title, "Variant")}
                          className="h-36 w-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-36 items-center justify-center text-xs text-[#86868b]">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#6e6e73]">Price</span>
                      <span className="font-medium text-[#1d1d1f]">
                        {formatCurrency(variant.price)}
                      </span>
                    </div>
                    {readText(variant.colorHex) ? (
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-[#6e6e73]">Color</span>
                        <span className="font-mono text-[12px] font-medium text-[#1d1d1f]">
                          {readText(variant.colorHex)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={16} className="text-[#6e6e73]" />
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            Description
          </h2>
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#1d1d1f]">
          {descriptionText}
        </p>
      </section>

      {productDetailSections.length > 0 && (
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Info size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Product Details</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {productDetailSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  {section.title}
                </p>
                {section.items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {section.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-3 py-1 text-[13px] text-[#1d1d1f]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {section.proTip && (
                  <p className="mt-2 text-[13px] italic text-[#6e6e73]">
                    <span className="font-medium not-italic text-[#1d1d1f]">Pro Tip: </span>
                    {section.proTip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {freeFromItems.length > 0 && (
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Tag size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Free From</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {freeFromItems.map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-1 text-[13px] font-medium text-[#1d1d1f]"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Ruler size={16} className="text-[#6e6e73]" />
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            Additional Information
          </h2>
        </div>
        {additionalInfoRows.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {additionalInfoRows.map((row) => (
              <div key={row.key} className="rounded-lg bg-[#f5f5f7] p-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                  {row.key}
                </p>
                <p className="mt-1 wrap-break-word text-[14px] font-medium text-[#1d1d1f]">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-[#6e6e73]">
            No additional information available.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-[#6e6e73]" />
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Images</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
          <div className="rounded-xl border border-[#d2d2d7] bg-linear-to-b from-[#f8f9fb] to-[#eef2f7] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
              Cover Image
            </p>
            {coverImage ? (
              <img
                src={coverImage}
                alt="Cover"
                className="h-48 w-full rounded-lg border border-[#e5e5e7] bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-[#e5e5e7] bg-white text-[#86868b]">
                Not available
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#d2d2d7] bg-linear-to-b from-[#f8f9fb] to-[#eef2f7] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
              Hover Image
            </p>
            {hoverImage ? (
              <img
                src={hoverImage}
                alt="Hover"
                className="h-48 w-full rounded-lg border border-[#e5e5e7] bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-[#e5e5e7] bg-white text-[#86868b]">
                Not available
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#d2d2d7] bg-linear-to-b from-[#f8f9fb] to-[#eef2f7] p-3">
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
              Frontend Hover Preview
            </p>
            <div className="group relative h-48 overflow-hidden rounded-lg border border-[#e5e5e7] bg-white">
              <img
                src={coverImage || hoverImage}
                alt="Product preview"
                className="h-full w-full object-contain p-2 transition-opacity duration-200"
              />
              {hoverImage ? (
                <img
                  src={hoverImage}
                  alt="Product hover preview"
                  className="absolute inset-0 h-full w-full bg-white object-contain p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              ) : null}
            </div>
            <p className="mt-2 text-[12px] text-[#6e6e73]">
              Hover this card to see hover-image state.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
              Gallery Media
            </p>
            <p className="text-[12px] font-medium text-[#1d1d1f]">
              {allGalleryItems.length} total
            </p>
          </div>
          {allGalleryItems.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {allGalleryItems.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="overflow-hidden rounded-xl border border-[#d2d2d7] bg-linear-to-b from-white to-[#f6f7fa] p-2 shadow-sm"
                >
                  {item.type === "VIDEO" ? (
                    <video
                      src={item.url}
                      className="h-28 w-full rounded-md bg-white object-contain"
                      controls
                      muted
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`Gallery ${index + 1}`}
                      className="h-28 w-full rounded-md object-contain bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#e5e5e7] bg-white px-4 py-6 text-center text-[13px] text-[#86868b]">
              No gallery media available.
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
};
