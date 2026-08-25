import React from "react";
import { ClipboardList, Eye, Edit2, Trash2, PlusCircle } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { telemetryApi } from "@/features/telemetry";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { AuditLogDetailModal } from "./AuditLogDetailModal";
import type { AuditLogRow } from "./auditLogs.types";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {});

const toAction = (value: string): AuditLogRow["action"] => {
  const lower = value.toLowerCase();
  if (lower.includes("delete")) return "Deleted";
  if (lower.includes("update")) return "Updated";
  if (lower.includes("create")) return "Created";
  return "Viewed";
};

const formatEntity = (entityType: string): string =>
  entityType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const mapRows = (payload: unknown): ReadonlyArray<AuditLogRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const row = record(entry);
    const user = record(row.user);
    const newValues = record(row.newValues);
    const firstname = text(user.firstname);
    const lastname = text(user.lastname);
    return {
      id: text(row.id, crypto.randomUUID()),
      admin: [firstname, lastname].filter(Boolean).join(" ") || "System",
      adminEmail: text(user.email, "—"),
      action: toAction(text(row.action, "Viewed")),
      entity: formatEntity(text(row.entityType, "System")),
      method: text(newValues.method, "—"),
      statusCode: typeof newValues.statusCode === "number" ? newValues.statusCode : 0,
      timestamp: formatTimestamp(text(row.createdAt)),
      createdAt: text(row.createdAt),
      changedBody: record(newValues.body),
    };
  });
};

const actionIcon = (action: AuditLogRow["action"]) => {
  if (action === "Created") return <PlusCircle size={12} />;
  if (action === "Updated") return <Edit2 size={12} />;
  if (action === "Deleted") return <Trash2 size={12} />;
  return <Eye size={12} />;
};

export const AuditLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedRow, setSelectedRow] = React.useState<AuditLogRow | null>(null);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = telemetryApi.auditLogs.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const rows = React.useMemo(() => mapRows(query.data), [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const totalLogs = query.data?.total ?? rows.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => r.action.toLowerCase() === activeTab);
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total: totalLogs,
    created: rows.filter((r) => r.action === "Created").length,
    updated: rows.filter((r) => r.action === "Updated").length,
    deleted: rows.filter((r) => r.action === "Deleted").length,
  }), [rows, totalLogs]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "created", label: "Created" },
    { key: "updated", label: "Updated" },
    { key: "deleted", label: "Deleted" },
  ];

  const columns = [
    {
      key: "admin",
      label: "Who",
      sortValue: (r: AuditLogRow) => r.admin,
      render: (r: AuditLogRow) => <span className="font-medium text-gray-900">{r.admin}</span>,
    },
    {
      key: "action",
      label: "What",
      sortValue: (r: AuditLogRow) => r.action,
      render: (r: AuditLogRow) => (
        <div className="flex items-center gap-1.5">
          {actionIcon(r.action)}
          <StatusBadge status={r.action} />
          <span className="text-gray-700">{r.entity}</span>
        </div>
      ),
    },
    { key: "timestamp", label: "When", sortValue: (r: AuditLogRow) => r.createdAt, render: (r: AuditLogRow) => <span className="text-xs text-gray-400">{r.timestamp}</span> },
    {
      key: "view",
      label: "",
      render: (r: AuditLogRow) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(r);
          }}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label={`View details for ${r.entity} ${r.action.toLowerCase()} by ${r.admin}`}
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Audit Logs"
      subtitle="Administrative audit trail."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search admin, entity, action..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Events" value={stats.total} icon={ClipboardList} colorVariant="blue" />
        <StatCardV2 label="Created" value={stats.created} icon={PlusCircle} colorVariant="emerald" />
        <StatCardV2 label="Updated" value={stats.updated} icon={Edit2} colorVariant="amber" />
        <StatCardV2 label="Deleted" value={stats.deleted} icon={Trash2} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        onRowClick={setSelectedRow}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading audit logs..." : "No audit logs found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((prev) => ({ ...prev, page: 1, limit: size }))}
      />
      {selectedRow && <AuditLogDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </PageLayout>
  );
};
