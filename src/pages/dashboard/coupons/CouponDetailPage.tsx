import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Tag, Users, UserMinus, BarChart2, Edit } from "lucide-react";
import { ModernFormLayout, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { commerceApi } from "@/features/commerce";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

export const CouponDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const couponQuery = commerceApi.coupons.crud.hooks.useGet(id, Boolean(id));

  const insightsQuery = useQuery({
    queryKey: ["coupon", "insights", id],
    queryFn: () => commerceApi.coupons.insights(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const [issueIds, setIssueIds] = React.useState("");
  const [unassignIds, setUnassignIds] = React.useState("");
  const [issuing, setIssuing] = React.useState(false);
  const [unassigning, setUnassigning] = React.useState(false);

  const coupon = couponQuery.data as Record<string, unknown> | undefined;
  const insights = insightsQuery.data as Record<string, unknown> | undefined;

  const parseIds = (raw: string): string[] =>
    raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

  const handleIssue = async () => {
    const customerIds = parseIds(issueIds);
    if (!customerIds.length) { toast.error("Enter at least one customer ID"); return; }
    setIssuing(true);
    try {
      await commerceApi.coupons.issueUsers({ couponId: id!, customerIds });
      toast.success(`Coupon issued to ${customerIds.length} customer(s)`);
      setIssueIds("");
      void insightsQuery.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIssuing(false);
    }
  };

  const handleUnassign = async () => {
    const customerIds = parseIds(unassignIds);
    if (!customerIds.length) { toast.error("Enter at least one customer ID"); return; }
    setUnassigning(true);
    try {
      await commerceApi.coupons.unassignUsers({ couponId: id!, customerIds });
      toast.success(`Coupon removed from ${customerIds.length} customer(s)`);
      setUnassignIds("");
      void insightsQuery.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setUnassigning(false);
    }
  };

  if (couponQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading coupon...
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        Coupon not found.
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={text(coupon.code, "Coupon")}
      subtitle={text(coupon.title)}
      onBack={() => navigate("/dashboard/coupons")}
    >
      {/* Edit button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/dashboard/coupons/${id}/edit`)}
          className="flex items-center gap-2 rounded-full bg-[#0071e3] px-5 py-2 text-sm font-medium text-white hover:bg-[#0066cc]"
        >
          <Edit size={14} />
          Edit Coupon
        </button>
      </div>

      {/* Basic info */}
      <FormSection title="Coupon Info">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Discount</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {text(coupon.discountType) === "PERCENTAGE"
                ? `${num(coupon.discountValue)}%`
                : `Rs ${num(coupon.discountValue)}`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Validity</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {text(coupon.startsAt, "—").slice(0, 10)} → {text(coupon.expiresAt, "—").slice(0, 10)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <div className="mt-1"><StatusBadge status={text(coupon.status, "Inactive")} /></div>
          </div>
        </div>
        {coupon.description && (
          <p className="text-sm text-gray-600">{text(coupon.description)}</p>
        )}
      </FormSection>

      {/* Insights */}
      <FormSection title="Insights">
        {insightsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Loading insights...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardV2
              label="Total Usage"
              value={num(insights?.totalUsage ?? coupon.usageCount)}
              icon={BarChart2}
              colorVariant="blue"
            />
            <StatCardV2
              label="Usage Limit"
              value={num(insights?.usageLimit ?? coupon.usageLimit) || "Unlimited"}
              icon={Tag}
              colorVariant="amber"
            />
            <StatCardV2
              label="Unique Users"
              value={num(insights?.uniqueUsers ?? insights?.userCount)}
              icon={Users}
              colorVariant="emerald"
            />
            <StatCardV2
              label="Total Discount Given"
              value={`Rs ${num(insights?.totalDiscountGiven ?? insights?.totalSavings).toFixed(0)}`}
              icon={BarChart2}
              colorVariant="blue"
            />
          </div>
        )}
      </FormSection>

      {/* Issue to users */}
      <FormSection title="Issue to Customers">
        <p className="text-sm text-gray-500">Paste customer IDs (one per line or comma-separated) to grant this coupon.</p>
        <textarea
          value={issueIds}
          onChange={(e) => setIssueIds(e.target.value)}
          placeholder={"customer-id-1\ncustomer-id-2"}
          rows={4}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
        />
        <button
          onClick={() => void handleIssue()}
          disabled={issuing}
          className="flex items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#0066cc] disabled:opacity-50"
        >
          {issuing ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
          Issue Coupon
        </button>
      </FormSection>

      {/* Unassign from users */}
      <FormSection title="Remove from Customers">
        <p className="text-sm text-gray-500">Paste customer IDs to revoke this coupon.</p>
        <textarea
          value={unassignIds}
          onChange={(e) => setUnassignIds(e.target.value)}
          placeholder={"customer-id-1\ncustomer-id-2"}
          rows={4}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-xs text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
        />
        <button
          onClick={() => void handleUnassign()}
          disabled={unassigning}
          className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {unassigning ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
          Remove Coupon
        </button>
      </FormSection>
    </ModernFormLayout>
  );
};
