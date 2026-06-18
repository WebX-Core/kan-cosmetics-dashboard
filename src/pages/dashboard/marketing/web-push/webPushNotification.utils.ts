import type { AdminUserSearchOption } from "@/shared/hooks/useAdminUserSearch";
import type { CustomerSearchOption } from "@/shared/hooks/useCustomerSearch";
import type { WebPushSubscriptionSearchOption } from "@/shared/hooks/useWebPushSubscriptionSearch";

export type NotificationTargetType = "customer" | "subscription" | "user" | "session";

export type NotificationTargetSnapshot = Readonly<{
  targetType: NotificationTargetType;
  targetId: string;
  customer: CustomerSearchOption | null;
  subscription: WebPushSubscriptionSearchOption | null;
  user: AdminUserSearchOption | null;
}>;

export type NotificationTargetDescription = Readonly<{
  label: string;
  value: string;
  meta: string;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getName = (parts: ReadonlyArray<unknown>, fallback: string): string => {
  const name = parts
    .map((part) => readString(part).trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || fallback;
};

export const readString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const readText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : fallback;

export const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

export const formatDateTime = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const stringifyJson = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return JSON.stringify(value, null, 2);
};

export const parsePayloadJson = (value: string | undefined): Record<string, unknown> | null => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Payload must be a JSON object");
  }
  return parsed;
};

const customerFromRecord = (record: Record<string, unknown>): CustomerSearchOption | null => {
  const customer = isRecord(record.customer) ? record.customer : null;
  const source = customer ?? record;
  const id = readString(source.id ?? record.customerId);
  if (!id) return null;

  return {
    id,
    name: getName([source.firstname, source.middlename, source.lastname], readString(source.name ?? source.fullname, "Customer")),
    email: readString(source.email),
    phone: readString(source.phone),
  };
};

const userFromRecord = (record: Record<string, unknown>): AdminUserSearchOption | null => {
  const user = isRecord(record.user) ? record.user : null;
  const source = user ?? record;
  const id = readString(source.id ?? record.userId);
  if (!id) return null;

  return {
    id,
    name: getName([source.firstname, source.middlename, source.lastname], readString(source.name ?? source.fullname, "User")),
    email: readString(source.email),
    phone: readString(source.phone),
    role: readString(source.role, "USER"),
  };
};

const subscriptionFromRecord = (record: Record<string, unknown>): WebPushSubscriptionSearchOption | null => {
  const subscription = isRecord(record.subscription) ? record.subscription : null;
  const source = subscription ?? record;
  const id = readString(source.id ?? record.subscriptionId);
  if (!id) return null;

  const customer = isRecord(record.customer) ? record.customer : null;
  const user = isRecord(record.user) ? record.user : null;
  const customerName = getName([customer?.firstname, customer?.middlename, customer?.lastname], "");
  const userName = getName([user?.firstname, user?.middlename, user?.lastname], "");

  return {
    id,
    endpoint: readString(source.endpoint),
    owner:
      customerName ||
      userName ||
      readString(customer?.id ?? record.customerId) ||
      readString(user?.id ?? record.userId) ||
      readString(record.sessionId) ||
      "Unassigned",
    browser: readString(source.browser ?? source.userAgent),
    platform: readString(source.platform),
    isActive: source.isActive !== false && record.isActive !== false,
    lastSeenAt: readString(source.lastSeenAt),
  };
};

export const getNotificationTarget = (record: Record<string, unknown>): NotificationTargetSnapshot => {
  const subscription = isRecord(record.subscription) ? record.subscription : null;
  const subscriptionId = readString(subscription?.id ?? record.subscriptionId);
  if (subscriptionId) {
    return {
      targetType: "subscription",
      targetId: subscriptionId,
      customer: null,
      subscription: subscriptionFromRecord(record),
      user: null,
    };
  }

  const customer = isRecord(record.customer) ? record.customer : null;
  const customerId = readString(customer?.id ?? record.customerId);
  if (customerId) {
    return {
      targetType: "customer",
      targetId: customerId,
      customer: customerFromRecord(record),
      subscription: null,
      user: null,
    };
  }

  const user = isRecord(record.user) ? record.user : null;
  const userId = readString(user?.id ?? record.userId);
  if (userId) {
    return {
      targetType: "user",
      targetId: userId,
      customer: null,
      subscription: null,
      user: userFromRecord(record),
    };
  }

  const sessionId = readString(record.sessionId);
  return {
    targetType: sessionId ? "session" : "customer",
    targetId: sessionId,
    customer: null,
    subscription: null,
    user: null,
  };
};

export const describeNotificationTarget = (target: NotificationTargetSnapshot): NotificationTargetDescription => {
  if (target.targetType === "subscription") {
    const value = target.subscription?.endpoint || target.subscription?.id || target.targetId || "Subscription";
    const meta = [target.subscription?.owner, target.subscription?.browser, target.subscription?.platform]
      .filter(Boolean)
      .join(" • ");

    return { label: "Subscription", value, meta: meta || "Saved browser subscription." };
  }

  if (target.targetType === "customer") {
    const value = target.customer?.name || target.customer?.id || target.targetId || "Customer";
    const meta = [target.customer?.email, target.customer?.phone].filter(Boolean).join(" • ");

    return { label: "Customer", value, meta: meta || "Customer-wide delivery." };
  }

  if (target.targetType === "user") {
    const value = target.user?.name || target.user?.id || target.targetId || "User";
    const meta = [target.user?.email, target.user?.phone, target.user?.role].filter(Boolean).join(" • ");

    return { label: "User", value, meta: meta || "Direct admin-user delivery." };
  }

  return {
    label: "Session",
    value: target.targetId || "Session",
    meta: "Direct session target.",
  };
};

export const notificationTargetLabel = (record: Record<string, unknown>): string =>
  describeNotificationTarget(getNotificationTarget(record)).value;
