const siteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined)?.trim() ?? "";

const toPublicPathPattern = (path: string): RegExp => {
  const escaped = path
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/:([a-zA-Z0-9_]+)/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
};

const publicGetRoutes = [
  "/auth/signin",
  "/auth/session",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/customer-auth/signin",
  "/customer-auth/signup",
  "/customer-auth/google-signin",
  "/faq/get-all",
  "/blog/get-all",
  "/blog/get/:identifier",
  "/category/get-all",
  "/category/get/:identifier",
  "/subcategory/get-all",
  "/subcategory/get/:identifier",
  "/product/get-all",
  "/product/get/:identifier",
  "/product-variant/get-all",
  "/product-variant/get/:identifier",
  "/product-tag/get-all",
  "/product-tag/get/:id",
  "/product-attribute/get-all",
  "/product-attribute/get/:id",
  "/inventory/get-all",
  "/inventory/get/:id",
  "/review/get-all",
  "/review/get-site",
  "/review/get-product/:productId",
  "/review/get/:id",
  "/advertisement/get-all",
  "/advertisement/get/:id",
  "/advertisement/match",
  "/seo/page",
  "/seo/:entityType/:entityId",
].map(toPublicPathPattern);

const normalizePath = (rawPath: string): string => {
  const pathWithoutQuery = rawPath.split("?")[0] ?? rawPath;
  const trimmed = pathWithoutQuery.replace(/^https?:\/\/[^/]+/i, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

export const shouldSkipRecaptcha = (method: string | undefined, requestPath: string): boolean => {
  if (!method) return false;
  if (method.toUpperCase() !== "GET") return false;

  const normalizedPath = normalizePath(requestPath);
  return publicGetRoutes.some((pattern) => pattern.test(normalizedPath));
};

const waitForRecaptcha = async (): Promise<NonNullable<typeof window.grecaptcha>> => {
  const start = Date.now();

  while (!window.grecaptcha?.ready || !window.grecaptcha?.execute) {
    if (Date.now() - start > 5_000) {
      throw new Error("reCAPTCHA script did not load in time.");
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return window.grecaptcha;
};

export const getRecaptchaToken = async (action = "api_request"): Promise<string | null> => {
  if (!siteKey) return null;

  const grecaptcha = await waitForRecaptcha();

  return new Promise((resolve, reject) => {
    grecaptcha.ready(async () => {
      try {
        const token = await grecaptcha.execute(siteKey, { action });
        resolve(token || null);
      } catch (error) {
        reject(error);
      }
    });
  });
};
