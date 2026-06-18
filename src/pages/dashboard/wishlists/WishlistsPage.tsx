import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Users, Package, TrendingUp, ArrowRight } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useWishlistAggregate } from "@/features/commerce";

type WishlistRow = Readonly<{
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  wishlistItemCount: number;
  lastWishlistActivityAt: string;
}>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

const buildFullName = (firstName: unknown, middleName: unknown, lastName: unknown): string => {
  const parts = [firstName, middleName, lastName]
    .map((part) => text(part))
    .filter(Boolean);
  return parts.join(" ") || "Unknown Customer";
};

const toWishlistRow = (entry: unknown): WishlistRow => {
  const row = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;

  return {
    customerId: text(row.customerId, crypto.randomUUID()),
    customerName: buildFullName(row.firstname, row.middlename, row.lastname),
    customerEmail: text(row.email, "—"),
    customerPhone: text(row.phone, "—"),
    wishlistItemCount: toNumber(row.wishlistItemCount ?? row.itemsCount ?? row.items),
    lastWishlistActivityAt: text(row.lastWishlistActivityAt ?? row.updatedAt ?? row.createdAt),
  };
};

const getRows = (payload: unknown): ReadonlyArray<WishlistRow> => {
  const root = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const candidates = [
    payload,
    root.data,
    root.rows,
    root.items,
    (root.data as Record<string, unknown> | undefined)?.rows,
    (root.data as Record<string, unknown> | undefined)?.items,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map(toWishlistRow);
  }

  return [];
};

export const WishlistsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const query = useWishlistAggregate();

  const wishlists = React.useMemo(() => getRows(query.data), [query.data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wishlists;
    return wishlists.filter((row) =>
      [
        row.customerName,
        row.customerEmail,
        row.customerPhone,
        String(row.wishlistItemCount),
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [search, wishlists]);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageData = React.useMemo(
    () => filtered.slice((currentPage - 1) * limit, currentPage * limit),
    [currentPage, filtered],
  );

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = React.useMemo(() => {
    const totalItems = wishlists.reduce((sum, row) => sum + row.wishlistItemCount, 0);
    const latestActivity = wishlists
      .map((row) => row.lastWishlistActivityAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      customers: wishlists.length,
      totalItems,
      latestActivity: latestActivity ? formatDateTime(latestActivity) : "—",
      activeCustomers: wishlists.filter((row) => row.wishlistItemCount > 0).length,
    };
  }, [wishlists]);

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (row: WishlistRow) => (
        <button
          type="button"
          onClick={() =>
            navigate(`/dashboard/wishlists/${row.customerId}`, {
              state: {
                customer: {
                  name: row.customerName,
                  email: row.customerEmail,
                  phone: row.customerPhone,
                },
              },
            })
          }
          className="text-left"
        >
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-xs text-gray-400">{row.customerEmail}</div>
        </button>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: WishlistRow) => (
        <span className="text-sm text-gray-700">{row.customerPhone}</span>
      ),
    },
    {
      key: "items",
      label: "Wishlist Items",
      render: (row: WishlistRow) => (
        <span className="inline-flex items-center rounded-full bg-[#f5f5f7] px-2.5 py-1 text-sm font-medium text-[#1d1d1f]">
          {row.wishlistItemCount}
        </span>
      ),
    },
    {
      key: "lastWishlistActivityAt",
      label: "Last Activity",
      render: (row: WishlistRow) => (
        <span className="text-sm text-gray-700">
          {formatDateTime(row.lastWishlistActivityAt)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row: WishlistRow) => (
        <button
          type="button"
          onClick={() =>
            navigate(`/dashboard/wishlists/${row.customerId}`, {
              state: {
                customer: {
                  name: row.customerName,
                  email: row.customerEmail,
                  phone: row.customerPhone,
                },
              },
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1.5 text-xs font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          View
          <ArrowRight size={12} />
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Wishlists"
      subtitle="Customer wishlists, item counts, and last activity."
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search customers, email, phone..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Customers"
          value={stats.customers}
          icon={Users}
          colorVariant="blue"
        />
        <StatCardV2
          label="Active Wishlists"
          value={stats.activeCustomers}
          icon={Heart}
          colorVariant="rose"
        />
        <StatCardV2
          label="Total Items"
          value={stats.totalItems}
          icon={Package}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Latest Activity"
          value={stats.latestActivity}
          icon={TrendingUp}
          colorVariant="amber"
        />
      </div>

      <DataTableV2
        title="Wishlist Customers"
        subtitle="Open a customer to review all wishlist items."
        columns={columns}
        data={pageData}
        searchValue={search}
        onRowClick={(row) =>
          navigate(`/dashboard/wishlists/${row.customerId}`, {
            state: {
              customer: {
                name: row.customerName,
                email: row.customerEmail,
                phone: row.customerPhone,
              },
            },
          })
        }
        emptyMessage={query.isLoading ? "Loading wishlists..." : "No wishlists found."}
        showPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
};
