import React from "react";
import { useQuery } from "@tanstack/react-query";
import { commerceApi } from "@/features/commerce";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

export type CustomerSearchOption = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
}>;

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const toCustomerOptions = (payload: unknown): ReadonlyArray<CustomerSearchOption> => {
  const raw = payload as { customers?: unknown; data?: unknown } | undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(raw?.customers)
      ? raw?.customers
      : Array.isArray(raw?.data)
        ? raw?.data
        : [];

  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((customer) => {
      const firstname = text(customer.firstname);
      const middlename = text(customer.middlename);
      const lastname = text(customer.lastname);
      const name = [firstname, middlename, lastname].filter(Boolean).join(" ").trim() || text(customer.fullname ?? customer.name, "Unknown");

      return {
        id: text(customer.id),
        name,
        email: text(customer.email),
        phone: text(customer.phone),
      };
    })
    .filter((customer) => customer.id.length > 0);
};

export const useCustomerSearch = () => {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const query = useQuery({
    queryKey: ["customers", "search", debouncedSearch],
    queryFn: () =>
      commerceApi.customers.getAll({
        page: 1,
        limit: 12,
        search: debouncedSearch || undefined,
      }),
    staleTime: 30_000,
  });

  const customers = React.useMemo(() => toCustomerOptions(query.data), [query.data]);
  const isSearching = search.trim().length > 0 && (search !== debouncedSearch || query.isFetching);

  return {
    customers,
    debouncedSearch,
    isLoading: query.isLoading,
    isSearching,
    search,
    setSearch,
  };
};
