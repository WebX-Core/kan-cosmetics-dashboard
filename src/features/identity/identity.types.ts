import type { SignupDto } from "../auth/auth.types";

export type RoleDto = Readonly<{
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}>;

export type PermissionDto = Readonly<{
  module: string;
  action: string;
  key: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}>;

export type UserRoleAssignDto = Readonly<{
  userId: string;
  roleId: string;
}>;

export type RolePermissionAssignDto = Readonly<{
  roleId: string;
  permissionId: string;
}>;

export type UserPermissionAssignDto = Readonly<{
  userId: string;
  permissionId?: string;
  permissionIds?: ReadonlyArray<string>;
}>;

export type AdminUserDto = SignupDto;
