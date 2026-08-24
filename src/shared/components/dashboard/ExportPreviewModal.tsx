import React from "react";
import { read, utils } from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Download, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import type { ExportFile, ExportFormat } from "@/shared/utils/exportFile";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PREVIEW_ROWS = 50;

interface ExcelPreviewProps {
  file: ExportFile;
}

interface ExcelPreviewData {
  headers: ReadonlyArray<string>;
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
  totalRows: number;
}

const nonEmptyCellCount = (row: ReadonlyArray<unknown>): number =>
  row.filter((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "").length;

const readExcelPreview = async (blob: Blob): Promise<ExcelPreviewData> => {
  const buffer = await blob.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as ReadonlyArray<
    ReadonlyArray<unknown>
  >;

  // Report exports lead with a merged title row (e.g. "Product Report") before
  // the real column headers — skip rows until one has more than one cell filled.
  const headerRowIndex = rows.findIndex((row) => nonEmptyCellCount(row) > 1);
  const headers = rows[headerRowIndex] ?? [];
  const body = rows.slice(headerRowIndex + 1).filter((row) => nonEmptyCellCount(row) > 0);

  return {
    headers: headers.map((cell) => String(cell ?? "")),
    rows: body.slice(0, MAX_PREVIEW_ROWS),
    totalRows: body.length,
  };
};

const ExcelPreview: React.FC<ExcelPreviewProps> = ({ file }) => {
  const [data, setData] = React.useState<ExcelPreviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    readExcelPreview(file.blob)
      .then(setData)
      .catch(() => setError("Could not preview this file."));
  }, [file]);

  if (error) return <p className="p-6 text-[13px] text-[#86868b]">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 size={18} className="animate-spin text-[#86868b]" />
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-[#e5e5e7]">
      <table className="w-max min-w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 bg-[#f5f5f7]">
          <tr>
            {data.headers.map((header, index) => (
              <th key={index} className="whitespace-nowrap border-b border-[#e5e5e7] px-3 py-2 font-semibold text-[#1d1d1f]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[#f0f0f2] last:border-0">
              {data.headers.map((_, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-3 py-2 text-[#424245]">
                  {String(row[cellIndex] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.totalRows > MAX_PREVIEW_ROWS && (
        <p className="border-t border-[#e5e5e7] bg-[#fafafa] px-3 py-2 text-[12px] text-[#86868b]">
          Showing {MAX_PREVIEW_ROWS} of {data.totalRows} rows.
        </p>
      )}
    </div>
  );
};

interface PdfPreviewProps {
  file: ExportFile;
}

const renderPdfPages = async (blob: Blob, container: HTMLDivElement, isCancelled: () => boolean) => {
  const buffer = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const scale = Math.min(2, (container.clientWidth || 800) / 612);

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    if (isCancelled()) return;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = "mb-3 w-full rounded-lg border border-[#e5e5e7] shadow-sm last:mb-0";

    const context = canvas.getContext("2d");
    if (!context) continue;

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    if (isCancelled()) return;
    container.appendChild(canvas);
  }
};

const PdfPreview: React.FC<PdfPreviewProps> = ({ file }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    setError(null);

    let cancelled = false;
    renderPdfPages(file.blob, container, () => cancelled)
      .catch(() => {
        if (!cancelled) setError("Could not preview this file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl bg-[#f5f5f7] p-3">
      {loading && (
        <div className="flex items-center justify-center p-10">
          <Loader2 size={18} className="animate-spin text-[#86868b]" />
        </div>
      )}
      {error && <p className="p-6 text-[13px] text-[#86868b]">{error}</p>}
      <div ref={containerRef} />
    </div>
  );
};

export interface ExportPreviewModalProps {
  file: ExportFile;
  format: ExportFormat;
  downloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  file,
  format,
  downloading,
  onDownload,
  onClose,
}) => {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[min(94vw,900px)] max-w-none">
        <AlertDialogHeader>
          <AlertDialogTitle>Preview export</AlertDialogTitle>
          <AlertDialogDescription>{file.filename}</AlertDialogDescription>
        </AlertDialogHeader>

        {format === "excel" ? <ExcelPreview file={file} /> : <PdfPreview file={file} />}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={downloading} onClick={onDownload}>
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
