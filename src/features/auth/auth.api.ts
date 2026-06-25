import { api, toFormData, unwrap } from "../../shared/api/api";
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SigninDto,
  SigninResponse,
  SessionResponse,
  SignupPayload,
  SignupResponse,
  SuccessResponse,
} from "./auth.types";
import type { FormFieldValue, FormFileValue } from "../../shared/api/api";

export const authApi = {
  signup: async (payload: SignupPayload): Promise<SignupResponse> => {
    const { profile, ...fields } = payload;

    const fd = toFormData(
      fields as Readonly<Record<string, FormFieldValue>>,
      { profile: (profile ?? undefined) as FormFileValue }
    );

    const res = await api.post("/auth/signup", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap<SignupResponse>(res);
  },

  signin: async (dto: SigninDto): Promise<SigninResponse> => {
    const res = await api.post("/auth/signin", dto);
    return unwrap<SigninResponse>(res);
  },

  session: async (): Promise<SessionResponse> => {
    const res = await api.get("/auth/session");
    return unwrap<SessionResponse>(res);
  },

  forgotPassword: async (dto: ForgotPasswordDto): Promise<SuccessResponse> => {
    const res = await api.post("/auth/forgot-password", dto);
    return unwrap<SuccessResponse>(res);
  },

  resetPassword: async (dto: ResetPasswordDto): Promise<SuccessResponse> => {
    const res = await api.patch("/auth/reset-password", dto);
    return unwrap<SuccessResponse>(res);
  },

  changePassword: async (dto: ChangePasswordDto): Promise<SuccessResponse> => {
    const res = await api.patch("/auth/change-password", dto);
    return unwrap<SuccessResponse>(res);
  },

  logout: async (): Promise<SuccessResponse> => {
    const res = await api.delete("/auth/logout");
    return unwrap<SuccessResponse>(res);
  },

} as const;
