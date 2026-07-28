import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ApiListQuery, UUID } from "@/shared/types/common.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { getOrderRows } from "@/shared/utils/orderMapping";
import { normalizePaymentStatus } from "@/shared/utils/paymentStatus";
import { commerceApi } from "./commerce.api";
import type { CustomerBanLiftDto } from "./commerce.types";

const keys = {
  orders: (q?: ApiListQuery) => ["commerce", "orders", q] as const,
  readyForPickup: (q?: ApiListQuery) => ["commerce", "orders", "ready-for-pickup", q] as const,
  order: (id?: UUID) => ["commerce", "order", id] as const,
  paymentsByOrder: (orderId?: UUID) => ["commerce", "payments", "order", orderId] as const,
  cartsAggregate: () => ["commerce", "carts", "aggregate"] as const,
  cartsAbandonedAggregate: () => ["commerce", "carts", "abandoned", "aggregate"] as const,
  wishlistsAggregate: () => ["commerce", "wishlists", "aggregate"] as const,
  paymentsAggregate: () => ["commerce", "payments", "aggregate"] as const,
  customers: (q?: ApiListQuery) => ["commerce", "customers", q] as const,
  purchaseHistoryByCustomer: (customerId?: UUID) => ["commerce", "purchase-history", "customer", customerId] as const,
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

export const useReadyForPickupOrders = (q?: ApiListQuery, enabled = true) =>
  useQuery({
    queryKey: keys.readyForPickup(q),
    queryFn: () => commerceApi.orders.readyForPickup(q),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export const useBulkPickupNotification = () => {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (orderIds: ReadonlyArray<UUID>) =>
      commerceApi.orders.bulkPickupNotification({ orderIds }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "order"] });
      void qc.invalidateQueries({ queryKey: ["delivery", "pickupRequests"] });
      void qc.invalidateQueries({ queryKey: ["delivery", "shipments"] });
      toast.success("Pickup notification requested.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
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
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "order"] });
      void qc.invalidateQueries({ queryKey: keys.paymentsAggregate() });
      void qc.invalidateQueries({ queryKey: ["commerce", "payments", "order"] });
      toast.success("Payment updated.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};

export const usePaymentSyncProvider = () => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: UUID) => commerceApi.payments.syncProvider(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["commerce", "orders"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "order"] });
      void qc.invalidateQueries({ queryKey: keys.paymentsAggregate() });
      void qc.invalidateQueries({ queryKey: ["commerce", "payments", "order"] });
      toast.success("Payment synced with provider.");
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
      void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
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
    queryFn: () => commerceApi.carts.allCustomersSummary(),
  });

export const useAbandonedCartAggregate = () =>
  useQuery({
    queryKey: keys.cartsAbandonedAggregate(),
    queryFn: () => commerceApi.carts.abandonedCustomersSummary(),
  });

export const useWishlistAggregate = () =>
  useQuery({
    queryKey: keys.wishlistsAggregate(),
    queryFn: () => commerceApi.wishlists.allCustomersSummary(),
  });

export const useCustomers = (q?: ApiListQuery, enabled = true) =>
  useQuery({
    queryKey: keys.customers(q),
    queryFn: () => commerceApi.customers.getAll(q),
    placeholderData: keepPreviousData,
    enabled,
  });

export const usePurchaseHistoryByCustomer = (customerId?: UUID, enabled = true) =>
  useQuery({
    queryKey: keys.purchaseHistoryByCustomer(customerId),
    queryFn: () => commerceApi.purchaseHistory.byCustomer(customerId!),
    enabled: enabled && Boolean(customerId),
  });

export const useCustomerBanLift = () => {
  const qc = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CustomerBanLiftDto) => commerceApi.customerBans.lift(payload),
    onSuccess: (_data, payload) => {
      void qc.invalidateQueries({ queryKey: ["customerBans"] });
      void qc.invalidateQueries({ queryKey: ["customerBans", "get"] });
      void qc.invalidateQueries({ queryKey: ["customerBans", "list"] });
      toast.success(payload.ids.length > 1 ? "Customers unbanned." : "Customer unbanned.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};

export const usePaymentsAggregate = (enabled = true) =>
  useQuery({
    queryKey: keys.paymentsAggregate(),
    queryFn: async () => {
      const orderPayload = await commerceApi.orders.all();
      const orders = getOrderRows(orderPayload).filter(
        (order) => normalizePaymentStatus(order.paymentStatus) === "PAID",
      );
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
    enabled,
  });
