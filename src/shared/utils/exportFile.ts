import type { AxiosResponse } from "axios";
import { api } from "@/shared/api/api";

export type ExportFormat = "excel" | "pdf";
export type ExportParams = Readonly<Record<string, string | number | boolean | undefined | null>>;

const extension = (format: ExportFormat) => format === "excel" ? "xlsx" : "pdf";
const filenameFromDisposition = (value: unknown) => {
  if (typeof value !== "string") return "";
  const utf = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf) return decodeURIComponent(utf.replace(/["']/g, ""));
  return value.match(/filename=["']?([^;"']+)/i)?.[1]?.trim() ?? "";
};

export const downloadExport = async (path: string, format: ExportFormat, params?: ExportParams, fallbackName = "export") => {
  const response: AxiosResponse<Blob> = await api.get(path, { params, responseType: "blob" });
  const contentType = String(response.headers["content-type"] ?? "");
  if (contentType.includes("application/json")) {
    const body = JSON.parse(await response.data.text()) as { message?: string };
    throw new Error(body.message || "Export failed.");
  }
  const filename = filenameFromDisposition(response.headers["content-disposition"]) || `${fallbackName}.${extension(format)}`;
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
