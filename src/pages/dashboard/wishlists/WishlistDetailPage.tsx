import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package, Loader2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { commerceApi } from "@/features/commerce";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : parseFloat(String(v)) || 0);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type WishlistItem = Readonly<{
  id: string;
  productTitle: string;
  coverImage: string;
  price: string;
  variantTitle: string;
  addedAt: string;
}>;

type CustomerInfo = Readonly<{ name: string; email: string }>;

const toWishlistItem = (raw: unknown): WishlistItem => {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const product = (typeof r.product === "object" && r.product !== null ? r.product : {}) as Record<string, unknown>;
  const variant = (typeof r.productVariant === "object" && r.productVariant !== null ? r.productVariant : {}) as Record<string, unknown>;
  const price = num(product.price ?? variant.price);
  return {
    id: text(r.id, crypto.randomUUID()),
    productTitle: text(product.title ?? product.name, "Unknown Product"),
    coverImage: text(product.coverImage ?? product.image),
    price: price > 0 ? price.toFixed(2) : "—",
    variantTitle: text(variant.title ?? variant.name),
    addedAt: text(r.createdAt),
  };
};

export const WishlistDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const customer = (location.state as { customer?: CustomerInfo } | null)?.customer;

  const query = useQuery({
    queryKey: ["wishlist", "customer", customerId],
    queryFn: () => commerceApi.wishlists.byCustomer(customerId!),
    enabled: !!customerId,
    staleTime: 30_000,
  });

  const payload = React.useMemo(() => {
    const d = query.data as Record<string, unknown> | undefined;
    return (d?.data ?? d) as Record<string, unknown> | undefined;
  }, [query.data]);

  const items = React.useMemo<WishlistItem[]>(() => {
    const raw = Array.isArray(payload?.items) ? (payload!.items as unknown[]) : [];
    return raw.map(toWishlistItem);
  }, [payload]);

  const displayName = customer?.name ?? "Customer";
  const displaySub = customer?.email ?? (customerId ?? "");

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row: WishlistItem) => (
        <div className="flex items-center gap-3">
          {row.coverImage ? (
            <img
              src={row.coverImage}
              alt={row.productTitle}
              className="h-10 w-10 rounded-lg object-cover border border-[#e5e5e7] bg-[#f5f5f7]"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e7] bg-[#f5f5f7]">
              <Package size={16} className="text-[#86868b]" />
            </div>
          )}
          <div>
            <p className="font-medium text-[#1d1d1f]">{row.productTitle}</p>
            {row.variantTitle && (
              <p className="text-xs text-[#86868b]">{row.variantTitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (row: WishlistItem) => (
        <span className="font-medium text-[#1d1d1f]">
          {row.price === "—" ? "—" : `Rs ${row.price}`}
        </span>
      ),
    },
    {
      key: "addedAt",
      label: "Added",
      render: (row: WishlistItem) => (
        <span className="text-xs text-[#86868b]">{fmt(row.addedAt)}</span>
      ),
    },
  ];

  return (
    <PageLayout
      title={`${displayName}'s Wishlist`}
      subtitle={displaySub}
      onBack={() => navigate("/dashboard/wishlists")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardV2 label="Wishlist Items" value={items.length} icon={Heart} colorVariant="rose" />
        <StatCardV2 label="Total Value" value={`Rs ${items.reduce((s, i) => s + (i.price === "—" ? 0 : parseFloat(i.price)), 0).toFixed(2)}`} icon={Package} colorVariant="blue" />
      </div>

      <DataTableV2
        title="Wishlist Items"
        columns={columns}
        data={items}
        emptyMessage={query.isLoading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading wishlist…</span> : "This wishlist is empty."}
        showPagination={false}
      />
    </PageLayout>
  );
};
