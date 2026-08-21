/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthContext";

export const ROUTE_MODULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/dashboard\/users(?:\/|$)/, "admin"],
  [/^\/dashboard\/(?:permissions|rbac)(?:\/|$)/, "permission"],
  [/^\/dashboard\/company-settings(?:\/|$)/, "company-setting"],
  [/^\/dashboard\/product-variants(?:\/|$)/, "product-variant"],
  [/^\/dashboard\/product-tags(?:\/|$)/, "product-tag"],
  [/^\/dashboard\/product-attributes(?:\/|$)/, "product-attribute"],
  [/^\/dashboard\/(?:products|product-media)(?:\/|$)/, "product"],
  [/^\/dashboard\/categories(?:\/|$)/, "category"],
  [/^\/dashboard\/subcategories(?:\/|$)/, "subcategory"],
  [/^\/dashboard\/inventory(?:\/|$)/, "inventory"],
  [/^\/dashboard\/orders(?:\/|$)/, "order"],
  [/^\/dashboard\/payments(?:\/|$)/, "payment"],
  [/^\/dashboard\/coupon-usage(?:\/|$)/, "coupon-usage"],
  [/^\/dashboard\/coupons(?:\/|$)/, "coupon"],
  [/^\/dashboard\/loyalty(?:\/|$)/, "customer-loyalty"],
  [/^\/dashboard\/customers\/bans(?:\/|$)/, "customer-ban"],
  [/^\/dashboard\/customers\/addresses(?:\/|$)/, "customer-address"],
  [/^\/dashboard\/customers(?:\/|$)/, "customer"],
  [/^\/dashboard\/delivery\/couriers(?:\/|$)/, "courier"],
  [/^\/dashboard\/delivery\/courier-branches(?:\/|$)/, "courier-branch"],
  [/^\/dashboard\/delivery\/courier-pickup-addresses(?:\/|$)/, "courier-pickup-address"],
  [/^\/dashboard\/delivery\/shipment-tracking(?:\/|$)/, "shipment-tracking"],
  [/^\/dashboard\/delivery\/pickup-requests(?:\/|$)/, "pickup-request"],
  [/^\/dashboard\/delivery\/api-logs(?:\/|$)/, "delivery-api-log"],
  [/^\/dashboard\/delivery\/webhook-events(?:\/|$)/, "delivery-webhook-event"],
  [/^\/dashboard\/delivery\/ready-for-pickup(?:\/|$)/, "order"],
  [/^\/dashboard\/delivery(?:\/|$)/, "shipment"],
  [/^\/dashboard\/(?:reviews|testimonials)(?:\/|$)/, "review"],
  [/^\/dashboard\/faqs(?:\/|$)/, "faq"],
  [/^\/dashboard\/support\/product-inquiries(?:\/|$)/, "inquiry"],
  [/^\/dashboard\/support\/site-inquiries(?:\/|$)/, "site-inquiry"],
  [/^\/dashboard\/(?:support\/contacts|contact)(?:\/|$)/, "contact"],
  [/^\/dashboard\/support\/replies(?:\/|$)/, "reply"],
  [/^\/dashboard\/(?:blog-posts|newsroom)(?:\/|$)/, "blog"],
  [/^\/dashboard\/advertisements(?:\/|$)/, "advertisement"],
  [/^\/dashboard\/newsletter(?:\/|$)/, "newsletter"],
  [/^\/dashboard\/marketing\/email-campaigns(?:\/|$)/, "email-campaign"],
  [/^\/dashboard\/marketing\/email-recipients(?:\/|$)/, "email-recipient"],
  [/^\/dashboard\/marketing\/email-recipient-buckets(?:\/|$)/, "email-recipient-bucket"],
  [/^\/dashboard\/marketing\/email-queue(?:\/|$)/, "email-queue"],
  [/^\/dashboard\/marketing\/email-logs(?:\/|$)/, "email-log"],
  [/^\/dashboard\/marketing\/web-push\/notifications(?:\/|$)/, "web-push-notification"],
  [/^\/dashboard\/marketing\/web-push\/subscriptions(?:\/|$)/, "web-push-subscription"],
  [/^\/dashboard\/seo-metadata(?:\/|$)/, "seo"],
  [/^\/dashboard\/activity-logs(?:\/|$)/, "user-activity"],
  [/^\/dashboard\/audit-logs(?:\/|$)/, "audit-log"],
  [/^\/dashboard\/purchase-history(?:\/|$)/, "purchase-history"],
  [/^\/dashboard\/user-metadata(?:\/|$)/, "user-metadata"],
  [/^\/dashboard\/team(?:\/|$)/, "teammember"],
];

const actionForPath = (path: string): "view" | "create" | "update" => {
  if (/\/create(?:\/|$)/.test(path) || /\/bulk(?:\/|$)/.test(path)) return "create";
  if (/\/edit(?:\/|$)/.test(path)) return "update";
  return "view";
};

export const getDashboardModule = (path: string): string | undefined =>
  ROUTE_MODULES.find(([pattern]) => pattern.test(path))?.[1];

export const hasDashboardPermission = (
  role: string | null,
  permissions: ReadonlyArray<string>,
  path: string,
  action: "view" | "create" | "update" | "delete",
): boolean => {
  const moduleName = getDashboardModule(path);
  if (action === "delete") return role === "SUDOADMIN";
  if (!moduleName || role === "SUDOADMIN" || permissions.includes("*")) return true;
  if (permissions.length === 0) return role === "ADMIN";
  return permissions.some((permission) => {
    const normalized = permission.toLowerCase();
    return normalized === `${moduleName}:${action}` || normalized === `${moduleName}:manage`;
  });
};

export const DashboardPermissionGuard: React.FC = () => {
  const { state } = useAuth();
  const { pathname } = useLocation();
  const moduleName = getDashboardModule(pathname);

  if (!moduleName || state.role === "SUDOADMIN" || state.permissions.includes("*")) return <Outlet />;
  if (state.permissions.length === 0) {
    return state.role === "ADMIN" ? <Outlet /> : <Navigate to="/dashboard" replace />;
  }

  const action = actionForPath(pathname);
  const allowed = hasDashboardPermission(state.role, state.permissions, pathname, action);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
