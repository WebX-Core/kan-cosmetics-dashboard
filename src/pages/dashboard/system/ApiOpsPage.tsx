import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { commerceApi } from "@/features/commerce";
import { engagementApi } from "@/features/engagement";
import { marketingApi } from "@/features/marketing";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";

const Box: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <section className="rounded border border-zinc-200 bg-white p-4">
    <h2 className="mb-3 text-base font-semibold">{title}</h2>
    <div className="grid gap-2">{children}</div>
  </section>
);

const idSchema = z.string().min(1);
const couponUsersSchema = z.object({
  couponId: z.string().min(1),
  customerIds: z.array(z.string().min(1)).min(1),
});
const adMatchSchema = z.object({
  season: z.string().optional(),
  targetType: z.string().optional(),
});

export const ApiOpsPage: React.FC = () => {
  const [orderId, setOrderId] = React.useState("");
  const [couponId, setCouponId] = React.useState("");
  const [campaignId, setCampaignId] = React.useState("");
  const [customerIds, setCustomerIds] = React.useState("");
  const [adSeason, setAdSeason] = React.useState("");
  const [adTargetType, setAdTargetType] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const salesAnalytics = useQuery({
    queryKey: ["ops", "sales-analytics"],
    queryFn: () => commerceApi.orders.salesAnalytics(),
  });

  const adMatch = useQuery({
    queryKey: ["ops", "ad-match", adSeason, adTargetType],
    queryFn: () => marketingApi.advertisementsMatch({ season: adSeason, targetType: adTargetType } as never),
    enabled: adSeason.trim().length > 0 || adTargetType.trim().length > 0,
  });

  const syncDelivery = useMutation({
    mutationFn: (id: string) => commerceApi.orders.syncDelivery(id),
    onSuccess: () => setMessage("Synced delivery status."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const syncBranches = useMutation({
    mutationFn: () => commerceApi.orders.syncBranches(),
    onSuccess: () => setMessage("Synced branches."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const pickupNotification = useMutation({
    mutationFn: (id: string) => commerceApi.orders.pickupNotification(id),
    onSuccess: () => setMessage("Pickup notification created."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const exportExcel = useMutation({
    mutationFn: () => engagementApi.inquiries.exportExcel(),
    onSuccess: () => setMessage("Inquiry export (excel) requested."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const exportPdf = useMutation({
    mutationFn: () => engagementApi.inquiries.exportPdf(),
    onSuccess: () => setMessage("Inquiry export (pdf) requested."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const issueUsers = useMutation({
    mutationFn: (payload: { couponId: string; customerIds: ReadonlyArray<string> }) => commerceApi.coupons.issueUsers(payload),
    onSuccess: () => setMessage("Coupon issued to users."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const unassignUsers = useMutation({
    mutationFn: (payload: { couponId: string; customerIds: ReadonlyArray<string> }) => commerceApi.coupons.unassignUsers(payload),
    onSuccess: () => setMessage("Coupon unassigned from users."),
    onError: (e) => setMessage(parseApiError(e).message),
  });
  const couponInsights = useQuery({
    queryKey: ["ops", "coupon-insights", couponId],
    queryFn: () => commerceApi.coupons.insights(couponId),
    enabled: couponId.trim().length > 0,
  });

  const parsedCustomerIds = customerIds
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <PageLayout title="API Ops" subtitle="Developer operations and API test utilities.">
      {message ? <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">{message}</div> : null}
      <div className="space-y-4">

      <Box title="Order Operations">
        <button className="rounded border px-3 py-2 text-sm" onClick={() => salesAnalytics.refetch()}>Load Sales Analytics</button>
        <textarea className="min-h-[100px] rounded border p-2 text-xs font-mono" value={JSON.stringify(salesAnalytics.data ?? {}, null, 2)} readOnly />
        <input className="rounded border px-3 py-2 text-sm" placeholder="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(idSchema, orderId, { error: (m) => setMessage(m) }, "Invalid order id"); if (!parsed) return; syncDelivery.mutate(parsed); }}>Sync Delivery</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => syncBranches.mutate()}>Sync Branches</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(idSchema, orderId, { error: (m) => setMessage(m) }, "Invalid order id"); if (!parsed) return; pickupNotification.mutate(parsed); }}>Create Pickup Notification</button>
        </div>
      </Box>

      <Box title="Inquiry Export">
        <div className="flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={() => exportExcel.mutate()}>Export Excel</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => exportPdf.mutate()}>Export PDF</button>
        </div>
      </Box>

      <Box title="Advertisement Match">
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded border px-3 py-2 text-sm" placeholder="season" value={adSeason} onChange={(e) => setAdSeason(e.target.value)} />
          <input className="rounded border px-3 py-2 text-sm" placeholder="targetType" value={adTargetType} onChange={(e) => setAdTargetType(e.target.value)} />
        </div>
        <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(adMatchSchema, { season: adSeason || undefined, targetType: adTargetType || undefined }, { error: (m) => setMessage(m) }, "Invalid ad match params"); if (!parsed) return; void adMatch.refetch(); }}>Match Ads</button>
        <textarea className="min-h-[100px] rounded border p-2 text-xs font-mono" value={JSON.stringify(adMatch.data ?? {}, null, 2)} readOnly />
      </Box>

      <Box title="Coupon Operations">
        <input className="rounded border px-3 py-2 text-sm" placeholder="couponId" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
        <input className="rounded border px-3 py-2 text-sm" placeholder="customerIds (comma-separated)" value={customerIds} onChange={(e) => setCustomerIds(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(couponUsersSchema, { couponId: campaignId, customerIds: parsedCustomerIds }, { error: (m) => setMessage(m) }, "Invalid coupon issue payload"); if (!parsed) return; issueUsers.mutate(parsed); }}>Issue Users</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(couponUsersSchema, { couponId: campaignId, customerIds: parsedCustomerIds }, { error: (m) => setMessage(m) }, "Invalid coupon unassign payload"); if (!parsed) return; unassignUsers.mutate(parsed); }}>Unassign Users</button>
        </div>
        <input className="rounded border px-3 py-2 text-sm" placeholder="couponId for insights" value={couponId} onChange={(e) => setCouponId(e.target.value)} />
        <button className="rounded border px-3 py-2 text-sm" onClick={() => { const parsed = validateOrToast(idSchema, couponId, { error: (m) => setMessage(m) }, "Invalid coupon id"); if (!parsed) return; void couponInsights.refetch(); }}>Load Coupon Insights</button>
        <textarea className="min-h-[100px] rounded border p-2 text-xs font-mono" value={JSON.stringify(couponInsights.data ?? {}, null, 2)} readOnly />
      </Box>
      </div>
    </PageLayout>
  );
};
