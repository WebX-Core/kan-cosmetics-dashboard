import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);
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

const ReviewModal: React.FC<{
  review: ReviewRow;
  onClose: () => void;
  onSaved: () => void;
}> = ({ review, onClose, onSaved }) => {
  const toast = useToast();
  const [isPublished, setIsPublished] = React.useState(review.isPublished);
  const [isSite, setIsSite] = React.useState(review.isSite);

  const mutation = useMutation({
    mutationFn: () =>
      engagementApi.reviews.crud.update(review.id, { isPublished, isSite } as Record<string, unknown>),
    onSuccess: () => {
      toast.success("Review updated.");
      onSaved();
      onClose();
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const changed = isPublished !== review.isPublished || isSite !== review.isSite;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] font-semibold text-[#1d1d1f]">Review Details</p>

        <div className="flex items-center gap-3">
          {review.image && (
            <img src={review.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-[#e5e5ea] shrink-0" />
          )}
          <div>
            <p className="font-medium text-[#1d1d1f]">{review.reviewerName}</p>
            <p className="text-xs text-[#86868b]">{review.reviewerEmail}</p>
            <Stars rating={review.rating} />
          </div>
        </div>

        {review.comment && (
          <div className="rounded-xl bg-[#f5f5f7] px-4 py-3 text-sm text-[#1d1d1f]">
            {review.comment}
          </div>
        )}

        <p className="text-xs text-[#86868b]">Submitted {fmt(review.createdAt)}</p>

        <div className="space-y-3 border-t border-[#f5f5f7] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">Flags</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1d1d1f]">Published</p>
              <p className="text-xs text-[#86868b]">Visible to customers on the product page</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublished}
              onClick={() => setIsPublished((p) => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isPublished ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1d1d1f]">Site Review</p>
              <p className="text-xs text-[#86868b]">Shown in the site-wide reviews section</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSite}
              onClick={() => setIsSite((p) => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isSite ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isSite ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#f5f5f7] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center rounded-full border border-[#d2d2d7] px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!changed || mutation.isPending}
            className="flex h-9 items-center rounded-full bg-[#0071e3] px-4 text-sm font-medium text-white hover:bg-[#0066cc] disabled:opacity-40"
          >
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductReviewsPage: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("name") ?? "Product";
  const toast = useToast();
  const qc = useQueryClient();

  const [selected, setSelected] = React.useState<ReviewRow | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(new Set());

  const query = useQuery({
    queryKey: ["reviews", "product", productId],
    queryFn: () => engagementApi.reviews.byProduct(productId!),
    enabled: Boolean(productId),
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reviews", "product", productId] });

  const bulkUpdate = async (ids: Set<string>, patch: Record<string, unknown>) => {
    await Promise.all([...ids].map((id) => engagementApi.reviews.crud.update(id, patch as never)));
    void invalidate();
    toast.success(`${ids.size} review${ids.size > 1 ? "s" : ""} updated.`);
  };

  const bulkDelete = async (ids: Set<string>, clear: () => void) => {
    await Promise.all([...ids].map((id) => engagementApi.reviews.crud.softDelete(id)));
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
            onClick={(e) => { e.stopPropagation(); setSelected(r); }}
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
        onRowClick={(r) => setSelected(r as ReviewRow)}
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

      {selected && (
        <ReviewModal
          review={selected}
          onClose={() => setSelected(null)}
          onSaved={() => void qc.invalidateQueries({ queryKey: ["reviews", "product", productId] })}
        />
      )}
    </PageLayout>
  );
};
