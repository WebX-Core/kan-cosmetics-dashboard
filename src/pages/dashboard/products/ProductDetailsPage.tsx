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
  const lipstickColorHex = readText(product?.lipstickColorHex, "—");
  const isTryOn = Boolean(product?.isTryOn);
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
    const descJson = parseObject(product?.descriptionJson);
    const fromJson = readText(descJson.text);
    if (fromJson) return fromJson;
    return readText(product?.description, "No description available.");
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
                Try On
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {isTryOn ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f5f7] p-3 sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
                Lipstick Color Hex
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Palette size={14} className="text-[#86868b]" />
                <p className="text-[14px] font-medium text-[#1d1d1f]">
                  {lipstickColorHex}
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

      <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={16} className="text-[#6e6e73]" />
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            Description
          </h2>
        </div>
        <div
          className="prose prose-sm max-w-none text-[14px] leading-6 text-[#1d1d1f]"
          dangerouslySetInnerHTML={{ __html: descriptionText }}
        />
      </section>

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
