import { api, unwrap } from "@/shared/api/api";
import type { UUID } from "@/shared/types/common.types";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type {
  AdminUserDto,
  RoleDto,
  PermissionDto,
  UserRoleAssignDto,
  RolePermissionAssignDto,
  UserPermissionAssignDto,
} from "./identity.types";

export const identityApi = {
  admin: {
    create: async (payload: AdminUserDto) =>
      unwrap<unknown>(await api.post("/admin/create-users", payload)),
    list: async () => unwrap<unknown>(await api.get("/admin/get-all-users")),
    get: async (id: UUID) =>
      unwrap<unknown>(await api.get(`/admin/get-users/${id}`)),
    update: async (id: UUID, payload: AdminUserDto) =>
      unwrap<unknown>(await api.put(`/admin/update-users/${id}`, payload)),
    remove: async (id: UUID) =>
      unwrap<unknown>(await api.delete(`/admin/delete-users/${id}`)),
  },
  roles: makeStandardCrud<Record<string, unknown>, RoleDto, RoleDto>({
    key: "roles",
    basePath: "/role",
  }),
  permissions: makeStandardCrud<
    Record<string, unknown>,
    PermissionDto,
    PermissionDto
  >({ key: "permissions", basePath: "/permission" }),
  userRoles: {
    assign: async (payload: UserRoleAssignDto) =>
      unwrap<unknown>(await api.post("/user-role/assign", payload)),
    listByUser: async (userId: UUID) =>
      unwrap<unknown>(await api.get(`/user-role/user/${userId}`)),
    remove: async (id: UUID) =>
      unwrap<unknown>(await api.delete(`/user-role/remove/${id}`)),
    clearByUser: async (userId: UUID) =>
      unwrap<unknown>(await api.delete(`/user-role/clear/user/${userId}`)),
  },
  rolePermissions: {
    assign: async (payload: RolePermissionAssignDto) =>
      unwrap<unknown>(await api.post("/role-permission/assign", payload)),
    listByRole: async (roleId: UUID) =>
      unwrap<unknown>(await api.get(`/role-permission/role/${roleId}`)),
    remove: async (id: UUID) =>
      unwrap<unknown>(await api.delete(`/role-permission/remove/${id}`)),
    clearByRole: async (roleId: UUID) =>
      unwrap<unknown>(
        await api.delete(`/role-permission/clear/role/${roleId}`),
      ),
  },
  userPermissions: {
    assign: async (payload: UserPermissionAssignDto) =>
      unwrap<unknown>(await api.post("/user-permission/assign", payload)),
    listByUser: async (userId: UUID) =>
      unwrap<unknown>(await api.get(`/user-permission/user/${userId}`)),
    remove: async (id: UUID) =>
      unwrap<unknown>(await api.delete(`/user-permission/remove/${id}`)),
    clearByUser: async (userId: UUID) =>
      unwrap<unknown>(
        await api.delete(`/user-permission/clear/user/${userId}`),
      ),
  },
};
