import React from "react";
import { ShoppingCart, Users, DollarSign, Clock, X } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useAbandonedCartAggregate, useCartAggregate } from "@/features/commerce";

type CartRow = Readonly<{
  id: string;
  customerName: string;
  customerEmail: string;
  items: number;
  total: number;
  status: "Active" | "Abandoned" | "Converted";
}>;

const toText = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

type SummaryPayload = Readonly<{
  data?: Readonly<{
    rows?: ReadonlyArray<Record<string, unknown>>;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>;
}>;

const getRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as SummaryPayload).data?.rows;
  return Array.isArray(rows) ? rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null) : [];
};

const getFullName = (row: Record<string, unknown>): string => {
  const first = toText(row.firstname);
  const middle = toText(row.middlename);
  const last = toText(row.lastname);
  const parts = [first, middle, last].filter((part) => part.trim().length > 0);
  return parts.length > 0 ? parts.join(" ") : toText(row.customerName ?? row.fullname, "Unknown");
};

const mapCartRows = (payload: unknown, status: CartRow["status"]): ReadonlyArray<CartRow> =>
  getRows(payload).map((entry) => {
    const item = entry;
    return {
      id: toText(item.customerId ?? item.id, crypto.randomUUID()),
      customerName: getFullName(item),
      customerEmail: toText(item.email, "—"),
      items: toNumber(item.itemCount ?? item.itemsCount ?? item.abandonedItemCount),
      total: toNumber(item.totalAmount ?? item.abandonedTotalAmount ?? item.total),
      status,
    };
  });

const LIMIT = 20;

export const CartsPage: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const activeQuery = useCartAggregate();
  const abandonedQuery = useAbandonedCartAggregate();

  const carts = React.useMemo(
    () => [
      ...mapCartRows(activeQuery.data, "Active"),
      ...mapCartRows(abandonedQuery.data, "Abandoned"),
    ],
    [activeQuery.data, abandonedQuery.data]
  );

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return carts;
    return carts.filter((c) => c.status.toLowerCase() === activeTab);
  }, [carts, activeTab]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((c) =>
      [c.customerName, c.customerEmail, c.status].some((v) => v.toLowerCase().includes(q))
    );
  }, [tabFiltered, search]);

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
    total: carts.length,
    active: carts.filter((c) => c.status === "Active").length,
    abandoned: carts.filter((c) => c.status === "Abandoned").length,
    totalValue: carts.reduce((sum, c) => sum + c.total, 0),
  }), [carts]);

  const tabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "abandoned", label: "Abandoned" },
  ];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} aria-label="Select all carts" />,
      render: (row: CartRow) => (
        <input type="checkbox" checked={selectedIds.includes(row.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleSelectOne(row.id, e.target.checked)} aria-label={`Select ${row.id}`} />
      ),
      width: "44px",
    },
    { key: "customer", label: "Customer", render: (row: CartRow) => (
      <div>
        <div className="font-medium text-gray-900">{row.customerName}</div>
        <div className="text-xs text-gray-400">{row.customerEmail}</div>
      </div>
    )},
    { key: "items", label: "Items", render: (row: CartRow) => (
      <span className="font-medium text-gray-900">{row.items}</span>
    )},
    { key: "total", label: "Total", render: (row: CartRow) => (
      <span className="font-medium text-gray-900">Rs {row.total.toFixed(2)}</span>
    )},
    { key: "status", label: "Status", render: (row: CartRow) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PageLayout title="Shopping Carts" subtitle="Monitor active and abandoned carts.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Carts" value={stats.total} icon={ShoppingCart} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={Users} colorVariant="emerald" />
        <StatCardV2 label="Abandoned" value={stats.abandoned} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Total Value" value={`Rs ${stats.totalValue.toFixed(2)}`} icon={DollarSign} colorVariant="blue" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setPage(1); }}
        columns={columns}
        data={pageData}
        actions={selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">{selectedIds.length} selected</span>
            <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selected carts">
              <X size={12} />
            </button>
          </div>
        ) : undefined}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search carts..."
        emptyMessage={activeQuery.isLoading || abandonedQuery.isLoading ? "Loading carts..." : "No carts found."}
        showPagination={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
};
