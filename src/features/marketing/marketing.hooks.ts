import { marketingApi } from "./marketing.api";

export const useBlogList = marketingApi.blogs.hooks.useList;
export const useNewsletterList = marketingApi.newsletters.hooks.useList;
