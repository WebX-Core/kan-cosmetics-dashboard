import { identityApi } from "./identity.api";

export const useRoleList = identityApi.roles.hooks.useList;
export const usePermissionList = identityApi.permissions.hooks.useList;
