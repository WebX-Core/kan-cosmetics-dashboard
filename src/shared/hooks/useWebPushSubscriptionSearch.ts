import React from "react";
import { marketingApi } from "@/features/marketing";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export type WebPushSubscriptionSearchOption = Readonly<{
  id: string;
  endpoint: string;
  owner: string;
  browser: string;
  platform: string;
  isActive: boolean;
  lastSeenAt: string;
}>;

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const pickRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as {
    data?: { subscriptions?: unknown[] } | unknown[];
    subscriptions?: unknown[];
  };

  if (Array.isArray(data.data)) {
    return data.data.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }

  if (Array.isArray((data.data as { subscriptions?: unknown[] } | undefined)?.subscriptions)) {
    const subscriptions = (data.data as { subscriptions?: unknown[] } | undefined)?.subscriptions ?? [];
    return subscriptions.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }

  if (Array.isArray(data.subscriptions)) {
    return data.subscriptions.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }

  return [];
};

const toOwnerLabel = (item: Record<string, unknown>): string => {
  const customer = typeof item.customer === "object" && item.customer !== null ? (item.customer as Record<string, unknown>) : null;
  const user = typeof item.user === "object" && item.user !== null ? (item.user as Record<string, unknown>) : null;
  const customerName = [text(customer?.firstname), text(customer?.middlename), text(customer?.lastname)].filter(Boolean).join(" ").trim();
  const userName = [text(user?.firstname), text(user?.middlename), text(user?.lastname)].filter(Boolean).join(" ").trim();
  return (
    customerName ||
    userName ||
    text(customer?.id ?? item.customerId) ||
    text(user?.id ?? item.userId) ||
    text(item.sessionId) ||
    "Unassigned"
  );
};

const toOptions = (payload: unknown): ReadonlyArray<WebPushSubscriptionSearchOption> =>
  pickRows(payload)
    .map((item) => ({
      id: text(item.id),
      endpoint: text(item.endpoint),
      owner: toOwnerLabel(item),
      browser: text(item.browser ?? item.userAgent),
      platform: text(item.platform),
      isActive: item.isActive !== false,
      lastSeenAt: text(item.lastSeenAt),
    }))
    .filter((subscription) => subscription.id.length > 0);

export const useWebPushSubscriptionSearch = () => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const query = marketingApi.webPushSubscriptions.hooks.useList({
    page: 1,
    limit: 12,
    search: debouncedSearch || undefined,
  });

  const subscriptions = React.useMemo(() => toOptions(query.data), [query.data]);
  const isSearching = search.trim().length > 0 && (search !== debouncedSearch || query.isFetching);

  return {
    subscriptions,
    debouncedSearch,
    isLoading: query.isLoading,
    isSearching,
    search,
    setSearch,
  };
};
