import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Package, DollarSign, Loader2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { commerceApi } from "@/features/commerce";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : parseFloat(String(v)) || 0);

type CartItem = Readonly<{
  id: string;
  coverImage: string;
  productId: string;
  quantity: number;
  price: string;
  subtotal: string;
}>;

type CustomerInfo = Readonly<{ name: string; email: string; type?: "active" | "abandoned" }>;

const toCartItem = (raw: unknown): CartItem => {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: text(r.id, crypto.randomUUID()),
    coverImage: text(r.coverImage),
    productId: text(r.productId),
    quantity: num(r.quantity),
    price: text(r.price, "0.00"),
    subtotal: text(r.subtotal, "0.00"),
  };
};

export const CartDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const customer = (location.state as { customer?: CustomerInfo } | null)?.customer;
  const isAbandoned = customer?.type === "abandoned";

  const query = useQuery({
    queryKey: ["cart", isAbandoned ? "abandoned" : "active", "customer", customerId],
    queryFn: () =>
      isAbandoned
        ? commerceApi.carts.abandonedByCustomer(customerId!)
        : commerceApi.carts.byCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 30_000,
  });

  const payload = React.useMemo(() => {
    const d = query.data as Record<string, unknown> | undefined;
    return (d?.data ?? d) as Record<string, unknown> | undefined;
  }, [query.data]);

  const items = React.useMemo<CartItem[]>(() => {
    const raw = Array.isArray(payload?.items) ? (payload!.items as unknown[]) : [];
    return raw.map(toCartItem);
  }, [payload]);

  const subtotal = text(payload?.subtotalAmount, "0.00");
  const grandTotal = text(payload?.grandTotal, "0.00");
  const totalItems = num(payload?.total ?? items.length);

  const displayName = customer?.name ?? "Customer";
  const displaySub = customer?.email ?? (customerId ?? "");
  const cartType = isAbandoned ? "Abandoned Cart" : "Cart";

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row: CartItem) => (
        <div className="flex items-center gap-3">
          {row.coverImage ? (
            <img
              src={row.coverImage}
              alt="Product"
              className="h-10 w-10 rounded-lg object-cover border border-[#e5e5e7] bg-[#f5f5f7]"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e7] bg-[#f5f5f7]">
              <Package size={16} className="text-[#86868b]" />
            </div>
          )}
          <span className="font-mono text-xs text-[#86868b]">{row.productId || "—"}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      render: (row: CartItem) => (
        <span className="font-medium text-[#1d1d1f]">{row.quantity}</span>
      ),
    },
    {
      key: "price",
      label: "Unit Price",
      render: (row: CartItem) => (
        <span className="text-[#1d1d1f]">Rs {row.price}</span>
      ),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (row: CartItem) => (
        <span className="font-semibold text-[#1d1d1f]">Rs {row.subtotal}</span>
      ),
    },
  ];

  return (
    <PageLayout
      title={`${displayName}'s ${cartType}`}
      subtitle={displaySub}
      onBack={() => navigate("/dashboard/carts")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Items" value={totalItems} icon={ShoppingCart} colorVariant="blue" />
        <StatCardV2 label="Subtotal" value={`Rs ${subtotal}`} icon={Package} colorVariant="amber" />
        <StatCardV2 label="Grand Total" value={`Rs ${grandTotal}`} icon={DollarSign} colorVariant="emerald" />
      </div>

      <DataTableV2
        title="Cart Items"
        columns={columns}
        data={items}
        emptyMessage={query.isLoading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading cart…</span> : "This cart is empty."}
        showPagination={false}
      />
    </PageLayout>
  );
};
