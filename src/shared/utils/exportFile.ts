import type { AxiosResponse } from "axios";
import { api } from "@/shared/api/api";

export type ExportFormat = "excel" | "pdf";
export type ExportParams = Readonly<Record<string, string | number | boolean | undefined | null>>;

export interface ExportFile {
  blob: Blob;
  filename: string;
}

const extension = (format: ExportFormat) => (format === "excel" ? "xlsx" : "pdf");

const filenameFromDisposition = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const utf = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf) return decodeURIComponent(utf.replace(/["']/g, ""));
  return value.match(/filename=["']?([^;"']+)/i)?.[1]?.trim() ?? "";
};

export const fetchExport = async (
  path: string,
  format: ExportFormat,
  params?: ExportParams,
  fallbackName = "export",
): Promise<ExportFile> => {
  const response: AxiosResponse<Blob> = await api.get(path, { params, responseType: "blob" });
  const contentType = String(response.headers["content-type"] ?? "");

  if (contentType.includes("application/json")) {
    const body = JSON.parse(await response.data.text()) as { message?: string };
    throw new Error(body.message || "Export failed.");
  }

  const filename =
    filenameFromDisposition(response.headers["content-disposition"]) ||
    `${fallbackName}.${extension(format)}`;

  return { blob: response.data, filename };
};

export const saveExportFile = (file: ExportFile) => {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
