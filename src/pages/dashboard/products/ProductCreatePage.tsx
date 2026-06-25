import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
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
type ExistingMedia = Readonly<{
  url: string;
  type: ProductMediaType;
  id?: string;
}>;

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
};

const read = (value: unknown): string =>
  typeof value === "string" ? value : "";
const readDescriptionText = (
  row: Readonly<Record<string, unknown>>,
): string => {
  const directDescription = read(row.description);
  if (directDescription) return directDescription;
  // Backward compat: old records stored description inside descriptionJson.text
  const rawDescriptionJson = row.descriptionJson;
  const parsed =
    typeof rawDescriptionJson === "string"
      ? (() => {
          try {
            return JSON.parse(rawDescriptionJson) as unknown;
          } catch {
            return null;
          }
        })()
      : rawDescriptionJson;
  if (typeof parsed === "object" && parsed !== null) {
    return read((parsed as Record<string, unknown>).text);
  }
  return "";
};

type FreeFromItem = { title: string };
const parseFreeFrom = (value: unknown): FreeFromItem[] => {
  const arr =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
    }))
    .filter((item) => item.title);
};
type DescriptionJsonForm = {
  problemItSolves: string[];
  whoItsFor: string[];
  keyIngredients: string[];
  howToUseInstructions: string[];
  howToUseProTip: string;
};
const emptyDescJson = (): DescriptionJsonForm => ({
  problemItSolves: [],
  whoItsFor: [],
  keyIngredients: [],
  howToUseInstructions: [],
  howToUseProTip: "",
});
const parseDescJson = (value: unknown): DescriptionJsonForm => {
  const obj =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return {};
          }
        })()
      : value;
  if (typeof obj !== "object" || obj === null) return emptyDescJson();
  const r = obj as Record<string, unknown>;
  const toStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const howToUse =
    typeof r.howToUse === "object" && r.howToUse !== null
      ? (r.howToUse as Record<string, unknown>)
      : {};
  return {
    problemItSolves: toStrArr(r.problemItSolves),
    whoItsFor: toStrArr(r.whoItsFor),
    keyIngredients: toStrArr(r.keyIngredients),
    howToUseInstructions: toStrArr(howToUse.instructions),
    howToUseProTip: typeof howToUse.proTip === "string" ? howToUse.proTip : "",
  };
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
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...items, ""]);
    // focus the new input on next render
    setTimeout(() => inputRefs.current[items.length]?.focus(), 0);
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === items.length - 1) add();
      else inputRefs.current[index + 1]?.focus();
    }
    if (e.key === "Backspace" && items[index] === "" && items.length > 0) {
      e.preventDefault();
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
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              value={item}
              onChange={(e) => update(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              placeholder={placeholder}
              className="h-[38px] flex-1 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-[#d2d2d7] text-[#86868b] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
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
          Add item
        </button>
      </div>
    </div>
  );
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
  const id = read(row.id) || undefined;
  return { url, type, id };
};

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const selectClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

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
    <div className="rounded-xl   p-3">
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
  const nextStep = searchParams.get("next") ?? "";

  const getQuery = catalogApi.products.hooks.useGet(id, isEdit);
  const createMutation = catalogApi.products.hooks.useCreate();
  const updateMutation = catalogApi.products.hooks.useUpdate();

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
  const [removedMediaAssetIds, setRemovedMediaAssetIds] = React.useState<
    ReadonlyArray<string>
  >([]);
  const [freeFrom, setFreeFrom] = React.useState<FreeFromItem[]>([]);
  const [descJson, setDescJson] =
    React.useState<DescriptionJsonForm>(emptyDescJson);

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
    });

    setFreeFrom(parseFreeFrom(row.keyFeatures));
    setDescJson(parseDescJson(row.descriptionJson));
    setExistingCoverImage(read(row.coverImage));
    setExistingHoverImage(read(row.hoverImage));
    setExistingGallery(gallery);
    setRemovedUrls([]);
    setRemovedMediaAssetIds([]);
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
    updateMutation.isPending;

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
      description: parsed.description || undefined,
      descriptionJson: (() => {
        const obj: Record<string, unknown> = {
          problemItSolves: descJson.problemItSolves.length
            ? descJson.problemItSolves
            : [],
        };
        if (descJson.whoItsFor.length) obj.whoItsFor = descJson.whoItsFor;
        if (descJson.keyIngredients.length)
          obj.keyIngredients = descJson.keyIngredients;
        if (descJson.howToUseInstructions.length || descJson.howToUseProTip) {
          obj.howToUse = {
            ...(descJson.howToUseInstructions.length
              ? { instructions: descJson.howToUseInstructions }
              : {}),
            ...(descJson.howToUseProTip
              ? { proTip: descJson.howToUseProTip }
              : {}),
          };
        }
        return obj;
      })(),
      keyFeatures: (() => {
        const items = freeFrom
          .filter(({ title }) => title.trim())
          .map(({ title }) => ({ title: title.trim() }));
        return items.length ? items : undefined;
      })(),
      coverImage: coverImageFile ?? undefined,
      hoverImage: hoverImageFile ?? undefined,
      gallery: galleryFiles.length
        ? galleryFiles.map((item) => item.file)
        : undefined,
      removeUrls: removedUrls.length ? removedUrls : undefined,
      removeMediaAssetIds: removedMediaAssetIds.length
        ? removedMediaAssetIds
        : undefined,
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
      const createdId = read((createdResult as Record<string, unknown>)?.id);
      const shouldCreateInventory = nextStep === "inventory" && createdId;

      if (shouldCreateInventory) {
        navigate(
          `/dashboard/inventory/create?productId=${encodeURIComponent(createdId)}&productName=${encodeURIComponent(parsed.title)}&returnPath=${encodeURIComponent(backPath)}`,
          { replace: true },
        );
        return;
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
                        if (item.id) {
                          setRemovedMediaAssetIds((prev) =>
                            prev.includes(item.id!)
                              ? prev
                              : [...prev, item.id!],
                          );
                        }
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
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Describe this product…"
            rows={4}
            className="w-full rounded-lg border border-[#d2d2d7] bg-white px-3 py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[var(--primary)] focus:outline-none resize-none"
          />
        </FormSection>

        <FormSection
          title="Product Details"
          description="Structured information shown on the product page."
        >
          <div className="space-y-4">
            <StringListInput
              label="Problem It Solves"
              placeholder="e.g. Dry hair, Frizz control…"
              items={descJson.problemItSolves}
              onChange={(v) =>
                setDescJson((p) => ({ ...p, problemItSolves: v }))
              }
            />
            <StringListInput
              label="Who It's For"
              placeholder="e.g. All hair types, Dry skin…"
              items={descJson.whoItsFor}
              onChange={(v) => setDescJson((p) => ({ ...p, whoItsFor: v }))}
            />
            <StringListInput
              label="Key Ingredients"
              placeholder="e.g. Keratin, Argan Oil…"
              items={descJson.keyIngredients}
              onChange={(v) =>
                setDescJson((p) => ({ ...p, keyIngredients: v }))
              }
            />
            <StringListInput
              label="How To Use — Steps"
              placeholder="e.g. Apply on wet hair…"
              items={descJson.howToUseInstructions}
              onChange={(v) =>
                setDescJson((p) => ({ ...p, howToUseInstructions: v }))
              }
            />
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[#1d1d1f]">
                How To Use — Pro Tip
              </p>
              <input
                type="text"
                value={descJson.howToUseProTip}
                onChange={(e) =>
                  setDescJson((p) => ({ ...p, howToUseProTip: e.target.value }))
                }
                placeholder="e.g. Use twice a week for visible smoothness"
                className="h-[38px] w-full rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Free From"
          description="Highlight what this product is free from (e.g. Paraben Free, Sulfate Free)."
        >
          <div className="space-y-2">
            {freeFrom.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-[12px] text-[#86868b] select-none">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) =>
                    setFreeFrom((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { title: e.target.value } : it,
                      ),
                    )
                  }
                  placeholder="e.g. Paraben Free"
                  className="h-[38px] flex-1 rounded-lg border border-[#d2d2d7] bg-white px-3 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                />
                <button
                  type="button"
                  title="Remove item"
                  onClick={() =>
                    setFreeFrom((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-[#d2d2d7] text-[#86868b] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFreeFrom((prev) => [...prev, { title: "" }])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#d2d2d7] px-3 py-1.5 text-[12px] text-[#86868b] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <Plus size={12} /> Add item
            </button>
          </div>
        </FormSection>

        <FormActions
          submitLabel={
            saving
              ? "Saving…"
              : isEdit
                ? "Update Product"
                : "Create Product"
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
