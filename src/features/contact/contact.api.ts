// src/features/contact/contact.api.ts
import { makeCrud } from "../../shared/api/crudFactory";
import type { CrudPaths } from "../../shared/api/crudFactory";
import type { Contact, ContactCreateDto } from "./contact.types";

type NoUpdate = Readonly<Record<never, never>>;

const paths: CrudPaths = {
  getAll: "/contact/get-all",
  getOne: (id) => `/contact/get/${id}`,

  create: "/contact/create",


  softDelete: (ids) => `/contact/destroy/${ids}`,

  deletedList: "/contact/deleted",
  recover: "/contact/recover",

  destroy: (ids) => `/contact/destroy/${ids}`,
} as const;

export const contactModule = makeCrud<Contact, ContactCreateDto, NoUpdate>("contact", paths);
