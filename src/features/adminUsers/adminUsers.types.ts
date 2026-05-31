// src/features/adminUsers/adminUsers.types.ts
import type { UUID } from "../../shared/types/common.types";

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type Role = "SUDOADMIN" | "ADMIN" | "USER";

export type User = Readonly<{
  id: UUID;
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  gender: Gender;
  role: Role;
  isVerified: boolean;
  sortOrder?: number;
  profileUrl?: string;

  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}>;

export type CreateUserDto = Readonly<{
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  gender: Gender;
  roleIds?: ReadonlyArray<string>;
  permissionIds?: ReadonlyArray<string>;
  isVerified?: boolean;
  sortOrder?: number;
}>;

export type UpdateUserDto = Readonly<
  Partial<Omit<CreateUserDto, "password">> & {
    // optional if your backend supports it; safe to include
    removeProfile?: boolean;
  }
>;

export type CreateUserPayload = Readonly<CreateUserDto & { profile?: File | null }>;
export type UpdateUserPayload = Readonly<UpdateUserDto & { profile?: File | null }>;
