import { engagementApi } from "./engagement.api";

export const useInquiryList = engagementApi.inquiries.crud.hooks.useList;
export const useSiteInquiryList = engagementApi.siteInquiries.hooks.useList;
export const useReviewList = engagementApi.reviews.crud.hooks.useList;
export const useFaqList = engagementApi.faqs.hooks.useList;
