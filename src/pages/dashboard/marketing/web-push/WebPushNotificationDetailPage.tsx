import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Clock3,
  Copy,
  Edit3,
  Loader2,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { marketingApi } from "@/features/marketing";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  describeNotificationTarget,
  formatDateTime,
  getNotificationTarget,
  readBoolean,
  readString,
  readText,
  stringifyJson,
} from "./webPushNotification.utils";

const renderJson = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

export const WebPushNotificationDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const confirm = useConfirmAction();

  const query = marketingApi.webPushNotifications.hooks.useGet(id, Boolean(id));
  const softDelete = marketingApi.webPushNotifications.hooks.useSoftDelete();
  const notification = (query.data ?? null) as Record<string, unknown> | null;

  const copyPayload = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied payload JSON.");
    } catch {
      toast.error("Copy failed.");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await softDelete.mutateAsync(id);
      toast.success("Notification deleted.");
      navigate("/dashboard/marketing/web-push/notifications", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin text-[var(--primary)]" />
        Loading notification…
      </div>
    );
  }

  if (!notification) {
    return (
      <PageLayout
        title="Notification Not Found"
        subtitle="The push notification could not be loaded."
        onBack={() => navigate("/dashboard/marketing/web-push/notifications")}
      >
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-6 text-sm text-[#6e6e73]">
          No notification was found for this record.
        </div>
      </PageLayout>
    );
  }

  const target = getNotificationTarget(notification);
  const targetSummary = describeNotificationTarget(target);
  const broadcastAll = readBoolean(notification.broadcastAll, false);
  const audienceSummary = broadcastAll
    ? {
        label: "Audience",
        value: "All recipients",
        meta: "Broadcast to every eligible recipient.",
      }
    : targetSummary;
  const status = readString(notification.status, "queued");
  const deliveryState =
    status.trim().toLowerCase() === "sent" || status.trim().toLowerCase() === "delivered"
      ? "Delivered"
      : status.trim().toLowerCase() === "failed"
        ? "Failed"
        : status.trim().toLowerCase() === "partial"
          ? "Partial"
          : status.trim().toLowerCase() === "scheduled"
            ? "Scheduled"
            : "Queued";
  const payloadJson = stringifyJson(notification.payload);
  const responseJson = stringifyJson(notification.responsePayload);

  return (
    <PageLayout
      title={readString(notification.title, "Push Notification")}
      subtitle={`${audienceSummary.label}: ${audienceSummary.value}`}
      onBack={() => navigate("/dashboard/marketing/web-push/notifications")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/marketing/web-push/notifications/${id}/edit`)}
            className="flex h-[34px] items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-[18px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Edit3 size={13} strokeWidth={2} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => confirm.prompt("delete", [String(id)])}
            className="flex h-[34px] items-center gap-2 rounded-full border border-red-200 bg-red-50 px-[18px] text-[13px] font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <Trash2 size={13} strokeWidth={2} />
            Delete
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardV2 label="Status" value={deliveryState} icon={BadgeCheck} colorVariant={deliveryState === "Failed" ? "rose" : deliveryState === "Delivered" ? "emerald" : "blue"} />
        <StatCardV2 label={audienceSummary.label} value={audienceSummary.value} icon={Send} colorVariant="blue" />
        <StatCardV2 label="Urgency" value={readString(notification.urgency, "normal")} icon={ShieldAlert} colorVariant="amber" />
        <StatCardV2 label="Scheduled" value={formatDateTime(readString(notification.scheduledAt, ""))} icon={Clock3} colorVariant="gray" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Message</h2>
              <p className="mt-1 text-[13px] text-[#6e6e73]">The exact payload that appears in the browser notification.</p>
            </div>
            {payloadJson ? (
              <button
                type="button"
                onClick={() => void copyPayload(payloadJson)}
                className="flex h-9 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              >
                <Copy size={13} strokeWidth={2} />
                Copy JSON
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Title" value={readString(notification.title, "—")} />
            <Field label="Tag" value={readString(notification.tag, "—")} />
            <Field label="Click Action" value={readString(notification.clickAction, "—")} mono />
          </div>
          <div className="mt-4 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] p-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">Body</div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#1d1d1f]">{readString(notification.body, "—")}</p>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Target</h2>
          <div className="mt-4 space-y-3">
            <Field label="Broadcast All" value={broadcastAll ? "Yes" : "No"} />
            <Field label={audienceSummary.label} value={audienceSummary.value} mono={target.targetType === "session" && !broadcastAll} />
            {!broadcastAll ? (
              <>
                <Field label="Target Type" value={target.targetType} />
                <Field label="Target ID" value={target.targetId || "—"} mono />
              </>
            ) : null}
            <div className="rounded-xl bg-[#f5f5f7] p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">Summary</div>
              <div className="mt-1 text-[13px] font-medium text-[#1d1d1f]">{broadcastAll ? audienceSummary.meta : targetSummary.meta}</div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Delivery</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Broadcast All" value={broadcastAll ? "Yes" : "No"} />
            <Field label="TTL" value={readText(notification.ttl, "—")} />
            <Field label="Provider Message ID" value={readString(notification.providerMessageId, "—")} mono />
            <Field label="Response Status" value={readText(notification.responseStatus, "—")} />
            <Field label="Failure Reason" value={readString(notification.failureReason, "—")} />
            <Field label="Created At" value={formatDateTime(readString(notification.createdAt, ""))} />
            <Field label="Updated At" value={formatDateTime(readString(notification.updatedAt, ""))} />
            <Field label="Sent At" value={formatDateTime(readString(notification.sentAt, ""))} />
            <Field label="Delivered At" value={formatDateTime(readString(notification.deliveredAt, ""))} />
            <Field label="Failed At" value={formatDateTime(readString(notification.failedAt, ""))} />
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-5">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Raw Payloads</h2>
          <div className="mt-4 space-y-4">
            <RawBlock title="Payload JSON" value={payloadJson || "—"} />
            <RawBlock title="Response Payload" value={responseJson || "—"} />
          </div>
        </section>
      </div>

      <AlertDialog open={confirm.open} onOpenChange={(open) => !open && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the notification and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

const Field: React.FC<Readonly<{ label: string; value: string; mono?: boolean }>> = ({ label, value, mono = false }) => (
  <div className="rounded-xl bg-[#f5f5f7] p-4">
    <div className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">{label}</div>
    <div className={`mt-1 text-[13px] font-medium text-[#1d1d1f] ${mono ? "break-all font-mono" : ""}`}>{value}</div>
  </div>
);

const RawBlock: React.FC<Readonly<{ title: string; value: string }>> = ({ title, value }) => (
  <div className="rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] p-4">
    <div className="text-[11px] uppercase tracking-[0.08em] text-[#86868b]">{title}</div>
    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[12px] leading-5 text-[#1d1d1f]">
      {renderJson(value)}
    </pre>
  </div>
);
