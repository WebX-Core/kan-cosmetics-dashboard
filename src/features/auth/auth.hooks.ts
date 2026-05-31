import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./auth.api";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SigninDto,
  SignupPayload,
} from "./auth.types";

export const useSignup = () => {
  return useMutation({
    mutationFn: (payload: SignupPayload) => authApi.signup(payload),
  });
};

export const useSignin = () => {
  return useMutation({
    mutationFn: (dto: SigninDto) => authApi.signin(dto),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) => authApi.forgotPassword(dto),
  });
};



export const useResetPassword = () => {
  return useMutation({
    mutationFn: (dto: ResetPasswordDto) => authApi.resetPassword(dto),
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => authApi.changePassword(dto),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
};
