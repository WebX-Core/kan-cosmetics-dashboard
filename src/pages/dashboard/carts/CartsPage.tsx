import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Users,
  DollarSign,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useAbandonedCartAggregate, useCartAggregate } from "@/features/commerce";

type CartRow = Readonly<{
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  itemCount: number;
  totalAmount: number;
  lastCartActivityAt: string;
  status: "Active" | "Abandoned";
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

const buildFullName = (
  firstName: unknown,
  middleName: unknown,
  lastName: unknown,
): string => {
  const parts = [firstName, middleName, lastName]
    .map((part) => text(part))
    .filter(Boolean);
  return parts.join(" ") || "Unknown Customer";
};

const getRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  const root = (typeof payload === "object" && payload !== null
    ? payload
    : {}) as Record<string, unknown>;

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
    return candidate.filter(
      (row): row is Record<string, unknown> =>
        typeof row === "object" && row !== null,
    );
  }

  return [];
};

const mapCartRows = (
  payload: unknown,
  status: CartRow["status"],
): ReadonlyArray<CartRow> =>
  getRows(payload).map((row) => {
    const inferredStatus =
      status === "Abandoned" ||
      "abandonedItemCount" in row ||
      "abandonedTotalAmount" in row ||
      "lastAbandonedAt" in row
        ? "Abandoned"
        : "Active";

    return {
      customerId: text(row.customerId, crypto.randomUUID()),
      customerName: buildFullName(row.firstname, row.middlename, row.lastname),
      customerEmail: text(row.email, "—"),
      customerPhone: text(row.phone, "—"),
      itemCount: toNumber(row.itemCount ?? row.itemsCount ?? row.abandonedItemCount),
      totalAmount: toNumber(row.totalAmount ?? row.abandonedTotalAmount ?? row.total),
      lastCartActivityAt: text(
        row.lastCartActivityAt ?? row.lastAbandonedAt ?? row.updatedAt ?? row.createdAt,
      ),
      status: inferredStatus,
    };
  });

export const CartsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const activeQuery = useCartAggregate();
  const abandonedQuery = useAbandonedCartAggregate();

  const carts = React.useMemo(
    () => [
      ...mapCartRows(activeQuery.data, "Active"),
      ...mapCartRows(abandonedQuery.data, "Abandoned"),
    ],
    [activeQuery.data, abandonedQuery.data],
  );

  const filteredByTab = React.useMemo(() => {
    if (activeTab === "all") return carts;
    return carts.filter((cart) => cart.status.toLowerCase() === activeTab);
  }, [activeTab, carts]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByTab;
    return filteredByTab.filter((cart) =>
      [
        cart.customerName,
        cart.customerEmail,
        cart.customerPhone,
        cart.status,
        String(cart.itemCount),
        String(cart.totalAmount),
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [filteredByTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = React.useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered, pageSize],
  );
  const visibleIds = React.useMemo(() => pageData.map((row) => row.customerId), [pageData]);
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(() => {
    const totalValue = carts.reduce((sum, cart) => sum + cart.totalAmount, 0);
    const totalItems = carts.reduce((sum, cart) => sum + cart.itemCount, 0);
    const latestActivity = carts
      .map((cart) => cart.lastCartActivityAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      total: carts.length,
      active: carts.filter((cart) => cart.status === "Active").length,
      abandoned: carts.filter((cart) => cart.status === "Abandoned").length,
      totalItems,
      totalValue,
      latestActivity: latestActivity ? formatDateTime(latestActivity) : "—",
    };
  }, [carts]);

  const tabs = [
    { key: "all", label: "All", count: carts.length },
    { key: "active", label: "Active", count: stats.active },
    { key: "abandoned", label: "Abandoned", count: stats.abandoned },
  ];

  const openCart = (row: CartRow) => {
    navigate(`/dashboard/carts/${row.customerId}`, {
      state: {
        customer: {
          name: row.customerName,
          email: row.customerEmail,
          phone: row.customerPhone,
          type: row.status.toLowerCase(),
        },
      },
    });
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all carts"
        />
      ),
      render: (row: CartRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.customerId)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.customerId, event.target.checked)}
          aria-label={`Select ${row.customerName}`}
        />
      ),
      width: "44px",
    },
    {
      key: "customer",
      label: "Customer",
      sortValue: (row: CartRow) => row.customerName,
      render: (row: CartRow) => (
        <button type="button" onClick={() => openCart(row)} className="text-left">
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-xs text-gray-400">{row.customerEmail}</div>
        </button>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: CartRow) => (
        <span className="text-sm text-gray-700">{row.customerPhone}</span>
      ),
    },
    {
      key: "items",
      label: "Items",
      sortValue: (row: CartRow) => row.itemCount,
      render: (row: CartRow) => (
        <span className="inline-flex items-center rounded-full bg-[#f5f5f7] px-2.5 py-1 text-sm font-medium text-[#1d1d1f]">
          {row.itemCount}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      sortValue: (row: CartRow) => row.totalAmount,
      render: (row: CartRow) => (
        <span className="font-medium text-gray-900">Rs {row.totalAmount.toFixed(2)}</span>
      ),
    },
    {
      key: "activity",
      label: "Last Activity",
      sortValue: (row: CartRow) => row.lastCartActivityAt,
      render: (row: CartRow) => (
        <span className="text-sm text-gray-700">
          {formatDateTime(row.lastCartActivityAt)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: CartRow) => (
        <StatusBadge status={row.status} label={row.status} />
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row: CartRow) => (
        <button
          type="button"
          onClick={() => openCart(row)}
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
      title="Shopping Carts"
      subtitle="Monitor active and abandoned carts."
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search carts..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Carts" value={stats.total} icon={ShoppingCart} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={Users} colorVariant="emerald" />
        <StatCardV2 label="Abandoned" value={stats.abandoned} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Total Value" value={`Rs ${stats.totalValue.toFixed(2)}`} icon={DollarSign} colorVariant="blue" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        columns={columns}
        data={pageData}
        onRowClick={(row) => openCart(row)}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6e6e73]">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                aria-label="Clear selected carts"
              >
                <X size={12} />
              </button>
            </div>
          ) : undefined
        }
        searchValue={search}
        searchPlaceholder="Search carts..."
        emptyMessage={
          activeQuery.isLoading || abandonedQuery.isLoading
            ? "Loading carts..."
            : "No carts found."
        }
        showPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </PageLayout>
  );
};
