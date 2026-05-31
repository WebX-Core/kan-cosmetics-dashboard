import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingBag, DollarSign, UserCheck, Eye } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useOrders } from "@/features/commerce";

type CustomerRow = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
}>;

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

const deriveCustomers = (orders: unknown[]): CustomerRow[] => {
  const map = new Map<string, CustomerRow>();
  for (const order of orders) {
    const o = (typeof order === "object" && order !== null ? order : {}) as Record<string, unknown>;
    const cid = text(o.customerId);
    if (!cid) continue;
    const amount =
      typeof o.total === "number" ? o.total
        : typeof o.totalAmount === "number" ? o.totalAmount
        : parseFloat(text(o.total ?? o.totalAmount, "0")) || 0;
    if (map.has(cid)) {
      const existing = map.get(cid)!;
      (existing as { orderCount: number; totalSpent: number }).orderCount += 1;
      (existing as { orderCount: number; totalSpent: number }).totalSpent += amount;
    } else {
      map.set(cid, {
        id: cid,
        name: text(o.customerName ?? o.fullname, "Unknown"),
        email: text(o.customerEmail ?? o.email, "—"),
        phone: text(o.phone ?? o.customerPhone, "—"),
        orderCount: 1,
        totalSpent: amount,
      });
    }
  }
  return Array.from(map.values());
};

const LIMIT = 20;

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const ordersQuery = useOrders(undefined, true);
  const rawOrders = React.useMemo<unknown[]>(() => {
    const payload = ordersQuery.data;
    if (Array.isArray(payload)) return payload;
    const envelope = payload as { data?: unknown[] } | undefined;
    return envelope?.data ?? [];
  }, [ordersQuery.data]);

  const customers = React.useMemo(() => deriveCustomers(rawOrders), [rawOrders]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone].some((v) => v.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const totalPages = Math.ceil(filtered.length / LIMIT) || 1;
  const pageData = React.useMemo(
    () => filtered.slice((page - 1) * LIMIT, page * LIMIT),
    [filtered, page],
  );

  const stats = React.useMemo(
    () => ({
      total: customers.length,
      withOrders: customers.filter((c) => c.orderCount > 0).length,
      totalOrders: customers.reduce((s, c) => s + c.orderCount, 0),
      totalRevenue: customers.reduce((s, c) => s + c.totalSpent, 0),
    }),
    [customers],
  );

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (row: CustomerRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-xs text-gray-400">{row.email}</div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: CustomerRow) => <span className="text-gray-600">{row.phone}</span>,
    },
    {
      key: "orderCount",
      label: "Orders",
      render: (row: CustomerRow) => (
        <span className="font-medium text-gray-900">{row.orderCount}</span>
      ),
    },
    {
      key: "totalSpent",
      label: "Total Spent",
      render: (row: CustomerRow) => (
        <span className="font-medium text-gray-900">Rs {row.totalSpent.toFixed(2)}</span>
      ),
    },
    {
      key: "view",
      label: "",
      render: (row: CustomerRow) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/customers/${row.id}`);
            }}
            className="flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-[12px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Eye size={12} strokeWidth={2} />
            View
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Customers"
      subtitle="View customers derived from order activity."
      searchValue={search}
      onSearchChange={(v) => {
        setSearch(v);
        setPage(1);
      }}
      searchPlaceholder="Search name, email, phone..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Customers" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Active Buyers" value={stats.withOrders} icon={UserCheck} colorVariant="emerald" />
        <StatCardV2 label="Total Orders" value={stats.totalOrders} icon={ShoppingBag} colorVariant="amber" />
        <StatCardV2 label="Total Revenue" value={`Rs ${stats.totalRevenue.toFixed(0)}`} icon={DollarSign} colorVariant="blue" />
      </div>
      <DataTableV2
        columns={columns}
        data={pageData}
        searchValue={search}
        onRowClick={(row) => navigate(`/dashboard/customers/${row.id}`)}
        emptyMessage={ordersQuery.isLoading ? "Loading customers..." : "No customers found."}
        showPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </PageLayout>
  );
};
