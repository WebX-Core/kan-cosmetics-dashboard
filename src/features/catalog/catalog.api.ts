import { api, unwrap } from "@/shared/api/api";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type { FormFieldValue, FormFileValue } from "@/shared/api/api";
import type {
  CategoryDto,
  SubcategoryDto,
  ProductDto,
  ProductVariantDto,
  ProductTagDto,
  ProductAttributeDto,
  InventoryDto,
} from "./catalog.types";

export const catalogApi = {
  categories: makeStandardCrud<Record<string, unknown>, CategoryDto, CategoryDto>(
    { key: "categories", basePath: "/category" },
    {
      create: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
      update: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
    }
  ),
  subcategories: makeStandardCrud<Record<string, unknown>, SubcategoryDto, SubcategoryDto>(
    { key: "subcategories", basePath: "/subcategory" },
    {
      create: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
      update: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
    }
  ),
  products: makeStandardCrud<Record<string, unknown>, ProductDto, ProductDto>(
    { key: "products", basePath: "/product" },
    {
      create: (dto) => {
        const { coverImage, hoverImage, gallery, mediaAssets, mediaAssetTypes, ...rest } = dto;
        const derivedMediaAssets = mediaAssets ?? [];
        const derivedGallery = gallery ?? (derivedMediaAssets.length ? derivedMediaAssets.map((item) => item.file) : undefined);
        const derivedMediaTypes = mediaAssetTypes ?? (derivedMediaAssets.length ? derivedMediaAssets.map((item) => item.type) : undefined);
        return {
          fields: {
            ...(rest as Readonly<Record<string, FormFieldValue>>),
            mediaAssetTypes: derivedMediaTypes as FormFieldValue,
            galleryTypes: derivedMediaTypes as FormFieldValue,
          },
          files: {
            coverImage: (coverImage ?? undefined) as FormFileValue,
            hoverImage: (hoverImage ?? undefined) as FormFileValue,
            gallery: (derivedGallery ?? undefined) as FormFileValue,
            mediaAssets: (derivedGallery ?? undefined) as FormFileValue,
          },
        };
      },
      update: (dto) => {
        const { coverImage, hoverImage, gallery, mediaAssets, mediaAssetTypes, ...rest } = dto;
        const derivedMediaAssets = mediaAssets ?? [];
        const derivedGallery = gallery ?? (derivedMediaAssets.length ? derivedMediaAssets.map((item) => item.file) : undefined);
        const derivedMediaTypes = mediaAssetTypes ?? (derivedMediaAssets.length ? derivedMediaAssets.map((item) => item.type) : undefined);
        return {
          fields: {
            ...(rest as Readonly<Record<string, FormFieldValue>>),
            mediaAssetTypes: derivedMediaTypes as FormFieldValue,
            galleryTypes: derivedMediaTypes as FormFieldValue,
          },
          files: {
            coverImage: (coverImage ?? undefined) as FormFileValue,
            hoverImage: (hoverImage ?? undefined) as FormFileValue,
            gallery: (derivedGallery ?? undefined) as FormFileValue,
            mediaAssets: (derivedGallery ?? undefined) as FormFileValue,
          },
        };
      },
    }
  ),
  productVariants: makeStandardCrud<Record<string, unknown>, ProductVariantDto, ProductVariantDto>({ key: "productVariants", basePath: "/product-variant" }),
  productTags: makeStandardCrud<Record<string, unknown>, ProductTagDto, ProductTagDto>({ key: "productTags", basePath: "/product-tag" }),
  productAttributes: makeStandardCrud<Record<string, unknown>, ProductAttributeDto, ProductAttributeDto>({ key: "productAttributes", basePath: "/product-attribute" }),
  inventory: makeStandardCrud<Record<string, unknown>, InventoryDto, InventoryDto>({ key: "inventory", basePath: "/inventory" }),
  productsBulkCreate: async (payload: ReadonlyArray<ProductDto>) => unwrap<unknown>(await api.post("/product/bulk-create", payload)),
  productsBulkUploadImages: async (payload: unknown) => unwrap<unknown>(await api.post("/product/bulk-upload-images", payload)),
};
