import { makeCrud } from "../../shared/api/crudFactory";
import type { CrudPaths } from "../../shared/api/crudFactory";
import type { FormFieldValue, FormFileValue } from "../../shared/api/api";
import type { TeamCreatePayload, TeamMember, TeamUpdatePayload } from "./team.types";

const paths: CrudPaths = {
  getAll: "/teammember/get-all",
  getOne: (id) => `/teammember/get/${id}`,

  create: "/teammember/create",
  update: (id) => `/teammember/update/${id}`,

  softDelete: (id) => `/teammember/destroy/${id}`,

  deletedList: "/teammember/deleted",
  recover: "/teammember/recover",

  destroy: (ids) => `/teammember/destroy/${ids}`,
} as const;

export const teamModule = makeCrud<TeamMember, TeamCreatePayload, TeamUpdatePayload>(
  "team",
  paths,
  {
    create: (dto) => {
      const { image, ...rest } = dto;

      return {
        fields: rest as Readonly<Record<string, FormFieldValue>>,
        files: { image: (image ?? undefined) as FormFileValue },
      };
    },

    update: (dto) => {
      const { image, ...rest } = dto;

      return {
        fields: rest as Readonly<Record<string, FormFieldValue>>,
        files: { image: (image ?? undefined) as FormFileValue },
      };
    },
  }
);
