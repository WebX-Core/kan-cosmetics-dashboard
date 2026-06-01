# End-to-End API Documentation (2026-04-30)

File: `API docs/e2e-api-documentation-2026-04-30.md`

## 1. Base URL, Prefix, and Request Setup

- API prefix is environment-driven from `.env` key: `API_PREFIX`.
- Current default in backend: `/api/v1/kan`.
- All routes below are relative to:
  - `{{BASE_URL}}{{API_PREFIX}}`
  - Example: `http://localhost:3000/api/v1/kan`

### Common Headers

- `Content-Type: application/json` for JSON endpoints.
- Cookies are used for authentication (admin/user and customer flows).

### Auth Middleware Types

- `Public`: no auth middleware.
- `Customer Protected`: `customerAuthentication` + `isVerifiedUser`.
- `Admin/User Protected`: `authentication` + `isVerifiedUser`.
- `Admin/Sudo Protected`: `authentication` + `isVerifiedUser` + `isAdminOrSudoAdmin`.
- `Sudo Only`: `authentication` + `isVerifiedUser` + `isSudoAdmin`.

## 2. Global Response Contract

Most controllers return one of these shapes:

### Success (generic)

```json
{
  "status": 200,
  "message": "FOUND|CREATED|UPDATED|DELETED",
  "data": {}
}
```

### Success (single resource)

```json
{
  "status": 200,
  "message": "FOUND",
  "<resourceKey>": {}
}
```

### Validation/Error

```json
{
  "status": 400,
  "message": "Validation failed or business error"
}
```

### Standard status codes used in this backend

- `200 OK`
- `201 CREATED`
- `202 ACCEPTED` (some auth/password flows)
- `400 BAD_REQUEST`
- `401 UNAUTHORIZED`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`

## 3. Standard CRUD Contract (Used by many modules)

For most admin modules, the same endpoint pattern is used:

- `POST /<module>/create`
- `GET /<module>/get-all?page=&limit=&search=`
- `GET /<module>/get/:id` or `GET /<module>/get/:identifier`
- `PUT /<module>/update/:id` (or `PATCH` in a few modules)
- `DELETE /<module>/delete/:id`
- `GET /<module>/deleted?page=&limit=&search=`
- `PUT /<module>/recover` with body `{ "ids": ["uuid"] }`
- `DELETE /<module>/destroy/:id`

Expected responses:

- Create: `{ status: 201, message: "CREATED" }`
- Get all: `{ status: 200, message: "FOUND", data: { items, total, page, limit, totalPages } }`
- Get one: `{ status: 200, message: "FOUND", <resourceKey>: {...} }`
- Update: `{ status: 200, message: "UPDATED" }`
- Delete: `{ status: 200, message: "DELETED" }`
- Deleted list: `{ status: 200, message: "FOUND", data: {...} }`
- Recover: `{ status: 200, message: "Recovered", recoveredCount: number }`
- Destroy: `{ status: 200, message: "DELETED", deletedIds: [...] }`

## 4. Module-by-Module API Map

## 4.1 Auth and User Management

### `/auth`

- `POST /auth/signup` (Sudo Only, multipart/form-data optional profile)
- `POST /auth/signin` (Public)
- `POST /auth/forgot-password` (Public)
- `PATCH /auth/reset-password` (Public)
- `PATCH /auth/change-password` (Admin/User Protected)
- `DELETE /auth/logout` (Admin/User Protected)

Typical success:

- Signin: status 200 + identity and role payload, cookies set.
- Signup: status 201 + created message.

### `/admin`

- `POST /admin/create` (Admin/Sudo Protected)
- `GET /admin/get-all` (Admin/Sudo Protected)
- `GET /admin/get/:id` (Admin/Sudo Protected)
- `PUT /admin/update/:id` (Admin/Sudo Protected)
- `DELETE /admin/delete/:id` (Admin/Sudo Protected)

### `/customer-auth`

- `POST /customer-auth/signup` (Public)
- `POST /customer-auth/signin` (Public)
- `POST /customer-auth/google-signin` (Public)
- `POST /customer-auth/logout` (Public)
- `GET /customer-auth/profile` (Customer Protected)
- `PATCH /customer-auth/profile` (Customer Protected)

## 4.2 Catalog and Commerce Core

### Standard CRUD modules (Admin/Sudo Protected for write ops)

- `/category`
- `/subcategory`
- `/product`
- `/product-variant`
- `/product-tag`
- `/product-attribute`
- `/inventory`
- `/advertisement`
- `/coupon`
- `/courier`
- `/courier-branch`
- `/courier-pickup-address`
- `/shipment`
- `/shipment-tracking`
- `/pickup-request`
- `/delivery-api-log`
- `/delivery-webhook-event`

Use Section 3 contract for request/response behavior.

### `/product` additional endpoints

- `POST /product/create` (multipart file support)
- `POST /product/create-many`
- `POST /product/import`
- `GET /product/get-all` (public read)

### `/coupon` additional endpoints

Coupon has domain-specific actions in addition to CRUD, such as validation/apply/listing by code or eligibility. Use route names under `/coupon/*` exactly as implemented.

## 4.3 Order and Payment

### `/order`

Customer:

- `POST /order/create` (Customer Protected)
- `GET /order/my` (Customer Protected)
- `GET /order/my/:id` (Customer Protected)
- `PATCH /order/cancel/:id` (Customer Protected)

Admin analytics/ops:

- `GET /order/get-all` (Admin/Sudo Protected)
- `GET /order/get/:id` (Admin/Sudo Protected)
- `PATCH /order/status/:id` (Admin/Sudo Protected)
- `GET /order/sales-analytics?days=&lowSalesDropPct=` (Admin/Sudo Protected)
- `POST /order/sync-delivery/:id` (Admin/Sudo Protected)
- `POST /order/sync-branches` (Admin/Sudo Protected)
- `POST /order/pickup-notification/:id` (Admin/Sudo Protected)

Webhook:

- `POST /order/delivery-webhook` (Public webhook receiver)

Sales analytics response includes daily/monthly/yearly revenue plus trend/low-sales indicator.

### `/payment`

- `GET /payment/order/:orderId` (Admin/Sudo Protected)
- `PATCH /payment/update/:id` (Admin/Sudo Protected)

Expected response:

- `GET`: status 200 + payment detail for order.
- `PATCH`: status 200 + updated message.

## 4.4 Cart and Wishlist

### `/cart` (Customer Protected)

- `POST /cart/add`
- `GET /cart/my`
- `GET /cart/get/:id`
- `PATCH /cart/update/:id`
- `DELETE /cart/remove/:id`
- `DELETE /cart/clear`

### `/wishlist` (Customer Protected)

- `POST /wishlist/add`
- `GET /wishlist/my`
- `GET /wishlist/get/:id`
- `DELETE /wishlist/remove/:id`
- `DELETE /wishlist/clear`

Expected response:

- List endpoints return status 200 + `data` list.
- Add/update/remove return status 200/201 with action message.

## 4.5 Content and Support

### Standard CRUD-style modules

- `/blog`
- `/faq`
- `/review`
- `/inquiry`
- `/reply`
- `/site-inquiry`

Each follows the Section 3 contract with small variations in identifier field names (`id` vs `identifier`).

### `/contact`

- `POST /contact/create` (Public)
- `GET /contact/get-all` (Admin/Sudo Protected)
- `GET /contact/get/:id` (Admin/Sudo Protected)
- `DELETE /contact/delete/:id` (Admin/Sudo Protected)
- `DELETE /contact/destroy/:id` (Admin/Sudo Protected)
- `GET /contact/deleted` (Admin/Sudo Protected)
- `PUT /contact/recover` (Admin/Sudo Protected)

### `/newsletter`

- `POST /newsletter/create` (Public)
- `GET /newsletter/get-all` (Admin/Sudo Protected)
- `DELETE /newsletter/delete/:id` (Admin/Sudo Protected)
- `DELETE /newsletter/destroy/:id` (Admin/Sudo Protected)
- `PUT /newsletter/recover` (Admin/Sudo Protected)
- `GET /newsletter/deleted` (Admin/Sudo Protected)

## 4.6 Tracking and Analytics

### `/user-metadata`

- `POST /user-metadata/create` (Admin/Sudo Protected)
- `GET /user-metadata/get-all` (Admin/Sudo Protected)
- `GET /user-metadata/get/:id` (Admin/Sudo Protected)
- `DELETE /user-metadata/delete/:id` (Admin/Sudo Protected)
- `GET /user-metadata/deleted` (Admin/Sudo Protected)
- `PUT /user-metadata/recover` (Admin/Sudo Protected)
- `DELETE /user-metadata/destroy/:id` (Admin/Sudo Protected)

### `/user-activity`

Public tracker:

- `POST /user-activity/track` (Public event intake)

Admin analytics:

- `POST /user-activity/create`
- `GET /user-activity/get-all`
- `GET /user-activity/get/:id`
- `GET /user-activity/funnel`
- `GET /user-activity/discard-analytics`
- `DELETE /user-activity/delete/:id`
- `GET /user-activity/deleted`
- `PUT /user-activity/recover`
- `DELETE /user-activity/destroy/:id`

Expected responses:

- `funnel`: conversion steps and counts.
- `discard-analytics`: abandoned cart/wishlist metrics and user segments.

### `/audit-log`

- Standard CRUD contract (Section 3), Admin/Sudo Protected.

## 4.7 RBAC Modules

### `/role` and `/permission`

- Full Section 3 contract.

### `/user-role`

- `POST /user-role/assign`
- `GET /user-role/user/:userId`
- `DELETE /user-role/remove/:id`
- `DELETE /user-role/clear/user/:userId`

### `/role-permission`

- `POST /role-permission/assign`
- `GET /role-permission/role/:roleId`
- `DELETE /role-permission/remove/:id`
- `DELETE /role-permission/clear/role/:roleId`

### `/user-permission`

- `POST /user-permission/assign`
- `GET /user-permission/user/:userId`
- `DELETE /user-permission/remove/:id`
- `DELETE /user-permission/clear/user/:userId`

Expected responses:

- assign/remove/clear return status 200 with action message.
- list endpoints return status 200 + mapping list.

## 4.8 SEO and Purchase History

### `/seo`

- `GET /seo/page?routeKey=...` (Public)
- `GET /seo/:identifier` (Public)

Expected response:

- status 200 with SEO metadata object for route/page.

### `/purchase-history`

- `POST /purchase-history/create`
- `POST /purchase-history/create-many`
- `GET /purchase-history/get-all`
- `GET /purchase-history/get/:id`

## 5. How to Send Requests (Examples)

### Example 1: Create courier (Admin/Sudo)

```bash
curl -X POST "{{BASE_URL}}{{API_PREFIX}}/courier/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=...; refreshToken=..." \
  -d '{
    "name": "Pathao",
    "slug": "pathao",
    "isActive": true
  }'
```

Success:

```json
{
  "status": 201,
  "message": "CREATED"
}
```

### Example 2: Fetch order sales analytics (Admin/Sudo)

```bash
curl "{{BASE_URL}}{{API_PREFIX}}/order/sales-analytics?days=30&lowSalesDropPct=20" \
  -H "Cookie: accessToken=...; refreshToken=..."
```

Success (shape):

```json
{
  "status": 200,
  "message": "FOUND",
  "data": {
    "daily": [],
    "monthly": [],
    "yearly": [],
    "trend": {
      "isLowSalesWeek": false
    }
  }
}
```

### Example 3: Track user activity event (Public)

```bash
curl -X POST "{{BASE_URL}}{{API_PREFIX}}/user-activity/track" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PRODUCT_CLICK",
    "entityType": "product",
    "entityId": "<uuid>",
    "metadata": { "category": "Shoes", "source": "social" }
  }'
```

Success:

```json
{
  "status": 201,
  "message": "CREATED"
}
```

## 6. Source of Truth for DTO fields

For exact payload fields and validation rules, use DTO files under:

- `src/dto/**/<module>.dto.ts`

For route-level exact URLs and middleware, use:

- `src/routes/**/<module>.route.ts`

For exact response keys/messages, use:

- `src/controller/**/<module>.controller.ts`

## 7. Notes

- This document is intentionally separated and dated for your current backend state on **April 30, 2026**.
- If `API_PREFIX` changes in `.env`, prepend that new value to every route in this file.
