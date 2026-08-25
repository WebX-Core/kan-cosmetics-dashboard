import React from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper, RefreshCw, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { formatDateTime } from "@/shared/utils/date";
import {
  useNewsroomList,
  useNewsroomDeleted,
  useSoftDeleteNewsroom,
  useRecoverNewsroom,
  useDestroyNewsroom,
} from "@/features/newsroom";
import { useQueryClient } from "@tanstack/react-query";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

type NewsroomRow = Readonly<{
  id: string;
  title: string;
  slug: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}>;

const toRow = (entry: unknown): NewsroomRow => {
  const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? crypto.randomUUID()),
    title: String(item.title ?? "—"),
    slug: String(item.slug ?? "—"),
    sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : undefined,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
  };
};

const fromPayload = (payload: unknown): ReadonlyArray<NewsroomRow> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map(toRow);
};

export const NewsroomPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("active");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const activeQuery = useNewsroomList({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const deletedQuery = useNewsroomDeleted();
  const softDelete = useSoftDeleteNewsroom();
  const recover = useRecoverNewsroom();
  const destroy = useDestroyNewsroom();

  const activeRows = React.useMemo(() => fromPayload(activeQuery.data), [activeQuery.data]);
  const deletedRows = React.useMemo(() => fromPayload(deletedQuery.data), [deletedQuery.data]);
  const totalPages = activeQuery.data?.totalPages ?? 1;

  const rows = activeTab === "deleted" ? deletedRows : activeRows;

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Move to trash?");
    if (!ok) return;
    await softDelete.mutateAsync(id);
    toast.success("Moved to trash.");
  };

  const handleRecover = async (id: string) => {
    const ok = await confirmAction("Restore this entry?");
    if (!ok) return;
    await recover.mutateAsync({ ids: [id] });
    void qc.invalidateQueries();
    toast.success("Restored.");
  };

  const handleDestroy = async (id: string) => {
    const ok = await confirmAction("Permanently delete? Cannot be undone.");
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
      key: "title",
      label: "Title",
      sortValue: (r: NewsroomRow) => r.title,
      render: (r: NewsroomRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.title}</div>
          <div className="text-xs text-gray-400">{r.slug}</div>
        </div>
      ),
    },
    { key: "sort", label: "Sort", sortValue: (r: NewsroomRow) => r.sortOrder ?? 0, render: (r: NewsroomRow) => <span className="text-gray-600">{r.sortOrder ?? "—"}</span> },
    { key: "updatedAt", label: "Updated", sortValue: (r: NewsroomRow) => r.updatedAt ?? "", render: (r: NewsroomRow) => <span className="text-xs text-gray-400">{formatDateTime(r.updatedAt)}</span> },
  ];

  const deletedColumns = [
    {
      key: "title",
      label: "Title",
      render: (r: NewsroomRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.title}</div>
          <div className="text-xs text-gray-400">{r.slug}</div>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r: NewsroomRow) => (
        <div className="flex items-center gap-2">
          <button onClick={() => void handleRecover(r.id)} className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
            <RefreshCw size={11} /> Restore
          </button>
          <button onClick={() => void handleDestroy(r.id)} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
            <Trash2 size={11} /> Destroy
          </button>
        </div>
      ),
    },
  ];

  const isLoading = activeTab === "deleted" ? deletedQuery.isLoading : activeQuery.isLoading;

  return (
    <PageLayout
      title="Newsroom"
      subtitle="Manage press releases and news articles."
      onNew={() => navigate("/dashboard/newsroom/create")}
      newButtonLabel="New Article"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search title, slug..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCardV2 label="Active Articles" value={activeRows.length} icon={Newspaper} colorVariant="blue" />
        <StatCardV2 label="Deleted" value={deletedRows.length} icon={Trash2} colorVariant="red" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setState((p) => ({ ...p, page: 1 })); }}
        columns={activeTab === "deleted" ? deletedColumns : activeColumns}
        data={rows}
        searchValue={state.search}
        onEdit={activeTab === "active" ? (r) => navigate(`/dashboard/newsroom/${r.slug || r.id}/edit`) : undefined}
        onDelete={activeTab === "active" ? (r) => void handleDelete(r.id) : undefined}
        emptyMessage={isLoading ? "Loading..." : `No ${activeTab} articles.`}
        showPagination={activeTab === "active"}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((p) => ({ ...p, page: 1, limit: size }))}
      />
    </PageLayout>
  );
};
