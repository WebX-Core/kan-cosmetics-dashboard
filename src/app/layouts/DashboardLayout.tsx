import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useLogout } from "@/features/auth";
import { useAuth } from "@/app/providers/AuthContext";
import { usePermission } from "@/shared/hooks/usePermission";
import { can, type AppPermission } from "@/shared/auth/permissions";
import { Sidebar } from "@/shared/components/dashboard/Sidebar";
import { TopNav } from "@/shared/components/dashboard/TopNav";
import { useContactList } from "@/features/contact";
import { useOrders, usePaymentsAggregate } from "@/features/commerce";
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
  const logout = useLogout();
  const { clearAuth, state } = useAuth();
  const canUsersManage = usePermission("users.manage");
  const canContactManage = usePermission("contact.manage");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [viewedContactIds, setViewedContactIds] = React.useState<ReadonlySet<string>>(new Set());
  const contactList = useContactList({ page: 1, limit: 100 }, Boolean(state.user) && canContactManage);
  const ordersList = useOrders({ page: 1, limit: 1 }, Boolean(state.user));
  const shipmentsList = useShipmentList({ page: 1, limit: 1 }, Boolean(state.user));
  const inquiryList = useInquiryList({ page: 1, limit: 1 }, Boolean(state.user));
  const siteInquiryList = useSiteInquiryList({ page: 1, limit: 1 }, Boolean(state.user));
  const reviewList = useReviewList({ page: 1, limit: 1 }, Boolean(state.user));
  const paymentsAggregate = usePaymentsAggregate();
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

    const paymentsRows = (paymentsAggregate.data ?? []).flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const payload = (entry as { paymentPayload?: unknown }).paymentPayload;
      if (Array.isArray(payload)) return payload;
      return ((payload as { data?: unknown[] } | undefined)?.data ?? []);
    });

    return {
      orders: ordersCount,
      payments: paymentsRows.length,
      delivery: deliveryCount,
      "product-inquiries": inquiriesCount,
      "site-inquiries": siteInquiriesCount,
      contacts: unreadContacts.length,
      reviews: reviewsCount,
    } as const;
  }, [
    inquiryList.data,
    ordersList.data,
    paymentsAggregate.data,
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

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  };

  const hasPermission = React.useCallback(
    (permission: AppPermission): boolean => {
      if (state.permissions.length > 0) return state.permissions.includes(permission);
      return can(state.role, permission);
    },
    [state.permissions, state.role]
  );

  const hasModuleAccess = React.useCallback(
    (moduleKey: string): boolean => {
      const permissionByModuleKey: Readonly<Record<string, AppPermission>> = {
        users: "users.manage",
        permissions: "users.manage",
        contacts: "contact.manage",
        "product-inquiries": "contact.manage",
        "site-inquiries": "contact.manage",
        reviews: "contact.manage",
        faqs: "contact.manage",
        "customer-bans": "contact.manage",
        "customer-addresses": "contact.manage",
      };
      const needed = permissionByModuleKey[moduleKey];
      if (!needed) return true;
      return hasPermission(needed);
    },
    [hasPermission]
  );

  return (
    <div className="dashboard-shell min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <Sidebar
          canUsersManage={canUsersManage}
          canContactManage={canContactManage}
          hasModuleAccess={hasModuleAccess}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          notificationCounts={notificationCounts}
        />
        <main className="relative min-w-0 flex-1">
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
