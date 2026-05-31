import React from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useChangePassword } from "@/features/auth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const inputCls =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 pr-11 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}> = ({ label, value, onChange, show, onToggle, placeholder }) => (
  <FormField label={label} required>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </FormField>
);

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNext, setShowNext] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, { currentPassword, password, confirmPassword }, toast);
    if (!parsed) return;
    try {
      await change.mutateAsync(parsed);
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <ModernFormLayout
      title="Change Password"
      subtitle="Use a strong password with at least 6 characters."
      onBack={() => navigate("/dashboard/profile")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Update Password">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="Enter your current password"
          />
          <PasswordField
            label="New Password"
            value={password}
            onChange={setPassword}
            show={showNext}
            onToggle={() => setShowNext((v) => !v)}
            placeholder="At least 6 characters"
          />
          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="Re-enter new password"
          />
        </FormSection>

        <FormActions
          submitLabel={change.isPending ? "Updating…" : "Change Password"}
          submitIcon={change.isPending ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={change.isPending}
          onCancel={() => navigate("/dashboard/profile")}
        />
      </form>
    </ModernFormLayout>
  );
};
