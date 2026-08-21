import { makeCrud, type CrudPaths } from "@/shared/api/crudFactory";
import type { MultipartConfig } from "@/shared/api/crudFactory";

export type EntityRecord = Readonly<Record<string, unknown>>;
export type DefaultCreateDto = Readonly<Record<string, unknown>>;
export type DefaultUpdateDto = Readonly<Record<string, unknown>>;

type CrudOptions = Readonly<{
  key: string;
  basePath: string;
  getOne?: boolean;
  update?: boolean;
  deleted?: boolean;
  recover?: boolean;
  destroy?: boolean;
  publicationLifecycle?: boolean;
  dashboardStatusList?: boolean;
}>;

const toCrudPaths = ({
  basePath,
  getOne = true,
  update = true,
  deleted = true,
  recover = true,
  destroy = true,
  publicationLifecycle = false,
  dashboardStatusList = false,
}: CrudOptions): CrudPaths => ({
  getAll: dashboardStatusList
    ? `${basePath}/dashboard/get-all?status=PUBLISHED`
    : `${basePath}/get-all`,
  draftList: publicationLifecycle
    ? dashboardStatusList
      ? `${basePath}/dashboard/get-all?status=DRAFT`
      : `${basePath}/draft`
    : undefined,
  archivedList: publicationLifecycle
    ? dashboardStatusList
      ? `${basePath}/dashboard/get-all?status=ARCHIVED`
      : `${basePath}/archived`
    : undefined,
  getOne: getOne ? (id) => `${basePath}/get/${id}` : undefined,
  create: `${basePath}/create`,
  update: update ? (id) => `${basePath}/update/${id}` : undefined,
  softDelete: (ids) => `${basePath}/destroy/${ids}`,
  deletedList: deleted ? `${basePath}/deleted` : `${basePath}/get-all`,
  recover: recover ? `${basePath}/recover` : `${basePath}/create`,
  destroy: destroy ? (ids) => `${basePath}/destroy/${ids}` : (ids) => `${basePath}/delete/${ids}`,
});

export const makeStandardCrud = <
  TItem extends EntityRecord = EntityRecord,
  TCreate extends DefaultCreateDto = DefaultCreateDto,
  TUpdate extends DefaultUpdateDto = DefaultUpdateDto,
>(
  options: CrudOptions,
  multipart?: MultipartConfig<TCreate, TUpdate>,
) => makeCrud<TItem, TCreate, TUpdate>(options.key, toCrudPaths(options), multipart);
