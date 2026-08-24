import React from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

interface ReplyDialogProps {
  isOpen: boolean;
  targetName: string;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export const ReplyDialog: React.FC<ReplyDialogProps> = ({ isOpen, targetName, onClose, onSubmit }) => {
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setMessage("");
  }, [isOpen]);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reply</AlertDialogTitle>
          <AlertDialogDescription>Replying to {targetName}</AlertDialogDescription>
        </AlertDialogHeader>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your reply…"
          rows={4}
          className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />

        <AlertDialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!message.trim() || submitting}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            Send Reply
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
