import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, Star, User, Calendar } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { engagementApi } from "@/features/engagement";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { Tooltip } from "@/shared/components/ui/Tooltip";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type ReviewRow = Readonly<{
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  title: string;
  comment: string;
  rating: number;
  image: string;
  isPublished: boolean;
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
      title: text(r.title, ""),
      comment: text(r.comment ?? r.message, ""),
      rating: num(r.rating),
      image: text(r.image ?? r.imageUrl, ""),
      isPublished: Boolean(r.isPublished),
      createdAt: text(r.createdAt, ""),
    };
  });
};

const DataCell: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <div className={`rounded-lg bg-[#f5f5f7] p-3${wide ? " sm:col-span-2" : ""}`}>
    <p className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">{label}</p>
    <div className="mt-1 text-[14px] font-medium text-[#1d1d1f]">{children}</div>
  </div>
);

export const ProductReviewDetailPage: React.FC = () => {
  const { id: productId, reviewId } = useParams<{ id: string; reviewId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("name") ?? "Product";
  const toast = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["reviews", "product", productId],
    queryFn: () => engagementApi.reviews.byProduct(productId!),
    enabled: Boolean(productId),
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const review = rows.find((r) => r.id === reviewId) ?? null;

  const [isPublished, setIsPublished] = React.useState(false);
  React.useEffect(() => {
    if (review) setIsPublished(review.isPublished);
  }, [review]);

  const changed = review ? isPublished !== review.isPublished : false;

  const mutation = useMutation({
    mutationFn: () => {
      if (!review) return Promise.reject(new Error("Review not loaded"));
      return engagementApi.reviews.crud.service.update(reviewId!, {
        reviewerName: review.reviewerName,
        reviewerEmail: review.reviewerEmail,
        title: review.title || undefined,
        comment: review.comment,
        rating: review.rating,
        isPublished,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["reviews", "product", productId] });
      toast.success("Review updated.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const backPath = `/dashboard/products/${productId}/reviews?name=${encodeURIComponent(productName)}`;

  if (query.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!review) {
    return (
      <PageLayout title="Review Not Found" subtitle="This review no longer exists." onBack={() => navigate(backPath)}>
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-8 text-sm text-[#6e6e73]">
          No review was found for this record.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={review.reviewerName}
      subtitle={`Review for ${productName}`}
      onBack={() => navigate(backPath)}
      actions={
        changed ? (
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-40"
          >
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        ) : undefined
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCardV2
          label="Rating"
          value={`${review.rating} / 5`}
          icon={Star}
          colorVariant="amber"
          compact
        />
        <StatCardV2
          label="Submitted"
          value={fmt(review.createdAt)}
          icon={Calendar}
          colorVariant="blue"
          compact
        />
        <StatCardV2
          label="Status"
          value={review.isPublished ? "Published" : "Unpublished"}
          icon={Info}
          colorVariant={review.isPublished ? "emerald" : "amber"}
          compact
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Reviewer + Comment */}
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <User size={16} className="text-[#6e6e73]" />
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Review Details</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DataCell label="Reviewer">{review.reviewerName}</DataCell>
            <DataCell label="Email">{review.reviewerEmail || "—"}</DataCell>
            <DataCell label="Rating">
              <span className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={13} className={i <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                ))}
                <span className="ml-1 text-[13px] text-[#86868b]">{review.rating} / 5</span>
              </span>
            </DataCell>
            <DataCell label="Submitted">{fmt(review.createdAt)}</DataCell>
            {review.comment && (
              <DataCell label="Comment" wide>{review.comment}</DataCell>
            )}
          </div>
        </section>

        {/* Sidebar: image + publish toggle */}
        <div className="flex flex-col gap-4">
          {review.image && (
            <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Info size={16} className="text-[#6e6e73]" />
                <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Photo</h2>
              </div>
              <img
                src={review.image}
                alt={review.reviewerName}
                className="h-32 w-32 rounded-xl object-cover border border-[#e5e5ea]"
              />
            </section>
          )}

          <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Info size={16} className="text-[#6e6e73]" />
              <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Visibility</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isPublished}
                onClick={() => setIsPublished((p) => !p)}
                className={`relative h-6 w-11 rounded-full transition-colors ${isPublished ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-[#1d1d1f]">Published</span>
                <Tooltip text="Visible to customers on the product page">
                  <Info size={12} className="cursor-help text-[#86868b]" />
                </Tooltip>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};
