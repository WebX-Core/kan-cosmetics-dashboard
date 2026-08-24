import React from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import {
  fetchExport,
  saveExportFile,
  type ExportFile,
  type ExportFormat,
  type ExportParams,
} from "@/shared/utils/exportFile";
import { ExportPreviewModal } from "@/shared/components/dashboard/ExportPreviewModal";

export interface ExportMenuProps {
  basePath: string;
  params?: ExportParams;
  filename: string;
  label?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ basePath, params, filename, label = "Export" }) => {
  const toast = useToast();
  const root = React.useRef<HTMLDivElement>(null);

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<ExportFormat | null>(null);
  const [preview, setPreview] = React.useState<{ format: ExportFormat; file: ExportFile } | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openPreview = async (format: ExportFormat) => {
    setOpen(false);
    setLoading(format);
    try {
      const file = await fetchExport(`${basePath}/export/${format}`, format, params, filename);
      setPreview({ format, file });
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    setDownloading(true);
    try {
      saveExportFile(preview.file);
      toast.success(`${preview.format === "excel" ? "Excel" : "PDF"} export downloaded.`);
      setPreview(null);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={Boolean(loading)}
        className="flex h-[34px] items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {label}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border bg-white p-1 shadow-xl">
          <button
            onClick={() => void openPreview("excel")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f5f5f7]"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel (.xlsx)
          </button>
          <button
            onClick={() => void openPreview("pdf")}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f5f5f7]"
          >
            <FileText size={14} className="text-red-600" />
            PDF
          </button>
        </div>
      )}

      {preview && (
        <ExportPreviewModal
          file={preview.file}
          format={preview.format}
          downloading={downloading}
          onDownload={handleDownload}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};
