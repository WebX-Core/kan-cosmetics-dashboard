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
    { key: "categories", basePath: "/category", publicationLifecycle: true, dashboardStatusList: true, dashboardGetOne: true },
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
    { key: "subcategories", basePath: "/subcategory", publicationLifecycle: true, dashboardStatusList: true, dashboardGetOne: true },
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
    { key: "products", basePath: "/product", publicationLifecycle: true, dashboardStatusList: true, dashboardGetOne: true },
    {
      create: (dto) => {
        const { coverImage, hoverImage, howToUseImage, pdf, gallery, keyFeatures, comboItems, ...rest } = dto;
        return {
          fields: {
            ...(rest as Readonly<Record<string, FormFieldValue>>),
            keyFeatures: keyFeatures !== undefined ? JSON.stringify(keyFeatures) : undefined,
            comboItems: comboItems !== undefined ? JSON.stringify(comboItems) : undefined,
          },
          files: {
            coverImage: (coverImage ?? undefined) as FormFileValue,
            hoverImage: (hoverImage ?? undefined) as FormFileValue,
            howToUseImage: (howToUseImage ?? undefined) as FormFileValue,
            pdf: (pdf ?? undefined) as FormFileValue,
            gallery: (gallery?.length ? gallery : undefined) as FormFileValue,
          },
        };
      },
      update: (dto) => {
        const { coverImage, hoverImage, howToUseImage, pdf, gallery, keyFeatures, comboItems, ...rest } = dto;
        return {
          fields: {
            ...(rest as Readonly<Record<string, FormFieldValue>>),
            keyFeatures: keyFeatures !== undefined ? JSON.stringify(keyFeatures) : undefined,
            comboItems: comboItems !== undefined ? JSON.stringify(comboItems) : undefined,
          },
          files: {
            coverImage: (coverImage ?? undefined) as FormFileValue,
            hoverImage: (hoverImage ?? undefined) as FormFileValue,
            howToUseImage: (howToUseImage ?? undefined) as FormFileValue,
            pdf: (pdf ?? undefined) as FormFileValue,
            gallery: (gallery?.length ? gallery : undefined) as FormFileValue,
          },
        };
      },
    }
  ),
  productVariants: makeStandardCrud<Record<string, unknown>, ProductVariantDto, ProductVariantDto>(
    { key: "productVariants", basePath: "/product-variant", publicationLifecycle: true, dashboardStatusList: true },
    {
      create: (dto) => {
        const { image, images, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: {
            image: (image ?? undefined) as FormFileValue,
            images: (images?.length ? images : undefined) as FormFileValue,
          },
        };
      },
      update: (dto) => {
        const { image, images, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: {
            image: (image ?? undefined) as FormFileValue,
            images: (images?.length ? images : undefined) as FormFileValue,
          },
        };
      },
    }
  ),
  productTags: makeStandardCrud<Record<string, unknown>, ProductTagDto, ProductTagDto>({ key: "productTags", basePath: "/product-tag" }),
  productAttributes: makeStandardCrud<Record<string, unknown>, ProductAttributeDto, ProductAttributeDto>({ key: "productAttributes", basePath: "/product-attribute" }),
  inventory: {
    ...makeStandardCrud<Record<string, unknown>, InventoryDto, InventoryDto>({ key: "inventory", basePath: "/inventory" }),
    downloadBulkTemplate: async () => {
      const response = await api.get("/inventory/bulk-upload/template", {
        responseType: "blob",
      });
      return response.data as Blob;
    },
    bulkUploadCsv: async (file: File, note?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (note?.trim()) formData.append("note", note.trim());
      return unwrap<Record<string, unknown>>(
        await api.post("/inventory/bulk-upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );
    },
    getBulkUploadHistory: async (params?: Readonly<Record<string, unknown>>) =>
      unwrap<Record<string, unknown>>(
        await api.get("/inventory/bulk-upload/history", { params }),
      ),
    getBulkUploadDetail: async (
      id: string,
      params?: Readonly<Record<string, unknown>>,
    ) =>
      unwrap<Record<string, unknown>>(
        await api.get(`/inventory/bulk-upload/history/${id}`, { params }),
      ),
  },
  productsBulkCreate: async (payload: ReadonlyArray<ProductDto>) => unwrap<unknown>(await api.post("/product/bulk-create", payload)),
  productsBulkUploadImages: async (payload: unknown) => unwrap<unknown>(await api.post("/product/bulk-upload-images", payload)),
};
