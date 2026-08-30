export type ProductDescriptionJson = Readonly<{
  problemItSolves?: ReadonlyArray<string>;
  whoItsFor?: ReadonlyArray<string>;
  keyIngredients?: ReadonlyArray<string>;
  howToUse?: Readonly<{
    instructions?: ReadonlyArray<string>;
    proTip?: string;
  }>;
}>;

export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PublicationFields = Readonly<{
  status?: PublicationStatus;
  isPublished?: boolean;
  publishedAt?: string | null;
}>;

// Legacy shape; kept for reading old records. New writes use `editorContent`.
export type ProductFreeFrom = Readonly<{
  title: string;
}>;

export type CategoryDto = Readonly<{
  title?: string;
  slug?: string;
  description?: string;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
  isDeleted?: boolean;
  coverImage?: File | null;
}> & PublicationFields;

export type SubcategoryDto = Readonly<{
  categoryId?: string;
  title?: string;
  slug?: string;
  description?: string;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
  isDeleted?: boolean;
  coverImage?: File | null;
}> & PublicationFields;

export type ProductMediaType = "IMAGE" | "VIDEO";
export const PRODUCT_TYPES = [
  "OTHERS", "LIPSTICK", "COMBO_OFFER", "GIFT_SET", "FESTIVE_OFFER", "CLEARANCE_SALE",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const OCCASION_TYPES = [
  "NONE", "DASHAIN", "TIHAR", "TEEJ", "HOLI", "MAGHI", "CHHATH", "JANAI_PURNIMA", "RAKHI",
  "GAURA_PARVA", "INDRA_JATRA", "GAI_JATRA", "LOSAR", "BUDDHA_JAYANTI", "SHIVARATRI",
  "KRISHNA_JANMASHTAMI", "RAM_NAVAMI", "NEPALI_NEW_YEAR", "ENGLISH_NEW_YEAR", "CHRISTMAS",
  "VALENTINES_DAY", "WEDDING_SEASON", "BRIDAL_OFFER",
] as const;
export type OccasionType = (typeof OCCASION_TYPES)[number];

export type ProductMediaUpload = Readonly<{
  file: File;
  type: ProductMediaType;
}>;

export type ComboPackageItemDto = Readonly<{
  componentProductId: string;
  componentProductVariantId?: string;
  quantity: number;
  sortOrder: number;
}>;

export type ProductDto = Readonly<{
  subcategoryId?: string;
  title?: string;
  slug?: string;
  description?: string;
  descriptionJson?: ProductDescriptionJson | Record<string, unknown>;
  keyFeatures?: ReadonlyArray<ProductFreeFrom>;
  // "Free From" rich-text field, stored verbatim (emoji + text).
  editorContent?: string;
  weight?: string;
  weightUnit?: string;
  sku?: string;
  price?: string;
  compareAtPrice?: string;
  productType?: ProductType;
  occasionType?: OccasionType;
  isVatIncluded?: boolean;
  vatRate?: number;
  maxOrderQuantity?: number | "";
  maxCustomerPurchaseQuantity?: number | "";
  purchaseLimitStartsAt?: string;
  purchaseLimitEndsAt?: string;
  additionalInformationJson?: unknown;
  removeUrls?: ReadonlyArray<string>;
  removeMediaAssetIds?: ReadonlyArray<string>;
  sortOrder?: number;
  coverImage?: File | null;
  hoverImage?: File | null;
  howToUseImage?: File | null;
  pdf?: File | null;
  gallery?: ReadonlyArray<File>;
  comboItems?: ReadonlyArray<ComboPackageItemDto>;
}> & PublicationFields;

export type ProductVariantDto = Readonly<{
  productId?: string;
  title?: string;
  sku?: string;
  variantType?: string;
  variantValue?: string;
  price?: string;
  compareAtPrice?: string;
  weight?: string;
  weightUnit?: string;
  colorHex?: string;
  isDefault?: boolean;
  isTryOn?: boolean;
  isVatIncluded?: boolean;
  vatRate?: number;
  maxOrderQuantity?: number | "";
  maxCustomerPurchaseQuantity?: number | "";
  purchaseLimitStartsAt?: string;
  purchaseLimitEndsAt?: string;
  descriptionJson?: ProductDescriptionJson | Record<string, unknown>;
  image?: File | null;
  images?: ReadonlyArray<File>;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
}> & PublicationFields;

export type ProductTagDto = Readonly<{
  productId?: string;
  tag?: string;
  sortOrder?: number;
}>;

export type ProductAttributeDto = Readonly<{
  productId?: string;
  name?: string;
  value?: string;
  sortOrder?: number;
}>;

export type InventoryDto = Readonly<{
  productId?: string;
  productVariantId?: string;
  stockQuantity?: number;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  isInStock?: boolean;
  sortOrder?: number;
}>;
