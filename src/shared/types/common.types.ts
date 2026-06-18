export type UUID = string;

export type ApiListQuery = Readonly<{
  page?: number;
  limit?: number;
  search?: string;
  /** backend filter: subcategory list by category id or slug */
  category?: string;
  /** backend filter: product list by subcategory id or slug */
  subcategory?: string;
  /** backend filter: product-tag/product-attribute list by product id or slug */
  productId?: string;
  /** backend filter: product-variant list by product id or slug */
  product?: string;
  /** backend filter: inventory list by product variant id */
  productVariantId?: string;
}>;
export type PaginationQuery = Readonly<{
  page?: number;
  limit?: number;
  search?: string;
}>;

export type PaginatedResponse<T> = Readonly<{
  data: ReadonlyArray<T>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}>;

export type RecoverDto = Readonly<{
  ids: ReadonlyArray<UUID>;
}>;

export type CommaIds = string; 

export type JsonObject = Record<string, unknown>;
export type JsonLike = string | JsonObject;

export type ApiEnvelope<T> = Readonly<{
  success: boolean;
  message?: string;
  data: T;
}>;

export type ApiListEnvelope<T> = Readonly<{
  success: boolean;
  message?: string;
  data: ReadonlyArray<T>;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}>;
