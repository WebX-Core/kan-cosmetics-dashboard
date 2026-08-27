import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { parseApiError } from "@/shared/utils/apiError";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
};

const getRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { data?: { subscriptions?: unknown[] } | unknown[] };
  const rows: unknown[] = Array.isArray(data.data)
    ? data.data
    : Array.isArray(
          (data.data as { subscriptions?: unknown[] } | undefined)
            ?.subscriptions,
        )
      ? ((data.data as { subscriptions?: unknown[] } | undefined)
          ?.subscriptions ?? [])
      : [];

  return rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null,
  );
};

type SubscriptionRow = Readonly<{
  id: string;
  endpoint: string;
  owner: string;
  isActive: "Active" | "Inactive";
  browser: string;
  platform: string;
  lastSeenAt: string;
  createdAt: string;
}>;

const personName = (person: Record<string, unknown> | null): string => {
  if (!person) return "";
  const firstname = text(person.firstname);
  const lastname = text(person.lastname);
  return [firstname, lastname].filter(Boolean).join(" ") || text(person.email);
};

const toSubscriptionRows = (payload: unknown): ReadonlyArray<SubscriptionRow> =>
  getRows(payload).map((item) => {
    const customer =
      typeof item.customer === "object" && item.customer !== null
        ? (item.customer as Record<string, unknown>)
        : null;
    const user =
      typeof item.user === "object" && item.user !== null
        ? (item.user as Record<string, unknown>)
        : null;
    const owner =
      personName(customer) ||
      personName(user) ||
      text(item.sessionId, "") ||
      "—";

    return {
      id: text(item.id, crypto.randomUUID()),
      endpoint: text(item.endpoint, "—"),
      owner,
      isActive: item.isActive === false ? "Inactive" : "Active",
      browser: text(item.browser ?? item.userAgent, "—"),
      platform: text(item.platform, "—"),
      lastSeenAt: text(item.lastSeenAt, ""),
      createdAt: text(item.createdAt, ""),
    };
  });

export const WebPushSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });

  const query = marketingApi.webPushSubscriptions.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const softDelete = marketingApi.webPushSubscriptions.hooks.useSoftDelete();

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this subscription?");
    if (!ok) return;
    try {
      await softDelete.mutateAsync(id);
      await query.refetch();
      toast.success("Subscription deleted.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const rows = React.useMemo(
    () => toSubscriptionRows(query.data),
    [query.data],
  );
  const totalPages =
    (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total =
    (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(
    () =>
      activeTab === "all"
        ? rows
        : rows.filter((r) => r.isActive.toLowerCase() === activeTab),
    [rows, activeTab],
  );

  const stats = React.useMemo(
    () => ({
      total,
      active: rows.filter((r) => r.isActive === "Active").length,
      inactive: rows.filter((r) => r.isActive === "Inactive").length,
    }),
    [rows, total],
  );

  const tabs = [
    { key: "all", label: "All", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "inactive", label: "Inactive", count: stats.inactive },
  ];

  const columns = [
    {
      key: "platform",
      label: "Platform",
      sortValue: (r: SubscriptionRow) => r.platform,
      render: (r: SubscriptionRow) => (
        <span className="text-sm text-[#1d1d1f]">{r.platform}</span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortValue: (r: SubscriptionRow) => r.isActive,
      render: (r: SubscriptionRow) => <StatusBadge status={r.isActive} />,
    },
    {
      key: "lastSeenAt",
      label: "Last Seen",
      sortValue: (r: SubscriptionRow) => r.lastSeenAt,
      render: (r: SubscriptionRow) => (
        <span className="text-xs text-[#6e6e73]">{fmt(r.lastSeenAt)}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (r: SubscriptionRow) => r.createdAt,
      render: (r: SubscriptionRow) => (
        <span className="text-xs text-[#6e6e73]">{fmt(r.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: SubscriptionRow) => (
        <div
          className="flex items-center justify-end gap-[5px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => void handleDelete(r.id)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500"
            aria-label={`Delete subscription ${r.id}`}
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      ),
      width: "80px",
    },
  ];

  return (
    <PageLayout
      title="Web Push Subscriptions"
      subtitle="Browser subscriptions already registered by customers and sessions."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search subscriptions..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2
          label="Total Subscriptions"
          value={stats.total}
          icon={Users}
          colorVariant="blue"
        />
        <StatCardV2
          label="Active"
          value={stats.active}
          icon={CheckCircle}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Inactive"
          value={stats.inactive}
          icon={AlertCircle}
          colorVariant="gray"
        />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setState((p) => ({ ...p, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        onRowClick={(row) =>
          navigate(`/dashboard/marketing/web-push/subscriptions/${row.id}`)
        }
        emptyMessage={
          query.isLoading
            ? "Loading subscriptions..."
            : "No subscriptions found."
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
      />
    </PageLayout>
  );
};
