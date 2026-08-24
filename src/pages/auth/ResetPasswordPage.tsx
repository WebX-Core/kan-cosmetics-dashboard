import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { z } from "zod";
import { useResetPassword } from "@/features/auth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const ResetPasswordPage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const reset = useResetPassword();
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, { token, password, confirmPassword }, toast);
    if (!parsed) return;
    try {
      await reset.mutateAsync(parsed);
      toast.success("Password reset successful");
      nav("/login", { replace: true });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[20px] font-bold tracking-tight text-gray-900">
          Reset password
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-gray-500">
          Enter the token from your email and choose a new password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="reset-token" className="block text-[12px] font-medium text-gray-700">
            Reset token
          </label>
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="reset-token"
              autoComplete="one-time-code"
              placeholder="Enter your reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3.5 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-password" className="block text-[12px] font-medium text-gray-700">
            New password
          </label>
          <div className="relative">
            <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-11 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="block text-[12px] font-medium text-gray-700">
            Confirm password
          </label>
          <div className="relative">
            <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-11 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={reset.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {reset.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
          {reset.isPending ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <Link
        to="/login"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover"
      >
        <ArrowLeft size={14} />
        Back to sign in
      </Link>
    </div>
  );
};
