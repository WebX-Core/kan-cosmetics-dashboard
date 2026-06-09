import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  X,
  Plus,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useOrders } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { getOrderRows, normalizeOrderRow } from "@/shared/utils/orderMapping";

type OrderRow = Readonly<{
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  placedAt: string;
  status: string;
}>;

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>(
    [],
  );
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const ordersQuery = useOrders({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const orders = React.useMemo(() => {
    return getOrderRows(ordersQuery.data).map(
      (row) => normalizeOrderRow(row) as OrderRow,
    );
  }, [ordersQuery.data]);

  const totalPages =
    (ordersQuery.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const totalOrders =
    (ordersQuery.data as { total?: number } | undefined)?.total ??
    orders.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return orders;
    return orders.filter((o) => o.status.toLowerCase() === activeTab);
  }, [orders, activeTab]);
  const visibleIds = React.useMemo(
    () => tabFiltered.map((row) => row.id),
    [tabFiltered],
  );
  const isAllVisibleSelected = React.useMemo(
    () =>
      visibleIds.length > 0 &&
      visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );

  const toggleSelectOne = (orderId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? prev.includes(orderId)
          ? prev
          : [...prev, orderId]
        : prev.filter((entry) => entry !== orderId),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(
    () => ({
      total: totalOrders,
      pending: orders.filter((o) => o.status === "PENDING").length,
      shipped: orders.filter((o) => o.status === "SHIPPED").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
    }),
    [orders, totalOrders],
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
          aria-label="Select all orders"
        />
      ),
      render: (row: OrderRow) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleSelectOne(row.id, event.target.checked)}
          aria-label={`Select ${row.orderNumber}`}
        />
      ),
      width: "44px",
    },
    {
      key: "orderNumber",
      label: "Order",
      render: (row: OrderRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.orderNumber}</div>
          <div className="text-xs text-gray-400">{row.placedAt}</div>
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (row: OrderRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-xs text-gray-400">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      key: "payment",
      label: "Payment",
      render: (row: OrderRow) => (
        <div>
          <div className="text-gray-700">{row.paymentMethod}</div>
          <div className="text-xs text-gray-400">{row.paymentStatus}</div>
        </div>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (row: OrderRow) => (
        <span className="font-medium text-gray-900">{row.total}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: OrderRow) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <PageLayout
      title="Orders"
      showExport
      actions={
        <button
          type="button"
          onClick={() => navigate("/dashboard/orders/create")}
          className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.982]"
        >
          <Plus size={14} /> New Order
        </button>
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search orders..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Total Orders"
          value={stats.total}
          icon={ShoppingCart}
          colorVariant="blue"
        />
        <StatCardV2
          label="Pending"
          value={stats.pending}
          icon={Package}
          colorVariant="amber"
        />
        <StatCardV2
          label="Shipped"
          value={stats.shipped}
          icon={Truck}
          colorVariant="blue"
        />
        <StatCardV2
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle}
          colorVariant="emerald"
        />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
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
                aria-label="Clear selected orders"
              >
                <X size={12} />
              </button>
            </div>
          ) : undefined
        }
        searchValue={state.search}
        onRowClick={(row) => navigate(`/dashboard/orders/${row.id}`)}
        onEdit={(row) => navigate(`/dashboard/orders/${row.id}`)}
        emptyMessage={
          ordersQuery.isLoading ? "Loading orders..." : "No orders found."
        }
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
