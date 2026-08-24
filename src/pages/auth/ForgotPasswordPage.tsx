import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { useForgotPassword } from "@/features/auth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";

const schema = z.object({
  email: z.string().email(),
});

export const ForgotPasswordPage: React.FC = () => {
  const toast = useToast();
  const forgot = useForgotPassword();
  const [email, setEmail] = React.useState("");

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, { email }, toast, "Invalid email");
    if (!parsed) return;
    try {
      await forgot.mutateAsync(parsed);
      toast.success("Reset link requested");
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[20px] font-bold tracking-tight text-gray-900">
          Forgot password?
        </h1>
        <p className="mt-1 text-[13px] leading-5 text-gray-500">
          Enter your email address and we’ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="forgot-password-email" className="block text-[12px] font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3.5 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={forgot.isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {forgot.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
          {forgot.isPending ? "Sending…" : "Send reset link"}
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
