import { makeCrud } from "../../shared/api/crudFactory";
import type { CrudPaths } from "../../shared/api/crudFactory";
import type { Faq, FaqCreateDto, FaqUpdateDto } from "./faq.types";

const paths: CrudPaths = {
  getAll: ["/faq/dashboard/get-all", "/faq/get-all"],
  getOne: (id) => `/faq/get/${id}`,

  create: "/faq/create",
  update: (id) => `/faq/update/${id}`,

  softDelete: (ids) => `/faq/destroy/${ids}`,

  deletedList: "/faq/deleted",
  recover: "/faq/recover",

  destroy: (ids) => `/faq/destroy/${ids}`, // supports comma-separated IDs
} as const;

export const faqModule = makeCrud<Faq, FaqCreateDto, FaqUpdateDto>("faq", paths);
