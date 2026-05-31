const AUTH_TOKEN_KEY = "dashboard_auth_token";

export const getSessionToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  return token && token.length > 0 ? token : null;
};

export const setSessionToken = (token: string): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearSessionToken = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

