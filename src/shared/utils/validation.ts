import type { ZodSchema } from "zod";

type ToastLike = Readonly<{
  error: (message: string) => void;
}>;

export const validateOrToast = <T>(
  schema: ZodSchema<T>,
  value: unknown,
  toast: ToastLike,
  fallback = "Invalid form",
): T | null => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    toast.error(parsed.error.issues[0]?.message ?? fallback);
    return null;
  }
  return parsed.data;
};

