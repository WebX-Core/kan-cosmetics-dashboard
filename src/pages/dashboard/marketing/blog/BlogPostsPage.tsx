import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle, Clock, Layers } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { marketingApi } from "@/features/marketing";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const num = (value: unknown): number => (typeof value === "number" ? value : 0);

type Row = Readonly<{
  id: string;
  title: string;
  author: string;
  category: string;
  status: "Published" | "Draft" | "Scheduled";
  views: number;
}>;

const toStatus = (value: string): Row["status"] =>
  value.toLowerCase().includes("publish")
    ? "Published"
    : value.toLowerCase().includes("schedule")
    ? "Scheduled"
    : "Draft";

const rowsFrom = (payload: unknown): ReadonlyArray<Row> => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((entry) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(item.id, crypto.randomUUID()),
      title: text(item.title, "Untitled"),
      author: text(item.author ?? item.createdBy, "—"),
      category: text(item.category, "General"),
      status: toStatus(text(item.status, "Draft")),
      views: num(item.views),
    };
  });
};

export const BlogPostsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = marketingApi.blogs.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => rowsFrom(query.data), [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const totalPosts = query.data?.total ?? rows.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === activeTab);
  }, [rows, activeTab]);

  const stats = React.useMemo(() => ({
    total: totalPosts,
    published: rows.filter((r) => r.status === "Published").length,
    draft: rows.filter((r) => r.status === "Draft").length,
    scheduled: rows.filter((r) => r.status === "Scheduled").length,
  }), [rows, totalPosts]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Draft" },
    { key: "scheduled", label: "Scheduled" },
  ];

  const columns = [
    { key: "post", label: "Post", render: (r: Row) => (
      <div>
        <div className="font-medium text-gray-900">{r.title}</div>
        <div className="text-xs text-gray-400">{r.author} · {r.category}</div>
      </div>
    )},
    { key: "views", label: "Views", render: (r: Row) => <span className="text-gray-600">{r.views}</span> },
    { key: "status", label: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
  ];

  return (
    <PageLayout
      title="Blog Posts"
      subtitle="Manage blog content and articles."
      onNew={() => navigate("/dashboard/blog-posts/create")}
      newButtonLabel="New Post"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search title, author, category..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Posts" value={stats.total} icon={FileText} colorVariant="blue" />
        <StatCardV2 label="Published" value={stats.published} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Draft" value={stats.draft} icon={Layers} colorVariant="amber" />
        <StatCardV2 label="Scheduled" value={stats.scheduled} icon={Clock} colorVariant="blue" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        searchValue={state.search}
        onEdit={(r) => navigate(`/dashboard/blog-posts/${r.id}`)}
        emptyMessage={query.isLoading ? "Loading posts..." : "No blog posts found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
