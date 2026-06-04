import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bell, CheckCircle2, Clock3, Loader2, ShieldAlert, WifiOff } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { marketingApi } from "@/features/marketing";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const read = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
};

const ownerLabel = (row: Record<string, unknown>): string => {
  const customer = row.customer as Record<string, unknown> | undefined;
  const user = row.user as Record<string, unknown> | undefined;
  const customerId = read(customer?.id ?? row.customerId, "");
  const userId = read(user?.id ?? row.userId, "");
  if (customerId) return `Customer ${customerId}`;
  if (userId) return `User ${userId}`;
  if (read(row.sessionId, "")) return `Session ${read(row.sessionId)}`;
  return "—";
};

export const WebPushSubscriptionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const query = marketingApi.webPushSubscriptions.hooks.useGet(id, isEdit);
  const updateMutation = marketingApi.webPushSubscriptions.hooks.useUpdate();
  const softDeleteMutation = marketingApi.webPushSubscriptions.hooks.useSoftDelete();
  const [isActive, setIsActive] = React.useState(true);
  const [failureReason, setFailureReason] = React.useState("");

  const subscription = (query.data ?? null) as Record<string, unknown> | null;

  React.useEffect(() => {
    if (!subscription) return;
    setIsActive(subscription.isActive !== false);
    setFailureReason(read(subscription.failureReason, ""));
  }, [subscription]);

  const changed = Boolean(subscription) && (isActive !== (subscription?.isActive !== false) || failureReason !== read(subscription?.failureReason, ""));

  const onSave = async () => {
    if (!id || !subscription) return;
    try {
      await updateMutation.mutateAsync({
        id,
        dto: {
          customerId: read((subscription.customer as Record<string, unknown> | undefined)?.id ?? subscription.customerId, "") || undefined,
          userId: read((subscription.user as Record<string, unknown> | undefined)?.id ?? subscription.userId, "") || undefined,
          sessionId: read(subscription.sessionId, "") || undefined,
          endpoint: read(subscription.endpoint),
          p256dh: read(subscription.p256dh),
          authKey: read(subscription.authKey),
          contentEncoding: read(subscription.contentEncoding, "aesgcm") || undefined,
          isActive,
          lastSeenAt: read(subscription.lastSeenAt, "") || undefined,
          lastSuccessAt: read(subscription.lastSuccessAt, "") || undefined,
          lastFailureAt: read(subscription.lastFailureAt, "") || undefined,
          failureReason: failureReason.trim() || undefined,
          userAgent: read(subscription.userAgent, "") || undefined,
          deviceType: read(subscription.deviceType, "") || undefined,
          platform: read(subscription.platform, "") || undefined,
          browser: read(subscription.browser, "") || undefined,
          locale: read(subscription.locale, "") || undefined,
          timezone: read(subscription.timezone, "") || undefined,
          ip: read(subscription.ip, "") || undefined,
          metadata: (subscription.metadata as Record<string, unknown> | null | undefined) ?? undefined,
        },
      });
      toast.success("Subscription updated.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    try {
      await softDeleteMutation.mutateAsync(id);
      toast.success("Subscription deleted.");
      navigate("/dashboard/marketing/web-push/subscriptions", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 size={18} className="animate-spin text-[#0071e3]" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <PageLayout title="Subscription Not Found" subtitle="The push subscription could not be loaded." onBack={() => navigate("/dashboard/marketing/web-push/subscriptions")}>
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-6 text-sm text-[#6e6e73]">
          No subscription was found for this record.
        </div>
      </PageLayout>
    );
  }

  const active = isActive;

  return (
    <PageLayout
      title="Push Subscription"
      subtitle={ownerLabel(subscription)}
      onBack={() => navigate("/dashboard/marketing/web-push/subscriptions")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-[34px] items-center gap-2 rounded-full border border-red-200 bg-red-50 px-[18px] text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!changed || updateMutation.isPending}
            className="flex h-[34px] items-center gap-2 rounded-full bg-[#0071e3] px-[18px] text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {changed ? "Save Changes" : "Saved"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Status" value={active ? "Active" : "Inactive"} icon={active ? CheckCircle2 : WifiOff} colorVariant={active ? "emerald" : "gray"} />
        <StatCardV2 label="Browser" value={read(subscription.browser, "—")} icon={Bell} colorVariant="blue" />
        <StatCardV2 label="Platform" value={read(subscription.platform, "—")} icon={ShieldAlert} colorVariant="amber" />
        <StatCardV2 label="Last Seen" value={fmt(read(subscription.lastSeenAt, ""))} icon={Clock3} colorVariant="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5 lg:col-span-2">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Connection Details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Endpoint" value={read(subscription.endpoint, "—")} mono />
            <Field label="Owner" value={ownerLabel(subscription)} />
            <Field label="Content Encoding" value={read(subscription.contentEncoding, "aesgcm")} />
            <Field label="Locale" value={read(subscription.locale, "—")} />
            <Field label="Timezone" value={read(subscription.timezone, "—")} />
            <Field label="IP Address" value={read(subscription.ip, "—")} />
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Settings</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3">
              <div>
                <div className="text-[13px] font-medium text-[#1d1d1f]">Active</div>
                <div className="text-[12px] text-[#6e6e73]">Inactive subscriptions will not receive notifications.</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition-colors ${active ? "bg-[#34c759]" : "bg-[#d2d2d7]"}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] p-4">
              <label className="block text-[12px] font-medium text-[#1d1d1f]">Failure Reason</label>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
                placeholder="Optional admin note or failure message"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
        <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Timestamps</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Created At" value={fmt(read(subscription.createdAt, ""))} />
          <Field label="Updated At" value={fmt(read(subscription.updatedAt, ""))} />
          <Field label="Last Success At" value={fmt(read(subscription.lastSuccessAt, ""))} />
          <Field label="Last Failure At" value={fmt(read(subscription.lastFailureAt, ""))} />
        </div>
      </section>
    </PageLayout>
  );
};

const Field: React.FC<Readonly<{ label: string; value: string; mono?: boolean }>> = ({ label, value, mono = false }) => (
  <div className="rounded-xl bg-[#f5f5f7] p-4">
    <div className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">{label}</div>
    <div className={`mt-1 text-[13px] font-medium text-[#1d1d1f] ${mono ? "break-all font-mono" : ""}`}>{value}</div>
  </div>
);
