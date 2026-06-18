import { catalogApi } from "./catalog.api";

export const useCategoryList = catalogApi.categories.hooks.useList;
export const useCategoryGet = catalogApi.categories.hooks.useGet;
export const useCategoryCreate = catalogApi.categories.hooks.useCreate;
export const useCategoryUpdate = catalogApi.categories.hooks.useUpdate;
export const useCategorySoftDelete = catalogApi.categories.hooks.useSoftDelete;

export const useSubcategoryList = catalogApi.subcategories.hooks.useList;
export const useSubcategoryGet = catalogApi.subcategories.hooks.useGet;
export const useSubcategoryCreate = catalogApi.subcategories.hooks.useCreate;
export const useSubcategoryUpdate = catalogApi.subcategories.hooks.useUpdate;

export const useProductList = catalogApi.products.hooks.useList;
export const useProductGet = catalogApi.products.hooks.useGet;
export const useProductSoftDelete = catalogApi.products.hooks.useSoftDelete;

export const useProductTagList = catalogApi.productTags.hooks.useList;
export const useProductTagGet = catalogApi.productTags.hooks.useGet;
export const useProductTagCreate = catalogApi.productTags.hooks.useCreate;
export const useProductTagUpdate = catalogApi.productTags.hooks.useUpdate;
export const useProductTagSoftDelete = catalogApi.productTags.hooks.useSoftDelete;

export const useProductAttributeList = catalogApi.productAttributes.hooks.useList;
export const useProductAttributeGet = catalogApi.productAttributes.hooks.useGet;
export const useProductAttributeCreate = catalogApi.productAttributes.hooks.useCreate;
export const useProductAttributeUpdate = catalogApi.productAttributes.hooks.useUpdate;
export const useProductAttributeSoftDelete = catalogApi.productAttributes.hooks.useSoftDelete;

export const useInventoryList = catalogApi.inventory.hooks.useList;
export const useInventorySoftDelete = catalogApi.inventory.hooks.useSoftDelete;
