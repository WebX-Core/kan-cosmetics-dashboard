import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";

const input = "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const toRows = (value: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> => {
  if (Array.isArray(value)) return value as ReadonlyArray<Readonly<Record<string, unknown>>>;
  if (!value || typeof value !== "object") return [];
  const nested = Object.values(value as Record<string, unknown>).find(Array.isArray);
  return Array.isArray(nested) ? (nested as ReadonlyArray<Readonly<Record<string, unknown>>>) : [];
};

const readQueryParam = (searchParams: URLSearchParams, key: string): string =>
  searchParams.get(key)?.trim() ?? "";

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
    <Link to="/dashboard/product-tags" className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700 transition hover:border-[var(--primary)]/40 hover:text-[var(--primary-hover)]">
      <Tag size={20} className="mb-2 text-[var(--primary)]" />
      Manage Product Tags
    </Link>
    <Link to="/dashboard/product-attributes" className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700 transition hover:border-[var(--primary)]/40 hover:text-[var(--primary-hover)]">
      <SlidersHorizontal size={20} className="mb-2 text-[var(--primary)]" />
      Manage Product Attributes
    </Link>
  </div>
);

type TagRow = Readonly<{ id: string; tag: string; productId: string }>;
type AttrRow = Readonly<{ id: string; name: string; value: string; productId: string }>;

export const ProductTagsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const productId = readQueryParam(searchParams, "productId");
  const productName = readQueryParam(searchParams, "productName");

  const q = catalogApi.productTags.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
    productId: productId || undefined,
  });
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
  const hasTag = Boolean(productId) && rows.length > 0;
  const pageTitle = productName ? `${productName} Tags` : "Product Tags";
  const pageSubtitle = productName
    ? hasTag
      ? "Each product can only have one tag."
      : "Manage tags attached to this product."
    : "Keyword tags attached to products.";
  const createPath = productId
    ? `/dashboard/product-tags/create?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName || "")}`
    : "/dashboard/product-tags/create";
  const editPath = (id: string) =>
    productId
      ? `/dashboard/product-tags/${id}/edit?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName || "")}`
      : `/dashboard/product-tags/${id}/edit`;

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this tag?");
    if (!ok) return;
    await del.mutateAsync(id);
    toast.success("Tag deleted.");
  };

  const columns = [
    { key: "tag", label: "Tag", sortValue: (r: TagRow) => r.tag, render: (r: TagRow) => <span className="font-medium text-gray-900">{r.tag}</span> },
  ];

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      onBack={() => navigate("/dashboard/products")}
      onNew={hasTag ? undefined : () => navigate(createPath)}
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
        onEdit={(r) => navigate(editPath(r.id))}
        onDelete={(r) => void handleDelete(r.id)}
        emptyMessage={q.isLoading ? "Loading tags..." : "No product tags found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(limit) => setState((prev) => ({ ...prev, page: 1, limit }))}
      />
    </PageLayout>
  );
};

export const ProductTagCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const create = catalogApi.productTags.hooks.useCreate();
  const scopedProductId = readQueryParam(searchParams, "productId");
  const scopedProductName = readQueryParam(searchParams, "productName");
  const existingTags = catalogApi.productTags.hooks.useList(
    { productId: scopedProductId || undefined, limit: 1 },
    Boolean(scopedProductId),
  );
  const hasExistingTag = Boolean(scopedProductId) && toRows(existingTags.data?.data).length > 0;
  const [tag, setTag] = React.useState("");
  const [sortOrder] = React.useState("0");
  const submit = async () => {
    if (hasExistingTag) {
      toast.error("This product already has a tag. Delete it before adding a new one.");
      return;
    }
    const parsed = validateOrToast(tagSchema, { productId: scopedProductId, tag, sortOrder }, toast);
    if (!parsed) return;
    await create.mutateAsync(parsed);
    navigate(
      scopedProductId
        ? `/dashboard/product-tags?productId=${encodeURIComponent(scopedProductId)}&productName=${encodeURIComponent(scopedProductName || "")}`
        : "/dashboard/product-tags",
    );
  };
  return (
    <ModernFormLayout title="New Product Tag" subtitle={scopedProductName ? `Add a tag to ${scopedProductName}.` : "Add a tag to a product."} onBack={() => navigate(-1)}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-[21px]">
        {hasExistingTag && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This product already has a tag. Each product can only have one — delete the existing tag first.
          </p>
        )}
        <FormSection title="Tag Details">
          <FormField label="Tag name" required>
            <input autoFocus disabled={hasExistingTag} className={input} placeholder="e.g. Best seller" value={tag} onChange={(e) => setTag(e.target.value)} />
          </FormField>
        </FormSection>
        <FormActions submitLabel="Create Tag" isSubmitting={create.isPending} onCancel={() => navigate(-1)} />
      </form>
    </ModernFormLayout>
  );
};

export const ProductTagEditPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const scopedProductId = readQueryParam(searchParams, "productId");
  const scopedProductName = readQueryParam(searchParams, "productName");
  const get = catalogApi.productTags.hooks.useGet(id);
  const update = catalogApi.productTags.hooks.useUpdate();
  const [productId, setProductId] = React.useState(scopedProductId);
  const [tag, setTag] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  React.useEffect(() => {
    const row = (get.data ?? {}) as Record<string, unknown>;
    if (!row.id) return;
    setProductId(String(row.productId ?? (row.product as Record<string, unknown> | undefined)?.id ?? ""));
    setTag(String(row.tag ?? ""));
    setSortOrder(String(row.sortOrder ?? 0));
  }, [get.data]);
  React.useEffect(() => {
    if (scopedProductId) setProductId(scopedProductId);
  }, [scopedProductId]);
  const submit = async () => {
    if (!id) return;
    const parsed = validateOrToast(tagSchema, { productId, tag, sortOrder }, toast);
    if (!parsed) return;
    await update.mutateAsync({ id, dto: parsed });
    navigate(
      scopedProductId
        ? `/dashboard/product-tags?productId=${encodeURIComponent(scopedProductId)}&productName=${encodeURIComponent(scopedProductName || "")}`
        : "/dashboard/product-tags",
    );
  };
  return (
    <ModernFormLayout title="Edit Product Tag" subtitle={scopedProductName ? `Update the tag for ${scopedProductName}.` : "Update tag details."} onBack={() => navigate(-1)}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-[21px]">
        <FormSection title="Tag Details">
          <FormField label="Tag name" required>
            <input autoFocus className={input} placeholder="e.g. Best seller" value={tag} onChange={(e) => setTag(e.target.value)} />
          </FormField>
        </FormSection>
        <FormActions submitLabel="Update Tag" isSubmitting={update.isPending || get.isLoading} onCancel={() => navigate(-1)} />
      </form>
    </ModernFormLayout>
  );
};

export const ProductAttributesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const productId = readQueryParam(searchParams, "productId");
  const productName = readQueryParam(searchParams, "productName");

  const q = catalogApi.productAttributes.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
    productId: productId || undefined,
  });
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
  const pageTitle = productName ? `${productName} Attributes` : "Product Attributes";
  const pageSubtitle = productName
    ? "Manage attributes attached to this product."
    : "Custom attribute key-value pairs for products.";
  const createPath = productId
    ? `/dashboard/product-attributes/create?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName || "")}`
    : "/dashboard/product-attributes/create";
  const editPath = (id: string) =>
    productId
      ? `/dashboard/product-attributes/${id}/edit?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(productName || "")}`
      : `/dashboard/product-attributes/${id}/edit`;

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
      sortValue: (r: AttrRow) => r.name,
      render: (r: AttrRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.name}</div>
          <div className="text-xs text-gray-400">{r.value}</div>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      onBack={() => navigate("/dashboard/products")}
      onNew={() => navigate(createPath)}
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
        onEdit={(r) => navigate(editPath(r.id))}
        onDelete={(r) => void handleDelete(r.id)}
        emptyMessage={q.isLoading ? "Loading attributes..." : "No product attributes found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(limit) => setState((prev) => ({ ...prev, page: 1, limit }))}
      />
    </PageLayout>
  );
};

export const ProductAttributeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const scopedProductId = readQueryParam(searchParams, "productId");
  const scopedProductName = readQueryParam(searchParams, "productName");
  const create = catalogApi.productAttributes.hooks.useCreate();
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [sortOrder] = React.useState("0");
  const submit = async () => {
    const parsed = validateOrToast(attributeSchema, { productId: scopedProductId, name, value, sortOrder }, toast);
    if (!parsed) return;
    await create.mutateAsync(parsed);
    navigate(
      scopedProductId
        ? `/dashboard/product-attributes?productId=${encodeURIComponent(scopedProductId)}&productName=${encodeURIComponent(scopedProductName || "")}`
        : "/dashboard/product-attributes",
    );
  };
  return (
    <ModernFormLayout title="New Product Attribute" subtitle={scopedProductName ? `Add an attribute to ${scopedProductName}.` : "Add an attribute to a product."} onBack={() => navigate(-1)}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-[21px]">
        <FormSection title="Attribute Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Attribute name" required>
              <input autoFocus className={input} placeholder="e.g. Skin type" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Attribute value" required>
              <input className={input} placeholder="e.g. All skin types" value={value} onChange={(e) => setValue(e.target.value)} />
            </FormField>
          </div>
        </FormSection>
        <FormActions submitLabel="Create Attribute" isSubmitting={create.isPending} onCancel={() => navigate(-1)} />
      </form>
    </ModernFormLayout>
  );
};

export const ProductAttributeEditPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const scopedProductId = readQueryParam(searchParams, "productId");
  const scopedProductName = readQueryParam(searchParams, "productName");
  const get = catalogApi.productAttributes.hooks.useGet(id);
  const update = catalogApi.productAttributes.hooks.useUpdate();
  const [productId, setProductId] = React.useState(scopedProductId);
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
  React.useEffect(() => {
    if (scopedProductId) setProductId(scopedProductId);
  }, [scopedProductId]);
  const submit = async () => {
    if (!id) return;
    const parsed = validateOrToast(attributeSchema, { productId, name, value, sortOrder }, toast);
    if (!parsed) return;
    await update.mutateAsync({ id, dto: parsed });
    navigate(
      scopedProductId
        ? `/dashboard/product-attributes?productId=${encodeURIComponent(scopedProductId)}&productName=${encodeURIComponent(scopedProductName || "")}`
        : "/dashboard/product-attributes",
    );
  };
  return (
    <ModernFormLayout title="Edit Product Attribute" subtitle={scopedProductName ? `Update the attribute for ${scopedProductName}.` : "Update attribute details."} onBack={() => navigate(-1)}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-[21px]">
        <FormSection title="Attribute Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            <FormField label="Attribute name" required>
              <input autoFocus className={input} placeholder="e.g. Skin type" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Attribute value" required>
              <input className={input} placeholder="e.g. All skin types" value={value} onChange={(e) => setValue(e.target.value)} />
            </FormField>
          </div>
        </FormSection>
        <FormActions submitLabel="Update Attribute" isSubmitting={update.isPending || get.isLoading} onCancel={() => navigate(-1)} />
      </form>
    </ModernFormLayout>
  );
};
