import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Star, RefreshCw, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { formatDateTime } from "@/shared/utils/date";
import { slugify } from "@/shared/utils/slug";
import {
  useTeamList,
  useTeamDeleted,
  useSoftDeleteTeam,
  useRecoverTeam,
  useDestroyTeam,
} from "@/features/team";
import { useQueryClient } from "@tanstack/react-query";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

type TeamRow = Readonly<{
  id: string;
  fullname: string;
  designation: string;
  countryCode: string;
  phoneNumber: string;
  isLeader?: boolean;
  addToHome?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}>;

const toRow = (entry: unknown): TeamRow => {
  const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? crypto.randomUUID()),
    fullname: String(item.fullname ?? ""),
    designation: String(item.designation ?? "—"),
    countryCode: String(item.countryCode ?? ""),
    phoneNumber: String(item.phoneNumber ?? ""),
    isLeader: Boolean(item.isLeader),
    addToHome: Boolean(item.addToHome),
    sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : undefined,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
  };
};

const fromPayload = (payload: unknown): ReadonlyArray<TeamRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map(toRow);
};

export const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("active");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const activeQuery = useTeamList({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const deletedQuery = useTeamDeleted();
  const softDelete = useSoftDeleteTeam();
  const recover = useRecoverTeam();
  const destroy = useDestroyTeam();

  const activeRows = React.useMemo(() => fromPayload(activeQuery.data), [activeQuery.data]);
  const deletedRows = React.useMemo(() => fromPayload(deletedQuery.data), [deletedQuery.data]);
  const totalPages = activeQuery.data?.totalPages ?? 1;

  const rows = activeTab === "deleted" ? deletedRows : activeRows;

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Move this member to trash?");
    if (!ok) return;
    await softDelete.mutateAsync(id);
    toast.success("Moved to trash.");
  };

  const handleRecover = async (id: string) => {
    const ok = await confirmAction("Restore this member?");
    if (!ok) return;
    await recover.mutateAsync({ ids: [id] });
    void qc.invalidateQueries();
    toast.success("Restored.");
  };

  const handleDestroy = async (id: string) => {
    const ok = await confirmAction("Permanently delete this member? This cannot be undone.");
    if (!ok) return;
    await destroy.mutateAsync(id);
    void qc.invalidateQueries();
    toast.success("Permanently deleted.");
  };

  const tabs = [
    { key: "active", label: "Active", count: activeRows.length },
    { key: "deleted", label: "Deleted", count: deletedRows.length },
  ];

  const activeColumns = [
    {
      key: "member",
      label: "Member",
      render: (r: TeamRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.fullname}</div>
          <div className="text-xs text-gray-400">{r.designation}</div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (r: TeamRow) => <span className="text-gray-600">{r.countryCode} {r.phoneNumber}</span>,
    },
    {
      key: "flags",
      label: "Flags",
      render: (r: TeamRow) => (
        <div className="flex gap-2 text-xs text-gray-500">
          {r.isLeader ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">Leader</span> : null}
          {r.addToHome ? <span className="rounded-full bg-[#0071e3]/10 px-2 py-0.5 text-[#0071e3]">Home</span> : null}
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (r: TeamRow) => <span className="text-xs text-gray-400">{formatDateTime(r.updatedAt)}</span>,
    },
  ];

  const deletedColumns = [
    {
      key: "member",
      label: "Member",
      render: (r: TeamRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.fullname}</div>
          <div className="text-xs text-gray-400">{r.designation}</div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (r: TeamRow) => <span className="text-gray-600">{r.countryCode} {r.phoneNumber}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (r: TeamRow) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleRecover(r.id)}
            className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <RefreshCw size={11} /> Restore
          </button>
          <button
            onClick={() => void handleDestroy(r.id)}
            className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 size={11} /> Destroy
          </button>
        </div>
      ),
    },
  ];

  const isLoading = activeTab === "deleted" ? deletedQuery.isLoading : activeQuery.isLoading;

  return (
    <PageLayout
      title="Team"
      subtitle="Manage team members and leadership."
      onNew={() => navigate("/dashboard/team/create")}
      newButtonLabel="New Member"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search name, designation..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Active Members" value={activeRows.length} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Leaders" value={activeRows.filter((r) => r.isLeader).length} icon={Star} colorVariant="amber" />
        <StatCardV2 label="On Home" value={activeRows.filter((r) => r.addToHome).length} icon={Users} colorVariant="emerald" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setState((p) => ({ ...p, page: 1 })); }}
        columns={activeTab === "deleted" ? deletedColumns : activeColumns}
        data={rows}
        searchValue={state.search}
        onEdit={activeTab === "active" ? (r) => navigate(`/dashboard/team/${slugify(r.fullname || "team-member")}/edit`) : undefined}
        onDelete={activeTab === "active" ? (r) => void handleDelete(r.id) : undefined}
        emptyMessage={isLoading ? "Loading..." : `No ${activeTab} team members.`}
        showPagination={activeTab === "active"}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
