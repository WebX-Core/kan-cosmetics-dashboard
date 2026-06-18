import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, BellRing, Target, Clock3, ShieldAlert } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { CustomerSearchPicker } from "@/shared/components/forms/CustomerSearchPicker";
import { WebPushSubscriptionSearchPicker } from "@/shared/components/forms/WebPushSubscriptionSearchPicker";
import { AdminUserSearchPicker } from "@/shared/components/forms/AdminUserSearchPicker";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";
import type { CustomerSearchOption } from "@/shared/hooks/useCustomerSearch";
import type { WebPushSubscriptionSearchOption } from "@/shared/hooks/useWebPushSubscriptionSearch";
import type { AdminUserSearchOption } from "@/shared/hooks/useAdminUserSearch";
import { StatusToggle } from "@/shared/components/dashboard/StatusToggle";
import { getNotificationTarget, readBoolean, readString } from "./webPushNotification.utils";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  body: z.string().trim().min(1, "Body is required"),
  broadcastAll: z.boolean(),
  targetType: z.enum(["customer", "subscription", "user", "session"]),
  targetId: z.string().trim().optional().default(""),
}).superRefine((value, ctx) => {
  if (value.broadcastAll) return;
  if (value.targetId.trim()) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["targetId"],
    message: "Target is required",
  });
});

type TargetType = "customer" | "subscription" | "user" | "session";

type Form = Readonly<{
  title: string;
  body: string;
  broadcastAll: boolean;
  targetType: TargetType;
  targetId: string;
}>;

const initial: Form = {
  title: "",
  body: "",
  broadcastAll: false,
  targetType: "customer",
  targetId: "",
};

const read = readString;

export const WebPushNotificationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.webPushNotifications.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.webPushNotifications.hooks.useCreate();
  const updateMutation = marketingApi.webPushNotifications.hooks.useUpdate();
  const [form, setForm] = React.useState<Form>(initial);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerSearchOption | null>(null);
  const [selectedSubscription, setSelectedSubscription] = React.useState<WebPushSubscriptionSearchOption | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<AdminUserSearchOption | null>(null);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const row = getQuery.data as Record<string, unknown>;
    const target = getNotificationTarget(row);
    setForm({
      title: read(row.title),
      body: read(row.body),
      broadcastAll: readBoolean(row.broadcastAll, false),
      targetType: target.targetType,
      targetId: target.targetId,
    });
    setSelectedCustomer(target.customer);
    setSelectedSubscription(target.subscription);
    setSelectedUser(target.user);
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTargetTypeChange = (targetType: TargetType) => {
    setForm((prev) => ({ ...prev, targetType, targetId: "" }));
    setSelectedCustomer(null);
    setSelectedSubscription(null);
    setSelectedUser(null);
  };

  const targetPreview = React.useMemo(() => {
    if (form.broadcastAll) {
      return {
        label: "Audience",
        value: "All recipients",
        meta: "Broadcast to every eligible recipient.",
      };
    }

    if (form.targetType === "customer") {
      return selectedCustomer
        ? {
            label: "Customer",
            value: selectedCustomer.name,
            meta: [selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" • "),
          }
        : { label: "Customer", value: "No customer selected", meta: "Choose a customer to deliver to all active subscriptions." };
    }

    if (form.targetType === "subscription") {
      return selectedSubscription
        ? {
            label: "Subscription",
            value: selectedSubscription.endpoint || selectedSubscription.id,
            meta: [selectedSubscription.owner, selectedSubscription.browser, selectedSubscription.platform].filter(Boolean).join(" • "),
          }
        : { label: "Subscription", value: "No subscription selected", meta: "Choose one saved browser subscription." };
    }

    if (form.targetType === "user") {
      return selectedUser
        ? {
            label: "User",
            value: selectedUser.name,
            meta: [selectedUser.email, selectedUser.phone, selectedUser.role].filter(Boolean).join(" • "),
          }
        : { label: "User", value: "No user selected", meta: "Choose an admin user target." };
    }

    return form.targetId.trim()
      ? { label: "Session", value: form.targetId.trim(), meta: "Direct session target." }
      : { label: "Session", value: "No session selected", meta: "Enter a session ID to target a single session." };
  }, [form.targetId, form.targetType, selectedCustomer, selectedSubscription, selectedUser]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    try {
      const parsed = validateOrToast(schema, form, toast);
      if (!parsed) return;

      const targetId = parsed.targetId.trim();
      if (!parsed.broadcastAll) {
        if (parsed.targetType === "customer" && !selectedCustomer?.id) {
          throw new Error("Customer target is required");
        }
        if (parsed.targetType === "subscription" && !selectedSubscription?.id) {
          throw new Error("Subscription target is required");
        }
        if (parsed.targetType === "user" && !selectedUser?.id) {
          throw new Error("User target is required");
        }
        if (parsed.targetType === "session" && !targetId) {
          throw new Error("Session ID is required");
        }
      }

      const dto = {
        title: parsed.title,
        body: parsed.body,
        broadcastAll: parsed.broadcastAll,
        ...(parsed.broadcastAll
          ? {}
          : parsed.targetType === "customer"
            ? { customerId: selectedCustomer?.id }
            : parsed.targetType === "subscription"
              ? { subscriptionId: selectedSubscription?.id }
              : parsed.targetType === "user"
                ? { userId: selectedUser?.id }
                : { sessionId: targetId }),
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto });
      } else {
        await createMutation.mutateAsync(dto);
      }
      toast.success(isEdit ? "Notification updated." : "Notification created.");
      navigate("/dashboard/marketing/web-push/notifications", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" />
        Loading notification…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Notification" : "New Push Notification"}
      subtitle={
        isEdit
          ? "Update the notification target and payload."
          : "Create a browser push notification for a customer, subscription, user, or session."
      }
      onBack={() => navigate("/dashboard/marketing/web-push/notifications")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection
          title="Notification Content"
          description="Only the required notification content is shown here."
        >
          <div className="grid gap-4">
            <FormField label="Title" required>
              <input
                type="text"
                value={form.title}
                placeholder="Flash Sale — 30% off today only"
                onChange={(e) => updateField("title", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Body" required>
              <textarea
                value={form.body}
                placeholder="Write the notification message…"
                onChange={(e) => updateField("body", e.target.value)}
                rows={4}
                className={textareaClass}
              />
            </FormField>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3">
              <div>
                <div className="text-[13px] font-medium text-[#1d1d1f]">Broadcast to all</div>
                <div className="mt-1 text-[12px] leading-5 text-[#6e6e73]">
                  Send this notification to every eligible recipient instead of a single target.
                </div>
              </div>
              <StatusToggle
                checked={form.broadcastAll}
                onChange={(next) => {
                  updateField("broadcastAll", next);
                  if (next) {
                    setSelectedCustomer(null);
                    setSelectedSubscription(null);
                    setSelectedUser(null);
                    updateField("targetId", "");
                  }
                }}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Target"
          description={form.broadcastAll ? "Broadcast all is enabled, so a single target is not required." : "Pick exactly one target type. Customers are the common path for product announcements."}
        >
          {form.broadcastAll ? (
            <div className="rounded-xl border border-dashed border-[#d2d2d7] bg-[#f5f5f7] px-4 py-4 text-[13px] text-[#6e6e73]">
              Broadcast all is enabled. Target selection is ignored.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { key: "customer", label: "Customer", icon: Target },
                  { key: "subscription", label: "Subscription", icon: BellRing },
                  { key: "user", label: "User", icon: ShieldAlert },
                  { key: "session", label: "Session", icon: Clock3 },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = form.targetType === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleTargetTypeChange(option.key as TargetType)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[#1d1d1f]"
                          : "border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7]"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-[var(--primary)]" : "text-[#86868b]"} />
                      <span className="text-[13px] font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {form.targetType === "customer" ? (
                <CustomerSearchPicker
                  label="Customer"
                  value={selectedCustomer}
                  onChange={(customer) => {
                    setSelectedCustomer(customer);
                    updateField("targetId", customer?.id ?? "");
                  }}
                  required
                  helperText="The notification will be delivered to all active subscriptions for this customer."
                />
              ) : form.targetType === "subscription" ? (
                <WebPushSubscriptionSearchPicker
                  label="Subscription"
                  value={selectedSubscription}
                  onChange={(subscription) => {
                    setSelectedSubscription(subscription);
                    updateField("targetId", subscription?.id ?? "");
                  }}
                  required
                  helperText="Choose a specific saved browser subscription."
                />
              ) : form.targetType === "user" ? (
                <AdminUserSearchPicker
                  label="User"
                  value={selectedUser}
                  onChange={(user) => {
                    setSelectedUser(user);
                    updateField("targetId", user?.id ?? "");
                  }}
                  required
                  helperText="Choose a specific admin user target."
                />
              ) : (
                <FormField label="Session ID" required>
                  <input
                    type="text"
                    value={form.targetId}
                    onChange={(e) => updateField("targetId", e.target.value)}
                    placeholder="Customer session ID"
                    className={inputClass}
                  />
                </FormField>
              )}
            </>
          )}
        </FormSection>

        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6e6e73]">
                {form.broadcastAll ? "Audience Preview" : "Target Preview"}
              </div>
              <div className="mt-1 text-[14px] font-medium text-[#1d1d1f]">{targetPreview.label}</div>
            </div>
            <div className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[12px] font-medium text-[#1d1d1f]">
              {form.broadcastAll ? "all" : form.targetType}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3">
            <div className="text-[14px] font-medium text-[#1d1d1f]">{targetPreview.value}</div>
            <div className="mt-1 text-[12px] leading-5 text-[#6e6e73]">{targetPreview.meta}</div>
          </div>
        </div>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Notification" : "Create Notification"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/marketing/web-push/notifications")}
        />
      </form>
    </ModernFormLayout>
  );
};
