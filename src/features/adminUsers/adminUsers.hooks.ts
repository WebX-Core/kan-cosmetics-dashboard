// src/features/adminUsers/adminUsers.hooks.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ApiListQuery, CommaIds, UUID } from "../../shared/types/common.types";
import { adminUsersApi } from "./adminUsers.api";
import type { CreateUserPayload, UpdateUserPayload } from "./adminUsers.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const KEY = "adminUsers" as const;
const toUsersMessage = (
  action: "created" | "updated" | "deleted",
  count = 1
) => `The selected user${count > 1 ? "s" : ""} has been ${action} successfully.`;

export const useAdminUsersList = (q?: ApiListQuery, enabled = true) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [KEY, "list", q],
    queryFn: () => adminUsersApi.list(q),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!q?.page || !q?.limit || q.limit <= 1) return;
    const totalPages = query.data?.totalPages;
    if (!totalPages || q.page >= totalPages) return;
    const next = { ...q, page: q.page + 1 };
    void qc.prefetchQuery({
      queryKey: [KEY, "list", next],
      queryFn: () => adminUsersApi.list(next),
      staleTime: 30_000,
    });
  }, [enabled, q, query.data?.totalPages, qc]);

  return query;
};

export const useAdminUsersGet = (id?: UUID, enabled = true) =>
  useQuery({
    queryKey: [KEY, "get", id],
    queryFn: () => adminUsersApi.get(id as UUID),
    enabled: enabled && typeof id === "string" && id.length > 0,
  });

export const useCreateAdminUser = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => adminUsersApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY, "list"] });
      toast.success(toUsersMessage("created"));
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });
};

export const useUpdateAdminUser = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (vars: { id: UUID; payload: UpdateUserPayload }) =>
      adminUsersApi.update(vars.id, vars.payload),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [KEY, "list"] });
      void qc.invalidateQueries({ queryKey: [KEY, "get", vars.id] });
      toast.success(toUsersMessage("updated"));
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });
};

export const useDeleteAdminUsers = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (idOrCommaIds: UUID | CommaIds) => adminUsersApi.remove(idOrCommaIds),
    onSuccess: (_data, ids) => {
      const count = String(ids).split(",").filter(Boolean).length || 1;
      void qc.invalidateQueries({ queryKey: [KEY, "list"] });
      toast.success(toUsersMessage("deleted", count));
    },
    onError: (e) => toast.error(parseApiError(e).message),
  });
};
