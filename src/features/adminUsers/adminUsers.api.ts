// src/features/adminUsers/adminUsers.api.ts
import { api, toFormData, unwrap } from "../../shared/api/api";
import type { ApiListQuery, CommaIds, UUID } from "../../shared/types/common.types";
import type { FormFieldValue, FormFileValue } from "../../shared/api/api";
import type { CreateUserPayload, UpdateUserPayload, User } from "./adminUsers.types";

export type AdminUsersListResponse = Readonly<{
  data: ReadonlyArray<User>;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}>;

export const adminUsersApi = {
  list: async (q?: ApiListQuery): Promise<AdminUsersListResponse> => {
    const res = await api.get("/admin/get-all-users", {
      params: q,
      headers: { "Cache-Control": "no-cache" },
    });
    const payload = unwrap<unknown>(res);

    const pickFirstArray = (value: unknown): ReadonlyArray<User> => {
      if (!value || typeof value !== "object") return [];
      for (const v of Object.values(value as Record<string, unknown>)) {
        if (Array.isArray(v)) return v as ReadonlyArray<User>;
      }
      for (const v of Object.values(value as Record<string, unknown>)) {
        if (v && typeof v === "object") {
          const nested = pickFirstArray(v);
          if (nested.length > 0) return nested;
        }
      }
      return [];
    };

    if (Array.isArray(payload)) {
      return { data: payload as ReadonlyArray<User>, total: payload.length, totalPages: 1 };
    }

    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      const level1 = obj.data ?? obj.items ?? payload;
      const level2 =
        level1 && typeof level1 === "object"
          ? (level1 as Record<string, unknown>).data ?? (level1 as Record<string, unknown>).items
          : undefined;

      const rows = Array.isArray(level1)
        ? (level1 as ReadonlyArray<User>)
        : Array.isArray(level2)
          ? (level2 as ReadonlyArray<User>)
          : pickFirstArray(payload);

      const total =
        (typeof obj.total === "number" ? obj.total : undefined) ??
        (level1 && typeof level1 === "object" && typeof (level1 as Record<string, unknown>).total === "number"
          ? ((level1 as Record<string, unknown>).total as number)
          : undefined) ??
        rows.length;

      const totalPages =
        (typeof obj.totalPages === "number" ? obj.totalPages : undefined) ??
        (level1 && typeof level1 === "object" && typeof (level1 as Record<string, unknown>).totalPages === "number"
          ? ((level1 as Record<string, unknown>).totalPages as number)
          : undefined) ??
        1;

      return {
        data: rows,
        total,
        totalPages,
      };
    }

    return { data: [] };
  },

  get: async (id: UUID): Promise<User> => {
    const res = await api.get(`/admin/get-users/${id}`);
    const payload = unwrap<unknown>(res);

    if (Array.isArray(payload)) return (payload[0] ?? {}) as User;
    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>;
      const value = obj.data ?? obj.item ?? obj.result ?? payload;
      if (Array.isArray(value)) return (value[0] ?? {}) as User;
      return value as User;
    }

    return payload as User;
  },

  create: async (payload: CreateUserPayload): Promise<User> => {
    const { profile, ...rest } = payload;
    const hasProfile = profile instanceof File;

    const res = hasProfile
      ? await api.post(
          "/admin/create-users",
          toFormData(
            rest as Readonly<Record<string, FormFieldValue>>,
            { profile: (profile ?? undefined) as FormFileValue }
          ),
          { headers: { "Content-Type": "multipart/form-data" } }
        )
      : await api.post("/admin/create-users", rest);

    return unwrap<User>(res);
  },

  update: async (id: UUID, payload: UpdateUserPayload): Promise<User> => {
    const { profile, ...rest } = payload;

    if (profile instanceof File) {
      // Send data fields as JSON so arrays (e.g. roleIds) are properly parsed by the backend.
      // Then send the profile image separately via FormData.
      await api.put(`/admin/update-users/${id}`, rest);
      const fd = new FormData();
      fd.append("profile", profile);
      const res = await api.put(`/admin/update-users/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return unwrap<User>(res);
    }

    return unwrap<User>(await api.put(`/admin/update-users/${id}`, rest));
  },

  remove: async (idOrCommaIds: UUID | CommaIds): Promise<Readonly<{ success: boolean }>> => {
    const res = await api.delete(`/admin/delete-users/${idOrCommaIds}`);
    return unwrap<Readonly<{ success: boolean }>>(res);
  },
} as const;
