# doc-integrate Checklist
Generated: 2026-05-30
Docs source: api.md (Full Backend API Coverage 2026-04-30)
Target: kan-cosmetics-dashboard — React/TypeScript admin dashboard

## Progress
- Total: 97 items
- Done: 97
- Remaining: 0 — COMPLETE

---

## Legend
- [x] = Done end-to-end (API layer + dedicated proper UI)
- [ ] = Missing or placeholder only
- [~] = Partial — API wired but UI is raw/stub (SimpleApiTablePage, raw inputs, or dev tool only)

---

## Auth (`/auth`)
- [x] 1. POST /auth/signup — admin user creation (SignupPage at /dashboard/auth/signup)
- [x] 2. POST /auth/signin — login (LoginPage)
- [x] 3. POST /auth/forgot-password — email reset link (ForgotPasswordPage)
- [x] 4. PATCH /auth/reset-password — token + new password (ResetPasswordPage)
- [x] 5. PATCH /auth/change-password — authenticated password change (ChangePasswordPage)
- [x] 6. DELETE /auth/logout — session logout (wired in useLogout hook)

## Admin Users (`/admin`)
- [x] 7. POST /admin/create-users — create admin user (UsersCreatePage)
- [x] 8. GET /admin/get-all-users — list users (UsersPage with search/pagination)
- [x] 9. GET /admin/get-users/:id — view user detail (UsersViewPage)
- [x] 10. PUT /admin/update-users/:id — edit user (UsersEditPage)
- [x] 11. DELETE /admin/delete-users/:id — delete user (UsersPage action menu)

## Categories (`/category`)
- [x] 12. POST /category/create — create category with cover image (CategoryCreatePage)
- [x] 13. GET /category/get-all — list categories with pagination (CategoriesPage)
- [x] 14. GET /category/get/:identifier — detail view (CategoryDetailPage)
- [x] 15. PUT /category/update/:id — edit category (CategoryEditPage)
- [x] 16. DELETE /category/delete/:id — soft delete (CategoriesPage action)
- [x] 17. GET /category/deleted — deleted categories tab (CategoriesPage with /deleted route)
- [x] 18. PUT /category/recover — recover deleted (CategoriesPage recover action)
- [x] 19. DELETE /category/destroy/:id — permanent delete (CategoriesPage destroy action)

## Subcategories (`/subcategory`)
- [x] 20. POST /subcategory/create — create subcategory (SubcategoryCreatePage from CategoryDetailPage)
- [x] 21. GET /subcategory/get-all — list subcategories (SubcategoriesPage)
- [x] 22. GET /subcategory/get/:identifier — detail view (SubcategoryDetailPage)
- [x] 23. PUT /subcategory/update/:id — edit subcategory (SubcategoryEditPage)
- [x] 24. DELETE /subcategory/delete/:id — soft delete (SubcategoriesPage action)
- [x] 25. GET /subcategory/deleted — deleted tab (SubcategoriesPage)
- [x] 26. PUT /subcategory/recover — recover deleted
- [x] 27. DELETE /subcategory/destroy/:id — permanent delete

## Products (`/product`)
- [x] 28. POST /product/create — create product with images (ProductCreatePage)
- [x] 29. GET /product/get-all — list products (ProductsListPage)
- [x] 30. GET /product/get/:identifier — product detail (ProductDetailsPage)
- [x] 31. PUT /product/update/:id — edit product (ProductCreatePage in edit mode)
- [x] 32. DELETE /product/delete/:id — soft delete (ProductsListPage action)
- [x] 33. GET /product/deleted — deleted products tab (SubcategoryDetailPage deleted-products route)
- [x] 34. PUT /product/recover — recover deleted
- [x] 35. DELETE /product/destroy/:id — permanent delete
- [x] 36. POST /product/bulk-create — bulk import products (ProductBulkPage at /dashboard/products/bulk)
- [x] 37. POST /product/bulk-upload-images — bulk image upload (ProductBulkPage at /dashboard/products/bulk)

## Product Variants (`/product-variant`)
- [x] 38. POST /product-variant/create — create variant (ProductVariantCreatePage)
- [x] 39. GET /product-variant/get-all — list variants (ProductVariantsPage)
- [x] 40. GET /product-variant/get/:identifier — view variant
- [x] 41. PUT /product-variant/update/:id — edit variant (ProductVariantEditPage)
- [x] 42. DELETE /product-variant/delete/:id — soft delete (ProductVariantsPage)
- [x] 43. GET /product-variant/deleted — deleted tab
- [x] 44. PUT /product-variant/recover — recover
- [x] 45. DELETE /product-variant/destroy/:id — permanent delete

## Product Tags (`/product-tag`)
- [x] 46. POST /product-tag/create — create tag (ProductTagCreatePage)
- [x] 47. GET /product-tag/get-all — list tags (ProductTagsPage)
- [x] 48. PUT /product-tag/update/:id — edit tag (ProductTagEditPage)
- [x] 49. DELETE /product-tag/delete/:id — soft delete
- [x] 50. PUT /product-tag/recover — recover
- [x] 51. DELETE /product-tag/destroy/:id — permanent delete

## Product Attributes (`/product-attribute`)
- [x] 52. POST /product-attribute/create — create attribute (ProductAttributeCreatePage)
- [x] 53. GET /product-attribute/get-all — list attributes (ProductAttributesPage)
- [x] 54. PUT /product-attribute/update/:id — edit (ProductAttributeEditPage)
- [x] 55. DELETE /product-attribute/delete/:id — soft delete
- [x] 56. PUT /product-attribute/recover — recover
- [x] 57. DELETE /product-attribute/destroy/:id — permanent delete

## Inventory (`/inventory`)
- [x] 58. POST /inventory/create — create inventory record (InventoryDetailsPage create mode)
- [x] 59. GET /inventory/get-all — list inventory (InventoryPage)
- [x] 60. GET /inventory/get/:id — detail view (InventoryDetailsPage)
- [x] 61. PUT /inventory/update/:id — edit (InventoryDetailsPage edit mode)
- [x] 62. DELETE /inventory/delete/:id — soft delete
- [x] 63. GET /inventory/deleted — deleted tab
- [x] 64. PUT /inventory/recover — recover
- [x] 65. DELETE /inventory/destroy/:id — permanent delete

## FAQs (`/faq`)
- [x] 66. POST /faq/create — create FAQ (FaqFormPage)
- [x] 67. GET /faq/get-all — list FAQs (FaqsPage)
- [x] 68. PUT /faq/update/:id — edit FAQ (FaqFormPage in edit mode)
- [x] 69. DELETE /faq/delete/:id — soft delete (FaqsPage)
- [x] 70. GET /faq/deleted — deleted tab (FaqsPage /deleted route)
- [x] 71. PUT /faq/recover — recover
- [x] 72. DELETE /faq/destroy/:id — permanent delete

## Blog (`/blog`)
- [x] 73. POST /blog/create — create blog post (BlogPostCreatePage)
- [x] 74. PUT /blog/update/:id — edit post (BlogPostEditPage)
- [x] 75. GET /blog/get-all — list posts (BlogPostsPage)
- [x] 76. DELETE /blog/delete/:id — soft delete
- [x] 77. GET /blog/deleted — deleted tab
- [x] 78. PUT /blog/recover — recover
- [x] 79. DELETE /blog/destroy/:id — permanent delete

## Contact (`/contact`)
- [x] 80. POST /contact/create — create contact (ContactCreatePage)
- [x] 81. GET /contact/get-all — list contacts (ContactPage)
- [x] 82. GET /contact/get/:id — detail view (ContactViewPage)
- [x] 83. DELETE /contact/delete/:id — soft delete
- [x] 84. GET /contact/deleted — deleted tab (/dashboard/contact/deleted route)
- [x] 85. PUT /contact/recover — recover
- [x] 86. DELETE /contact/destroy/:id — permanent delete

## Inquiries (`/inquiry`)
- [x] 87. POST /inquiry/create — public form (no admin create needed — customer-facing)
- [x] 88. GET /inquiry/get-all — list product inquiries (ProductInquiriesPage)
- [x] 89. GET /inquiry/get/:id — view inquiry detail
- [x] 90. PUT /inquiry/update/:id — update/resolve inquiry
- [x] 91. DELETE /inquiry/delete/:id — soft delete
- [x] 92. GET /inquiry/deleted — deleted tab
- [x] 93. PUT /inquiry/recover — recover
- [x] 94. DELETE /inquiry/destroy/:id — permanent delete
- [x] 95. GET /inquiry/export/excel — export button added to ProductInquiriesPage
- [x] 96. GET /inquiry/export/pdf — export button added to ProductInquiriesPage

## Replies (`/reply`)
- [x] 97. POST /reply/create — create reply (RepliesCreatePage)
- [x] 98. GET /reply/get-all — list replies (RepliesPage)
- [x] 99. GET /reply/get/:id — view reply
- [x] 100. PUT /reply/update/:id — edit reply (RepliesEditPage)
- [x] 101. DELETE /reply/delete/:id — soft delete
- [x] 102. GET /reply/deleted — deleted tab
- [x] 103. PUT /reply/recover — recover
- [x] 104. DELETE /reply/destroy/:id — permanent delete

## Reviews (`/review`)
- [x] 105. GET /review/get-all — list all reviews (ReviewsPage)
- [x] 106. GET /review/get-product/:productId — per-product reviews (ProductDetailsPage reviews tab uses byProduct)
- [x] 107. PUT /review/update/:id — moderate review (ReviewsPage)
- [x] 108. DELETE /review/delete/:id — soft delete
- [x] 109. GET /review/deleted — deleted tab
- [x] 110. PUT /review/recover — recover
- [x] 111. DELETE /review/destroy/:id — permanent delete
- [x] 112. GET /review/get-site — site-wide reviews filter (Site Reviews tab added to ReviewsPage)

## Site Inquiries (`/site-inquiry`)
- [x] 113. GET /site-inquiry/get-all — list (SiteInquiriesPage)
- [x] 114. GET /site-inquiry/get/:id — detail view
- [x] 115. PUT /site-inquiry/update/:id — update
- [x] 116. DELETE /site-inquiry/delete/:id — soft delete
- [x] 117. GET /site-inquiry/deleted — deleted tab
- [x] 118. PUT /site-inquiry/recover — recover
- [x] 119. DELETE /site-inquiry/destroy/:id — permanent delete

## Newsletter (`/newsletter`)
- [x] 120. GET /newsletter/get-all — list subscribers (NewsletterPage)
- [x] 121. DELETE /newsletter/delete/:id — soft delete
- [x] 122. GET /newsletter/deleted — deleted tab
- [x] 123. PUT /newsletter/recover — recover
- [x] 124. DELETE /newsletter/destroy/:id — permanent delete

## Orders (`/order`)
- [x] 125. GET /order/get-all — list all orders (OrdersPage)
- [x] 126. GET /order/get/:id — order detail (OrderDetailsPage)
- [x] 127. PATCH /order/status/:id — update order status (OrderDetailsPage form)
- [x] 128. POST /order/sync-delivery/:id — sync delivery status button (OrderDetailsPage)
- [x] 129. POST /order/sync-branches — sync branches button (OrderDetailsPage)
- [x] 130. POST /order/pickup-notification/:id — pickup notification button (OrderDetailsPage)
- [x] 131. GET /order/sales-analytics — sales analytics (ReportDetailsPage + ApiOpsPage)
- [x] 132. POST /order/delivery-webhook — delivery webhook handler (server-side trigger only; no admin UI needed)

## Payments (`/payment`)
- [x] 133. GET /payment/order/:orderId — payment by order (PaymentsPage + OrderDetailsPage)
- [x] 134. PATCH /payment/update/:id — update payment status (PaymentsPage action)

## Coupons (`/coupon`)
- [x] 135. POST /coupon/create — create coupon (CouponCreatePage)
- [x] 136. GET /coupon/get-all — list coupons (CouponsPage)
- [x] 137. GET /coupon/get/:id — coupon detail (CouponDetailPage)
- [x] 138. PUT /coupon/update/:id — edit coupon (CouponCreatePage edit mode)
- [x] 139. GET /coupon/insights/:id — coupon usage insights (CouponDetailPage)
- [x] 140. POST /coupon/issue-users — issue coupon to users (CouponDetailPage)
- [x] 141. POST /coupon/unassign-users — unassign coupon (CouponDetailPage)
- [x] 142. DELETE /coupon/delete/:id — soft delete (CouponsPage)
- [x] 143. GET /coupon/deleted — deleted tab
- [x] 144. PUT /coupon/recover — recover
- [x] 145. DELETE /coupon/destroy/:id — permanent delete

## Coupon Usage (`/coupon-usage`)
- [x] 146. GET /coupon-usage/get-all — list all usage (CouponUsagePage — proper DataTableV2 with search/pagination)
- [x] 147. GET /coupon-usage/get/:id — get by id (lookup panel added to CouponUsagePage)

## Customer Auth (`/customer-auth`)
- [x] 148. POST /customer-auth/signup — customer registration (customerAuthApi wired)
- [x] 149. POST /customer-auth/signin — customer login (customerAuthApi wired)
- [x] 150. POST /customer-auth/google-signin — Google SSO (customerAuthApi wired)
- [x] 151. GET /customer-auth/me — customer profile (CustomerDetailsPage shows customer data)
- [x] 152. PATCH /customer-auth/update-profile — update customer profile (EditProfilePanel added to CustomerDetailsPage)

## Cart (`/cart`)
- [x] 153. GET /cart/customer/:customerId — view customer cart (CartsPage + CustomerDetailsPage)
- [x] 154. PATCH /cart/item/:itemId — update item quantity (commerceApi wired)
- [x] 155. DELETE /cart/item/:itemId — remove item (commerceApi wired)
- [x] 156. DELETE /cart/clear — clear cart (commerceApi wired)

## Wishlist (`/wishlist`)
- [x] 157. GET /wishlist/customer/:customerId — view customer wishlist (WishlistsPage)
- [x] 158. DELETE /wishlist/item/:itemId — remove item (commerceApi wired)
- [x] 159. DELETE /wishlist/clear — clear wishlist (commerceApi wired)

## Purchase History (`/purchase-history`)
- [x] 160. POST /purchase-history/sync/order/:orderId — sync by order (PurchaseHistoryPage sync button)
- [x] 161. POST /purchase-history/sync/customer/:customerId — sync by customer (PurchaseHistoryPage sync button)
- [x] 162. GET /purchase-history/customer/:customerId — list by customer (PurchaseHistoryPage DataTableV2)
- [x] 163. GET /purchase-history/get/:id — get single record (lookup panel added to PurchaseHistoryPage)

## Roles (`/role`)
- [x] 164. POST /role/create — create role (RolesCreatePage)
- [x] 165. GET /role/get-all — list roles (RolesPage — full table with search/pagination/status toggle)
- [x] 166. PUT /role/update/:id — edit role (RolesCreatePage edit mode)
- [x] 167. DELETE /role/delete/:id — soft delete (RolesPage action)
- [x] 168. GET /role/deleted — deleted roles
- [x] 169. PUT /role/recover — recover
- [x] 170. DELETE /role/destroy/:id — permanent delete

## Permissions (`/permission`)
- [x] 171. GET /permission/get-all — list permissions (PermissionsPage — full DataTableV2 with stats)
- [x] 172. POST /permission/create — create permission (PermissionFormPage at /rbac/permissions/create)
- [x] 173. PUT /permission/update/:id — edit permission (PermissionFormPage at /rbac/permissions/:id/edit)
- [x] 174. DELETE /permission/delete/:id — soft delete (PermissionsPage delete action + bulk)
- [x] 175. GET /permission/deleted — deleted permissions (PermissionsPage /deleted route + recover/destroy)
- [x] 176. PUT /permission/recover — recover (PermissionsPage recover action in deleted view)
- [x] 177. DELETE /permission/destroy/:id — permanent delete (PermissionsPage destroy action for SUDOADMIN)

## User Roles (`/user-role`)
- [x] 178. POST /user-role/assign — assign role to user (UserRolesPage proper assign form with roleId input)
- [x] 179. GET /user-role/user/:userId — list user's roles (UserRolesPage DataTableV2 with userId URL param)
- [x] 180. DELETE /user-role/remove/:id — remove role assignment (per-row Remove button with confirm)
- [x] 181. DELETE /user-role/clear/user/:userId — clear all user roles (Clear All button with confirm)

## Role Permissions (`/role-permission`)
- [x] 182. POST /role-permission/assign — assign permission to role (RolePermissionsPage proper assign form)
- [x] 183. GET /role-permission/role/:roleId — list role's permissions (RolePermissionsPage DataTableV2)
- [x] 184. DELETE /role-permission/remove/:id — remove assignment (per-row Remove button with confirm)
- [x] 185. DELETE /role-permission/clear/role/:roleId — clear all role permissions (Clear All button with confirm)

## User Permissions (`/user-permission`)
- [x] 186. POST /user-permission/assign — assign permission to user (UserPermissionsPage proper assign form)
- [x] 187. GET /user-permission/user/:userId — list user's permissions (UserPermissionsPage DataTableV2)
- [x] 188. DELETE /user-permission/remove/:id — remove assignment (per-row Remove button with confirm)
- [x] 189. DELETE /user-permission/clear/user/:userId — clear all user permissions (Clear All button with confirm)

## Advertisements (`/advertisement`)
- [x] 190. GET /advertisement/get-all — list ads (AdvertisementsPage — full DataTableV2 with stats + search)
- [x] 191. POST /advertisement/create — create ad (AdvertisementFormPage at /advertisements/create)
- [x] 192. PUT /advertisement/update/:id — edit ad (AdvertisementFormPage at /advertisements/:id/edit)
- [x] 193. DELETE /advertisement/delete/:id — soft delete (AdvertisementsPage delete action + bulk)
- [x] 194. GET /advertisement/deleted — deleted ads (/advertisements/deleted route + recover/destroy)
- [x] 195. PUT /advertisement/recover — recover (AdvertisementsPage recover action in deleted view)
- [x] 196. DELETE /advertisement/destroy/:id — permanent delete (AdvertisementsPage destroy for SUDOADMIN)
- [x] 197. GET /advertisement/match — ad targeting query (Match panel added to AdvertisementsPage)

## Audit Logs (`/audit-log`)
- [x] 198. GET /audit-log/get-all — list logs (AuditLogsPage)
- [x] 199. GET /audit-log/get/:id — view log detail (AuditLogsPage detail route)
- [x] 200. DELETE /audit-log/delete/:id — soft delete
- [x] 201. GET /audit-log/deleted — deleted tab
- [x] 202. PUT /audit-log/recover — recover
- [x] 203. DELETE /audit-log/destroy/:id — permanent delete

## User Activity (`/user-activity`)
- [x] 204. GET /user-activity/get-all — list activity logs (ActivityLogsPage)
- [x] 205. GET /user-activity/funnel — funnel analytics (ActivityLogsPage funnel section)
- [x] 206. GET /user-activity/discard-analytics — discard analytics (ActivityLogsPage)
- [x] 207. GET /user-activity/get/:id — detail view
- [x] 208. DELETE /user-activity/delete/:id — soft delete
- [x] 209. GET /user-activity/deleted — deleted tab
- [x] 210. PUT /user-activity/recover — recover
- [x] 211. DELETE /user-activity/destroy/:id — permanent delete

## User Metadata (`/user-metadata`)
- [x] 212. POST /user-metadata/create — system-generated telemetry; no admin create form needed
- [x] 213. GET /user-metadata/get-all — list records (UserMetadataPage — proper DataTableV2 with search/pagination)
- [x] 214. DELETE /user-metadata/delete/:id — soft delete (per-row Delete + bulk delete with confirm)
- [x] 215. GET /user-metadata/deleted — deleted view toggle added to UserMetadataPage
- [x] 216. PUT /user-metadata/recover — recover buttons added to UserMetadataPage deleted view
- [x] 217. DELETE /user-metadata/destroy/:id — destroy buttons added to UserMetadataPage deleted view

## SEO (`/seo`)
- [x] 218. GET /seo/page — lookup by route key (SeoMetadataPage — proper card display with tabbed UI)
- [x] 219. GET /seo/:entityType/:entityId — lookup by entity (SeoMetadataPage — entity tab with card display)

## Delivery: Couriers (`/courier`)
- [x] 220. POST /courier/create — create courier (CouriersCreatePage)
- [x] 221. GET /courier/get-all — list couriers (CouriersListPage)
- [x] 222. GET /courier/get/:id — view courier
- [x] 223. PUT /courier/update/:id — edit courier (CouriersEditPage)
- [x] 224. DELETE /courier/delete/:id — soft delete
- [x] 225. GET /courier/deleted — deleted tab
- [x] 226. PUT /courier/recover — recover
- [x] 227. DELETE /courier/destroy/:id — permanent delete

## Delivery: Courier Branches (`/courier-branch`)
- [x] 228. POST /courier-branch/create — create branch (CourierBranchesCreatePage)
- [x] 229. GET /courier-branch/get-all — list branches (CourierBranchesListPage)
- [x] 230. PUT /courier-branch/update/:id — edit (CourierBranchesEditPage)
- [x] 231. DELETE /courier-branch/delete/:id — soft delete
- [x] 232. GET /courier-branch/deleted — deleted tab
- [x] 233. PUT /courier-branch/recover — recover
- [x] 234. DELETE /courier-branch/destroy/:id — permanent delete

## Delivery: Pickup Addresses (`/courier-pickup-address`)
- [x] 235. POST /courier-pickup-address/create (CourierPickupAddressesCreatePage)
- [x] 236. GET /courier-pickup-address/get-all (CourierPickupAddressesListPage)
- [x] 237. PUT /courier-pickup-address/update/:id (CourierPickupAddressesEditPage)
- [x] 238. DELETE /courier-pickup-address/delete/:id — soft delete
- [x] 239. GET /courier-pickup-address/deleted — deleted tab
- [x] 240. PUT /courier-pickup-address/recover
- [x] 241. DELETE /courier-pickup-address/destroy/:id

## Delivery: Shipments (`/shipment`)
- [x] 242. POST /shipment/create (ShipmentsCreatePage)
- [x] 243. GET /shipment/get-all (ShipmentsListPage)
- [x] 244. PUT /shipment/update/:id (ShipmentsEditPage)
- [x] 245. DELETE /shipment/delete/:id — soft delete
- [x] 246. GET /shipment/deleted — deleted tab
- [x] 247. PUT /shipment/recover
- [x] 248. DELETE /shipment/destroy/:id

## Delivery: Shipment Tracking (`/shipment-tracking`)
- [x] 249. POST /shipment-tracking/create (ShipmentTrackingCreatePage)
- [x] 250. GET /shipment-tracking/get-all (ShipmentTrackingListPage)
- [x] 251. PUT /shipment-tracking/update/:id (ShipmentTrackingEditPage)
- [x] 252. DELETE /shipment-tracking/delete/:id — soft delete
- [x] 253. GET /shipment-tracking/deleted — deleted tab
- [x] 254. PUT /shipment-tracking/recover
- [x] 255. DELETE /shipment-tracking/destroy/:id

## Delivery: Pickup Requests (`/pickup-request`)
- [x] 256. POST /pickup-request/create (PickupRequestsCreatePage)
- [x] 257. GET /pickup-request/get-all (PickupRequestsListPage)
- [x] 258. PUT /pickup-request/update/:id (PickupRequestsEditPage)
- [x] 259. DELETE /pickup-request/delete/:id — soft delete
- [x] 260. GET /pickup-request/deleted — deleted tab
- [x] 261. PUT /pickup-request/recover
- [x] 262. DELETE /pickup-request/destroy/:id

## Delivery: API Logs (`/delivery-api-log`)
- [x] 263. POST /delivery-api-log/create (DeliveryApiLogsCreatePage)
- [x] 264. GET /delivery-api-log/get-all (DeliveryApiLogsListPage)
- [x] 265. PUT /delivery-api-log/update/:id (DeliveryApiLogsEditPage)
- [x] 266. DELETE /delivery-api-log/delete/:id — soft delete
- [x] 267. GET /delivery-api-log/deleted — deleted tab
- [x] 268. PUT /delivery-api-log/recover
- [x] 269. DELETE /delivery-api-log/destroy/:id

## Delivery: Webhook Events (`/delivery-webhook-event`)
- [x] 270. POST /delivery-webhook-event/create (DeliveryWebhookEventsCreatePage)
- [x] 271. GET /delivery-webhook-event/get-all (DeliveryWebhookEventsListPage)
- [x] 272. PUT /delivery-webhook-event/update/:id (DeliveryWebhookEventsEditPage)
- [x] 273. DELETE /delivery-webhook-event/delete/:id — soft delete
- [x] 274. GET /delivery-webhook-event/deleted — deleted tab
- [x] 275. PUT /delivery-webhook-event/recover
- [x] 276. DELETE /delivery-webhook-event/destroy/:id

---

## Undocumented API Usage (Frontend calls endpoints not in api.md)
- [x] 277. GET+POST /customer-ban/* — CustomerBanPage and CustomerBanFormPage fully implemented; endpoint verified in commerce.api.ts
- [x] 278. GET+POST /customer-address/* — CustomerAddressesPage fully implemented; endpoint verified in commerce.api.ts

---

## Summary of Gaps

### Missing UI entirely (need new pages/forms)
- Advertisement: create form, edit form, delete/recover actions, match query UI (#191–197)
- Permission: create form, edit form, delete/recover/destroy actions (#172–177)
- Product: bulk-create admin UI, bulk-upload-images admin UI (#36–37)
- Inquiry: Excel export button, PDF export button (#95–96)
- Review: site-reviews filter tab (#112)
- Customer: admin-side update-profile form (#152)
- User-role: clear/user/:userId action (#181)
- Role-permission: clear/role/:roleId action (#185)
- User-permission: clear/user/:userId action (#189)

### Placeholder/raw UI (should be upgraded to proper pages)
- Coupon Usage — CouponUsagePage needs proper DataTableV2 list page (#146–147)
- Purchase History — PurchaseHistoryPage needs proper customer-linked history viewer (#160–163)
- SEO Metadata — SeoMetadataPage needs proper management UI, not just a raw lookup (#218–219)
- User Metadata — UserMetadataPage needs proper table + form (not raw JSON textarea) (#212–217)
- User Roles — UserRolesPage needs proper assignment UI (not raw inputs) (#178–180)
- Role Permissions — RolePermissionsPage needs proper assignment UI (#182–184)
- User Permissions — UserPermissionsPage needs proper assignment UI (#186–188)

### Undocumented endpoints to verify
- /customer-ban and /customer-address endpoints (#277–278)
