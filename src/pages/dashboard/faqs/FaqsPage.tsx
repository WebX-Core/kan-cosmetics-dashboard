import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HelpCircle, CheckCircle, XCircle, Package, Globe, X, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { confirmAction } from "@/shared/utils/confirm";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { engagementApi } from "@/features/engagement";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
type Row = Readonly<{ id: string; question: string; answer: string; type: string; isSite: boolean; isActive: boolean; status: string; category: string; views: number }>;

const toRow = (entry: unknown): Row => {
  const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
  const descriptionRaw = item.description;
  const product = (typeof item.product === "object" && item.product !== null ? item.product : {}) as Record<string, unknown>;
  const productId = text(item.productId ?? product.id, "");
  const answer =
    typeof descriptionRaw === "string"
      ? descriptionRaw
      : descriptionRaw && typeof descriptionRaw === "object" && typeof (descriptionRaw as Record<string, unknown>).text === "string"
      ? text((descriptionRaw as Record<string, unknown>).text)
      : descriptionRaw && typeof descriptionRaw === "object"
      ? JSON.stringify(descriptionRaw)
      : "—";
  const isSite = Boolean(item.isSite ?? true);
  return {
    id: text(item.id, crypto.randomUUID()),
    question: text(item.title, "Untitled question"),
    answer,
    type: isSite ? "Site" : "Product",
    isSite,
    isActive: item.isActive !== false,
    status: item.isActive !== false ? "Active" : "Inactive",
    category: productId || "General",
    views: 0,
  };
};

export const FaqsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const productIdFilter = searchParams.get("productId") ?? "";
  const productNameFilter = searchParams.get("productName") ?? "";

  const query = engagementApi.faqs.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const destroyMutation = engagementApi.faqs.hooks.useDestroy();
  const updateMutation = engagementApi.faqs.hooks.useUpdate();

  const rows = React.useMemo(() => (query.data?.data ?? []).map(toRow), [query.data?.data]);
  const scopedRows = React.useMemo(() => {
    if (!productIdFilter) return rows;
    return rows.filter((row) => row.category === productIdFilter);
  }, [rows, productIdFilter]);
  const totalPages = query.data?.totalPages ?? 1;
  const totalFaqs = productIdFilter ? scopedRows.length : (query.data?.total ?? rows.length);

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return scopedRows;
    if (activeTab === "product") return scopedRows.filter((r) => r.type === "Product");
    if (activeTab === "site") return scopedRows.filter((r) => r.type === "Site");
    return scopedRows.filter((r) => r.status.toLowerCase() === activeTab);
  }, [scopedRows, activeTab]);
  const visibleIds = React.useMemo(() => tabFiltered.map((row) => row.id), [tabFiltered]);
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id)));
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const stats = React.useMemo(() => ({
    total: totalFaqs,
    active: scopedRows.filter((r) => r.status === "Active").length,
    inactive: scopedRows.filter((r) => r.status === "Inactive").length,
    product: scopedRows.filter((r) => r.type === "Product").length,
    site: scopedRows.filter((r) => r.type === "Site").length,
  }), [scopedRows, totalFaqs]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };

  const tabs = [{ key: "all", label: "All" }, { key: "product", label: "Product" }, { key: "site", label: "Site" }, { key: "inactive", label: "Inactive" }];

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllVisibleSelected} onChange={(e) => toggleSelectAllVisible(e.target.checked)} aria-label="Select all faqs" />,
      render: (r: Row) => (
        <input type="checkbox" checked={selectedIds.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleSelectOne(r.id, e.target.checked)} aria-label={`Select ${r.id}`} />
      ),
      width: "44px",
    },
    { key: "question", label: "Question", render: (r: Row) => (
      <div>
        <div className="font-medium text-gray-900">{r.question}</div>
        <div className="text-xs text-gray-400 line-clamp-1">{r.answer}</div>
      </div>
    )},
    { key: "type", label: "Type", render: (r: Row) => <span className="text-gray-600">{r.type}</span> },
    { key: "category", label: "Category", render: (r: Row) => <span className="text-gray-600">{r.category}</span> },
    { key: "status", label: "Status", render: (r: Row) => (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={r.isActive}
            onClick={async (event) => {
            event.stopPropagation();
            await updateMutation.mutateAsync({
              id: r.id,
              dto: { title: r.question, isActive: !r.isActive },
            });
            await query.refetch();
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            r.isActive ? "bg-emerald-500" : "bg-zinc-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              r.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-xs font-medium ${r.isActive ? "text-emerald-700" : "text-zinc-600"}`}>
          {r.isActive ? "Active" : "Inactive"}
        </span>
      </div>
    ) },
    {
      key: "actions",
      label: "Actions",
      render: (r: Row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/faqs/${r.id}/edit`); }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/seo-metadata/create?entityType=FAQ&entityId=${encodeURIComponent(r.id)}`); }}>
              <Globe className="mr-2 h-4 w-4" /> SEO
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await confirmAction("Delete this FAQ?");
                if (!ok) return;
                await destroyMutation.mutateAsync(r.id);
                await query.refetch();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="FAQs"
      subtitle={productIdFilter ? `Manage FAQs for ${productNameFilter || "selected product"}.` : "Manage FAQ records."}
      onNew={() => navigate(`/dashboard/faqs/create`)}
      newButtonLabel="New FAQ"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search FAQs..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCardV2 label="Total" value={stats.total} icon={HelpCircle} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactive} icon={XCircle} colorVariant="red" />
        <StatCardV2 label="Product FAQs" value={stats.product} icon={Package} colorVariant="amber" />
        <StatCardV2 label="Site FAQs" value={stats.site} icon={Globe} colorVariant="blue" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        actions={selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6e6e73]">{selectedIds.length} selected</span>
            <button type="button" onClick={() => setSelectedIds([])} className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]" aria-label="Clear selected faqs">
              <X size={12} />
            </button>
          </div>
        ) : undefined}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading FAQs..." : "No FAQs found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
