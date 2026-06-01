// src/features/newsroom/newsroom.api.ts
import { makeCrud } from "../../shared/api/crudFactory";
import type { CrudPaths } from "../../shared/api/crudFactory";
import type { FormFieldValue, FormFileValue } from "../../shared/api/api";
import type {
  Newsroom,
  NewsroomCreatePayload,
  NewsroomUpdatePayload,
} from "./newsroom.types";

const paths: CrudPaths = {
  getAll: "/blog/get-all",
  getOne: (id) => `/blog/get/${id}`,

  create: "/blog/create",
  update: (id) => `/blog/update/${id}`,

  softDelete: (ids) => `/blog/delete/${ids}`,

  deletedList: "/blog/deleted",
  recover: "/blog/recover",

  destroy: (ids) => `/blog/destroy/${ids}`,
} as const;

export const newsroomModule = makeCrud<
  Newsroom,
  NewsroomCreatePayload,
  NewsroomUpdatePayload
>("newsroom", paths, {
  create: (dto) => {
    const { image, mediaAssets, ...rest } = dto;

    const files: Readonly<Record<string, FormFileValue>> = {
      image: (image ?? undefined) as FormFileValue,
      mediaAssets: (mediaAssets ?? undefined) as FormFileValue,
    };

    return {
      fields: rest as Readonly<Record<string, FormFieldValue>>,
      files,
    };
  },

  update: (dto) => {
    const { image, mediaAssets, ...rest } = dto;

    const files: Readonly<Record<string, FormFileValue>> = {
      image: (image ?? undefined) as FormFileValue,
      mediaAssets: (mediaAssets ?? undefined) as FormFileValue,
    };

    return {
      fields: rest as Readonly<Record<string, FormFieldValue>>,
      files,
    };
  },
});