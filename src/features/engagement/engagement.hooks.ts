import { useQuery } from "@tanstack/react-query";
import type { ApiListQuery, UUID } from "@/shared/types/common.types";
import { engagementApi } from "./engagement.api";

export const useInquiryList = engagementApi.inquiries.crud.hooks.useList;
export const useSiteInquiryList = engagementApi.siteInquiries.hooks.useList;
export const useReviewList = engagementApi.reviews.crud.hooks.useList;
export const useFaqList = engagementApi.faqs.hooks.useList;

export const useProductFaqList = (
  identifier?: UUID | string,
  q?: ApiListQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: ["faqs", "product", identifier, q],
    queryFn: () => engagementApi.faqs.byProduct(identifier as string, q),
    enabled: enabled && Boolean(identifier),
  });
