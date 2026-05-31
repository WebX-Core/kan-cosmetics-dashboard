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

export const useInventoryList = catalogApi.inventory.hooks.useList;
export const useInventorySoftDelete = catalogApi.inventory.hooks.useSoftDelete;
