import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import {
  ModernFormLayout,
  FormSection,
  FormField,
  FormActions,
} from "@/shared/components/forms/ModernFormLayout";
import { slugify } from "@/shared/utils/slug";
import { validateOrToast } from "@/shared/utils/validation";
import { parseApiError } from "@/shared/utils/apiError";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 10;
type ProductMediaType = "IMAGE" | "VIDEO";
type MediaUpload = Readonly<{ file: File; type: ProductMediaType }>;
type ExistingMedia = Readonly<{ url: string; type: ProductMediaType }>;

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  subcategoryId: z.string().uuid("Subcategory must be a valid UUID"),
  sku: z.string().trim().min(1, "SKU is required"),
  price: z.string().trim().min(1, "Price is required"),
  weight: z.string().trim().optional(),
  productType: z.enum(["LIPSTICK", "OTHERS"]).optional(),
  sortOrder: z.coerce.number().optional(),
  description: z.string().trim().optional(),
  isTryOn: z.boolean().optional(),
  lipstickColorHex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{6})$/, "Use HEX like #FF3366")
    .optional()
    .or(z.literal("")),
  stockQuantity: z.coerce.number().min(0, "Stock must be >= 0").optional(),
  reservedQuantity: z.coerce
    .number()
    .min(0, "Reserved must be >= 0")
    .optional(),
  lowStockThreshold: z.coerce
    .number()
    .min(0, "Threshold must be >= 0")
    .optional(),
  inventoryInStock: z.boolean().optional(),
});

type Form = Readonly<{
  title: string;
  slug: string;
  subcategoryId: string;
  sku: string;
  price: string;
  weight: string;
  productType: "" | "LIPSTICK" | "OTHERS";
  sortOrder: string;
  description: string;
  isTryOn: boolean;
  lipstickColorHex: string;
  stockQuantity: string;
  reservedQuantity: string;
  lowStockThreshold: string;
  inventoryInStock: boolean;
}>;

const initial: Form = {
  title: "",
  slug: "",
  subcategoryId: "",
  sku: "",
  price: "",
  weight: "",
  productType: "",
  sortOrder: "0",
  description: "",
  isTryOn: false,
  lipstickColorHex: "",
  stockQuantity: "0",
  reservedQuantity: "0",
  lowStockThreshold: "0",
  inventoryInStock: true,
};

const read = (value: unknown): string =>
  typeof value === "string" ? value : "";
const readDescriptionText = (
  row: Readonly<Record<string, unknown>>,
): string => {
  const directDescription = read(row.description);
  const rawDescriptionJson = row.descriptionJson;
  if (typeof rawDescriptionJson === "string") {
    try {
      const parsed = JSON.parse(rawDescriptionJson) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const text = read((parsed as Record<string, unknown>).text);
        return text || directDescription;
      }
      return directDescription;
    } catch {
      return directDescription;
    }
  }
  if (typeof rawDescriptionJson === "object" && rawDescriptionJson !== null) {
    const text = read((rawDescriptionJson as Record<string, unknown>).text);
    return text || directDescription;
  }
  return directDescription;
};
const isValidImageFile = (file: File): boolean =>
  file.type.startsWith("image/") && file.size <= MAX_IMAGE_SIZE_BYTES;
const isValidGalleryMediaFile = (file: File): boolean => {
  if (file.type.startsWith("image/")) return file.size <= MAX_IMAGE_SIZE_BYTES;
  if (file.type.startsWith("video/")) return file.size <= MAX_VIDEO_SIZE_BYTES;
  return false;
};
const isVideoUrl = (url: string): boolean =>
  /\.(mp4|webm|ogg|mov|m4v|avi)(\?.*)?$/i.test(url);
const mediaTypeFromFile = (file: File): ProductMediaType =>
  file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
const mediaTypeFromString = (value: string): ProductMediaType =>
  value.toUpperCase().includes("VIDEO") ? "VIDEO" : "IMAGE";
const readMedia = (value: unknown): ExistingMedia | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const url = read(row.fileUrl ?? row.url ?? row.imageUrl ?? row.src);
  if (!url) return null;
  const rawType = read(row.type ?? row.mediaType ?? row.assetType);
  const type = rawType
    ? mediaTypeFromString(rawType)
    : isVideoUrl(url)
      ? "VIDEO"
      : "IMAGE";
  return { url, type };
};

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const selectClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const ImageCard: React.FC<{
  src: string;
  onRemove: () => void;
  isVideo?: boolean;
}> = ({ src, onRemove, isVideo }) => (
  <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-[#d2d2d7] bg-[#f5f5f7]">
    {isVideo ? (
      <video src={src} className="h-full w-full object-cover" muted controls />
    ) : (
      <img src={src} alt="Product" className="h-full w-full object-cover" />
    )}
    <button
      type="button"
      onClick={onRemove}
      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f]/80 text-white transition hover:bg-[#1d1d1f]"
      aria-label="Remove image"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

const HoverPreviewCard: React.FC<{
  coverSrc: string;
  hoverSrc: string;
}> = ({ coverSrc, hoverSrc }) => {
  const baseSrc = coverSrc || hoverSrc;
  if (!baseSrc) return null;
  return (
    <div className="rounded-xl border border-[#d2d2d7] bg-linear-to-b from-[#f8f9fb] to-[#eef2f7] p-3">
      <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#86868b]">
        Live Preview
      </p>
      <div className="group relative h-56 overflow-hidden rounded-lg border border-[#e5e5e7] bg-white">
        <img
          src={baseSrc}
          alt="Product preview"
          className="h-full w-full object-contain p-2 transition-opacity duration-200"
        />
        {hoverSrc ? (
          <img
            src={hoverSrc}
            alt="Product hover preview"
            className="absolute inset-0 h-full w-full object-contain bg-white p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        ) : null}
      </div>
      <p className="mt-2 text-[12px] text-[#6e6e73]">
        Hover the preview to see hover image state.
      </p>
    </div>
  );
};

const DropArea: React.FC<{
  label: string;
  multiple?: boolean;
  compact?: boolean;
  accept?: string;
  helperText?: string;
  promptText?: string;
  onFiles: (files: FileList | null) => void;
}> = ({
  label,
  multiple = false,
  compact = false,
  accept = "image/*",
  helperText = "Only images, up to 5MB",
  promptText = "Choose image file or drag and drop it here.",
  onFiles,
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(event.dataTransfer?.files ?? null);
      }}
      className={
        compact
          ? "flex h-28 w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] p-2 text-center"
          : "rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-6 text-center"
      }
    >
      <UploadCloud
        size={compact ? 18 : 26}
        className="mx-auto text-[#86868b]"
      />
      {!compact ? (
        <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">
          {promptText}
        </p>
      ) : null}
      {!compact ? (
        <p className="mt-1 text-[12px] text-[#86868b]">{helperText}</p>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={
          compact
            ? "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[16px] font-semibold leading-none text-white hover:bg-blue-600"
            : "mt-3 inline-flex h-9 items-center rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#fafafa]"
        }
      >
        {compact ? "+" : "Browse files"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        aria-label={label}
        onChange={(event) => {
          onFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const isEdit = Boolean(id);
  const prefillSubcategoryId = searchParams.get("subcategoryId") ?? "";
  const prefillCategoryId = searchParams.get("categoryId") ?? "";
  const explicitReturnPath = searchParams.get("returnPath") ?? "";

  const getQuery = catalogApi.products.hooks.useGet(id, isEdit);
  const createMutation = catalogApi.products.hooks.useCreate();
  const updateMutation = catalogApi.products.hooks.useUpdate();
  const createInventoryMutation = catalogApi.inventory.hooks.useCreate();

  const [form, setForm] = React.useState<Form>(initial);
  const [manualSlug, setManualSlug] = React.useState(false);
  const [resolvedProductId, setResolvedProductId] = React.useState("");
  const [fallbackEditProduct, setFallbackEditProduct] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [resolvedReturnPath, setResolvedReturnPath] = React.useState("");

  const [coverImageFile, setCoverImageFile] = React.useState<File | null>(null);
  const [hoverImageFile, setHoverImageFile] = React.useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = React.useState<
    ReadonlyArray<MediaUpload>
  >([]);

  const [existingCoverImage, setExistingCoverImage] =
    React.useState<string>("");
  const [existingHoverImage, setExistingHoverImage] =
    React.useState<string>("");
  const [existingGallery, setExistingGallery] = React.useState<
    ReadonlyArray<ExistingMedia>
  >([]);
  const [removedUrls, setRemovedUrls] = React.useState<ReadonlyArray<string>>(
    [],
  );

  React.useEffect(() => {
    if (isEdit || !prefillSubcategoryId) return;
    setForm((prev) => ({ ...prev, subcategoryId: prefillSubcategoryId }));
  }, [isEdit, prefillSubcategoryId]);

  React.useEffect(() => {
    let active = true;
    const loadFallback = async () => {
      if (!isEdit || !id) return;
      const source = getQuery.data as Record<string, unknown> | undefined;
      const candidate =
        source && typeof source.product === "object" && source.product !== null
          ? (source.product as Record<string, unknown>)
          : source;
      if (
        candidate &&
        (read(candidate.id) || read(candidate.slug) || read(candidate.title))
      )
        return;
      try {
        const list = await catalogApi.products.service.list({
          page: 1,
          limit: 1000,
        });
        const matched = list.data.find((entry) => {
          if (typeof entry !== "object" || entry === null) return false;
          const row = entry as Record<string, unknown>;
          return read(row.id) === id || read(row.slug) === id;
        });
        if (!active) return;
        setFallbackEditProduct(
          typeof matched === "object" && matched !== null
            ? (matched as Record<string, unknown>)
            : null,
        );
      } catch {
        if (!active) return;
        setFallbackEditProduct(null);
      }
    };
    void loadFallback();
    return () => {
      active = false;
    };
  }, [getQuery.data, getQuery.isError, id, isEdit]);

  React.useEffect(() => {
    if (!isEdit) return;
    const source = getQuery.data ?? fallbackEditProduct;
    if (!source) return;
    const raw = source as Record<string, unknown>;
    const row =
      typeof raw.product === "object" && raw.product !== null
        ? (raw.product as Record<string, unknown>)
        : raw;

    setResolvedProductId(read(row.id) || read(raw.id) || (id ?? ""));
    const subId = read(
      (row.subcategory as Record<string, unknown>)?.id ?? row.subcategoryId,
    );
    const rowCategoryId = read(
      (
        (row.subcategory as Record<string, unknown>)?.category as Record<
          string,
          unknown
        >
      )?.id,
    );
    if (rowCategoryId && subId) {
      setResolvedReturnPath(
        `/dashboard/categories/${rowCategoryId}/subcategories/${subId}`,
      );
    }
    const descriptionText = readDescriptionText(row);

    const mediaAssets = Array.isArray(row.mediaAssets) ? row.mediaAssets : [];
    const gallery = mediaAssets
      .map(readMedia)
      .filter((item): item is ExistingMedia => Boolean(item));

    setForm({
      title: read(row.title ?? row.name),
      slug: read(row.slug),
      subcategoryId: subId,
      sku: read(row.sku),
      price: read(row.price),
      weight: read(row.weight),
      productType: (read(row.productType) as Form["productType"]) || "",
      sortOrder: row.sortOrder != null ? String(row.sortOrder) : "0",
      description: descriptionText,
      isTryOn: Boolean(row.isTryOn),
      lipstickColorHex: read(row.lipstickColorHex),
      stockQuantity: "0",
      reservedQuantity: "0",
      lowStockThreshold: "0",
      inventoryInStock: true,
    });

    setExistingCoverImage(read(row.coverImage));
    setExistingHoverImage(read(row.hoverImage));
    setExistingGallery(gallery);
    setRemovedUrls([]);
    setCoverImageFile(null);
    setHoverImageFile(null);
    setGalleryFiles([]);

    setManualSlug(Boolean(read(row.slug)));
  }, [fallbackEditProduct, getQuery.data, id, isEdit]);

  React.useEffect(() => {
    if (manualSlug) return;
    const next = slugify(form.title);
    if (next === form.slug) return;
    setForm((prev) => ({ ...prev, slug: next }));
  }, [form.title, form.slug, manualSlug]);

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createInventoryMutation.isPending;

  const backPath = prefillCategoryId
    ? `/dashboard/categories/${prefillCategoryId}/subcategories/${prefillSubcategoryId}`
    : explicitReturnPath || resolvedReturnPath || "/dashboard/categories";

  const imageFileErrors = React.useCallback(
    (files: FileList | null): ReadonlyArray<File> => {
      if (!files?.length) return [];
      const all = Array.from(files);
      const valid = all.filter(isValidImageFile);
      if (valid.length !== all.length) {
        toast.error("Only image files up to 5MB are allowed.");
      }
      return valid;
    },
    [toast],
  );
  const galleryFileErrors = React.useCallback(
    (files: FileList | null): ReadonlyArray<File> => {
      if (!files?.length) return [];
      const all = Array.from(files);
      const valid = all.filter(isValidGalleryMediaFile);
      if (valid.length !== all.length) {
        toast.error(
          "Gallery supports images (up to 5MB) and videos (up to 50MB).",
        );
      }
      return valid;
    },
    [toast],
  );

  const markRemovedUrl = React.useCallback((url: string) => {
    if (!url) return;
    setRemovedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  }, []);

  const previewCover = coverImageFile
    ? URL.createObjectURL(coverImageFile)
    : "";
  const previewHover = hoverImageFile
    ? URL.createObjectURL(hoverImageFile)
    : "";
  const previewGallery = React.useMemo(
    () =>
      galleryFiles.map((item) => ({
        ...item,
        preview: URL.createObjectURL(item.file),
      })),
    [galleryFiles],
  );
  const hasCoverImage = Boolean(coverImageFile || existingCoverImage);
  const hasHoverImage = Boolean(hoverImageFile || existingHoverImage);
  const totalGalleryImages = previewGallery.length + existingGallery.length;
  const canAddGalleryImage = totalGalleryImages < MAX_GALLERY_IMAGES;

  React.useEffect(
    () => () => {
      if (previewCover) URL.revokeObjectURL(previewCover);
      if (previewHover) URL.revokeObjectURL(previewHover);
      previewGallery.forEach((item) => URL.revokeObjectURL(item.preview));
    },
    [previewCover, previewHover, previewGallery],
  );

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;

    if (
      parsed.productType !== "LIPSTICK" &&
      (parsed.isTryOn || parsed.lipstickColorHex)
    ) {
      toast.error("Try-on fields are only allowed for LIPSTICK products.");
      return;
    }

    const slug = slugify(parsed.slug || parsed.title);
    const payload = {
      title: parsed.title,
      slug,
      subcategoryId: parsed.subcategoryId || undefined,
      sku: parsed.sku,
      price: parsed.price,
      weight: parsed.weight || undefined,
      productType: parsed.productType || undefined,
      sortOrder: parsed.sortOrder ?? 0,
      descriptionJson: parsed.description
        ? { text: parsed.description }
        : undefined,
      isTryOn:
        parsed.productType === "LIPSTICK" ? Boolean(parsed.isTryOn) : undefined,
      lipstickColorHex:
        parsed.productType === "LIPSTICK"
          ? parsed.lipstickColorHex || undefined
          : undefined,
      coverImage: coverImageFile ?? undefined,
      hoverImage: hoverImageFile ?? undefined,
      gallery: galleryFiles.length
        ? galleryFiles.map((item) => item.file)
        : undefined,
      mediaAssets: galleryFiles.length ? galleryFiles : undefined,
      mediaAssetTypes: galleryFiles.length
        ? galleryFiles.map((item) => item.type)
        : undefined,
      removeUrls: removedUrls.length ? removedUrls : undefined,
    };

    try {
      if (isEdit && (resolvedProductId || id)) {
        await updateMutation.mutateAsync({
          id: resolvedProductId || (id as string),
          dto: payload,
        });
        navigate(backPath, { replace: true });
        return;
      }

      const createdResult = await createMutation.mutateAsync(payload);
      let createdId = read((createdResult as Record<string, unknown>)?.id);

      if (!createdId) {
        const fetched = await catalogApi.products.service.list({
          page: 1,
          limit: 1,
          search: slug,
        });
        const first = fetched.data[0] as Record<string, unknown> | undefined;
        createdId = read(first?.id);
      }

      if (createdId) {
        await createInventoryMutation.mutateAsync({
          productId: createdId,
          stockQuantity: Number(parsed.stockQuantity ?? 0),
          reservedQuantity: Number(parsed.reservedQuantity ?? 0),
          lowStockThreshold: Number(parsed.lowStockThreshold ?? 0),
          isInStock: Boolean(parsed.inventoryInStock ?? true),
        });
      }

      navigate(
        prefillSubcategoryId && prefillCategoryId
          ? `/dashboard/categories/${prefillCategoryId}/subcategories/${prefillSubcategoryId}`
          : backPath,
        { replace: true },
      );
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading product…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Product" : "Create Product"}
      subtitle={
        isEdit
          ? "Update product details."
          : "Add a new product to your catalog."
      }
      onBack={() => navigate(backPath)}
    >
      <form onSubmit={onSubmit} className="space-y-[21px]">
        <FormSection title="Main Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="e.g. Rose Glow Serum"
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Slug" required>
              <input
                type="text"
                value={form.slug}
                placeholder="rose-glow-serum"
                onChange={(e) => {
                  setManualSlug(true);
                  setForm((p) => ({ ...p, slug: slugify(e.target.value) }));
                }}
                className={inputClass}
              />
            </FormField>
            <FormField label="SKU" required>
              <input
                type="text"
                value={form.sku}
                placeholder="e.g. KAN-001"
                onChange={(e) =>
                  setForm((p) => ({ ...p, sku: e.target.value }))
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Price (Rs)" required>
              <input
                type="text"
                value={form.price}
                placeholder="e.g. 1299"
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value }))
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Weight">
              <input
                type="text"
                value={form.weight}
                placeholder="e.g. 50g"
                onChange={(e) =>
                  setForm((p) => ({ ...p, weight: e.target.value }))
                }
                className={inputClass}
              />
            </FormField>
            <FormField label="Product Type">
              <select
                value={form.productType}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    productType: e.target.value as Form["productType"],
                    isTryOn: e.target.value === "LIPSTICK" ? p.isTryOn : false,
                    lipstickColorHex:
                      e.target.value === "LIPSTICK" ? p.lipstickColorHex : "",
                  }))
                }
                className={selectClass}
              >
                <option value="">— Select type —</option>
                <option value="LIPSTICK">Lipstick</option>
                <option value="OTHERS">Others</option>
              </select>
            </FormField>
          </div>

          {form.productType === "LIPSTICK" ? (
            <div className="mt-3 grid gap-[13px] md:grid-cols-2">
              <FormField label="Enable Try On">
                <div className="flex h-11 items-end">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isTryOn}
                    onClick={() =>
                      setForm((p) => ({ ...p, isTryOn: !p.isTryOn }))
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      form.isTryOn ? "bg-[#0071e3]" : "bg-[#d2d2d7]"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        form.isTryOn ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </FormField>
              <FormField label="Lipstick Color HEX">
                <input
                  type="text"
                  value={form.lipstickColorHex}
                  placeholder="#FF3366"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lipstickColorHex: e.target.value }))
                  }
                  className={inputClass}
                />
              </FormField>
            </div>
          ) : null}
        </FormSection>

        <FormSection
          title="Product Media"
          description="Cover and hover must be images (max 5MB). Gallery supports images (5MB) and videos (50MB)."
        >
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-5">
              <div>
                <p className="mb-2 text-[13px] font-medium text-[#1d1d1f]">
                  Cover Image
                </p>
                {!hasCoverImage ? (
                  <DropArea
                    label="Cover image"
                    onFiles={(files) => {
                      const valid = imageFileErrors(files);
                      setCoverImageFile(valid[0] ?? null);
                    }}
                  />
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {coverImageFile && (
                      <ImageCard
                        src={previewCover}
                        onRemove={() => setCoverImageFile(null)}
                      />
                    )}
                    {!coverImageFile && existingCoverImage && (
                      <ImageCard
                        src={existingCoverImage}
                        onRemove={() => {
                          markRemovedUrl(existingCoverImage);
                          setExistingCoverImage("");
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-[#1d1d1f]">
                  Hover Image
                </p>
                {!hasHoverImage ? (
                  <DropArea
                    label="Hover image"
                    onFiles={(files) => {
                      const valid = imageFileErrors(files);
                      setHoverImageFile(valid[0] ?? null);
                    }}
                  />
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {hoverImageFile && (
                      <ImageCard
                        src={previewHover}
                        onRemove={() => setHoverImageFile(null)}
                      />
                    )}
                    {!hoverImageFile && existingHoverImage && (
                      <ImageCard
                        src={existingHoverImage}
                        onRemove={() => {
                          markRemovedUrl(existingHoverImage);
                          setExistingHoverImage("");
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
            <HoverPreviewCard
              coverSrc={previewCover || existingCoverImage}
              hoverSrc={previewHover || existingHoverImage}
            />

            <div>
              <p className="mb-1 text-[13px] font-medium text-[#1d1d1f]">
                Gallery (Images + Videos)
              </p>
              <p className="mb-2 text-[12px] text-[#86868b]">
                {totalGalleryImages}/{MAX_GALLERY_IMAGES}
              </p>
              {totalGalleryImages === 0 ? (
                <DropArea
                  label="Gallery media"
                  multiple
                  accept="image/*,video/*"
                  promptText="Choose image/video files or drag and drop them here."
                  helperText="Images up to 5MB, videos up to 50MB"
                  onFiles={(files) => {
                    const valid = galleryFileErrors(files);
                    if (!valid.length) return;
                    setGalleryFiles((prev) => {
                      const remaining =
                        MAX_GALLERY_IMAGES -
                        (prev.length + existingGallery.length);
                      if (remaining <= 0) return prev;
                      return [
                        ...prev,
                        ...valid.slice(0, remaining).map((file) => ({
                          file,
                          type: mediaTypeFromFile(file),
                        })),
                      ];
                    });
                  }}
                />
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {previewGallery.map((item, index) => (
                    <ImageCard
                      key={`${item.file.name}-${index}`}
                      src={item.preview}
                      isVideo={item.type === "VIDEO"}
                      onRemove={() => {
                        setGalleryFiles((prev) =>
                          prev.filter((_, fileIndex) => fileIndex !== index),
                        );
                      }}
                    />
                  ))}
                  {existingGallery.map((item) => (
                    <ImageCard
                      key={item.url}
                      src={item.url}
                      isVideo={item.type === "VIDEO"}
                      onRemove={() => {
                        markRemovedUrl(item.url);
                        setExistingGallery((prev) =>
                          prev.filter((entry) => entry.url !== item.url),
                        );
                      }}
                    />
                  ))}
                  {canAddGalleryImage ? (
                    <DropArea
                      label="Gallery media"
                      multiple
                      compact
                      accept="image/*,video/*"
                      onFiles={(files) => {
                        const valid = galleryFileErrors(files);
                        if (!valid.length) return;
                        setGalleryFiles((prev) => {
                          const remaining =
                            MAX_GALLERY_IMAGES -
                            (prev.length + existingGallery.length);
                          if (remaining <= 0) return prev;
                          return [
                            ...prev,
                            ...valid.slice(0, remaining).map((file) => ({
                              file,
                              type: mediaTypeFromFile(file),
                            })),
                          ];
                        });
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="Description">
          <RichTextEditor
            initialContent={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: v }))}
            placeholder="Describe this product…"
          />
        </FormSection>

        {!isEdit ? (
          <FormSection
            title="Inventory Setup"
            description="Inventory will be created after product creation succeeds."
          >
            <div className="grid gap-[13px] md:grid-cols-3">
              <FormField label="Stock Quantity">
                <input
                  type="number"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stockQuantity: e.target.value }))
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Reserved Quantity">
                <input
                  type="number"
                  min={0}
                  value={form.reservedQuantity}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, reservedQuantity: e.target.value }))
                  }
                  className={inputClass}
                />
              </FormField>
              <FormField label="Low Stock Threshold">
                <input
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      lowStockThreshold: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </FormField>
            </div>
            <label className="mt-[8px] flex cursor-pointer items-center gap-[10px]">
              <div
                role="checkbox"
                aria-checked={form.inventoryInStock}
                tabIndex={0}
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    inventoryInStock: !p.inventoryInStock,
                  }))
                }
                onKeyDown={(e) =>
                  e.key === " " &&
                  setForm((p) => ({
                    ...p,
                    inventoryInStock: !p.inventoryInStock,
                  }))
                }
                className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${
                  form.inventoryInStock ? "bg-[#0071e3]" : "bg-[#d2d2d7]"
                }`}
              >
                <span
                  className={`absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
                    form.inventoryInStock
                      ? "translate-x-[19px]"
                      : "translate-x-[3px]"
                  }`}
                />
              </div>
              <span className="text-[14px] font-medium text-[#1d1d1f]">
                {form.inventoryInStock ? "In Stock" : "Out of Stock"}
              </span>
            </label>
          </FormSection>
        ) : null}

        <FormActions
          submitLabel={
            saving
              ? "Saving…"
              : isEdit
                ? "Update Product"
                : "Create Product + Inventory"
          }
          submitIcon={
            saving ? <Loader2 size={14} className="animate-spin" /> : undefined
          }
          isSubmitting={saving}
          onCancel={() => navigate(backPath)}
        />
      </form>
    </ModernFormLayout>
  );
};
