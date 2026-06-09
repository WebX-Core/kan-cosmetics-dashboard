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

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const selectClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  body: z.string().trim().min(1, "Body is required"),
  icon: z.string().trim().optional().or(z.literal("")),
  badge: z.string().trim().optional().or(z.literal("")),
  image: z.string().trim().optional().or(z.literal("")),
  clickAction: z.string().trim().optional().or(z.literal("")),
  tag: z.string().trim().optional().or(z.literal("")),
  ttl: z.string().trim().optional().or(z.literal("")),
  urgency: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  payloadJson: z.string().trim().optional().or(z.literal("")),
  idempotencyKey: z.string().trim().optional().or(z.literal("")),
  targetType: z.enum(["customer", "subscription", "user", "session"]),
  targetId: z.string().trim().min(1, "Target is required"),
});

type TargetType = "customer" | "subscription" | "user" | "session";

type Form = Readonly<{
  title: string;
  body: string;
  icon: string;
  badge: string;
  image: string;
  clickAction: string;
  tag: string;
  ttl: string;
  urgency: string;
  status: string;
  scheduledAt: string;
  payloadJson: string;
  idempotencyKey: string;
  targetType: TargetType;
  targetId: string;
}>;

const initial: Form = {
  title: "",
  body: "",
  icon: "",
  badge: "",
  image: "",
  clickAction: "",
  tag: "",
  ttl: "60",
  urgency: "normal",
  status: "queued",
  scheduledAt: "",
  payloadJson: "",
  idempotencyKey: "",
  targetType: "customer",
  targetId: "",
};

const read = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const readText = (v: unknown, fb = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fb);

const customerFromRecord = (record: Record<string, unknown>): CustomerSearchOption | null => {
  const customer = (typeof record.customer === "object" && record.customer !== null
    ? record.customer
    : null) as Record<string, unknown> | null;
  const source = customer ?? record;
  const id = read(source.id ?? record.customerId);
  if (!id) return null;
  const nameParts = [source.firstname, source.middlename, source.lastname]
    .map((part) => read(part).trim())
    .filter(Boolean);
  const name = nameParts.length > 0 ? nameParts.join(" ") : read(source.name ?? source.fullname, "Customer");
  return {
    id,
    name,
    email: read(source.email),
    phone: read(source.phone),
  };
};

const userFromRecord = (record: Record<string, unknown>): AdminUserSearchOption | null => {
  const user = (typeof record.user === "object" && record.user !== null ? record.user : null) as Record<string, unknown> | null;
  const source = user ?? record;
  const id = read(source.id ?? record.userId);
  if (!id) return null;
  const nameParts = [source.firstname, source.middlename, source.lastname]
    .map((part) => read(part).trim())
    .filter(Boolean);
  const name = nameParts.length > 0 ? nameParts.join(" ") : read(source.name ?? source.fullname, "User");
  return {
    id,
    name,
    email: read(source.email),
    phone: read(source.phone),
    role: read(source.role, "USER"),
  };
};

const subscriptionFromRecord = (record: Record<string, unknown>): WebPushSubscriptionSearchOption | null => {
  const subscription = (typeof record.subscription === "object" && record.subscription !== null
    ? record.subscription
    : null) as Record<string, unknown> | null;
  const source = subscription ?? record;
  const id = read(source.id ?? record.subscriptionId);
  if (!id) return null;
  const customer = (typeof record.customer === "object" && record.customer !== null
    ? record.customer
    : null) as Record<string, unknown> | null;
  const user = (typeof record.user === "object" && record.user !== null ? record.user : null) as Record<string, unknown> | null;
  const customerName = [customer?.firstname, customer?.middlename, customer?.lastname]
    .map((part) => read(part).trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  const userName = [user?.firstname, user?.middlename, user?.lastname]
    .map((part) => read(part).trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id,
    endpoint: read(source.endpoint),
    owner:
      customerName ||
      userName ||
      read(customer?.id ?? record.customerId) ||
      read(user?.id ?? record.userId) ||
      read(record.sessionId) ||
      "Unassigned",
    browser: read(source.browser ?? source.userAgent),
    platform: read(source.platform),
    isActive: source.isActive !== false && record.isActive !== false,
    lastSeenAt: read(source.lastSeenAt),
  };
};

const getTarget = (
  record: Record<string, unknown>,
): {
  targetType: TargetType;
  targetId: string;
  customer: CustomerSearchOption | null;
  subscription: WebPushSubscriptionSearchOption | null;
  user: AdminUserSearchOption | null;
} => {
  const subscription = (typeof record.subscription === "object" && record.subscription !== null
    ? record.subscription
    : null) as Record<string, unknown> | null;
  const subscriptionId = read(subscription?.id ?? record.subscriptionId);
  if (subscriptionId) {
    return {
      targetType: "subscription",
      targetId: subscriptionId,
      customer: null,
      subscription: subscriptionFromRecord(record),
      user: null,
    };
  }

  const customerId = read((record.customer as Record<string, unknown> | undefined)?.id ?? record.customerId);
  if (customerId) {
    return { targetType: "customer", targetId: customerId, customer: customerFromRecord(record), subscription: null, user: null };
  }

  const userId = read((record.user as Record<string, unknown> | undefined)?.id ?? record.userId);
  if (userId) {
    return { targetType: "user", targetId: userId, customer: null, subscription: null, user: userFromRecord(record) };
  }

  const sessionId = read(record.sessionId);
  if (sessionId) {
    return { targetType: "session", targetId: sessionId, customer: null, subscription: null, user: null };
  }

  return { targetType: "customer", targetId: "", customer: null, subscription: null, user: null };
};

const parsePayloadJson = (value: string | undefined): Record<string, unknown> | null => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Payload must be a JSON object");
  }
  return parsed as Record<string, unknown>;
};

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
    const target = getTarget(row);
    setForm({
      title: read(row.title),
      body: read(row.body),
      icon: read(row.icon),
      badge: read(row.badge),
      image: read(row.image),
      clickAction: read(row.clickAction),
      tag: read(row.tag),
      urgency: read(row.urgency, "normal"),
      status: read(row.status, "queued"),
      scheduledAt: read(row.scheduledAt),
      ttl: readText(row.ttl),
      payloadJson: row.payload ? JSON.stringify(row.payload, null, 2) : "",
      idempotencyKey: read(row.idempotencyKey),
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

      const payloadJson = parsed.payloadJson ?? "";
      const payloadData = (() => {
        try {
          return parsePayloadJson(payloadJson);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Invalid payload JSON");
          return null;
        }
      })();
      if (payloadData === null && payloadJson.trim()) return;

      const dto = {
        title: parsed.title,
        body: parsed.body,
        icon: parsed.icon?.trim() || undefined,
        badge: parsed.badge?.trim() || undefined,
        image: parsed.image?.trim() || undefined,
        clickAction: parsed.clickAction?.trim() || undefined,
        tag: parsed.tag?.trim() || undefined,
        ttl: (() => {
          if (!parsed.ttl?.trim()) return undefined;
          const ttl = Number(parsed.ttl);
          if (!Number.isFinite(ttl) || ttl < 0) {
            throw new Error("TTL must be a number greater than or equal to 0");
          }
          return ttl;
        })(),
        urgency: parsed.urgency?.trim() || undefined,
        status: parsed.status?.trim() || undefined,
        scheduledAt: parsed.scheduledAt?.trim() || undefined,
        payload: payloadData ?? undefined,
        idempotencyKey: parsed.idempotencyKey?.trim() || undefined,
        ...(parsed.targetType === "customer"
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
          description="These fields become the actual browser notification payload."
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
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Icon URL">
                <input
                  type="url"
                  value={form.icon}
                  placeholder="https://example.com/icon.png"
                  onChange={(e) => updateField("icon", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Badge URL">
                <input
                  type="url"
                  value={form.badge}
                  placeholder="https://example.com/badge.png"
                  onChange={(e) => updateField("badge", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Image URL">
                <input
                  type="url"
                  value={form.image}
                  placeholder="https://example.com/banner.jpg"
                  onChange={(e) => updateField("image", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Click Action URL">
                <input
                  type="url"
                  value={form.clickAction}
                  placeholder="https://example.com/products"
                  onChange={(e) => updateField("clickAction", e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Delivery Settings"
          description="Control when and how the push service processes the message."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Status">
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={selectClass}>
                <option value="queued">Queued</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="partial">Partial</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </FormField>
            <FormField label="Urgency">
              <select value={form.urgency} onChange={(e) => updateField("urgency", e.target.value)} className={selectClass}>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
              </select>
            </FormField>
            <FormField label="TTL (seconds)">
              <input
                type="number"
                min={0}
                value={form.ttl}
                placeholder="60"
                onChange={(e) => updateField("ttl", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Scheduled At">
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => updateField("scheduledAt", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Idempotency Key">
              <input
                type="text"
                value={form.idempotencyKey}
                placeholder="Optional unique key"
                onChange={(e) => updateField("idempotencyKey", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Tag">
              <input
                type="text"
                value={form.tag}
                placeholder="sale-june-2026"
                onChange={(e) => updateField("tag", e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Target"
          description="Pick exactly one target type. Customers are the common path for product announcements."
        >
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
        </FormSection>

        <FormSection
          title="Payload"
          description="Optional custom data sent along with the notification."
        >
          <FormField label="Payload JSON">
            <textarea
              value={form.payloadJson}
              placeholder='{"productId":"...","category":"offers"}'
              onChange={(e) => updateField("payloadJson", e.target.value)}
              rows={5}
              className={textareaClass}
            />
          </FormField>
        </FormSection>

        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6e6e73]">Target Preview</div>
              <div className="mt-1 text-[14px] font-medium text-[#1d1d1f]">{targetPreview.label}</div>
            </div>
            <div className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[12px] font-medium text-[#1d1d1f]">
              {form.targetType}
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
