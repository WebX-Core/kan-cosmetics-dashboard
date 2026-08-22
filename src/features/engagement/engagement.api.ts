import { api, unwrap } from "@/shared/api/api";
import type { ApiListQuery, UUID } from "@/shared/types/common.types";
import { makeCrud, type CrudPaths } from "@/shared/api/crudFactory";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type {
  InquiryDto,
  ReplyDto,
  ContactDto,
  SiteInquiryDto,
  ReviewDto,
  FaqDto,
} from "./engagement.types";

const faqPaths: CrudPaths = {
  getAll: ["/faq/dashboard/get-all", "/faq/get-all"],
  getOne: (id) => `/faq/get/${id}`,
  create: "/faq/create",
  update: (id) => `/faq/update/${id}`,
  softDelete: (ids) => `/faq/destroy/${ids}`,
  deletedList: "/faq/deleted",
  recover: "/faq/recover",
  destroy: (ids) => `/faq/destroy/${ids}`,
};

const faqCrud = makeCrud<Record<string, unknown>, FaqDto, FaqDto>("faqs", faqPaths);

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  (error as { response?: { status?: number } }).response?.status === 404;

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
  faqs: {
    ...faqCrud,
    byProduct: async (identifier: UUID | string, q?: ApiListQuery) => {
      try {
        return unwrap<unknown>(await api.get(`/faq/dashboard/get-product/${identifier}`, { params: q }));
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
        return unwrap<unknown>(await api.get(`/faq/get-product/${identifier}`, { params: q }));
      }
    },
  },
  seo: {
    byPage: async (routeKey: string) => unwrap<unknown>(await api.get("/seo/page", { params: { routeKey } })),
    byEntity: async (entityType: string, entityId: UUID) => unwrap<unknown>(await api.get(`/seo/${entityType}/${entityId}`)),
    ...makeStandardCrud<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>({ key: "seo", basePath: "/seo" }),
  },
};
