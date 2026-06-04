import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Eye, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { engagementApi } from "@/features/engagement";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type ReviewRow = Readonly<{
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  comment: string;
  rating: number;
  image: string;
  isPublished: boolean;
  isSite: boolean;
  createdAt: string;
}>;

const toRows = (payload: unknown): ReadonlyArray<ReviewRow> => {
  const p = payload as Record<string, unknown> | undefined;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(p?.reviews)
    ? (p.reviews as unknown[])
    : ((p?.data) as unknown[] | undefined) ?? [];
  return (items as unknown[]).map((entry) => {
    const r = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    return {
      id: text(r.id, crypto.randomUUID()),
      reviewerName: text(r.reviewerName ?? r.fullname, "Anonymous"),
      reviewerEmail: text(r.reviewerEmail ?? r.email, "—"),
      comment: text(r.comment ?? r.message, ""),
      rating: num(r.rating),
      image: text(r.image ?? r.imageUrl, ""),
      isPublished: Boolean(r.isPublished),
      isSite: Boolean(r.isSite),
      createdAt: text(r.createdAt, ""),
    };
  });
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={12} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
    ))}
  </div>
);

const Flag: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
    {active ? <CheckCircle size={10} /> : <XCircle size={10} />} {label}
  </span>
);


export const ProductReviewsPage: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("name") ?? "Product";
  const toast = useToast();
  const qc = useQueryClient();

  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(new Set());

  const query = useQuery({
    queryKey: ["reviews", "product", productId],
    queryFn: () => engagementApi.reviews.byProduct(productId!),
    enabled: Boolean(productId),
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reviews", "product", productId] });

  const bulkUpdate = async (ids: Set<string>, patch: Record<string, unknown>) => {
    await Promise.all([...ids].map((id) => engagementApi.reviews.crud.service.update(id, patch as never)));
    void invalidate();
    toast.success(`${ids.size} review${ids.size > 1 ? "s" : ""} updated.`);
  };

  const bulkDelete = async (ids: Set<string>, clear: () => void) => {
    await Promise.all([...ids].map((id) => engagementApi.reviews.crud.service.softDelete(id)));
    void invalidate();
    clear();
    toast.success(`${ids.size} review${ids.size > 1 ? "s" : ""} deleted.`);
  };

  const stats = React.useMemo(() => ({
    total: rows.length,
    published: rows.filter((r) => r.isPublished).length,
    unpublished: rows.filter((r) => !r.isPublished).length,
    avg: rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "0.0",
  }), [rows]);

  const columns = [
    {
      key: "reviewer",
      label: "Reviewer",
      render: (r: ReviewRow) => (
        <div>
          <div className="font-medium text-gray-900">{r.reviewerName}</div>
          <div className="text-xs text-gray-400">{r.reviewerEmail}</div>
        </div>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      render: (r: ReviewRow) => <Stars rating={r.rating} />,
    },
    {
      key: "comment",
      label: "Comment",
      render: (r: ReviewRow) => (
        <span className="line-clamp-1 max-w-xs text-sm text-gray-600">{r.comment || "—"}</span>
      ),
    },
    {
      key: "flags",
      label: "Flags",
      render: (r: ReviewRow) => (
        <div className="flex items-center gap-1.5">
          <Flag active={r.isPublished} label="Published" />
          {r.isSite && <Flag active label="Site" />}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (r: ReviewRow) => <span className="text-xs text-gray-500">{fmt(r.createdAt)}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (r: ReviewRow) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/products/${productId}/reviews/${r.id}?name=${encodeURIComponent(productName)}`); }}
            className="flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-[12px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
          >
            <Eye size={12} strokeWidth={2} /> View
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title={`Reviews — ${productName}`}
      subtitle={`All customer reviews for this product.`}
      onBack={() => navigate("/dashboard/products")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCardV2 label="Total Reviews" value={stats.total} icon={Star} colorVariant="blue" />
        <StatCardV2 label="Published" value={stats.published} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Unpublished" value={stats.unpublished} icon={XCircle} colorVariant="amber" />
        <StatCardV2 label="Avg Rating" value={stats.avg} icon={Star} colorVariant="blue" />
      </div>

      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={query.isLoading ? "Loading reviews…" : "No reviews yet for this product."}
        showPagination={false}
        rowId={(r) => r.id}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids)}
        bulkActions={(ids, clear) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void bulkUpdate(ids, { isPublished: true }).then(clear)}
              className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle size={12} /> Publish ({ids.size})
            </button>
            <button
              type="button"
              onClick={() => void bulkUpdate(ids, { isPublished: false }).then(clear)}
              className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <XCircle size={12} /> Unpublish ({ids.size})
            </button>
            <button
              type="button"
              onClick={() => void bulkDelete(ids, clear)}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete ({ids.size})
            </button>
          </div>
        )}
      />

    </PageLayout>
  );
};
