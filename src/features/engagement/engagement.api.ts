import { api, unwrap } from "@/shared/api/api";
import type { ApiListQuery, UUID } from "@/shared/types/common.types";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type {
  InquiryDto,
  ReplyDto,
  ContactDto,
  SiteInquiryDto,
  ReviewDto,
  FaqDto,
} from "./engagement.types";

export const engagementApi = {
  inquiries: {
    crud: makeStandardCrud<Record<string, unknown>, InquiryDto, InquiryDto>({ key: "inquiries", basePath: "/inquiry" }),
    exportExcel: async () => unwrap<unknown>(await api.get("/inquiry/export/excel")),
    exportPdf: async () => unwrap<unknown>(await api.get("/inquiry/export/pdf")),
  },
  replies: makeStandardCrud<Record<string, unknown>, ReplyDto, ReplyDto>({ key: "replies", basePath: "/reply" }),
  contacts: makeStandardCrud<Record<string, unknown>, ContactDto, ContactDto>({ key: "contacts", basePath: "/contact", update: false }),
  siteInquiries: makeStandardCrud<Record<string, unknown>, SiteInquiryDto, SiteInquiryDto>({ key: "siteInquiries", basePath: "/site-inquiry" }),
  reviews: {
    crud: makeStandardCrud<Record<string, unknown>, ReviewDto, ReviewDto>({ key: "reviews", basePath: "/review" }),
    site: async (q?: ApiListQuery) => unwrap<unknown>(await api.get("/review/get-site", { params: q })),
    byProduct: async (productId: UUID, q?: ApiListQuery) => unwrap<unknown>(await api.get(`/review/get-product/${productId}`, { params: q })),
  },
  faqs: makeStandardCrud<Record<string, unknown>, FaqDto, FaqDto>({ key: "faqs", basePath: "/faq" }),
  seo: {
    byPage: async (routeKey: string) => unwrap<unknown>(await api.get("/seo/page", { params: { routeKey } })),
    byEntity: async (entityType: string, entityId: UUID) => unwrap<unknown>(await api.get(`/seo/${entityType}/${entityId}`)),
    ...makeStandardCrud<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>({ key: "seo", basePath: "/seo" }),
  },
};
