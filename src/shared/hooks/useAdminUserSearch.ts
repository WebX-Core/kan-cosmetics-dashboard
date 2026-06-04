import React from "react";
import { useAdminUsersList } from "@/features/adminUsers/adminUsers.hooks";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export type AdminUserSearchOption = Readonly<{
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
}>;

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const toOptions = (payload: unknown): ReadonlyArray<AdminUserSearchOption> => {
  const raw = payload as { data?: unknown[] } | undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(raw?.data)
      ? raw.data
      : [];

  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((user) => {
      const firstname = text(user.firstname);
      const middlename = text(user.middlename);
      const lastname = text(user.lastname);
      const name = [firstname, middlename, lastname].filter(Boolean).join(" ").trim() || text(user.fullname ?? user.name, "Unknown");

      return {
        id: text(user.id),
        name,
        email: text(user.email),
        role: text(user.role),
        phone: text(user.phone),
      };
    })
    .filter((user) => user.id.length > 0);
};

export const useAdminUserSearch = () => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const query = useAdminUsersList({
    page: 1,
    limit: 12,
    search: debouncedSearch || undefined,
  });

  const users = React.useMemo(() => toOptions(query.data), [query.data]);
  const isSearching = search.trim().length > 0 && (search !== debouncedSearch || query.isFetching);

  return {
    users,
    debouncedSearch,
    isLoading: query.isLoading,
    isSearching,
    search,
    setSearch,
  };
};
