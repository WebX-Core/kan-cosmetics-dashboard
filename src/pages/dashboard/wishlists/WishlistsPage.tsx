import React from "react";
import { Heart, Users, Package, TrendingUp, X } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useWishlistAggregate } from "@/features/commerce";

type WishlistRow = Readonly<{
  id: string;
  customerName: string;
  customerEmail: string;
  items: number;
  totalValue: number;
  status: "Active" | "Inactive";
}>;

const toText = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

const mapWishlistRows = (payload: unknown): ReadonlyArray<WishlistRow> => {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);

  return rows.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    const statusValue = toText(item.status, "active").toLowerCase();
    return {
      id: toText(item.id, crypto.randomUUID()),
      customerName: toText(item.customerName ?? item.fullname, "Unknown"),
      customerEmail: toText(item.customerEmail ?? item.email, "—"),
      items: toNumber(item.items ?? item.itemsCount),
      totalValue: toNumber(item.totalValue ?? item.totalAmount),
      status: statusValue === "inactive" ? "Inactive" : "Active",
    };
  });
};

const LIMIT = 20;

export const WishlistsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const query = useWishlistAggregate();

  const wishlists = React.useMemo(
    () => (query.data ?? []).flatMap((payload) => mapWishlistRows(payload)),
    [query.data]
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wishlists;
    return wishlists.filter((row) =>
      [row.customerName, row.customerEmail, row.status].some((v) => v.toLowerCase().includes(q))
    );
  }, [wishlists, search]);

  const totalPages = Math.ceil(filtered.length / LIMIT) || 1;
  const pageData = React.useMemo(() => filtered.slice((page - 1) * LIMIT, page * LIMIT), [filtered, page]);
  const visibleIds = React.useMemo(() => pageData.map((row) => row.id), [pageData]);
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id)));
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(() => ({
    total: wishlists.length,
    active: wishlists.filter((r) => r.status === "Active").length,
    totalItems: wishlists.reduce((sum, r) => sum + r.items, 0),
    totalValue: wishlists.reduce((sum, r) => sum + r.totalValue, 0),
  }), [wishlists]);

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} aria-label="Select all wishlists" />,
      render: (row: WishlistRow) => (
        <input type="checkbox" checked={selectedIds.includes(row.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleSelectOne(row.id, e.target.checked)} aria-label={`Select ${row.id}`} />
      ),
      width: "44px",
    },
    { key: "customer", label: "Customer", render: (row: WishlistRow) => (
      <div>
        <div className="font-medium text-gray-900">{row.customerName}</div>
        <div className="text-xs text-gray-400">{row.customerEmail}</div>
      </div>
    )},
    { key: "items", label: "Items", render: (row: WishlistRow) => (
      <span className="font-medium text-gray-900">{row.items}</span>
    )},
    { key: "totalValue", label: "Total Value", render: (row: WishlistRow) => (
      <span className="font-medium text-gray-900">Rs {row.totalValue.toFixed(2)}</span>
    )},
    { key: "status", label: "Status", render: (row: WishlistRow) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PageLayout
      title="Wishlists"
      subtitle="View customer wishlist items and values."
      searchValue={search}
      onSearchChange={(v) => { setSearch(v); setPage(1); }}
      searchPlaceholder="Search wishlists..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Wishlists" value={stats.total} icon={Heart} colorVariant="rose" />
        <StatCardV2 label="Active" value={stats.active} icon={Users} colorVariant="emerald" />
        <StatCardV2 label="Total Items" value={stats.totalItems} icon={Package} colorVariant="blue" />
        <StatCardV2 label="Total Value" value={`Rs ${stats.totalValue.toFixed(2)}`} icon={TrendingUp} colorVariant="blue" />
      </div>
      <DataTableV2
        columns={columns}
        data={pageData}
        actions={selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">{selectedIds.length} selected</span>
            <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selected wishlists">
              <X size={12} />
            </button>
          </div>
        ) : undefined}
        searchValue={search}
        emptyMessage={query.isLoading ? "Loading wishlists..." : "No wishlists found."}
        showPagination={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
};
