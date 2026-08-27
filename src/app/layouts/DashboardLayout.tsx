import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLogout } from "@/features/auth";

// Maps each sidebar module key to the backend route-module names that grant access.
// Keys absent from this map are always visible (e.g. "overview").
const SIDEBAR_BACKEND_MODULES: Readonly<Record<string, ReadonlyArray<string>>> = {
  overview:                  [], // visible if user has any permissions at all
  products:                  ["product", "product-variant", "product-tag", "product-attribute"],
  categories:                ["category", "subcategory"],
  inventory:                 ["inventory"],
  orders:                    ["order"],
  "company-settings":       ["company-setting", "order-bill"],
  payments:                  ["payment"],
  coupons:                   ["coupon", "coupon-usage"],
  delivery:                  ["shipment", "shipment-tracking", "courier", "courier-branch", "courier-pickup-address", "pickup-request", "delivery-api-log", "delivery-webhook-event"],
  carts:                     ["cart"],
  wishlists:                 ["wishlist"],
  customers:                 ["customer-address", "customer-ban", "purchase-history"],
  loyalty:                   ["customer-loyalty"],
  "product-inquiries":       ["inquiry"],
  "site-inquiries":          ["site-inquiry"],
  contacts:                  ["contact"],
  reviews:                   ["review"],
  testimonials:              ["review"],
  faqs:                      ["faq"],
  "blog-posts":              ["blog"],
  newsletter:                ["newsletter"],
  advertisements:            ["advertisement"],
  "email-campaigns":         ["email-campaign"],
  "email-recipients":        ["email-recipient"],
  "email-recipient-buckets": ["email-recipient-bucket"],
  "email-queue":             ["email-queue"],
  "email-logs":              ["email-log"],
  "web-push-notifications":  ["web-push-notification"],
  "web-push-subscriptions":  ["web-push-subscription"],
  seo:                       ["__sudoadmin_only__"],
  "activity-logs":           ["user-activity"],
  "audit-logs":              ["audit-log"],
  users:                     ["admin"],
};
import { useAuth } from "@/app/providers/AuthContext";
import { usePermission } from "@/shared/hooks/usePermission";
import { Sidebar } from "@/shared/components/dashboard/Sidebar";
import { TopNav } from "@/shared/components/dashboard/TopNav";
import { useContactList } from "@/features/contact";
import { useOrders, usePaymentsList } from "@/features/commerce";
import { useShipmentList } from "@/features/delivery";
import {
  useInquiryList,
  useReviewList,
  useSiteInquiryList,
} from "@/features/engagement";
import { resolveProfileImageUrl } from "@/shared/utils/profileImage";
import { useAdminUsersGet } from "@/features/adminUsers";

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = React.useRef<HTMLElement>(null);
  const logout = useLogout();
  const { clearAuth, state } = useAuth();
  const canUsersManage = usePermission("admin:manage");
  const canContactManage = usePermission("contact:manage");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [viewedContactIds, setViewedContactIds] = React.useState<ReadonlySet<string>>(new Set());
  const contactList = useContactList({ page: 1, limit: 20 }, Boolean(state.user) && canContactManage);
  const ordersList = useOrders({ page: 1, limit: 1 }, Boolean(state.user));
  const shipmentsList = useShipmentList({ page: 1, limit: 1 }, Boolean(state.user));
  const inquiryList = useInquiryList({ page: 1, limit: 1 }, Boolean(state.user));
  const siteInquiryList = useSiteInquiryList({ page: 1, limit: 1 }, Boolean(state.user));
  const reviewList = useReviewList({ page: 1, limit: 1 }, Boolean(state.user));
  const paymentsList = usePaymentsList({ page: 1, limit: 1 }, Boolean(state.user));
  const userId = typeof state.user?.id === "string" ? state.user.id : "";
  const currentUserQuery = useAdminUsersGet(userId, Boolean(userId));

  React.useEffect(() => {
    const syncViewed = () => {
      try {
        const raw = sessionStorage.getItem("viewedContactIds");
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        setViewedContactIds(new Set(Array.isArray(parsed) ? parsed : []));
      } catch {
        setViewedContactIds(new Set());
      }
    };
    syncViewed();
    window.addEventListener("viewed-contacts-changed", syncViewed);
    return () => window.removeEventListener("viewed-contacts-changed", syncViewed);
  }, []);

  const unreadContacts = React.useMemo(() => {
    const rows = contactList.data?.data ?? [];
    return rows
      .filter((row) => !row.isView && !(row as { isViewed?: boolean }).isViewed && !viewedContactIds.has(row.id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.createdAt,
      }));
  }, [contactList.data?.data, viewedContactIds]);

  const notificationCounts = React.useMemo(() => {
    const ordersCount = (ordersList.data as { total?: number } | undefined)?.total ?? 0;
    const deliveryCount = (shipmentsList.data as { total?: number } | undefined)?.total ?? 0;
    const inquiriesCount = (inquiryList.data as { total?: number } | undefined)?.total ?? 0;
    const siteInquiriesCount = (siteInquiryList.data as { total?: number } | undefined)?.total ?? 0;
    const reviewsCount = (reviewList.data as { total?: number } | undefined)?.total ?? 0;

    const paymentsCount = (paymentsList.data as { total?: number } | undefined)?.total ?? 0;

    return {
      orders: ordersCount,
      payments: paymentsCount,
      delivery: deliveryCount,
      "product-inquiries": inquiriesCount,
      "site-inquiries": siteInquiriesCount,
      contacts: unreadContacts.length,
      reviews: reviewsCount,
    } as const;
  }, [
    inquiryList.data,
    ordersList.data,
    paymentsList.data,
    reviewList.data,
    shipmentsList.data,
    siteInquiryList.data,
    unreadContacts.length,
  ]);

  const fullName = [state.user?.firstname, state.user?.lastname].filter(Boolean).join(" ").trim();
  const isPlaceholderName =
    fullName.length === 0 ||
    fullName.toLowerCase() === "user" ||
    fullName.toLowerCase() === "user user";
  const displayName =
    (!isPlaceholderName ? fullName : "") ||
    (state.user as { username?: string; name?: string } | null)?.username?.trim() ||
    (state.user as { username?: string; name?: string } | null)?.name?.trim() ||
    state.user?.email?.split("@")[0] ||
    "User";
  const profilePicture = resolveProfileImageUrl(currentUserQuery.data ?? state.user);
  const isRoleFormRoute =
    location.pathname === "/dashboard/rbac/roles/create" ||
    /^\/dashboard\/rbac\/roles\/[^/]+\/edit$/.test(location.pathname);

  React.useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  // Derive the set of backend module names the user has any permission for.
  // null = wildcard (*) → all modules accessible.
  const accessibleModules = React.useMemo((): ReadonlySet<string> | null => {
    const perms = state.permissions;
    if (perms.includes("*")) return null;
    if (perms.length === 0) return null; // no perms in DB → fall back to role
    return new Set(perms.map((p) => p.split(":")[0]).filter(Boolean));
  }, [state.permissions]);

  const hasModuleAccess = React.useCallback(
    (moduleKey: string): boolean => {
      const required = SIDEBAR_BACKEND_MODULES[moduleKey];
      // SUDOADMIN-only modules
      if (required?.includes("__sudoadmin_only__")) {
        return state.role === "SUDOADMIN";
      }
      // Wildcard or SUDOADMIN/ADMIN with no explicit DB perms → show all
      if (accessibleModules === null) {
        return state.role === "SUDOADMIN" || state.role === "ADMIN" || state.permissions.includes("*");
      }
      // Key not in map → always visible
      if (!required) return true;
      // Empty array → visible only if user has any permissions at all
      if (required.length === 0) return accessibleModules.size > 0;
      return required.some((m) => accessibleModules.has(m));
    },
    [accessibleModules, state.role, state.permissions]
  );

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-transparent">
      <div className="flex h-full min-h-0">
        <Sidebar
          canUsersManage={canUsersManage}
          canContactManage={canContactManage}
          hasModuleAccess={hasModuleAccess}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          notificationCounts={notificationCounts}
        />
        <main
          ref={mainRef}
          className={`relative h-full min-w-0 flex-1 overscroll-contain ${
            isRoleFormRoute
              ? "overflow-y-auto xl:overflow-hidden"
              : "overflow-y-auto"
          }`}
        >
          <TopNav
            displayName={displayName}
            roleLabel={state.role ?? "USER"}
            email={state.user?.email}
            profilePicture={profilePicture || undefined}
            onOpenMobile={() => setMobileOpen(true)}
            onProfile={() => navigate("/dashboard/profile")}
            onLogout={onLogout}
            isLoggingOut={logout.isPending}
            unreadContactsCount={unreadContacts.length}
            unreadContacts={unreadContacts}
          />
          <div className="w-full">
            <div className="premium-animate-in min-w-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
