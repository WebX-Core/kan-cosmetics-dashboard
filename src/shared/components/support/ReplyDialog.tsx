import React from "react";
import { Loader2, X } from "lucide-react";

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#d2d2d7] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Reply</h2>
            <p className="text-[13px] text-[#86868b]">Replying to {targetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <X size={14} />
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your reply…"
          rows={4}
          className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
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
        </div>
      </div>
    </div>
  );
};
