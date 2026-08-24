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
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import type { AuditLogRow } from "./auditLogs.types";

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export interface AuditLogDetailModalProps {
  row: AuditLogRow;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({ row, onClose }) => {
  const changedFields = Object.entries(row.changedBody);

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[min(94vw,640px)] max-w-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{row.entity} {row.action.toLowerCase()}d</AlertDialogTitle>
          <AlertDialogDescription>
            {row.admin} ({row.adminEmail}) &middot; {row.timestamp}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2">
          <StatusBadge status={row.action} />
          <StatusBadge status={row.statusCode < 400 ? "success" : "failed"} label={`${row.method} ${row.statusCode || "—"}`} />
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-[#e5e5e7]">
          {changedFields.length === 0 ? (
            <p className="p-4 text-[13px] text-[#86868b]">No field-level changes recorded.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="sticky top-0 bg-[#f5f5f7]">
                <tr>
                  <th className="whitespace-nowrap border-b border-[#e5e5e7] px-3 py-2 font-semibold text-[#1d1d1f]">Field</th>
                  <th className="border-b border-[#e5e5e7] px-3 py-2 font-semibold text-[#1d1d1f]">Value</th>
                </tr>
              </thead>
              <tbody>
                {changedFields.map(([key, value]) => (
                  <tr key={key} className="border-b border-[#f0f0f2] last:border-0 align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-[#424245]">{key}</td>
                    <td className="whitespace-pre-wrap px-3 py-2 text-[#424245]">{formatValue(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
