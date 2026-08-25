import React from "react";
import { Mail, UserCheck, AlertTriangle, Users, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { confirmAction } from "@/shared/utils/confirm";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

type Row = Readonly<{
  id: string;
  email: string;
  name: string;
  status: "Active" | "Unsubscribed" | "Bounced";
  source: string;
}>;

const toStatus = (value: string): Row["status"] =>
  value.toLowerCase().includes("bounce")
    ? "Bounced"
    : value.toLowerCase().includes("unsubscribe")
    ? "Unsubscribed"
    : "Active";

const mapRows = (payload: unknown): ReadonlyArray<Row> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(item.id, crypto.randomUUID()),
      email: text(item.email, "—"),
      name: text(item.name ?? item.fullname, "Subscriber"),
      status: toStatus(text(item.status, "Active")),
      source: text(item.source, "Website"),
    };
  });
};

export const NewsletterPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.newsletters.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const remove = marketingApi.newsletters.hooks.useSoftDelete();

  const rows = React.useMemo(() => mapRows(query.data), [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const totalSubscribers = query.data?.total ?? rows.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === activeTab);
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total: totalSubscribers,
    active: rows.filter((r) => r.status === "Active").length,
    unsubscribed: rows.filter((r) => r.status === "Unsubscribed").length,
    bounced: rows.filter((r) => r.status === "Bounced").length,
  }), [rows, totalSubscribers]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setState((p) => ({ ...p, page: 1 }));
  };

  const deleteSelected = async (ids: Set<string>, clearSelection: () => void) => {
    const count = ids.size;
    const confirmed = await confirmAction(`Delete ${count} selected subscriber${count === 1 ? "" : "s"}?`);
    if (!confirmed) return;

    try {
      await remove.mutateAsync([...ids].join(","));
      clearSelection();
      setSelectedIds(new Set());
      await query.refetch();
      toast.success(`${count} subscriber${count === 1 ? "" : "s"} deleted.`);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "unsubscribed", label: "Unsubscribed" },
    { key: "bounced", label: "Bounced" },
  ];

  const columns = [
    { key: "subscriber", label: "Subscriber", sortValue: (r: Row) => r.name || r.email, render: (r: Row) => (
      <div>
        <div className="font-medium text-gray-900">{r.name}</div>
        <div className="text-xs text-gray-400">{r.email}</div>
      </div>
    )},
    { key: "source", label: "Source", sortValue: (r: Row) => r.source, render: (r: Row) => <span className="text-gray-600">{r.source}</span> },
    { key: "status", label: "Status", sortValue: (r: Row) => r.status, render: (r: Row) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageLayout
      title="Newsletter"
      subtitle="Subscriber list and email campaign audience."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search name, email, source..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Subscribers" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={UserCheck} colorVariant="emerald" />
        <StatCardV2 label="Unsubscribed" value={stats.unsubscribed} icon={Mail} colorVariant="amber" />
        <StatCardV2 label="Bounced" value={stats.bounced} icon={AlertTriangle} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading subscribers..." : "No subscribers found."}
        rowId={(row) => row.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clearSelection) => (
          <button
            type="button"
            onClick={() => void deleteSelected(ids, clearSelection)}
            disabled={remove.isPending}
            className="inline-flex h-8 items-center gap-2 rounded-full bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {remove.isPending ? "Deleting…" : `Delete (${ids.size})`}
          </button>
        )}
        showPagination={true}
        alwaysShowPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
      />
    </PageLayout>
  );
};
