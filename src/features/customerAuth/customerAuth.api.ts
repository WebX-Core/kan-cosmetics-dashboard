import { api, unwrap } from "@/shared/api/api";
import type { CustomerGoogleSigninDto, CustomerSigninDto, CustomerSignupDto, CustomerUpdateProfileDto } from "./customerAuth.types";

export const customerAuthApi = {
  signup: async (payload: CustomerSignupDto) => unwrap<unknown>(await api.post("/customer-auth/signup", payload)),
  signin: async (payload: CustomerSigninDto) => unwrap<unknown>(await api.post("/customer-auth/signin", payload)),
  googleSignin: async (payload: CustomerGoogleSigninDto) => unwrap<unknown>(await api.post("/customer-auth/google-signin", payload)),
  logout: async () => unwrap<unknown>(await api.post("/customer-auth/logout")),
  me: async () => unwrap<unknown>(await api.get("/customer-auth/me")),
  updateProfile: async (payload: CustomerUpdateProfileDto) => unwrap<unknown>(await api.patch("/customer-auth/update-profile", payload)),
} as const;
