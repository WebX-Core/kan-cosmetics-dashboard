import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Tag, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";
import { confirmAction } from "@/shared/utils/confirm";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const input = "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const toRows = (value: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> => {
  if (Array.isArray(value)) return value as ReadonlyArray<Readonly<Record<string, unknown>>>;
  if (!value || typeof value !== "object") return [];
  const nested = Object.values(value as Record<string, unknown>).find(Array.isArray);
  return Array.isArray(nested) ? (nested as ReadonlyArray<Readonly<Record<string, unknown>>>) : [];
};

const tagSchema = z.object({
  productId: z.string().min(1),
  tag: z.string().min(1),
  sortOrder: z.coerce.number(),
});

const attributeSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  sortOrder: z.coerce.number(),
});

export const ProductAttributesTagsHubPage: React.FC = () => (
  <div className="grid gap-4 md:grid-cols-2">
    <Link to="/dashboard/product-tags" className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700 transition hover:border-[#0071e3]/40 hover:text-[#0066cc]">
      <Tag size={20} className="mb-2 text-[#0071e3]" />
      Manage Product Tags
    </Link>
    <Link to="/dashboard/product-attributes" className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700 transition hover:border-[#0071e3]/40 hover:text-[#0066cc]">
      <SlidersHorizontal size={20} className="mb-2 text-[#0071e3]" />
      Manage Product Attributes
    </Link>
  </div>
);

type TagRow = Readonly<{ id: string; tag: string; productId: string }>;
type AttrRow = Readonly<{ id: string; name: string; value: string; productId: string }>;

export const ProductTagsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const q = catalogApi.productTags.hooks.useList({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const del = catalogApi.productTags.hooks.useSoftDelete();

  const rows: ReadonlyArray<TagRow> = React.useMemo(() =>
    toRows(q.data?.data).map((r) => ({
      id: String(r.id ?? crypto.randomUUID()),
      tag: String(r.tag ?? "—"),
      productId: String(r.productId ?? (r.product as Record<string, unknown> | undefined)?.id ?? "—"),
    })),
    [q.data]
  );

  const totalPages = q.data?.totalPages ?? 1;

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this tag?");
    if (!ok) return;
    await del.mutateAsync(id);
    toast.success("Tag deleted.");
  };

  const columns = [
    { key: "tag", label: "Tag", render: (r: TagRow) => <span className="font-medium text-gray-900">{r.tag}</span> },
    { key: "productId", label: "Product ID", render: (r: TagRow) => <span className="text-xs text-gray-500">{r.productId}</span> },
  ];

  return (
    <PageLayout
      title="Product Tags"
      subtitle="Keyword tags attached to products."
      onNew={() => navigate("/dashboard/product-tags/create")}
      newButtonLabel="New Tag"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search tag..."
    >
      <StatCardV2 label="Total Tags" value={q.data?.total ?? rows.length} icon={Tag} colorVariant="blue" />
      <DataTableV2
        columns={columns}
        data={rows}
        searchValue={state.search}
        onEdit={(r) => navigate(`/dashboard/product-tags/${r.id}/edit`)}
        onDelete={(r) => void handleDelete(r.id)}
        emptyMessage={q.isLoading ? "Loading tags..." : "No product tags found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};

export const ProductTagCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const create = catalogApi.productTags.hooks.useCreate();
  const [productId, setProductId] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  const submit = async () => {
    const parsed = validateOrToast(tagSchema, { productId, tag, sortOrder }, toast);
    if (!parsed) return;
    await create.mutateAsync(parsed);
    navigate("/dashboard/product-tags");
  };
  return (
    <PageLayout title="New Product Tag" subtitle="Add a keyword tag to a product.">
      <div className="grid max-w-lg gap-3">
        <input className={input} placeholder="productId" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input className={input} placeholder="tag" value={tag} onChange={(e) => setTag(e.target.value)} />
        <button className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066cc]" onClick={() => void submit()}>Create Tag</button>
      </div>
    </PageLayout>
  );
};

export const ProductTagEditPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const get = catalogApi.productTags.hooks.useGet(id);
  const update = catalogApi.productTags.hooks.useUpdate();
  const [productId, setProductId] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  React.useEffect(() => {
    const row = (get.data ?? {}) as Record<string, unknown>;
    if (!row.id) return;
    setProductId(String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? ""));
    setTag(String(row.tag ?? ""));
    setSortOrder(String(row.sortOrder ?? 0));
  }, [get.data]);
  const submit = async () => {
    if (!id) return;
    const parsed = validateOrToast(tagSchema, { productId, tag, sortOrder }, toast);
    if (!parsed) return;
    await update.mutateAsync({ id, dto: parsed });
    navigate("/dashboard/product-tags");
  };
  return (
    <PageLayout title="Edit Product Tag" subtitle="Update tag details.">
      <div className="grid max-w-lg gap-3">
        <input className={input} placeholder="productId" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input className={input} placeholder="tag" value={tag} onChange={(e) => setTag(e.target.value)} />
        <button className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066cc]" onClick={() => void submit()}>Update Tag</button>
      </div>
    </PageLayout>
  );
};

export const ProductAttributesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const q = catalogApi.productAttributes.hooks.useList({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const del = catalogApi.productAttributes.hooks.useSoftDelete();

  const rows: ReadonlyArray<AttrRow> = React.useMemo(() =>
    toRows(q.data?.data).map((r) => ({
      id: String(r.id ?? crypto.randomUUID()),
      name: String(r.name ?? "—"),
      value: String(r.value ?? "—"),
      productId: String(r.productId ?? (r.product as Record<string, unknown> | undefined)?.id ?? "—"),
    })),
    [q.data]
  );

  const totalPages = q.data?.totalPages ?? 1;

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this attribute?");
    if (!ok) return;
    await del.mutateAsync(id);
    toast.success("Attribute deleted.");
  };

  const columns = [
    {
      key: "attr",
      label: "Attribute",
      render: (r: AttrRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          <div className="text-xs text-gray-400">{r.value}</div>
        </div>
      ),
    },
    { key: "productId", label: "Product ID", render: (r: AttrRow) => <span className="text-xs text-gray-500">{r.productId}</span> },
  ];

  return (
    <PageLayout
      title="Product Attributes"
      subtitle="Custom attribute key-value pairs for products."
      onNew={() => navigate("/dashboard/product-attributes/create")}
      newButtonLabel="New Attribute"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search name, value..."
    >
      <StatCardV2 label="Total Attributes" value={q.data?.total ?? rows.length} icon={SlidersHorizontal} colorVariant="blue" />
      <DataTableV2
        columns={columns}
        data={rows}
        searchValue={state.search}
        onEdit={(r) => navigate(`/dashboard/product-attributes/${r.id}/edit`)}
        onDelete={(r) => void handleDelete(r.id)}
        emptyMessage={q.isLoading ? "Loading attributes..." : "No product attributes found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};

export const ProductAttributeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const create = catalogApi.productAttributes.hooks.useCreate();
  const [productId, setProductId] = React.useState("");
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  const submit = async () => {
    const parsed = validateOrToast(attributeSchema, { productId, name, value, sortOrder }, toast);
    if (!parsed) return;
    await create.mutateAsync(parsed);
    navigate("/dashboard/product-attributes");
  };
  return (
    <PageLayout title="New Product Attribute" subtitle="Add a custom attribute to a product.">
      <div className="grid max-w-lg gap-3">
        <input className={input} placeholder="productId" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input className={input} placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066cc]" onClick={() => void submit()}>Create Attribute</button>
      </div>
    </PageLayout>
  );
};

export const ProductAttributeEditPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const get = catalogApi.productAttributes.hooks.useGet(id);
  const update = catalogApi.productAttributes.hooks.useUpdate();
  const [productId, setProductId] = React.useState("");
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  React.useEffect(() => {
    const row = (get.data ?? {}) as Record<string, unknown>;
    if (!row.id) return;
    setProductId(String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? ""));
    setName(String(row.name ?? ""));
    setValue(String(row.value ?? ""));
    setSortOrder(String(row.sortOrder ?? 0));
  }, [get.data]);
  const submit = async () => {
    if (!id) return;
    const parsed = validateOrToast(attributeSchema, { productId, name, value, sortOrder }, toast);
    if (!parsed) return;
    await update.mutateAsync({ id, dto: parsed });
    navigate("/dashboard/product-attributes");
  };
  return (
    <PageLayout title="Edit Product Attribute" subtitle="Update attribute details.">
      <div className="grid max-w-lg gap-3">
        <input className={input} placeholder="productId" value={productId} onChange={(e) => setProductId(e.target.value)} />
        <input className={input} placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0066cc]" onClick={() => void submit()}>Update Attribute</button>
      </div>
    </PageLayout>
  );
};
