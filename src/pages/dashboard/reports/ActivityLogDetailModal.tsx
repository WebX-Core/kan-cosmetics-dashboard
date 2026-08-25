import React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import type { ActivityRow } from "./activityLogs.types";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const isEmptyMetadata = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
};

export interface ActivityLogDetailModalProps {
  row: ActivityRow;
  onClose: () => void;
}

export const ActivityLogDetailModal: React.FC<ActivityLogDetailModalProps> = ({ row, onClose }) => {
  const fields: ReadonlyArray<readonly [string, unknown]> = [
    ["Who", row.who],
    ["Activity", row.activityLabel],
    ["Entity", row.entityLabel],
    ["Page", row.path],
    ["Method", row.method],
    ["Referrer", row.referrer],
    ["Session ID", row.sessionId],
    ["Occurred At", row.occurredAtLabel],
  ];

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[min(94vw,560px)] max-w-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{row.activityLabel}</AlertDialogTitle>
          <AlertDialogDescription>{row.who}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-xl border border-[#e5e5e7]">
          <table className="w-full border-collapse text-left text-[13px]">
            <tbody>
              {fields.map(([label, value]) => (
                <tr key={label} className="border-b border-[#f0f0f2] last:border-0 align-top">
                  <td className="w-[110px] whitespace-nowrap px-3 py-2 font-medium text-[#424245]">{label}</td>
                  <td className="break-all px-3 py-2 text-[#424245]">{formatValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isEmptyMetadata(row.metadata) && (
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[#424245]">Metadata</p>
            <pre className="max-h-[280px] overflow-auto rounded-xl border border-[#e5e5e7] bg-[#f8f8fa] p-3 text-[11px] leading-[1.6] text-[#3a3a3c]">
              {formatValue(row.metadata)}
            </pre>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
