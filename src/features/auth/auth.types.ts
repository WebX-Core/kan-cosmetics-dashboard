// src/features/auth/auth.types.ts
import type { UUID } from "../../shared/types/common.types";

/* -------- Enums -------- */
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type KnownRole = "SUDOADMIN" | "ADMIN" | "USER";
export type Role = KnownRole | (string & {});

/* -------- DTOs -------- */
export type SignupDto = Readonly<{
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string; // country-code + valid phone
  password: string;
  address: string;
  gender: Gender;
  roleIds?: ReadonlyArray<string>;
  permissionIds?: ReadonlyArray<string>;
  isVerified?: boolean;
  sortOrder?: number;
}>;

export type SignupPayload = Readonly<SignupDto & { profile?: File | null }>;

export type SigninDto = Readonly<{
  email: string;
  password: string;
}>;

export type ForgotPasswordDto = Readonly<{
  email: string;
}>;

export type ResetPasswordDto = Readonly<{
  token: string;
  password: string;
  confirmPassword: string;
}>;

export type ChangePasswordDto = Readonly<{
  currentPassword: string;
  password: string;
  confirmPassword: string;
}>;

/* -------- Entities -------- */
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

/* -------- Common small responses -------- */
export type SuccessResponse = Readonly<{
  success: boolean;
}>;

export type PermissionDetail = Readonly<{
  id: string;
  slug: string;
  key: string;
  module: string;
  action: string;
}>;

export type SigninResponse = Readonly<{
  status: number;
  message: string;
  id: string;
  role: Role;
  isVerified: boolean;
  name: string;
  profilePicture?: string | null;
  permissions: ReadonlyArray<string>;
  permissionDetails: ReadonlyArray<PermissionDetail>;
}>;

export type SignupResponse = User;
