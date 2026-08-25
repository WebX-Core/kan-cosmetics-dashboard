import React from "react";
import { Loader2 } from "lucide-react";
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
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import type { EmailLogRow } from "./emailLogs.types";

export interface EmailLogDetailModalProps {
  row: EmailLogRow;
  onClose: () => void;
  onRetry?: (row: EmailLogRow) => void;
  retrying?: boolean;
}

const fields: ReadonlyArray<readonly [string, (r: EmailLogRow) => string]> = [
  ["Campaign", (r) => r.campaignTitle],
  ["Subject", (r) => r.subject],
  ["Sent At", (r) => r.sentAt],
  ["Message ID", (r) => r.messageId],
  ["Provider Response", (r) => r.providerMessage],
  ["Error", (r) => r.errorMessage],
];

export const EmailLogDetailModal: React.FC<EmailLogDetailModalProps> = ({ row, onClose, onRetry, retrying }) => {
  const canRetry = Boolean(onRetry) && row.status.toLowerCase() === "failed";

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[min(94vw,560px)] max-w-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{row.recipientEmail}</AlertDialogTitle>
          <AlertDialogDescription>Email delivery detail</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2">
          <StatusBadge status={["delivered", "sent"].includes(row.status.toLowerCase()) ? "Active" : "Inactive"} label={row.status} />
        </div>

        <div className="rounded-xl border border-[#e5e5e7]">
          <table className="w-full border-collapse text-left text-[13px]">
            <tbody>
              {fields.map(([label, getValue]) => (
                <tr key={label} className="border-b border-[#f0f0f2] last:border-0 align-top">
                  <td className="w-[140px] whitespace-nowrap px-3 py-2 font-medium text-[#424245]">{label}</td>
                  <td className="whitespace-pre-wrap px-3 py-2 text-[#424245]">{getValue(row) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {canRetry && (
            <AlertDialogAction disabled={retrying} onClick={() => onRetry?.(row)}>
              {retrying ? <Loader2 size={13} className="animate-spin" /> : null}
              {retrying ? "Retrying…" : "Retry"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
