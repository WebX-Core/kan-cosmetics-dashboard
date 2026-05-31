import { useMutation } from "@tanstack/react-query";
import { customerAuthApi } from "./customerAuth.api";
import type { CustomerGoogleSigninDto, CustomerSigninDto, CustomerSignupDto } from "./customerAuth.types";

export const useCustomerSignup = () =>
  useMutation({
    mutationFn: (payload: CustomerSignupDto) => customerAuthApi.signup(payload),
  });

export const useCustomerSignin = () =>
  useMutation({
    mutationFn: (payload: CustomerSigninDto) => customerAuthApi.signin(payload),
  });

export const useCustomerGoogleSignin = () =>
  useMutation({
    mutationFn: (payload: CustomerGoogleSigninDto) => customerAuthApi.googleSignin(payload),
  });

