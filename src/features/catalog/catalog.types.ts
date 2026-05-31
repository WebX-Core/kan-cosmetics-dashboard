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
  descriptionJson?: unknown;
  weight?: string;
  sku?: string;
  price?: string;
  productType?: string;
  isTryOn?: boolean;
  lipstickColorHex?: string;
  additionalInformationJson?: unknown;
  removeUrls?: ReadonlyArray<string>;
  removeMediaAssetIds?: ReadonlyArray<string>;
  sortOrder?: number;
  isDeleted?: boolean;
  coverImage?: File | null;
  hoverImage?: File | null;
  gallery?: ReadonlyArray<File>;
  mediaAssets?: ReadonlyArray<ProductMediaUpload>;
  mediaAssetTypes?: ReadonlyArray<ProductMediaType>;
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
  isDefault?: boolean;
  isActive?: boolean;
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
