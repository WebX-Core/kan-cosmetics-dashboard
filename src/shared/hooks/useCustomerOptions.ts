import React from "react";
import { useQuery } from "@tanstack/react-query";
import { commerceApi } from "@/features/commerce";

export type CustomerOption = { id: string; name: string; email: string };

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

export const useCustomerOptions = () => {
  const query = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => commerceApi.customers.getAll({ limit: 200 }),
    staleTime: 60_000,
  });

  const customers = React.useMemo<CustomerOption[]>(() => {
    const raw = query.data as Record<string, unknown> | undefined;
    const items: unknown[] = Array.isArray(query.data)
      ? query.data
      : Array.isArray(raw?.customers)
      ? (raw.customers as unknown[])
      : Array.isArray(raw?.data)
      ? (raw.data as unknown[])
      : [];
    return items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((c) => {
        const firstname = text(c.firstname ?? "");
        const lastname = text(c.lastname ?? "");
        return {
          id: text(c.id),
          name: [firstname, lastname].filter(Boolean).join(" ") || text(c.fullname ?? c.name, "Unknown"),
          email: text(c.email, ""),
        };
      })
      .filter((c) => c.id);
  }, [query.data]);

  return { customers, isLoading: query.isLoading };
};
