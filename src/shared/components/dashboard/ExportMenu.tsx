import React from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { downloadExport, type ExportFormat, type ExportParams } from "@/shared/utils/exportFile";

export const ExportMenu: React.FC<{ basePath: string; params?: ExportParams; filename: string; label?: string }> = ({ basePath, params, filename, label = "Export" }) => {
  const toast = useToast(); const [open, setOpen] = React.useState(false); const [loading, setLoading] = React.useState<ExportFormat | null>(null); const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  const run = async (format: ExportFormat) => { setLoading(format); try { await downloadExport(`${basePath}/export/${format}`, format, params, filename); toast.success(`${format === "excel" ? "Excel" : "PDF"} export downloaded.`); setOpen(false); } catch (error) { toast.error(parseApiError(error).message); } finally { setLoading(null); } };
  return <div ref={root} className="relative"><button type="button" onClick={() => setOpen((value) => !value)} disabled={Boolean(loading)} className="flex h-[34px] items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50">{loading ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>} {label}</button>{open && <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border bg-white p-1 shadow-xl"><button onClick={() => void run("excel")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f5f5f7]"><FileSpreadsheet size={14} className="text-emerald-600"/> Excel (.xlsx)</button><button onClick={() => void run("pdf")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-[#f5f5f7]"><FileText size={14} className="text-red-600"/> PDF</button></div>}</div>;
};
