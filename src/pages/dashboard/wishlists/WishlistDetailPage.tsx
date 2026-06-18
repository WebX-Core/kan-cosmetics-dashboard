import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package, Loader2, Clock3 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { commerceApi } from "@/features/commerce";
import { useWishlistAggregate } from "@/features/commerce";
import { resolveProfileImageUrl } from "@/shared/utils/profileImage";

type CustomerSummary = Readonly<{
  name: string;
  email: string;
  phone: string;
}>;

type WishlistSummaryRow = Readonly<{
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  wishlistItemCount: number;
  lastWishlistActivityAt: string;
}>;

type WishlistItem = Readonly<{
  id: string;
  productTitle: string;
  variantTitle: string;
  coverImage: string;
  price: number;
  quantity: number;
  addedAt: string;
}>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatDateTime = (value: unknown): string => {
  const raw = text(value);
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const buildCustomerName = (value: Record<string, unknown>): string => {
  const parts = [value.firstname, value.middlename, value.lastname]
    .map((part) => text(part))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return text(value.customerName ?? value.fullname ?? value.name, "Customer");
};

const toSummaryRow = (value: unknown): WishlistSummaryRow => {
  const row = getObject(value);
  return {
    customerId: text(row.customerId, crypto.randomUUID()),
    customerName: buildCustomerName(row),
    customerEmail: text(row.email, "—"),
    customerPhone: text(row.phone, "—"),
    wishlistItemCount: toNumber(row.wishlistItemCount ?? row.itemsCount ?? row.items),
    lastWishlistActivityAt: text(row.lastWishlistActivityAt ?? row.updatedAt ?? row.createdAt),
  };
};

const extractRows = (payload: unknown): ReadonlyArray<WishlistSummaryRow> => {
  const root = getObject(payload);
  const candidates = [
    payload,
    root.data,
    root.rows,
    root.items,
    getObject(root.data).rows,
    getObject(root.data).items,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map(toSummaryRow);
  }

  return [];
};

const toWishlistItem = (raw: unknown): WishlistItem => {
  const row = getObject(raw);
  const product = getObject(row.product);
  const variant = getObject(row.productVariant);
  const productPrice = toNumber(product.price ?? row.price ?? variant.price);
  const quantity = toNumber(row.quantity ?? row.qty, 1) || 1;

  return {
    id: text(row.id, crypto.randomUUID()),
    productTitle: text(
      row.productTitleSnapshot ?? product.title ?? row.productName ?? row.name,
      "Unknown Product",
    ),
    variantTitle: text(variant.title ?? variant.name ?? row.variantTitle),
    coverImage: text(
      resolveProfileImageUrl(
        variant.image ?? product.coverImage ?? product.image ?? product.thumbnail,
      ),
    ),
    price: productPrice,
    quantity,
    addedAt: text(row.createdAt ?? row.addedAt ?? row.updatedAt),
  };
};

const extractItems = (payload: unknown): ReadonlyArray<WishlistItem> => {
  const root = getObject(payload);
  const candidates = [
    payload,
    root.data,
    root.items,
    root.rows,
    getObject(root.data).items,
    getObject(root.data).rows,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map(toWishlistItem);
  }

  return [];
};

const itemCurrency = (amount: number): string => `Rs ${amount.toFixed(2)}`;

export const WishlistDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const customer = (location.state as { customer?: CustomerSummary } | null)?.customer;

  const summaryQuery = useWishlistAggregate();
  const detailQuery = useQuery({
    queryKey: ["commerce", "wishlists", "customer", customerId],
    queryFn: () => commerceApi.wishlists.byCustomer(customerId!),
    enabled: Boolean(customerId),
  });

  const summaryRows = React.useMemo(() => extractRows(summaryQuery.data), [summaryQuery.data]);
  const detailItems = React.useMemo(() => extractItems(detailQuery.data), [detailQuery.data]);

  const summary = React.useMemo(
    () => summaryRows.find((row) => row.customerId === customerId),
    [customerId, summaryRows],
  );

  const displayName = customer?.name ?? summary?.customerName ?? "Wishlist";
  const displayEmail = customer?.email ?? summary?.customerEmail ?? "—";
  const displayPhone = customer?.phone ?? summary?.customerPhone ?? "—";
  const lastActivity = summary?.lastWishlistActivityAt ?? "";

  const totalValue = detailItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (row: WishlistItem) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#e5e5e7] bg-[#f5f5f7]">
            {row.coverImage ? (
              <img
                src={row.coverImage}
                alt={row.productTitle}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package size={16} className="text-[#86868b]" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#1d1d1f]">{row.productTitle}</p>
            {row.variantTitle && (
              <p className="truncate text-xs text-[#86868b]">{row.variantTitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      render: (row: WishlistItem) => (
        <span className="font-medium text-[#1d1d1f]">{row.quantity}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (row: WishlistItem) => (
        <span className="font-medium text-[#1d1d1f]">{itemCurrency(row.price)}</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (row: WishlistItem) => (
        <span className="font-medium text-[#1d1d1f]">
          {itemCurrency(row.price * row.quantity)}
        </span>
      ),
    },
    {
      key: "addedAt",
      label: "Added",
      render: (row: WishlistItem) => (
        <span className="text-xs text-[#86868b]">{formatDateTime(row.addedAt)}</span>
      ),
    },
  ];

  return (
    <PageLayout
      title={displayName}
      subtitle={`${displayEmail}${displayPhone !== "—" ? ` · ${displayPhone}` : ""}`}
      onBack={() => navigate("/dashboard/wishlists")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Wishlist Items"
          value={summary?.wishlistItemCount ?? detailItems.length}
          icon={Heart}
          colorVariant="rose"
          compact
        />
        <StatCardV2
          label="Wishlist Value"
          value={itemCurrency(totalValue)}
          icon={Package}
          colorVariant="blue"
          compact
        />
        <StatCardV2
          label="Last Activity"
          value={lastActivity ? formatDateTime(lastActivity) : "—"}
          icon={Clock3}
          colorVariant="amber"
          compact
        />
      </div>

      <div className="rounded-2xl border border-[#e5e5e7] bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#86868b]">
              Customer Profile
            </p>
            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              {displayName}
            </h2>
            <p className="mt-1 text-[13px] text-[#6e6e73]">
              {displayEmail}
            </p>
          </div>
          <div className="text-right text-[13px] text-[#6e6e73]">
            <p>{displayPhone}</p>
            <p className="mt-1">{lastActivity ? `Updated ${formatDateTime(lastActivity)}` : "No activity yet"}</p>
          </div>
        </div>
      </div>

      <DataTableV2
        title="Wishlist Items"
        subtitle="Products saved by this customer."
        columns={columns}
        data={detailItems}
        emptyMessage={
          detailQuery.isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Loading wishlist...
            </span>
          ) : (
            "This wishlist is empty."
          )
        }
        showPagination={false}
      />
    </PageLayout>
  );
};
