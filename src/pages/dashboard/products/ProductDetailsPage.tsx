/* Hallmark · macrostructure: Workbench · tone: utilitarian-premium · anchor hue: cool-blue
 * design.md managed project — tokens deferred to DESIGN.md (Apple-inspired system)
 * pre-emit critique: P5 H5 E5 S5 R4 V4
 */
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Edit2,
  ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { catalogApi } from "@/features/catalog";
import { engagementApi } from "@/features/engagement";
import { useQuery } from "@tanstack/react-query";

// ── helpers ──────────────────────────────────────────────────────────────────

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

const splitFreeFromText = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .flatMap((chunk) => chunk.split(/(?=\p{Extended_Pictographic})/gu))
    .map((item) => item.trim())
    .filter(Boolean);

const getFreeFromValue = (
  product: Readonly<Record<string, unknown>> | undefined,
): unknown =>
  product?.editorContent ??
  product?.editor_content ??
  product?.keyFeatures ??
  product?.key_features ??
  product?.freeFrom ??
  product?.free_from ??
  product?.freeFromPromise;

const parseFreeFromItems = (value: unknown): string[] => {
  const parsed = parseArray(value);
  if (typeof value === "string" && parsed.length === 0) {
    return splitFreeFromText(value);
  }
  return parsed
    .flatMap((item) => {
      if (typeof item === "string") return splitFreeFromText(item);
      if (typeof item !== "object" || item === null) return [];
      const record = item as Record<string, unknown>;
      return splitFreeFromText(
        readText(
          record.title ??
            record.label ??
            record.name ??
            record.value ??
            record.text,
        ),
      );
    })
    .filter(Boolean);
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
      row.fileUrl ?? row.url ?? row.imageUrl ?? row.image ?? row.path ?? row.src,
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
  return { url, type: typeRaw ? mediaTypeFromString(typeRaw) : "IMAGE" };
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

// ── detail-section accent palette ────────────────────────────────────────────
const SECTION_ACCENTS = ["var(--primary)", "#1a9e6b", "#c07d0a", "#86868b"] as const;

// ── component ────────────────────────────────────────────────────────────────

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
        const list = await catalogApi.products.service.list({ page: 1, limit: 1000 });
        const matched = list.data.find((entry) => {
          if (typeof entry !== "object" || entry === null) return false;
          const row = entry as Record<string, unknown>;
          return readText(row.id) === id || readText(row.slug) === id;
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
    return () => { active = false; };
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

  // ── derived values ──────────────────────────────────────────────────────────
  const title = readText(product?.title ?? product?.name, "Untitled Product");
  const sku = readText(product?.sku, "—");
  const slug = readText(product?.slug, "—");
  const price = readText(product?.price, "0");
  const compareAtPrice = readText(product?.compareAtPrice, "");
  const salePrice = readText(product?.salePrice, "");
  const secondaryPrice = compareAtPrice || salePrice;
  const weight = readText(product?.weight, "—");
  const weightUnit = readText(product?.weightUnit, "g");
  const productType = readText(product?.productType, "—");
  const occasionType = readText(product?.occasionType, "NONE");
  const vatRate = readText(product?.vatRate, "13");
  const isVatIncluded = product?.isVatIncluded !== false;
  const createdAt = formatDateTime(readText(product?.createdAt ?? product?.created_at));
  const updatedAt = formatDateTime(readText(product?.updatedAt ?? product?.updated_at));
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
  const subcategoryTitle = readText(subcategory?.title ?? subcategory?.name, "—");

  const derivedReturnPath =
    readText(category?.id) && readText(subcategory?.id)
      ? `/dashboard/categories/${readText(category?.id)}/subcategories/${readText(subcategory?.id)}`
      : "";
  const backPath = explicitReturnPath || derivedReturnPath || "/dashboard/categories";

  const descriptionText = (() => {
    const direct = readText(product?.description);
    if (direct) return direct;
    const descJson = parseObject(product?.descriptionJson);
    return readText(descJson.text, "No description available.");
  })();

  const freeFromItems = parseFreeFromItems(getFreeFromValue(product ?? undefined));

  const comboItemRows = parseArray(product?.comboItems).flatMap((entry, index) => {
    if (typeof entry !== "object" || entry === null) return [];
    const item = entry as Record<string, unknown>;
    const component = typeof item.componentProduct === "object" && item.componentProduct !== null
      ? item.componentProduct as Record<string, unknown>
      : {};
    const variant = typeof item.componentProductVariant === "object" && item.componentProductVariant !== null
      ? item.componentProductVariant as Record<string, unknown>
      : {};
    return [{
      id: readText(item.id, String(index)),
      title: readText(component.title, "Unknown product"),
      sku: readText(component.sku),
      variantTitle: readText(variant.title),
      variantSku: readText(variant.sku),
      quantity: readText(item.quantity, "1"),
      sortOrder: Number(item.sortOrder ?? index),
    }];
  }).sort((a, b) => a.sortOrder - b.sortOrder);

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
    const howToUse =
      typeof r.howToUse === "object" && r.howToUse !== null
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

  const coverImage = readText(product?.coverImage ?? product?.image ?? product?.thumbnail);
  const hoverImage = readText(product?.hoverImage);
  const howToUseImage = readText(product?.howToUseImage);

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
  // Don't surface the try-on variant image as the hero — it's virtual, not a product shot
  const heroImage = variantIsTryOn ? coverImage : (variantImage || coverImage);

  // ── not found ───────────────────────────────────────────────────────────────
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

  // ── loading ─────────────────────────────────────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title={title}
      subtitle={`${categoryTitle} · ${subcategoryTitle}`}
      onBack={() => navigate(backPath)}
      actions={
        <button
          type="button"
          onClick={() =>
            navigate(`/dashboard/products/${id}/edit?returnPath=${encodeURIComponent(backPath)}`)
          }
          className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          <Edit2 size={13} strokeWidth={2} />
          Edit
        </button>
      }
    >

      {/* ── Hero ── white panel on gray page; no outer border needed ─────────── */}
      <div className="overflow-hidden rounded-2xl bg-white">
        <div className="grid lg:grid-cols-[380px_1fr]">

          {/* Image */}
          <div className="relative flex min-h-[300px] items-center justify-center bg-[#f2f2f4] p-10">
            {heroImage ? (
              <img
                src={heroImage}
                alt={title}
                className="max-h-[260px] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-[#86868b]">
                <ImageIcon size={36} strokeWidth={1} />
                <p className="text-[13px]">No image</p>
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="flex flex-col gap-7 p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-[12px] text-[#6e6e73]">{productType}</span>
            </div>

            <div>
              <h2 className="text-[30px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#1d1d1f] sm:text-[34px]" style={{ textWrap: "balance" }}>
                {title}
              </h2>
              <div className="mt-2.5 flex items-baseline gap-3">
                <span className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                  {formatCurrency(price)}
                </span>
                {secondaryPrice && secondaryPrice !== price && (
                  <span className="text-[14px] font-medium text-[var(--primary)]">
                    {compareAtPrice ? `${formatCurrency(secondaryPrice)} was` : `${formatCurrency(secondaryPrice)} sale`}
                  </span>
                )}
              </div>
            </div>

            {/* Meta — flat label/value pairs, no box */}
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: "SKU", value: sku },
                { label: "Weight", value: weight !== "—" ? `${weight} ${weightUnit}` : "—" },
                { label: "Occasion", value: occasionType.replaceAll("_", " ") },
                { label: "VAT", value: `${vatRate}% ${isVatIncluded ? "included" : "excluded"}` },
                { label: "Category", value: categoryTitle },
                { label: "Subcategory", value: subcategoryTitle },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-[#86868b]">{label}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#f0f0f2] pt-5 text-[13px] text-[#6e6e73]">
              <span>
                {reviewStats.total} {reviewStats.total === 1 ? "review" : "reviews"}
                {reviewStats.total > 0 ? ` · ${reviewStats.avg} avg` : ""}
              </span>
              <span>{variantCount} {variantCount === 1 ? "variant" : "variants"}</span>
              {variantColorHex && variantColorHex !== "—" && (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-[#d2d2d7]" style={{ backgroundColor: variantColorHex }} />
                  <span className="font-mono text-[11px]">{variantColorHex}</span>
                </span>
              )}
              <span className="ml-auto font-mono text-[11px] text-[#86868b]">{slug}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content + Sidebar ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_268px]">

        {/* Main — one white panel, internal spacing as separator */}
        <div className="rounded-xl bg-white px-7 py-7">

          <div>
            <p className="mb-2.5 text-[12px] font-semibold text-[#86868b]">Description</p>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.72] text-[#1d1d1f]">
              {descriptionText}
            </p>
          </div>

          {productDetailSections.map((section, i) => {
            const accent = SECTION_ACCENTS[i % SECTION_ACCENTS.length];
            return (
              <div key={section.title} className="mt-7 border-t border-[#f2f2f4] pt-7">
                <p className="mb-3 text-[13px] font-semibold text-[#1d1d1f]">{section.title}</p>
                {section.items.length > 0 && (
                  <ul className="space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] leading-[1.6] text-[#1d1d1f]">
                        <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.proTip && (
                  <div className="mt-4 rounded-lg bg-[#f5f5f7] px-4 py-3">
                    <p className="text-[13px] leading-[1.6] text-[#1d1d1f]">
                      <span className="font-semibold">Pro tip — </span>
                      {section.proTip}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {freeFromItems.length > 0 && (
            <div className="mt-7 border-t border-[#f2f2f4] pt-7">
              <p className="mb-3 text-[12px] font-semibold text-[#86868b]">Free from</p>
              <div className="flex flex-wrap gap-2">
                {freeFromItems.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3.5 py-1.5 text-[13px] font-medium text-[#1d1d1f]"
                  >
                    <CheckCircle2 size={12} className="shrink-0 text-[#1a9e6b]" strokeWidth={2.5} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {comboItemRows.length > 0 && (
            <div className="mt-7 border-t border-[#f2f2f4] pt-7">
              <p className="mb-3 text-[12px] font-semibold text-[#86868b]">Package items</p>
              <div className="divide-y divide-[#f2f2f4] rounded-lg bg-[#f9f9fb] px-4">
                {comboItemRows.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{item.title}</p>
                      {(item.variantTitle || item.sku || item.variantSku) && (
                        <p className="truncate text-[11px] text-[#86868b]">
                          {[item.variantTitle, item.variantSku || item.sku].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold text-[var(--primary)]">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — SKU/Price/Weight/Type/Color already in hero; show Try On + timeline + variants */}
        <div className="self-start space-y-0 rounded-xl bg-white">
          {/* Try On — only field not surfaced in hero */}
          <div className="flex items-center justify-between px-5 py-3">
            <dt className="text-[12px] text-[#86868b]">Try On</dt>
            <dd className={`text-right text-[13px] font-medium ${variantIsTryOn ? "text-[#1a9e6b]" : "text-[#1d1d1f]"}`}>
              {variantIsTryOn ? "Enabled" : "Disabled"}
            </dd>
          </div>

          <dl className="divide-y divide-[#f2f2f4] border-t border-[#ebebed]">
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Created</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{createdAt}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Updated</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{updatedAt}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="mb-1.5 text-[11px] text-[#86868b]">Status</dt>
              <dd><StatusBadge status={status} /></dd>
            </div>
          </dl>

          {additionalInfoRows.length > 0 && (
            <dl className="divide-y divide-[#f2f2f4] border-t border-[#ebebed]">
              {additionalInfoRows.map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-4 px-5 py-3">
                  <dt className="shrink-0 capitalize text-[12px] text-[#86868b]">{row.key}</dt>
                  <dd className="break-all text-right text-[13px] font-medium text-[#1d1d1f]">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Variants — compact list in sidebar */}
          {variantRows.length > 0 && (
            <div className="border-t border-[#ebebed]">
              <div className="flex items-baseline justify-between px-5 py-3">
                <p className="text-[12px] font-semibold text-[#1d1d1f]">Variants</p>
                <p className="text-[11px] text-[#86868b]">{variantCount}</p>
              </div>
              <ul className="divide-y divide-[#f2f2f4]">
                {variantRows.map((variant, index) => {
                  const isPrimary =
                    variant.id === primaryLipstickVariant?.id ||
                    (index === 0 && !primaryLipstickVariant);
                  const variantImageUrl = readText(variant.image);
                  const hex = readText(variant.colorHex);
                  return (
                    <li
                      key={readText(variant.id, String(index))}
                      className={`flex items-center gap-3 px-5 py-2.5 ${isPrimary ? "bg-[#f8fbff]" : ""}`}
                    >
                      {/* Thumbnail or color swatch */}
                      {!variant.isTryOn && variantImageUrl ? (
                        <img src={variantImageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-[#f5f5f7] object-contain p-0.5" />
                      ) : hex && hex !== "—" ? (
                        <span className="h-9 w-9 shrink-0 rounded-lg border border-[#d2d2d7]" style={{ backgroundColor: hex }} />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                          <ImageIcon size={14} strokeWidth={1} className="text-[#86868b]" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#1d1d1f]">
                          {readText(variant.title, "Variant")}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] text-[#86868b]">{formatCurrency(variant.price)}</p>
                          {Boolean(variant.isTryOn) && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">Try On</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Media ─── no outer border; image cells use bg contrast only ──────── */}
      <div className="rounded-xl bg-white px-6 py-6">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">Media</p>
          {allGalleryItems.length > 0 && (
            <p className="text-[12px] text-[#86868b]">
              {allGalleryItems.length} gallery {allGalleryItems.length === 1 ? "item" : "items"}
            </p>
          )}
        </div>

        {/* Cover / Hover / Preview — bg-tint cells, no item borders */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Cover", src: coverImage },
            { label: "Hover", src: hoverImage },
            { label: "How To Use", src: howToUseImage },
          ].map(({ label, src }) => (
            <div key={label}>
              <p className="mb-2 text-[12px] font-medium text-[#86868b]">{label}</p>
              <div className="overflow-hidden rounded-xl bg-[#f2f2f4]">
                {src ? (
                  <img src={src} alt={label} className="h-44 w-full object-contain p-4" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-[#86868b]">
                    <ImageIcon size={20} strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-[12px] font-medium text-[#86868b]">Hover preview</p>
            <div className="group relative h-44 overflow-hidden rounded-xl bg-[#f2f2f4]">
              {coverImage || hoverImage ? (
                <>
                  <img
                    src={coverImage || hoverImage}
                    alt="cover"
                    className="h-full w-full object-contain p-4 transition-opacity duration-200"
                  />
                  {hoverImage && (
                    <img
                      src={hoverImage}
                      alt="hover"
                      className="absolute inset-0 h-full w-full bg-[#f2f2f4] object-contain p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[#86868b]">
                  <ImageIcon size={20} strokeWidth={1} />
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-[#86868b]">Hover to preview swap</p>
          </div>
        </div>

        {allGalleryItems.length > 0 ? (
          <div className="mt-6">
            <p className="mb-3 text-[12px] font-medium text-[#86868b]">Gallery</p>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8">
              {allGalleryItems.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="aspect-square overflow-hidden rounded-lg bg-[#f2f2f4]"
                >
                  {item.type === "VIDEO" ? (
                    <video src={item.url} className="h-full w-full object-cover" controls muted />
                  ) : (
                    <img src={item.url} alt={`Gallery ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-[13px] text-[#86868b]">No gallery media uploaded.</p>
        )}
      </div>
    </PageLayout>
  );
};
