import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { gsap } from "gsap";
import { useAuth } from "../app/providers/AuthContext";
import { useSignin, type User, type SigninResponse } from "@/features/auth";
import { parseApiError } from "@/shared/utils/apiError";
import { useToast } from "@/shared/components/feedback/ToastProvider";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginValues, string>>;

function toFieldErrors(err: z.ZodError<LoginValues>): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (key === "email" || key === "password") out[key] = issue.message;
  }
  return out;
}

const inputCls =
  "h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 text-[14px] text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10";

export const LoginPage: React.FC = () => {
  const [values, setValues]       = useState<LoginValues>({ email: "", password: "" });
  const [errors, setErrors]       = useState<FieldErrors>({});
  const [showPwd, setShowPwd]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const navigate   = useNavigate();
  const toast      = useToast();
  const location   = useLocation();
  const signin     = useSignin();
  const from = useMemo(() => {
    const st = location.state as { from?: string } | null;
    return st?.from ?? "/dashboard";
  }, [location.state]);
  const { setAuthenticated } = useAuth();

  /* ── form stagger entrance ──────────────────────────────────── */
  const wrapRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(Array.from(wrapRef.current?.children ?? []), {
          y: 12,
          opacity: 0,
          stagger: 0.07,
          duration: 0.4,
          ease: "power3.out",
          delay: 0.5,
        });
      }, wrapRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  /* ── helpers ─────────────────────────────────────────────────── */
  const asUser = (response: SigninResponse, email: string): User => {
    const nameParts = (response.name ?? "").trim().split(/\s+/).filter(Boolean);
    return {
      id: response.id || email,
      firstname: nameParts[0] || email.split("@")[0] || "User",
      middlename: nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : undefined,
      lastname: nameParts.length > 1 ? (nameParts[nameParts.length - 1] ?? "") : "",
      email,
      phone: "",
      address: "",
      gender: "OTHER",
      role: response.role,
      isVerified: response.isVerified,
      profileUrl: response.profilePicture ?? undefined,
    };
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) { setErrors(toFieldErrors(parsed.error)); return; }
    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    const email = parsed.data.email.trim().toLowerCase();
    try {
      const response = await signin.mutateAsync({ email, password: parsed.data.password });
      const user = asUser(response, email);
      const permissions: ReadonlyArray<string> = response.permissions.filter(
        (p): p is string => typeof p === "string"
      );
      setAuthenticated(user, permissions);
      navigate(from, { replace: true });
      toast.success("Signed in");
    } catch (err) {
      const msg = parseApiError(err).message;
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={wrapRef}>
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-[20px] font-bold tracking-tight text-gray-900">
          Sign in
        </h2>
        <p className="mt-1 text-[13px] text-gray-500">
          Welcome back to KAN dashboard.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-[12px] font-medium text-gray-700">
            Email
          </label>
          <input
            value={values.email}
            onChange={(e) => setValues(p => ({ ...p, email: e.target.value }))}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputCls}
          />
          {errors.email && (
            <p className="text-[11px] text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[12px] font-medium text-gray-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] text-blue-600 transition-colors hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              value={values.password}
              onChange={(e) => setValues(p => ({ ...p, password: e.target.value }))}
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[12px] text-red-600">
            {submitError}
          </p>
        )}

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-blue-600 text-[14px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
};
