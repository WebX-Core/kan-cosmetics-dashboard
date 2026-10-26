import type { QueryClient } from "@tanstack/react-query";

type LogoutHandler = Readonly<{
  clearAuth: () => void;
  queryClient: QueryClient;
  navigateToLogin: () => void;
}>;

let handler: LogoutHandler | null = null;
let logoutTriggered = false;

export function resetGlobalLogout(): void {
  logoutTriggered = false;
}

export function registerLogoutHandler(next: LogoutHandler): void {
  handler = next;
}

export function triggerGlobalLogout(): void {
  if (!handler || logoutTriggered) return;
  logoutTriggered = true;
  handler.queryClient.clear();
  handler.clearAuth();
  handler.navigateToLogin();
}