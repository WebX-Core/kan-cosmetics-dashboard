export type ProductDescriptionJson = Readonly<{
  problemItSolves?: ReadonlyArray<string>;
  whoItsFor?: ReadonlyArray<string>;
  keyIngredients?: ReadonlyArray<string>;
  howToUse?: Readonly<{
    instructions?: ReadonlyArray<string>;
    proTip?: string;
  }>;
}>;

// Sent to backend as `keyFeatures`; labelled "Free From" in the UI
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
}>;

export type SubcategoryDto = Readonly<{
  categoryId?: string;
  title?: string;
  slug?: string;
  description?: string;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
  isDeleted?: boolean;
  coverImage?: File | null;
}>;

export type ProductMediaType = "IMAGE" | "VIDEO";
export type ProductMediaUpload = Readonly<{
  file: File;
  type: ProductMediaType;
}>;

export type ProductDto = Readonly<{
  subcategoryId?: string;
  title?: string;
  slug?: string;
  description?: string;
  descriptionJson?: ProductDescriptionJson | Record<string, unknown>;
  keyFeatures?: ReadonlyArray<ProductFreeFrom>;
  weight?: string;
  sku?: string;
  price?: string;
  productType?: string;
  additionalInformationJson?: unknown;
  removeUrls?: ReadonlyArray<string>;
  removeMediaAssetIds?: ReadonlyArray<string>;
  sortOrder?: number;
  coverImage?: File | null;
  hoverImage?: File | null;
  pdf?: File | null;
  gallery?: ReadonlyArray<File>;
}>;

export type ProductVariantDto = Readonly<{
  productId?: string;
  title?: string;
  sku?: string;
  variantType?: string;
  variantValue?: string;
  price?: string;
  compareAtPrice?: string;
  weight?: string;
  colorHex?: string;
  isDefault?: boolean;
  isActive?: boolean;
  isTryOn?: boolean;
  image?: File | null;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
}>;

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
