import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileJson, CheckCircle, XCircle } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

export const ProductBulkPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [jsonText, setJsonText] = React.useState("");
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [bulkResult, setBulkResult] = React.useState<unknown>(null);

  const [imageFiles, setImageFiles] = React.useState<FileList | null>(null);
  const [imageResult, setImageResult] = React.useState<unknown>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const bulkCreate = useMutation({
    mutationFn: (payload: ReadonlyArray<Record<string, unknown>>) => catalogApi.productsBulkCreate(payload),
    onSuccess: (data) => { setBulkResult(data); toast.success("Bulk create completed."); },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const bulkUpload = useMutation({
    mutationFn: (formData: FormData) => catalogApi.productsBulkUploadImages(formData),
    onSuccess: (data) => { setImageResult(data); toast.success("Bulk image upload completed."); },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const handleBulkCreate = () => {
    setJsonError(null);
    setBulkResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim());
    } catch {
      setJsonError("Invalid JSON — please check your input.");
      return;
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    bulkCreate.mutate(arr as ReadonlyArray<Record<string, unknown>>);
  };

  const handleBulkUpload = () => {
    if (!imageFiles || imageFiles.length === 0) {
      toast.error("Please select at least one image file.");
      return;
    }
    const formData = new FormData();
    Array.from(imageFiles).forEach((file) => formData.append("images", file));
    bulkUpload.mutate(formData);
  };

  return (
    <PageLayout
      title="Bulk Product Operations"
      subtitle="Create multiple products at once or upload images in bulk."
      onBack={() => navigate("/dashboard/products")}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[#1d1d1f]">Bulk Create Products</p>
          </div>
          <p className="text-xs text-[#86868b]">
            Paste a JSON array of product objects. Each object should match the product creation schema.
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
            placeholder={'[\n  {\n    "title": "Product 1",\n    "price": 999\n  }\n]'}
            rows={10}
            className="w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3 font-mono text-xs text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 resize-y"
          />
          {jsonError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <XCircle size={13} /> {jsonError}
            </div>
          )}
          <button
            type="button"
            onClick={handleBulkCreate}
            disabled={!jsonText.trim() || bulkCreate.isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <FileJson size={15} /> {bulkCreate.isPending ? "Creating…" : "Bulk Create"}
          </button>
          {Boolean(bulkResult) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-emerald-700">
                <CheckCircle size={13} /> Success
              </div>
              <pre className="text-xs text-emerald-900 whitespace-pre-wrap break-all">
                {JSON.stringify(bulkResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-[var(--primary)]" />
            <p className="text-sm font-semibold text-[#1d1d1f]">Bulk Upload Images</p>
          </div>
          <p className="text-xs text-[#86868b]">
            Upload multiple product images at once. Supported formats: JPG, PNG, WebP.
          </p>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-6 py-10 cursor-pointer hover:border-[var(--primary)] hover:bg-[#f0f7ff] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-[#86868b]" />
            <p className="text-sm text-[#86868b]">
              {imageFiles && imageFiles.length > 0
                ? `${imageFiles.length} file${imageFiles.length > 1 ? "s" : ""} selected`
                : "Click to select images"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFiles(e.target.files)}
            />
          </div>

          {imageFiles && imageFiles.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {Array.from(imageFiles).map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f5f5f7] px-3 py-1.5 text-xs text-[#1d1d1f]">
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-[#86868b] shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={!imageFiles || imageFiles.length === 0 || bulkUpload.isPending}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Upload size={15} /> {bulkUpload.isPending ? "Uploading…" : "Upload Images"}
          </button>

          {Boolean(imageResult) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-emerald-700">
                <CheckCircle size={13} /> Upload complete
              </div>
              <pre className="text-xs text-emerald-900 whitespace-pre-wrap break-all">
                {JSON.stringify(imageResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};
