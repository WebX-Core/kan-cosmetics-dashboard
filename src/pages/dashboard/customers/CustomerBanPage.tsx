import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
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
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
};

type BanRow = Readonly<{
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  bannedUntil: string;
  isActive: boolean;
  createdAt: string;
}>;

const toRows = (payload: unknown): ReadonlyArray<BanRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item) => {
      const customer = (typeof item.customer === "object" && item.customer !== null
        ? item.customer
        : {}) as Record<string, unknown>;
      const bannedUntil = text(item.bannedUntil ?? item.expiresAt, "");
      const isExpired = bannedUntil ? new Date(bannedUntil) < new Date() : false;
      return {
        id: text(item.id, crypto.randomUUID()),
        customerId: text(item.customerId ?? customer.id, "—"),
        customerName: text(item.customerName ?? customer.fullname ?? customer.name, "—"),
        customerEmail: text(item.customerEmail ?? customer.email, "—"),
        reason: text(item.reason, "No reason provided"),
        bannedUntil,
        isActive: !isExpired && item.isActive !== false,
        createdAt: text(item.createdAt, ""),
      };
    });
};

export const CustomerBanPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = commerceApi.customerBans.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (activeTab === "active") return rows.filter((r) => r.isActive);
    if (activeTab === "expired") return rows.filter((r) => !r.isActive);
    return rows;
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total,
    active: rows.filter((r) => r.isActive).length,
    expired: rows.filter((r) => !r.isActive).length,
    permanent: rows.filter((r) => !r.bannedUntil).length,
  }), [rows, total]);

  const tabs = [
    { key: "all", label: "All Bans", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "expired", label: "Expired", count: stats.expired },
  ];

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (r: BanRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.customerName}</div>
          <div className="text-xs text-gray-400">{r.customerEmail}</div>
        </div>
      ),
    },
    { key: "reason", label: "Reason", render: (r: BanRow) => <span className="text-gray-600 line-clamp-1">{r.reason}</span> },
    {
      key: "status",
      label: "Status",
      render: (r: BanRow) => <StatusBadge status={r.isActive ? "Inactive" : "Active"} label={r.isActive ? "Banned" : "Expired"} />,
    },
    {
      key: "bannedUntil",
      label: "Banned Until",
      render: (r: BanRow) => (
        <span className="text-xs text-gray-500">{r.bannedUntil ? fmt(r.bannedUntil) : "Permanent"}</span>
      ),
    },
    { key: "createdAt", label: "Banned At", render: (r: BanRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Customer Bans"
      subtitle="View and manage banned customer accounts."
      onNew={() => navigate("/dashboard/customers/bans/create")}
      newButtonLabel="Ban Customer"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search banned customers..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Bans" value={stats.total} icon={ShieldOff} colorVariant="red" />
        <StatCardV2 label="Active Bans" value={stats.active} icon={AlertTriangle} colorVariant="rose" />
        <StatCardV2 label="Expired" value={stats.expired} icon={ShieldCheck} colorVariant="emerald" />
        <StatCardV2 label="Permanent" value={stats.permanent} icon={Clock} colorVariant="amber" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); setState((p) => ({ ...p, page: 1 })); }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading bans..." : "No customer bans found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        onEdit={(r) => navigate(`/dashboard/customers/bans/${r.id}/edit`)}
      />
    </PageLayout>
  );
};
