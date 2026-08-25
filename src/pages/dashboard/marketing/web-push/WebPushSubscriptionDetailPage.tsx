import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BellRing, Loader2, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
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

const personName = (person: Record<string, unknown> | undefined): string => {
  if (!person) return "";
  const firstname = read(person.firstname);
  const lastname = read(person.lastname);
  return [firstname, lastname].filter(Boolean).join(" ") || read(person.email);
};

const ownerLabel = (row: Record<string, unknown>): string => {
  const customer = row.customer as Record<string, unknown> | undefined;
  const user = row.user as Record<string, unknown> | undefined;
  return personName(customer) || personName(user) || read(row.sessionId, "") || "Anonymous session";
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

  const changed =
    Boolean(subscription) &&
    (isActive !== (subscription?.isActive !== false) || failureReason !== read(subscription?.failureReason, ""));

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
        <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <PageLayout title="Subscription Not Found" subtitle="The push subscription could not be loaded." onBack={() => navigate("/dashboard/marketing/web-push/subscriptions")}>
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-8 text-sm text-[#6e6e73]">
          No subscription was found for this record.
        </div>
      </PageLayout>
    );
  }

  const active = isActive;
  const owner = ownerLabel(subscription);
  const endpoint = read(subscription.endpoint, "—");

  return (
    <PageLayout
      title="Push Subscription"
      subtitle={owner}
      onBack={() => navigate("/dashboard/marketing/web-push/subscriptions")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onDelete()}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[21px] text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!changed || updateMutation.isPending}
            className="flex h-[34px] items-center gap-2 rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {changed ? "Save Changes" : "Saved"}
          </button>
        </div>
      }
    >
      {/* ── Hero ── */}
      <div className="overflow-hidden rounded-2xl bg-white">
        <div className="grid lg:grid-cols-[380px_1fr]">
          <div className="relative flex min-h-[240px] items-center justify-center bg-[#f2f2f4] p-10">
            <BellRing size={48} strokeWidth={1} className="text-[#86868b]" />
          </div>

          <div className="flex flex-col gap-7 p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={active ? "Active" : "Inactive"} />
              <span className="text-[12px] text-[#6e6e73]">{read(subscription.platform, "Unknown platform")}</span>
            </div>

            <div>
              <h2 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1d1d1f]" style={{ textWrap: "balance" }}>
                {owner}
              </h2>
              <p className="mt-2 break-all font-mono text-[12px] text-[#6e6e73]">{endpoint}</p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: "Browser", value: read(subscription.browser, "—") },
                { label: "Device", value: read(subscription.deviceType, "—") },
                { label: "Content Encoding", value: read(subscription.contentEncoding, "aesgcm") },
                { label: "Locale", value: read(subscription.locale, "—") },
                { label: "Timezone", value: read(subscription.timezone, "—") },
                { label: "IP Address", value: read(subscription.ip, "—") },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-[#86868b]">{label}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#f0f0f2] pt-5 text-[13px] text-[#6e6e73]">
              <span>Last seen {fmt(read(subscription.lastSeenAt, ""))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content + Sidebar ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_268px]">
        <div className="rounded-xl bg-white px-7 py-7">
          <h2 className="mb-4 text-[15px] font-semibold text-[#1d1d1f]">Settings</h2>

          <div className="flex items-center justify-between rounded-xl bg-[#f5f5f7] px-4 py-3">
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

          <div className="mt-4">
            <label className="mb-2 block text-[12px] font-semibold text-[#86868b]">Failure Reason</label>
            <textarea
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[13px] text-[#1d1d1f] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              placeholder="Optional admin note or failure message"
            />
          </div>
        </div>

        <div className="self-start space-y-0 rounded-xl bg-white">
          <dl className="divide-y divide-[#f2f2f4] border-t border-[#ebebed]">
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Created</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{fmt(read(subscription.createdAt, ""))}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Updated</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{fmt(read(subscription.updatedAt, ""))}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Last Success</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{fmt(read(subscription.lastSuccessAt, ""))}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-[11px] text-[#86868b]">Last Failure</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[#1d1d1f]">{fmt(read(subscription.lastFailureAt, ""))}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="mb-1.5 text-[11px] text-[#86868b]">Status</dt>
              <dd><StatusBadge status={active ? "Active" : "Inactive"} /></dd>
            </div>
          </dl>
        </div>
      </div>
    </PageLayout>
  );
};
