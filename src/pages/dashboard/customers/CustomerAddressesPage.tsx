import React from "react";
import { MapPin, Home, Star, Globe } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { commerceApi } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type AddressRow = Readonly<{
  id: string;
  fullName: string;
  customerId: string;
  type: string;
  address: string;
  city: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}>;

const toRows = (payload: unknown): ReadonlyArray<AddressRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item) => ({
      id: text(item.id, crypto.randomUUID()),
      fullName: text(item.fullName ?? item.fullname, "—"),
      customerId: text(item.customerId, "—"),
      type: text(item.type, "shipping"),
      address: [
        text(item.addressLine1),
        text(item.addressLine2),
      ].filter(Boolean).join(", ") || "—",
      city: text(item.city, "—"),
      country: text(item.country, "—"),
      isDefault: item.isDefault === true,
      createdAt: text(item.createdAt, ""),
    }));
};

export const CustomerAddressesPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = commerceApi.customerAddresses.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (activeTab === "default") return rows.filter((r) => r.isDefault);
    if (activeTab === "billing") return rows.filter((r) => r.type.toLowerCase() === "billing");
    if (activeTab === "shipping") return rows.filter((r) => r.type.toLowerCase() === "shipping");
    return rows;
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total,
    defaults: rows.filter((r) => r.isDefault).length,
    shipping: rows.filter((r) => r.type.toLowerCase() === "shipping").length,
    billing: rows.filter((r) => r.type.toLowerCase() === "billing").length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "shipping", label: "Shipping", count: stats.shipping },
    { key: "billing", label: "Billing", count: stats.billing },
    { key: "default", label: "Defaults", count: stats.defaults },
  ];

  const columns = [
    {
      key: "fullName",
      label: "Name",
      sortValue: (r: AddressRow) => r.fullName,
      render: (r: AddressRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{r.fullName}</span>
          {r.isDefault && (
            <span className="rounded-full bg-blue-500/10 px-2 py-px text-[10px] font-semibold text-blue-500">Default</span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (r: AddressRow) => (
        <StatusBadge status={r.type.toLowerCase() === "billing" ? "Pending" : "Active"} label={r.type} />
      ),
    },
    { key: "address", label: "Address", render: (r: AddressRow) => <span className="text-gray-600 line-clamp-1">{r.address}</span> },
    { key: "city", label: "City", sortValue: (r: AddressRow) => r.city, render: (r: AddressRow) => <span className="text-gray-600">{r.city}</span> },
    { key: "country", label: "Country", sortValue: (r: AddressRow) => r.country, render: (r: AddressRow) => <span className="text-gray-600">{r.country}</span> },
    { key: "customerId", label: "Customer ID", render: (r: AddressRow) => <span className="font-mono text-xs text-gray-400">{r.customerId}</span> },
    { key: "createdAt", label: "Added", sortValue: (r: AddressRow) => r.createdAt || "", render: (r: AddressRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Customer Addresses"
      subtitle="Shipping and billing addresses across all customers."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search addresses..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Addresses" value={stats.total} icon={MapPin} colorVariant="blue" />
        <StatCardV2 label="Shipping" value={stats.shipping} icon={Home} colorVariant="emerald" />
        <StatCardV2 label="Billing" value={stats.billing} icon={Globe} colorVariant="indigo" />
        <StatCardV2 label="Defaults" value={stats.defaults} icon={Star} colorVariant="amber" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading addresses..." : "No addresses found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(limit) => setState((prev) => ({ ...prev, page: 1, limit }))}
      />
    </PageLayout>
  );
};
