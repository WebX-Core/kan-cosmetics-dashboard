import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessageSquare, Plus } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { engagementApi, useProductFaqList } from "@/features/engagement";
import { catalogApi } from "@/features/catalog";
import { confirmAction } from "@/shared/utils/confirm";

const read = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractFaqRows = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.faqs)) return payload.faqs as ReadonlyArray<Record<string, unknown>>;
  if (isRecord(payload.data) && Array.isArray(payload.data.faqs)) {
    return payload.data.faqs as ReadonlyArray<Record<string, unknown>>;
  }
  return [];
};

type ProductFaqRow = Readonly<{
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}>;

export const ProductFaqsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = id ?? "";
  const [search, setSearch] = React.useState("");

  const productQuery = catalogApi.products.hooks.useGet(productId, Boolean(productId));
  const productFaqQuery = useProductFaqList(
    productId,
    {
      page: 1,
      limit: 1000,
      search: search.trim() || undefined,
    },
    Boolean(productId),
  );
  const deleteFaq = engagementApi.faqs.hooks.useSoftDelete();
  const updateFaq = engagementApi.faqs.hooks.useUpdate();

  const productName = React.useMemo(() => {
    const row = (productQuery.data ?? {}) as Record<string, unknown>;
    return read(row.title ?? row.name, "Product");
  }, [productQuery.data]);

  const rows = React.useMemo(() => {
    const list = extractFaqRows(productFaqQuery.data);
    return list.map((row) => ({
      id: read(row.id, crypto.randomUUID()),
      title: read(row.title, "Untitled FAQ"),
      description:
        typeof row.description === "string"
          ? row.description
          : typeof row.description === "object" && row.description !== null
            ? read((row.description as Record<string, unknown>).text, "—")
            : "—",
      isActive: Boolean(row.isActive ?? true),
      createdAt: read(row.createdAt),
    }));
  }, [productFaqQuery.data]);

  const stats = React.useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      inactive: rows.filter((row) => !row.isActive).length,
    }),
    [rows],
  );

  const columns = [
    {
      key: "title",
      label: "Question",
      sortValue: (row: ProductFaqRow) => row.title,
      render: (row: ProductFaqRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="line-clamp-1 text-xs text-gray-400">{row.description}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row: ProductFaqRow) => (row.isActive ? 1 : 0),
      render: (row: ProductFaqRow) => (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={row.isActive}
            onClick={async (event) => {
              event.stopPropagation();
              await updateFaq.mutateAsync({
                id: row.id,
                dto: { title: row.title, isActive: !row.isActive },
              });
              await productFaqQuery.refetch();
            }}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              row.isActive ? "bg-emerald-500" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                row.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-xs font-medium ${row.isActive ? "text-emerald-700" : "text-zinc-600"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
  ];

  const remove = async (row: ProductFaqRow) => {
    const ok = await confirmAction("Delete this product FAQ?");
    if (!ok) return;
    await deleteFaq.mutateAsync(row.id);
    await productFaqQuery.refetch();
  };

  return (
    <PageLayout
      title={`${productName} FAQs`}
      subtitle="Product-specific FAQs only."
      onBack={() => navigate("/dashboard/products")}
      actions={
        <button
          type="button"
          onClick={() => navigate(`/dashboard/products/${productId}/faqs/create`)}
          className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          <Plus size={13} />
          New Product FAQ
        </button>
      }
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search product FAQs..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total FAQs" value={stats.total} icon={MessageSquare} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={MessageSquare} colorVariant="emerald" />
        <StatCardV2 label="Inactive" value={stats.inactive} icon={MessageSquare} colorVariant="amber" />
      </div>
      <DataTableV2
        columns={columns}
        data={rows}
        onEdit={(row) => navigate(`/dashboard/products/${productId}/faqs/${row.id}/edit`)}
        onDelete={(row) => void remove(row)}
        emptyMessage={productFaqQuery.isLoading ? "Loading FAQs..." : "No product FAQs found."}
      />
    </PageLayout>
  );
};
