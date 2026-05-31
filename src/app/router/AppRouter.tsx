import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "../guards/ProtectedRoute";
import { PermissionGuard } from "../guards/PermissionGuard";
import { LoginPage } from "../../pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ChangePasswordPage } from "@/pages/auth/ChangePasswordPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { RoleGuard } from "../guards/RoleGuard";
import { CsrPage } from "../../pages/dashboard/csr/CsrPage";
import { NewsroomPage } from "../../pages/dashboard/newsroom/NewsroomPage";
import { TeamPage } from "../../pages/dashboard/team/TeamPage";
import { CompanyPage } from "../../pages/dashboard/company/CompanyPage";
import { TeamCreatePage } from "../../pages/dashboard/team/TeamCreatePage";
import { TeamEditPage } from "../../pages/dashboard/team/TeamEditPage";
import { CompanyCreatePage } from "../../pages/dashboard/company/CompanyCreatePage";
import { CompanyEditPage } from "../../pages/dashboard/company/CompanyEditPage";
import { CsrCreatePage } from "../../pages/dashboard/csr/CsrCreatePage";
import { CsrEditPage } from "../../pages/dashboard/csr/CsrEditPage";
import { NewsroomCreatePage } from "../../pages/dashboard/newsroom/NewsroomCreatePage";
import { NewsroomEditPage } from "../../pages/dashboard/newsroom/NewsroomEditPage";
import { UserFormPage } from "../../pages/dashboard/users/UserFormPage";
import { PermissionsUsersPage } from "../../pages/dashboard/permissions/PermissionsUsersPage";
import { UserPermissionsSetPage } from "../../pages/dashboard/permissions/UserPermissionsSetPage";
import { UsersPage } from "../../pages/dashboard/users/UsersPage";
import { ProfilePage } from "../../pages/dashboard/profile/ProfilePage";
import { DashboardOverviewPage } from "../../pages/dashboard/overview/DashboardOverviewPage";
import { ProductCreatePage } from "../../pages/dashboard/products/ProductCreatePage";
import { ProductDetailsPage } from "../../pages/dashboard/products/ProductDetailsPage";
import { OrdersPage } from "../../pages/dashboard/orders/OrdersPage";
import { OrderDetailsPage } from "../../pages/dashboard/orders/OrderDetailsPage";
import { OrderCreatePage } from "../../pages/dashboard/orders/OrderCreatePage";
import { InventoryPage } from "../../pages/dashboard/inventory/InventoryPage";
import { InventoryDetailsPage } from "../../pages/dashboard/inventory/InventoryDetailsPage";
import { ReportsPage } from "../../pages/dashboard/reports/ReportsPage";
import { ReportDetailsPage } from "../../pages/dashboard/reports/ReportDetailsPage";
import { CategoriesPage } from "../../pages/dashboard/categories/CategoriesPage";
import {
  CategoryCreatePage,
  CategoryDetailPage,
  CategoryEditPage,
  SubcategoriesPage,
  SubcategoryCreatePage,
  SubcategoryDetailPage,
  SubcategoryEditPage,
} from "../../pages/dashboard/categories";
import { CartsPage } from "../../pages/dashboard/carts/CartsPage";
import { WishlistsPage } from "../../pages/dashboard/wishlists/WishlistsPage";
import { PaymentsPage } from "../../pages/dashboard/payments/PaymentsPage";
import { CouponsPage, CouponCreatePage, CouponDetailPage } from "../../pages/dashboard/coupons";
import { CustomersPage } from "../../pages/dashboard/customers/CustomersPage";
import { CustomerDetailsPage } from "../../pages/dashboard/customers/CustomerDetailsPage";
import { ReviewsPage } from "../../pages/dashboard/reviews/ReviewsPage";
import { ContactPage } from "../../pages/dashboard/contact/ContactPage";
import { ContactCreatePage } from "../../pages/dashboard/contact/ContactCreatePage";
import { ProductInquiriesPage } from "../../pages/dashboard/inquiries/ProductInquiriesPage";
import { SiteInquiriesPage } from "../../pages/dashboard/inquiries/SiteInquiriesPage";
import { FaqFormPage, FaqsPage } from "../../pages/dashboard/faqs";
import { NewsletterPage } from "@/pages/dashboard/marketing/newsletter/NewsletterPage";
import {
  BlogPostCreatePage,
  BlogPostEditPage,
  BlogPostsPage,
} from "@/pages/dashboard/marketing/blog/BlogPostsCrudPages";
import { ActivityLogsPage } from "../../pages/dashboard/reports/ActivityLogsPage";
import { AuditLogsPage } from "../../pages/dashboard/reports/AuditLogsPage";
import {
  CompanyViewPage,
  ContactViewPage,
  CsrViewPage,
  NewsroomViewPage,
  TeamViewPage,
  UsersViewPage,
} from "../../pages/dashboard/views/EntityViewPages";
import {
  CouponUsagePage,
  ProductMediaPage,
  PurchaseHistoryPage,
  RolePermissionsPage,
  RolesPage,
  SeoMetadataPage,
  UserMetadataPage,
  UserPermissionsPage,
  UserRolesPage,
} from "@/pages/dashboard/system/SystemModulesPage";
import { AdvertisementsPage } from "@/pages/dashboard/marketing/AdvertisementsPage";
import { AdvertisementFormPage } from "@/pages/dashboard/marketing/AdvertisementFormPage";
import { PermissionsPage } from "@/pages/dashboard/permissions/PermissionsPage";
import { PermissionFormPage } from "@/pages/dashboard/permissions/PermissionFormPage";
import { RolesCreatePage } from "@/pages/dashboard/system/RolesCreatePage";
import {
  CourierBranchesCreatePage,
  CourierBranchesEditPage,
  CourierBranchesListPage,
  CourierPickupAddressesCreatePage,
  CourierPickupAddressesEditPage,
  CourierPickupAddressesListPage,
  CouriersCreatePage,
  CouriersEditPage,
  CouriersListPage,
  DeliveryApiLogsCreatePage,
  DeliveryApiLogsEditPage,
  DeliveryApiLogsListPage,
  DeliveryWebhookEventsCreatePage,
  DeliveryWebhookEventsEditPage,
  DeliveryWebhookEventsListPage,
  PickupRequestsCreatePage,
  PickupRequestsEditPage,
  PickupRequestsListPage,
  ShipmentsCreatePage,
  ShipmentsEditPage,
  ShipmentsListPage,
  ShipmentTrackingCreatePage,
  ShipmentTrackingEditPage,
  ShipmentTrackingListPage,
} from "@/pages/dashboard/delivery/DeliveryCrudPages";
import {
  RepliesCreatePage,
  RepliesEditPage,
  RepliesPage,
} from "@/pages/dashboard/support/RepliesCrudPages";
import { ApiOpsPage } from "@/pages/dashboard/system/ApiOpsPage";
import { TempCatalogSeederPage } from "@/pages/dashboard/system/TempCatalogSeederPage";
import { TempEngagementSeederPage } from "@/pages/dashboard/system/TempEngagementSeederPage";
import {
  ProductVariantCreatePage,
  ProductVariantEditPage,
  ProductVariantsPage,
} from "@/pages/dashboard/catalog/ProductVariantsCrudPages";
import {
  ProductAttributeCreatePage,
  ProductAttributeEditPage,
  ProductAttributesPage,
  ProductAttributesTagsHubPage,
  ProductTagCreatePage,
  ProductTagEditPage,
  ProductTagsPage,
} from "@/pages/dashboard/catalog/ProductTagAttributeCrudPages";
import { ProductsListPage } from "@/pages/dashboard/products/ProductsListPage";
import { ProductBulkPage } from "@/pages/dashboard/products/ProductBulkPage";
import { ProductFaqsPage } from "@/pages/dashboard/products/ProductFaqsPage";
import { ProductFaqFormPage } from "@/pages/dashboard/products/ProductFaqFormPage";
import { EmailCampaignsPage } from "@/pages/dashboard/marketing/email/EmailCampaignsPage";
import { EmailRecipientsPage } from "@/pages/dashboard/marketing/email/EmailRecipientsPage";
import { EmailQueuePage } from "@/pages/dashboard/marketing/email/EmailQueuePage";
import { EmailLogsPage } from "@/pages/dashboard/marketing/email/EmailLogsPage";
import { EmailCampaignFormPage } from "@/pages/dashboard/marketing/email/EmailCampaignFormPage";
import { EmailRecipientFormPage } from "@/pages/dashboard/marketing/email/EmailRecipientFormPage";
import { WebPushSubscriptionsPage } from "@/pages/dashboard/marketing/web-push/WebPushSubscriptionsPage";
import { WebPushNotificationsPage } from "@/pages/dashboard/marketing/web-push/WebPushNotificationsPage";
import { WebPushNotificationFormPage } from "@/pages/dashboard/marketing/web-push/WebPushNotificationFormPage";
import { CustomerBanPage } from "@/pages/dashboard/customers/CustomerBanPage";
import { CustomerBanFormPage } from "@/pages/dashboard/customers/CustomerBanFormPage";
import { CustomerAddressesPage } from "@/pages/dashboard/customers/CustomerAddressesPage";

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route element={<RoleGuard allow={["ADMIN", "SUDOADMIN"]} />}>
            <Route element={<PermissionGuard permission="users.manage" />}>
              <Route
                path="/dashboard/users"
                element={<UsersPage />}
              />
              <Route
                path="/dashboard/users/create"
                element={<UserFormPage />}
              />
              <Route
                path="/dashboard/users/:id/edit"
                element={<UserFormPage />}
              />
              <Route path="/dashboard/users/:id" element={<UsersViewPage />} />
            </Route>
            <Route path="/dashboard/permissions/users" element={<PermissionsUsersPage />} />
            <Route path="/dashboard/permissions/users/:id" element={<UserPermissionsSetPage />} />
          </Route>

          <Route path="/dashboard" element={<DashboardOverviewPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard/temp-catalog-seeder" element={<TempCatalogSeederPage />} />
          <Route path="/dashboard/temp-engagement-seeder" element={<TempEngagementSeederPage />} />
          <Route
            path="/dashboard/change-password"
            element={<ChangePasswordPage />}
          />

          <Route path="/dashboard/auth/signup" element={<SignupPage />} />

          <Route
            path="/dashboard/products/create"
            element={<ProductCreatePage />}
          />
          <Route
            path="/dashboard/products/:id/edit"
            element={<ProductCreatePage />}
          />
          <Route
            path="/dashboard/products/:id"
            element={<ProductDetailsPage />}
          />
          <Route
            path="/dashboard/products/:id/faqs"
            element={<ProductFaqsPage />}
          />
          <Route
            path="/dashboard/products/:id/faqs/create"
            element={<ProductFaqFormPage />}
          />
          <Route
            path="/dashboard/products/:id/faqs/:faqId/edit"
            element={<ProductFaqFormPage />}
          />
          <Route path="/dashboard/orders" element={<OrdersPage />} />
          <Route path="/dashboard/orders/create" element={<OrderCreatePage />} />
          <Route path="/dashboard/orders/:id" element={<OrderDetailsPage />} />
          <Route path="/dashboard/inventory" element={<InventoryPage />} />
          <Route
            path="/dashboard/inventory/create"
            element={<InventoryDetailsPage />}
          />
          <Route
            path="/dashboard/inventory/:id"
            element={<InventoryDetailsPage />}
          />
          <Route path="/dashboard/reports" element={<ReportsPage />} />
          <Route
            path="/dashboard/reports/:id"
            element={<ReportDetailsPage />}
          />
          <Route path="/dashboard/categories" element={<CategoriesPage />} />
          <Route path="/dashboard/categories/deleted" element={<CategoriesPage />} />
          <Route path="/dashboard/subcategories" element={<SubcategoriesPage />} />
          <Route path="/dashboard/subcategories/deleted" element={<SubcategoriesPage />} />
          <Route
            path="/dashboard/categories/create"
            element={<CategoryCreatePage />}
          />
          <Route
            path="/dashboard/categories/:id"
            element={<CategoryDetailPage />}
          />
          <Route
            path="/dashboard/categories/:id/deleted-subcategories"
            element={<CategoryDetailPage />}
          />
          <Route
            path="/dashboard/categories/:id/edit"
            element={<CategoryEditPage />}
          />
          <Route
            path="/dashboard/categories/:id/subcategories/create"
            element={<SubcategoryCreatePage />}
          />
          <Route
            path="/dashboard/categories/:id/subcategories/:subcategoryId"
            element={<SubcategoryDetailPage />}
          />
          <Route
            path="/dashboard/categories/:id/subcategories/:subcategoryId/deleted-products"
            element={<SubcategoryDetailPage />}
          />
          <Route
            path="/dashboard/categories/:id/subcategories/:subcategoryId/edit"
            element={<SubcategoryEditPage />}
          />
          <Route
            path="/dashboard/product-variants"
            element={<ProductVariantsPage />}
          />
          <Route
            path="/dashboard/product-variants/deleted"
            element={<ProductVariantsPage />}
          />
          <Route
            path="/dashboard/product-variants/create"
            element={<ProductVariantCreatePage />}
          />
          <Route
            path="/dashboard/product-variants/:id/edit"
            element={<ProductVariantEditPage />}
          />
          <Route
            path="/dashboard/product-attributes-tags"
            element={<ProductAttributesTagsHubPage />}
          />
          <Route
            path="/dashboard/product-tags"
            element={<ProductTagsPage />}
          />
          <Route
            path="/dashboard/product-tags/create"
            element={<ProductTagCreatePage />}
          />
          <Route
            path="/dashboard/product-tags/:id/edit"
            element={<ProductTagEditPage />}
          />
          <Route
            path="/dashboard/product-attributes"
            element={<ProductAttributesPage />}
          />
          <Route
            path="/dashboard/product-attributes/create"
            element={<ProductAttributeCreatePage />}
          />
          <Route
            path="/dashboard/product-attributes/:id/edit"
            element={<ProductAttributeEditPage />}
          />
          <Route
            path="/dashboard/product-media"
            element={<ProductMediaPage />}
          />
          <Route
            path="/dashboard/product-media/:id"
            element={<ProductMediaPage />}
          />
          <Route path="/dashboard/advertisements" element={<AdvertisementsPage />} />
          <Route path="/dashboard/advertisements/deleted" element={<AdvertisementsPage />} />
          <Route path="/dashboard/advertisements/create" element={<AdvertisementFormPage />} />
          <Route path="/dashboard/advertisements/:id/edit" element={<AdvertisementFormPage />} />
          <Route path="/dashboard/carts" element={<CartsPage />} />
          <Route path="/dashboard/carts/:id" element={<CartsPage />} />
          <Route path="/dashboard/wishlists" element={<WishlistsPage />} />
          <Route path="/dashboard/wishlists/:id" element={<WishlistsPage />} />
          <Route path="/dashboard/payments" element={<PaymentsPage />} />
          <Route path="/dashboard/payments/:id" element={<PaymentsPage />} />
          <Route path="/dashboard/coupons" element={<CouponsPage />} />
          <Route path="/dashboard/coupons/create" element={<CouponCreatePage />} />
          <Route path="/dashboard/coupons/:id/edit" element={<CouponCreatePage />} />
          <Route path="/dashboard/coupons/:id" element={<CouponDetailPage />} />
          <Route path="/dashboard/customers" element={<CustomersPage />} />
          <Route path="/dashboard/customers/:id" element={<CustomerDetailsPage />} />
          <Route
            path="/dashboard/delivery"
            element={<Navigate to="/dashboard/delivery/shipments" replace />}
          />
          <Route
            path="/dashboard/delivery/shipments"
            element={<ShipmentsListPage />}
          />
          <Route
            path="/dashboard/delivery/shipments/:id"
            element={<ShipmentsEditPage />}
          />
          <Route path="/dashboard/delivery/shipments/create" element={<ShipmentsCreatePage />} />
          <Route path="/dashboard/reviews" element={<ReviewsPage />} />
          <Route path="/dashboard/reviews/deleted" element={<ReviewsPage />} />
          <Route path="/dashboard/reviews/:id" element={<ReviewsPage />} />
          <Route path="/dashboard/faqs" element={<FaqsPage />} />
          <Route path="/dashboard/faqs/deleted" element={<FaqsPage />} />
          <Route path="/dashboard/faqs/create" element={<FaqFormPage />} />
          <Route path="/dashboard/faqs/:id/edit" element={<FaqFormPage />} />
          <Route
            path="/dashboard/faqs/:id"
            element={<Navigate to="edit" replace />}
          />
          <Route
            path="/dashboard/support/product-inquiries"
            element={<ProductInquiriesPage />}
          />
          <Route
            path="/dashboard/support/product-inquiries/deleted"
            element={<ProductInquiriesPage />}
          />
          <Route
            path="/dashboard/support/product-inquiries/:id"
            element={<ProductInquiriesPage />}
          />
          <Route path="/dashboard/support/contacts" element={<ContactPage />} />
          <Route
            path="/dashboard/support/contacts/:id"
            element={<ContactViewPage />}
          />
          <Route
            path="/dashboard/support/site-inquiries"
            element={<SiteInquiriesPage />}
          />
          <Route
            path="/dashboard/support/site-inquiries/deleted"
            element={<SiteInquiriesPage />}
          />
          <Route
            path="/dashboard/support/site-inquiries/:id"
            element={<SiteInquiriesPage />}
          />
          <Route path="/dashboard/support/replies" element={<RepliesPage />} />
          <Route path="/dashboard/support/replies/create" element={<RepliesCreatePage />} />
          <Route path="/dashboard/support/replies/:id/edit" element={<RepliesEditPage />} />
          <Route path="/dashboard/blog-posts" element={<BlogPostsPage />} />
          <Route
            path="/dashboard/blog-posts/create"
            element={<BlogPostCreatePage />}
          />
          <Route
            path="/dashboard/blog-posts/:id/edit"
            element={<BlogPostEditPage />}
          />
          <Route path="/dashboard/blog-posts/:id" element={<BlogPostsPage />} />
          <Route
            path="/dashboard/seo-metadata"
            element={<SeoMetadataPage />}
          />
          <Route
            path="/dashboard/seo-metadata/:id"
            element={<SeoMetadataPage />}
          />
          <Route path="/dashboard/newsletter" element={<NewsletterPage />} />
          <Route path="/dashboard/newsletter/:id" element={<NewsletterPage />} />
          <Route
            path="/dashboard/activity-logs"
            element={<ActivityLogsPage />}
          />
          <Route
            path="/dashboard/activity-logs/:id"
            element={<ActivityLogsPage />}
          />
          <Route path="/dashboard/audit-logs" element={<AuditLogsPage />} />
          <Route path="/dashboard/audit-logs/:id" element={<AuditLogsPage />} />

          <Route path="/dashboard/contact" element={<ContactPage />} />
          <Route path="/dashboard/contact/deleted" element={<ContactPage />} />
          <Route
            path="/dashboard/contact/create"
            element={<ContactCreatePage />}
          />
          <Route path="/dashboard/contact/:id" element={<ContactViewPage />} />
          <Route path="/dashboard/coupon-usage" element={<CouponUsagePage />} />
          <Route path="/dashboard/purchase-history" element={<PurchaseHistoryPage />} />
          <Route path="/dashboard/rbac/roles" element={<RolesPage />} />
          <Route path="/dashboard/rbac/roles/create" element={<RolesCreatePage />} />
          <Route path="/dashboard/rbac/roles/:id/edit" element={<RolesCreatePage />} />
          <Route path="/dashboard/rbac/permissions" element={<PermissionsPage />} />
          <Route path="/dashboard/rbac/permissions/deleted" element={<PermissionsPage />} />
          <Route path="/dashboard/rbac/permissions/create" element={<PermissionFormPage />} />
          <Route path="/dashboard/rbac/permissions/:id/edit" element={<PermissionFormPage />} />
          <Route path="/dashboard/rbac/user-roles" element={<UserRolesPage />} />
          <Route path="/dashboard/rbac/role-permissions" element={<RolePermissionsPage />} />
          <Route path="/dashboard/rbac/user-permissions" element={<UserPermissionsPage />} />
          <Route path="/dashboard/user-metadata" element={<UserMetadataPage />} />
          <Route path="/dashboard/system/api-ops" element={<ApiOpsPage />} />
          <Route path="/dashboard/delivery/couriers" element={<CouriersListPage />} />
          <Route path="/dashboard/delivery/couriers/create" element={<CouriersCreatePage />} />
          <Route path="/dashboard/delivery/couriers/:id/edit" element={<CouriersEditPage />} />
          <Route path="/dashboard/delivery/courier-branches" element={<CourierBranchesListPage />} />
          <Route path="/dashboard/delivery/courier-branches/create" element={<CourierBranchesCreatePage />} />
          <Route path="/dashboard/delivery/courier-branches/:id/edit" element={<CourierBranchesEditPage />} />
          <Route path="/dashboard/delivery/courier-pickup-addresses" element={<CourierPickupAddressesListPage />} />
          <Route path="/dashboard/delivery/courier-pickup-addresses/create" element={<CourierPickupAddressesCreatePage />} />
          <Route path="/dashboard/delivery/courier-pickup-addresses/:id/edit" element={<CourierPickupAddressesEditPage />} />
          <Route path="/dashboard/delivery/shipment-tracking" element={<ShipmentTrackingListPage />} />
          <Route path="/dashboard/delivery/shipment-tracking/create" element={<ShipmentTrackingCreatePage />} />
          <Route path="/dashboard/delivery/shipment-tracking/:id/edit" element={<ShipmentTrackingEditPage />} />
          <Route path="/dashboard/delivery/pickup-requests" element={<PickupRequestsListPage />} />
          <Route path="/dashboard/delivery/pickup-requests/create" element={<PickupRequestsCreatePage />} />
          <Route path="/dashboard/delivery/pickup-requests/:id/edit" element={<PickupRequestsEditPage />} />
          <Route path="/dashboard/delivery/api-logs" element={<DeliveryApiLogsListPage />} />
          <Route path="/dashboard/delivery/api-logs/create" element={<DeliveryApiLogsCreatePage />} />
          <Route path="/dashboard/delivery/api-logs/:id/edit" element={<DeliveryApiLogsEditPage />} />
          <Route path="/dashboard/delivery/webhook-events" element={<DeliveryWebhookEventsListPage />} />
          <Route path="/dashboard/delivery/webhook-events/create" element={<DeliveryWebhookEventsCreatePage />} />
          <Route path="/dashboard/delivery/webhook-events/:id/edit" element={<DeliveryWebhookEventsEditPage />} />

          <Route path="/dashboard/team" element={<TeamPage />} />
          <Route element={<PermissionGuard permission="entity.create" />}>
            <Route path="/dashboard/team/create" element={<TeamCreatePage />} />
          </Route>
          <Route element={<PermissionGuard permission="entity.update" />}>
            <Route
              path="/dashboard/team/:slug/edit"
              element={<TeamEditPage />}
            />
          </Route>
          <Route path="/dashboard/team/:slug" element={<TeamViewPage />} />

          <Route path="/dashboard/company" element={<CompanyPage />} />
          <Route element={<PermissionGuard permission="entity.create" />}>
            <Route
              path="/dashboard/company/create"
              element={<CompanyCreatePage />}
            />
          </Route>
          <Route element={<PermissionGuard permission="entity.update" />}>
            <Route
              path="/dashboard/company/:slug/edit"
              element={<CompanyEditPage />}
            />
          </Route>
          <Route
            path="/dashboard/company/:slug"
            element={<CompanyViewPage />}
          />

          <Route path="/dashboard/csr" element={<CsrPage />} />
          <Route element={<PermissionGuard permission="entity.create" />}>
            <Route path="/dashboard/csr/create" element={<CsrCreatePage />} />
          </Route>
          <Route element={<PermissionGuard permission="entity.update" />}>
            <Route path="/dashboard/csr/:slug/edit" element={<CsrEditPage />} />
          </Route>
          <Route path="/dashboard/csr/:slug" element={<CsrViewPage />} />

          <Route path="/dashboard/newsroom" element={<NewsroomPage />} />
          <Route element={<PermissionGuard permission="entity.create" />}>
            <Route
              path="/dashboard/newsroom/create"
              element={<NewsroomCreatePage />}
            />
          </Route>
          <Route element={<PermissionGuard permission="entity.update" />}>
            <Route
              path="/dashboard/newsroom/:slug/edit"
              element={<NewsroomEditPage />}
            />
          </Route>
          <Route
            path="/dashboard/newsroom/:slug"
            element={<NewsroomViewPage />}
          />

          {/* Products list */}
          <Route path="/dashboard/products" element={<ProductsListPage />} />
          <Route path="/dashboard/products/bulk" element={<ProductBulkPage />} />

          {/* Email campaigns */}
          <Route path="/dashboard/marketing/email-campaigns" element={<EmailCampaignsPage />} />
          <Route path="/dashboard/marketing/email-campaigns/deleted" element={<EmailCampaignsPage />} />
          <Route path="/dashboard/marketing/email-campaigns/create" element={<EmailCampaignFormPage />} />
          <Route path="/dashboard/marketing/email-campaigns/:id/edit" element={<EmailCampaignFormPage />} />
          <Route path="/dashboard/marketing/email-campaigns/:id" element={<EmailCampaignsPage />} />

          {/* Email recipients */}
          <Route path="/dashboard/marketing/email-recipients" element={<EmailRecipientsPage />} />
          <Route path="/dashboard/marketing/email-recipients/deleted" element={<EmailRecipientsPage />} />
          <Route path="/dashboard/marketing/email-recipients/create" element={<EmailRecipientFormPage />} />
          <Route path="/dashboard/marketing/email-recipients/:id/edit" element={<EmailRecipientFormPage />} />

          {/* Email queue & logs */}
          <Route path="/dashboard/marketing/email-queue" element={<EmailQueuePage />} />
          <Route path="/dashboard/marketing/email-logs" element={<EmailLogsPage />} />

          {/* Web Push */}
          <Route path="/dashboard/marketing/web-push/subscriptions" element={<WebPushSubscriptionsPage />} />
          <Route path="/dashboard/marketing/web-push/notifications" element={<WebPushNotificationsPage />} />
          <Route path="/dashboard/marketing/web-push/notifications/deleted" element={<WebPushNotificationsPage />} />
          <Route path="/dashboard/marketing/web-push/notifications/create" element={<WebPushNotificationFormPage />} />
          <Route path="/dashboard/marketing/web-push/notifications/:id/edit" element={<WebPushNotificationFormPage />} />
          <Route path="/dashboard/marketing/web-push" element={<Navigate to="/dashboard/marketing/web-push/notifications" replace />} />

          {/* Customer management */}
          <Route path="/dashboard/customers/bans" element={<CustomerBanPage />} />
          <Route path="/dashboard/customers/bans/create" element={<CustomerBanFormPage />} />
          <Route path="/dashboard/customers/bans/:id/edit" element={<CustomerBanFormPage />} />
          <Route path="/dashboard/customers/addresses" element={<CustomerAddressesPage />} />

        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<div>Not Found</div>} />
    </Routes>
  );
};
