// src/shared/api/api.ts
import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { ApiEnvelope } from "../types/common.types";
import { triggerGlobalLogout } from "../../app/providers/authEvents";
import { getRecaptchaToken, shouldSkipRecaptcha } from "../security/recaptcha";

const getRequestPath = (config?: InternalAxiosRequestConfig): string => {
  const rawUrl = String(config?.url ?? "");
  try {
    return new URL(rawUrl, config?.baseURL ?? window.location.origin).pathname;
  } catch {
    return rawUrl.split("?")[0] ?? rawUrl;
  }
};

/* =========================
   Axios instance
========================= */
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const apiBasePath = (import.meta.env.VITE_API_BASE_PATH as string | undefined)?.trim() || "/api/v1/kan";
const apiBaseUrl = import.meta.env.DEV ? apiBasePath : configuredBaseUrl || apiBasePath;

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const withRecaptchaHeader = async (
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> => {
  const requestPath = String(config.url ?? "");
  if (shouldSkipRecaptcha(config.method, requestPath)) {
    return config;
  }

  const token = await getRecaptchaToken("dashboard_api");
  if (!token) {
    throw new Error("reCAPTCHA token is required for all API requests.");
  }

  config.headers.set("x-recaptcha-token", token);
  return config;
};

api.interceptors.request.use((config) => withRecaptchaHeader(config));

api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const typedError = error as {
        config?: InternalAxiosRequestConfig;
        response?: { status?: number; data?: { message?: unknown } };
      };
      const resp = typedError.response;
      const requestPath = getRequestPath(typedError.config);
      const isSessionProbe = requestPath.endsWith("/auth/session");
      const message = typeof resp?.data?.message === "string"
        ? resp.data.message.toLowerCase()
        : "";
      const isExpiredSession =
        message.includes("session expired") ||
        message.includes("invalid or expired token") ||
        message.includes("missing or expired") ||
        message === "please login" ||
        message === "unauthorized";

      if (resp?.status === 401 && !isSessionProbe && isExpiredSession) {
        triggerGlobalLogout();
      }
    }

    return Promise.reject(error);
  }
);
/* =========================
   Response unwrap
========================= */
export function unwrap<T>(res: AxiosResponse<unknown>): T {
  const body: unknown = res.data;

  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as ApiEnvelope<T>).data;
  }

  return body as T;
}

/* =========================
   FormData helpers (strict)
========================= */

export type FormPrimitive = string | number | boolean;

export type FormObject = Record<string, unknown>;

export type FormFieldValue =
  | FormPrimitive
  | Blob
  | Date
  | FormObject
  | ReadonlyArray<FormPrimitive | Blob | Date | FormObject>
  | null
  | undefined;

export type FormFileArray = ReadonlyArray<File>;
export type FormFileValue = File | FormFileArray | null | undefined;

function isFileArray(v: FormFileValue): v is FormFileArray {
  return Array.isArray(v);
}

function appendFormValue(
  fd: FormData,
  key: string,
  value: Exclude<FormFieldValue, null | undefined>
): void {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => item instanceof Blob)) {
      for (const item of value) {
        fd.append(key, item);
      }
      return;
    }

    fd.append(key, JSON.stringify(value));
    return;
  }

  // Blob/File
  if (value instanceof Blob) {
    fd.append(key, value);
    return;
  }

  // Date
  if (value instanceof Date) {
    fd.append(key, value.toISOString());
    return;
  }

  // Object
  if (typeof value === "object") {
    fd.append(key, JSON.stringify(value));
    return;
  }

  // Primitive
  fd.append(key, String(value));
}

export function toFormData(
  fields: Readonly<Record<string, FormFieldValue>>,
  files?: Readonly<Record<string, FormFileValue>>
): FormData {
  const fd = new FormData();

  // Fields
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    appendFormValue(fd, k, v);
  }

  // Files
  if (files) {
    for (const [k, v] of Object.entries(files)) {
      if (!v) continue;

      if (isFileArray(v)) {
        for (const file of v) fd.append(k, file);
      } else {
        fd.append(k, v);
      }
    }
  }

  return fd;
}
