// src/shared/api/crudFactory.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ApiListQuery, CommaIds, RecoverDto, UUID } from "../types/common.types";
import { api, toFormData, unwrap } from "./api";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

/* -------------------------
   Route definitions
------------------------- */
export type CrudPaths = Readonly<{
  getAll: string;
  draftList?: string;
  archivedList?: string;
  getOne?: (id: UUID) => string;

  create: string;
  update?: (id: UUID) => string;

  // soft delete and destroy support single id or comma-separated ids
  softDelete: (idOrCommaIds: string) => string;

  deletedList: string;
  recover: string;

  destroy: (idOrCommaIds: string) => string;
}>;

/* -------------------------
   Multipart builders
------------------------- */
export type MultipartBuild<TDto> = (dto: TDto) => Readonly<{
  fields: Readonly<Record<string, import("./api").FormFieldValue>>;
  files?: Readonly<Record<string, import("./api").FormFileValue>>;
}>;

export type MultipartConfig<TCreate, TUpdate> = Readonly<{
  create?: MultipartBuild<TCreate>;
  update?: MultipartBuild<TUpdate>;
}>;

/* -------------------------
   CRUD factory
------------------------- */
export function makeCrud<TItem, TCreate, TUpdate>(
  key: string,
  paths: CrudPaths,
  multipart?: MultipartConfig<TCreate, TUpdate>
) {
  const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  const toMessage = (
    action: "created" | "updated" | "deleted" | "recovered" | "destroyed",
    count = 1
  ) => {
    const noun = count > 1 ? `${label}s` : label;
    return `The selected ${noun} has been ${action} successfully.`;
  };

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  const pickFirstObject = (value: unknown): unknown => {
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const normalizeOne = (payload: unknown): TItem => {
    let current: unknown = payload;

    // Unwrap common envelope shapes repeatedly.
    for (let i = 0; i < 5; i += 1) {
      current = pickFirstObject(current);
      if (!isRecord(current)) break;

      const directCandidates = [
        current.data,
        current.item,
        current.result,
        current[key],
      ];

      const firstDirect = directCandidates.find((v) => v !== undefined);
      if (firstDirect !== undefined) {
        current = firstDirect;
        continue;
      }

      // If this object already looks like an entity, stop.
      if (
        "id" in current ||
        "title" in current ||
        "name" in current ||
        "slug" in current ||
        "fullname" in current ||
        "email" in current
      ) {
        break;
      }

      // Fallback: dive into first object-like value.
      const nested = Object.values(current).find((v) => Array.isArray(v) || isRecord(v));
      if (!nested) break;
      current = nested;
    }

    current = pickFirstObject(current);
    return (isRecord(current) ? current : payload) as TItem;
  };

  const normalizeList = (
    payload: unknown
  ): Readonly<{
    data: ReadonlyArray<TItem>;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }> => {
    const pickFirstArray = (value: unknown): ReadonlyArray<TItem> => {
      if (Array.isArray(value)) return value as ReadonlyArray<TItem>;
      if (!isRecord(value)) return [];
      for (const v of Object.values(value)) {
        if (Array.isArray(v)) return v as ReadonlyArray<TItem>;
      }
      for (const v of Object.values(value)) {
        if (isRecord(v)) {
          const nested = pickFirstArray(v);
          if (nested.length > 0) return nested;
        }
      }
      return [];
    };

    if (Array.isArray(payload)) return { data: payload as ReadonlyArray<TItem>, total: payload.length, totalPages: 1 };
    if (!isRecord(payload)) return { data: [] };

    const level1 = payload.data ?? payload.items ?? payload;
    const level2 = isRecord(level1) ? level1.data ?? level1.items : undefined;
    const rows = Array.isArray(level1)
      ? (level1 as ReadonlyArray<TItem>)
      : Array.isArray(level2)
        ? (level2 as ReadonlyArray<TItem>)
        : pickFirstArray(payload);

    const total =
      (typeof payload.total === "number" ? payload.total : undefined) ??
      (isRecord(level1) && typeof level1.total === "number" ? level1.total : undefined) ??
      rows.length;
    const totalPages =
      (typeof payload.totalPages === "number" ? payload.totalPages : undefined) ??
      (isRecord(level1) && typeof level1.totalPages === "number" ? level1.totalPages : undefined) ??
      1;
    const page =
      (typeof payload.page === "number" ? payload.page : undefined) ??
      (isRecord(level1) && typeof level1.page === "number" ? level1.page : undefined);
    const limit =
      (typeof payload.limit === "number" ? payload.limit : undefined) ??
      (isRecord(level1) && typeof level1.limit === "number" ? level1.limit : undefined);

    return { data: rows, total, totalPages, page, limit };
  };

  const service = {
    list: async (q?: ApiListQuery) => {
      const res = await api.get(paths.getAll, { params: q });
      return normalizeList(unwrap<unknown>(res));
    },

    draft: async (q?: ApiListQuery) => {
      if (!paths.draftList) throw new Error(`Draft list not implemented for ${key}`);
      const res = await api.get(paths.draftList, { params: q });
      return normalizeList(unwrap<unknown>(res));
    },

    archived: async (q?: ApiListQuery) => {
      if (!paths.archivedList) throw new Error(`Archived list not implemented for ${key}`);
      const res = await api.get(paths.archivedList, { params: q });
      return normalizeList(unwrap<unknown>(res));
    },

    get: async (id: UUID) => {
      if (!paths.getOne) {
        throw new Error(`Get one not implemented for ${key}`);
      }
      const res = await api.get(paths.getOne(id));
      return normalizeOne(unwrap<unknown>(res));
    },

    deleted: async (q?: ApiListQuery) => {
      const res = await api.get(paths.deletedList, { params: q });
      return normalizeList(unwrap<unknown>(res));
    },

    create: async (dto: TCreate) => {
      if (multipart?.create) {
        const built = multipart.create(dto);
        const fd = toFormData(built.fields, built.files);
        const res = await api.post(paths.create, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return unwrap<TItem>(res);
      }

      const res = await api.post(paths.create, dto);
      return unwrap<TItem>(res);
    },

   update: async (id: UUID, dto: TUpdate) => {
  if (!paths.update) {
    throw new Error(`Update not implemented for ${key}`);
  }

  if (multipart?.update) {
    const built = multipart.update(dto);
    const fd = toFormData(built.fields, built.files);
    const res = await api.put(paths.update(id), fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap<TItem>(res);
  }

  const res = await api.put(paths.update(id), dto);
  return unwrap<TItem>(res);
},
    softDelete: async (idOrCommaIds: UUID | CommaIds) => {
      const res = await api.delete(paths.softDelete(idOrCommaIds));
      return unwrap<{ success: boolean }>(res);
    },

    recover: async (payload: RecoverDto) => {
      const res = await api.put(paths.recover, payload);
      return unwrap<{ success: boolean }>(res);
    },

    destroy: async (idOrCommaIds: UUID | CommaIds) => {
      const res = await api.delete(paths.destroy(idOrCommaIds));
      return unwrap<{ success: boolean }>(res);
    },
  };

  const hooks = {
    useList: (q?: ApiListQuery, enabled = true) => {
      const qc = useQueryClient();
      const query = useQuery({
        queryKey: [key, "list", q],
        queryFn: () => service.list(q),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      });

      useEffect(() => {
        if (!enabled) return;
        if (!q?.page || !q?.limit) return;
        const totalPages = query.data?.totalPages;
        if (!totalPages || q.page >= totalPages) return;
        const next = { ...q, page: q.page + 1 };
        void qc.prefetchQuery({
          queryKey: [key, "list", next],
          queryFn: () => service.list(next),
          staleTime: 30_000,
        });
      }, [enabled, q, query.data?.totalPages, qc]);

      return query;
    },

    useDraft: (q?: ApiListQuery, enabled = true) =>
      useQuery({
        queryKey: [key, "draft", q],
        queryFn: () => service.draft(q),
        enabled: Boolean(paths.draftList) && enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      }),

    useArchived: (q?: ApiListQuery, enabled = true) =>
      useQuery({
        queryKey: [key, "archived", q],
        queryFn: () => service.archived(q),
        enabled: Boolean(paths.archivedList) && enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      }),

    useGet: (id?: UUID, enabled = true) =>
      useQuery({
        queryKey: [key, "get", id],
        queryFn: () => service.get(id as UUID),
        enabled: Boolean(paths.getOne) && enabled && typeof id === "string" && id.length > 0,
      }),

    useDeleted: (q?: ApiListQuery, enabled = true) => {
      const qc = useQueryClient();
      const query = useQuery({
        queryKey: [key, "deleted", q],
        queryFn: () => service.deleted(q),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      });

      useEffect(() => {
        if (!enabled) return;
        if (!q?.page || !q?.limit) return;
        const totalPages = query.data?.totalPages;
        if (!totalPages || q.page >= totalPages) return;
        const next = { ...q, page: q.page + 1 };
        void qc.prefetchQuery({
          queryKey: [key, "deleted", next],
          queryFn: () => service.deleted(next),
          staleTime: 30_000,
        });
      }, [enabled, q, query.data?.totalPages, qc]);

      return query;
    },

    useCreate: () => {
      const qc = useQueryClient();
      const toast = useToast();
      return useMutation({
        mutationFn: (dto: TCreate) => service.create(dto),
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: [key, "list"] });
          void qc.invalidateQueries({ queryKey: [key, "draft"] });
          void qc.invalidateQueries({ queryKey: [key, "archived"] });
          void qc.invalidateQueries({ queryKey: [key, "deleted"] });
          toast.success(toMessage("created", 1));
        },
        onError: (e) => toast.error(parseApiError(e).message),
      });
    },

    useUpdate: () => {
      const qc = useQueryClient();
      const toast = useToast();
      return useMutation({
        mutationFn: (vars: { id: UUID; dto: TUpdate }) => service.update(vars.id, vars.dto),
        onSuccess: (_data, vars) => {
          void qc.invalidateQueries({ queryKey: [key, "list"] });
          void qc.invalidateQueries({ queryKey: [key, "draft"] });
          void qc.invalidateQueries({ queryKey: [key, "archived"] });
          void qc.invalidateQueries({ queryKey: [key, "get", vars.id] });
          void qc.invalidateQueries({ queryKey: [key, "deleted"] });
          toast.success(toMessage("updated", 1));
        },
        onError: (e) => toast.error(parseApiError(e).message),
      });
    },

    useSoftDelete: () => {
      const qc = useQueryClient();
      const toast = useToast();
      return useMutation({
        mutationFn: (idOrCommaIds: UUID | CommaIds) => service.softDelete(idOrCommaIds),
        onSuccess: (_data, ids) => {
          const count = String(ids).split(",").filter(Boolean).length || 1;
          void qc.invalidateQueries({ queryKey: [key, "list"] });
          void qc.invalidateQueries({ queryKey: [key, "draft"] });
          void qc.invalidateQueries({ queryKey: [key, "archived"] });
          void qc.invalidateQueries({ queryKey: [key, "deleted"] });
          toast.success(toMessage("deleted", count));
        },
        onError: (e) => toast.error(parseApiError(e).message),
      });
    },

    useRecover: () => {
      const qc = useQueryClient();
      const toast = useToast();
      return useMutation({
        mutationFn: (payload: RecoverDto) => service.recover(payload),
        onSuccess: (_data, payload) => {
          const count = payload.ids?.length ?? 1;
          void qc.invalidateQueries({ queryKey: [key, "list"] });
          void qc.invalidateQueries({ queryKey: [key, "draft"] });
          void qc.invalidateQueries({ queryKey: [key, "archived"] });
          void qc.invalidateQueries({ queryKey: [key, "deleted"] });
          toast.success(toMessage("recovered", count));
        },
        onError: (e) => toast.error(parseApiError(e).message),
      });
    },

    useDestroy: () => {
      const qc = useQueryClient();
      const toast = useToast();
      return useMutation({
        mutationFn: (idOrCommaIds: UUID | CommaIds) => service.destroy(idOrCommaIds),
        onSuccess: (_data, ids) => {
          const count = String(ids).split(",").filter(Boolean).length || 1;
          void qc.invalidateQueries({ queryKey: [key, "list"] });
          void qc.invalidateQueries({ queryKey: [key, "draft"] });
          void qc.invalidateQueries({ queryKey: [key, "archived"] });
          void qc.invalidateQueries({ queryKey: [key, "deleted"] });
          toast.success(toMessage("destroyed", count));
        },
        onError: (e) => toast.error(parseApiError(e).message),
      });
    },
  };

  return { key, service, hooks };
}
