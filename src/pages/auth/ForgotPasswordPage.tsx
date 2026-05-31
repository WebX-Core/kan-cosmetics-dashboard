import React from "react";
import { Link } from "react-router-dom";
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
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ margin: 0 }}>Forgot Password</h1>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Enter your email to request a reset link.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={forgot.isPending}>{forgot.isPending ? "Sending..." : "Send Reset Link"}</button>
      </form>
      <Link to="/login" style={{ fontSize: 13 }}>Back to sign in</Link>
    </div>
  );
};
