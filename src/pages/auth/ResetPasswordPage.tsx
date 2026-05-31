import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { useResetPassword } from "@/features/auth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { Button } from "@/shared/components/ui/button";
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
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Reset Password</h1>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Use the token from your email to set a new password.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} />
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", paddingRight: 34 }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 border-none bg-transparent p-0 text-[var(--muted)] shadow-none hover:bg-transparent"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", paddingRight: 34 }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 border-none bg-transparent p-0 text-[var(--muted)] shadow-none hover:bg-transparent"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        </div>
        <button type="submit" disabled={reset.isPending}>{reset.isPending ? "Resetting..." : "Reset Password"}</button>
      </form>
      <Link to="/login" style={{ fontSize: 13 }}>Back to sign in</Link>
    </div>
  );
};
