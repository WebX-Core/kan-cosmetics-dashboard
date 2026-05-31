import React from "react";
import { useOrders } from "@/features/commerce";

export type CustomerOption = { id: string; name: string; email: string };

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

const deriveCustomers = (orders: unknown[]): CustomerOption[] => {
  const map = new Map<string, CustomerOption>();
  for (const order of orders) {
    const o = (typeof order === "object" && order !== null ? order : {}) as Record<string, unknown>;
    const cid = text(o.customerId);
    if (!cid || map.has(cid)) continue;
    map.set(cid, {
      id: cid,
      name: text(o.customerName ?? o.fullname, "Unknown"),
      email: text(o.customerEmail ?? o.email, ""),
    });
  }
  return Array.from(map.values());
};

export const useCustomerOptions = () => {
  const ordersQuery = useOrders(undefined, true);
  const customers = React.useMemo<CustomerOption[]>(() => {
    const payload = ordersQuery.data;
    const raw = Array.isArray(payload)
      ? payload
      : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
    return deriveCustomers(raw);
  }, [ordersQuery.data]);
  return { customers, isLoading: ordersQuery.isLoading };
};
