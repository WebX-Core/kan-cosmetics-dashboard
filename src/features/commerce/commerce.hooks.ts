import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ApiListQuery, UUID } from "@/shared/types/common.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { commerceApi } from "./commerce.api";

const keys = {
  orders: (q?: ApiListQuery) => ["commerce", "orders", q] as const,
  order: (id?: UUID) => ["commerce", "order", id] as const,
  paymentsByOrder: (orderId?: UUID) => ["commerce", "payments", "order", orderId] as const,
  cartsAggregate: () => ["commerce", "carts", "aggregate"] as const,
  wishlistsAggregate: () => ["commerce", "wishlists", "aggregate"] as const,
  paymentsAggregate: () => ["commerce", "payments", "aggregate"] as const,
};

export const useOrders = (q?: ApiListQuery, enabled = true) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.orders(q),
    queryFn: () => commerceApi.orders.all(q),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!enabled || !q?.page || !q?.limit) return;
    const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages;
    if (!totalPages || q.page >= totalPages) return;
    const next = { ...q, page: q.page + 1 };
    void qc.prefetchQuery({ queryKey: keys.orders(next), queryFn: () => commerceApi.orders.all(next), staleTime: 30_000 });
  }, [enabled, q, query.data, qc]);

  return query;
};

export const useOrderGet = (id?: UUID, enabled = true) =>
  useQuery({
    queryKey: keys.order(id),
    queryFn: () => commerceApi.orders.get(id as UUID),
    enabled: enabled && typeof id === "string" && id.length > 0,
  });

export const usePaymentsByOrder = (orderId?: UUID, enabled = true) =>
  useQuery({
    queryKey: keys.paymentsByOrder(orderId),
    queryFn: () => commerceApi.payments.byOrder(orderId as UUID),
    enabled: enabled && typeof orderId === "string" && orderId.length > 0,
  });

export const useCouponsList = commerceApi.coupons.crud.hooks.useList;
export const useCouponSoftDelete = commerceApi.coupons.crud.hooks.useSoftDelete;

export const usePaymentUpdate = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Parameters<typeof commerceApi.payments.update>[1] }) =>
      commerceApi.payments.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.paymentsAggregate() });
      toast.success("Payment updated.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload: Parameters<typeof commerceApi.orders.updateStatus>[1] }) =>
      commerceApi.orders.updateStatus(id, payload),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      void qc.invalidateQueries({ queryKey: keys.order(vars.id) });
      void qc.invalidateQueries({ queryKey: keys.cartsAggregate() });
      void qc.invalidateQueries({ queryKey: keys.wishlistsAggregate() });
      void qc.invalidateQueries({ queryKey: keys.paymentsAggregate() });
      toast.success("Order status updated successfully.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};

export const useSyncOrderDelivery = () => {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (orderId: UUID) => commerceApi.orders.syncDelivery(orderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      toast.success("Delivery synced successfully.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};

export const useCartAggregate = () =>
  useQuery({
    queryKey: keys.cartsAggregate(),
    queryFn: async () => {
      const ordersPayload = await commerceApi.orders.all();
      const orders = Array.isArray(ordersPayload) ? ordersPayload : ((ordersPayload as { data?: unknown[] } | undefined)?.data ?? []);
      const customerIds = Array.from(
        new Set(
          orders
            .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).customerId : null))
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      );
      const cartPayloads = await Promise.all(customerIds.map((customerId) => commerceApi.carts.byCustomer(customerId)));
      return cartPayloads;
    },
  });

export const useWishlistAggregate = () =>
  useQuery({
    queryKey: keys.wishlistsAggregate(),
    queryFn: async () => {
      const ordersPayload = await commerceApi.orders.all();
      const orders = Array.isArray(ordersPayload) ? ordersPayload : ((ordersPayload as { data?: unknown[] } | undefined)?.data ?? []);
      const customerIds = Array.from(
        new Set(
          orders
            .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>).customerId : null))
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      );
      return Promise.all(customerIds.map((customerId) => commerceApi.wishlists.byCustomer(customerId)));
    },
  });

export const usePaymentsAggregate = () =>
  useQuery({
    queryKey: keys.paymentsAggregate(),
    queryFn: async () => {
      const orderPayload = await commerceApi.orders.all();
      const orders = Array.isArray(orderPayload) ? orderPayload : ((orderPayload as { data?: unknown[] } | undefined)?.data ?? []);
      return Promise.all(
        orders.map(async (order) => {
          if (!order || typeof order !== "object") return [];
          const orderObj = order as Record<string, unknown>;
          const orderId = orderObj.id;
          if (typeof orderId !== "string" || orderId.length === 0) return [];
          const paymentPayload = await commerceApi.payments.byOrder(orderId);
          return { paymentPayload, orderObj };
        }),
      );
    },
  });
