# Category Module Changes (Dashboard)

This document records the category-related frontend changes completed in `kan-cosmetics-dashboard`.

## 1. Backend Contract Alignment

Verified against `KAN-BACKEND` category APIs:

- Category create/update accepts:
  - `title` (required on create)
  - `slug` (required on create)
  - `description` (optional)
  - `coverImage` file (optional)
  - `removeUrls` (optional; update use case)
  - `sortOrder` (optional; intentionally not shown in UI)

Frontend category forms were updated to align with these fields only (except `sortOrder`, which is intentionally hidden).

## 2. Category API Multipart Support

Updated catalog API layer to send category payloads as multipart when needed:

- Added `coverImage?: File | null` to `CategoryDto`
- Added multipart builders for:
  - `categories.create`
  - `categories.update`

Files:

- `src/features/catalog/catalog.types.ts`
- `src/features/catalog/catalog.api.ts`

## 3. Category Create Page Rewrite

`CategoryCreatePage` was rebuilt to match backend expectations:

- Kept fields:
  - `title`
  - `slug`
  - `description`
  - `coverImage`
- Removed fields not backed by category backend contract:
  - `status`
  - visible `sortOrder`

Cover image UX implemented:

- Initial empty state: full-width dropzone with helper text
- After image selected: image card with top-right delete icon
- Image validation: only image MIME types, max 5MB

File:

- `src/pages/dashboard/categories/CategoryCreatePage.tsx`

## 4. Category Edit Page Rewrite

`CategoryEditPage` was rebuilt with backend-aligned fields and cover image behavior:

- Editable fields:
  - `title`
  - `slug`
  - `description`
  - `coverImage`
- Removed `status` and visible `sortOrder`
- Existing cover image is shown on load
- Removing existing cover image tracks URL in `removeUrls` for backend
- If cover exists, no compact `+` upload tile is shown (per latest UX request)
- Full-width dropzone appears only when no cover image is present

File:

- `src/pages/dashboard/categories/CategoryEditPage.tsx`

## 5. Removed Embedded Subcategories Table from Category Edit

Per request, subcategory table/controls inside category edit page were removed.

Removed section:

- `Subcategories` block from `CategoryEditPage`

## 6. Categories Table Behavior Updates

Updated `CategoriesPage` table behavior and mapping:

### Navigation behavior

- Clicking a category row now opens category detail/subcategories page:
  - `/dashboard/categories/:id`
- Clicking edit button now opens category edit page:
  - `/dashboard/categories/:id/edit`

### Data mapping corrections

Previously table used non-backend field assumptions (`name`, `subcategoriesCount`, `productsCount`, `status`), causing incorrect values.

Now:

- Category title maps from backend `title` (fallback `name`)
- Category thumbnail maps from backend `coverImage`
- Subcategory count computed dynamically from subcategory list response (grouped by category ID)
- Product count computed dynamically from product list response (grouped via product -> subcategory -> category)
- Status is derived only from existing backend-safe signal (`isDeleted` -> inactive)

### Created date formatting

- `Created` column now renders in human-readable format
  - Example: `May 24, 2026, 03:45 PM`
- Invalid/missing date falls back to `—`

File:

- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 7. DataTable Row Click Support

Enhanced shared table component to support row click while preserving action button behavior:

- Added `onRowClick?: (row) => void`
- Edit/Delete action buttons stop propagation so they do not trigger row navigation

File:

- `src/shared/components/dashboard/DataTableV2.tsx`

## 8. Notes / Constraints

- No backend schema changes were made.
- No non-backend category fields were introduced.
- Existing repo-wide TypeScript/build issues outside category module remain and are unrelated to these category updates.

## 9. Category Table Interaction & Mapping Fixes

After initial category module updates, additional fixes were made to category listing behavior:

### Row and action navigation

- Category row click now navigates to category detail/subcategories page:
  - `/dashboard/categories/:id`
- Edit button now navigates to category edit page:
  - `/dashboard/categories/:id/edit`

### Category list field mapping fixes

- Category name now maps from backend `title` (fallback `name`)
- Category image now maps from backend `coverImage`
- Created date rendered in human-readable format

### Subcategories/products count fixes

Counts were previously showing `0` because non-backend fields were assumed.
Now counts are computed dynamically by aggregating:

- subcategories from `/subcategory/get-all`
- products from `/product/get-all`
  using category IDs from response relations.

Files:

- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 10. Shared Table Row Click Support

`DataTableV2` was enhanced to support row-level click behavior:

- Added optional prop: `onRowClick`
- Edit/Delete action buttons stop propagation so row navigation is not triggered by action clicks
- Column label typing broadened to support JSX in headers (e.g., checkbox header)

File:

- `src/shared/components/dashboard/DataTableV2.tsx`

## 11. Category Bulk Soft Delete (Active Categories View)

Active categories table now supports multi-select soft delete:

- Added per-row checkbox
- Added select-all checkbox in header
- Added bulk action button on toolbar line:
  - `(bin icon) Delete (count)`
- Existing single-row delete action retained
- Both single and bulk delete now use the same confirmation modal

Delete used here is still **soft delete** only:

- frontend hook: `useSoftDelete`
- backend route: `DELETE /category/delete/:id`

File:

- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 12. Category Delete Confirmation Modal Styling

Category confirmation modal styles were updated:

- white modal background
- rounded-full action buttons

File:

- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 13. Sudo-Only Deleted Categories View

Added dedicated soft-deleted categories page:

- Route: `/dashboard/categories/deleted`
- Visible entry button in active categories page header:
  - `(bin icon) View Deleted`
- Button is shown **only** when current user role is `SUDOADMIN`

Implementation details:

- Reused `CategoriesPage` component in deleted-mode based on pathname
- Deleted-mode fetches only deleted categories via:
  - `catalogApi.categories.hooks.useDeleted(...)`

Files:

- `src/app/router/AppRouter.tsx`
- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 14. Deleted Categories Page UX/Actions

In deleted categories view:

- Top stat cards are hidden
- Per-row action buttons added:
  - `(recover icon) Recover`
  - `(bin icon) Delete Permanently`
- Multi-select bulk actions appear on same toolbar line as search:
  - `Recover (count)`
  - `Delete Permanently (count)`

All these actions use confirmation modal flow.

Notes:

- `Recover` uses recover endpoint
- `Delete Permanently` uses destroy endpoint
- Active categories view still uses soft delete only

File:

- `src/pages/dashboard/categories/CategoriesPage.tsx`

## 15. Subcategory Backend Contract Alignment

Subcategory frontend was aligned with backend-accepted fields in the same spirit as categories:

- Kept in form/API payload:
  - `categoryId`
  - `title`
  - `slug`
  - `description`
  - `coverImage` (file)
  - `removeUrls` (edit remove flow)
- Not shown in form:
  - `sortOrder` (optional)
- Not sent as form field:
  - custom `status` UI field

Files:

- `src/features/catalog/catalog.types.ts`
- `src/features/catalog/catalog.api.ts`

## 16. Subcategory Multipart Upload Support

Added multipart support for subcategory create/update to carry image file upload:

- `SubcategoryDto` now supports `coverImage?: File | null`
- Added `create` and `update` multipart builders for subcategories API,
  splitting payload into `fields` + `files.coverImage`

Files:

- `src/features/catalog/catalog.types.ts`
- `src/features/catalog/catalog.api.ts`

## 17. Subcategory Create/Edit Form Rework

Reworked subcategory forms to match category-style UX and backend parity:

### SubcategoryCreatePage

- Fields now include only backend-aligned values:
  - `title`, `slug`, `description`, `coverImage`
- Removed old `status` and `sortOrder` handling
- Cover image UX:
  - initial full-width dropzone with helper text
  - after image select: image card with top-right bin icon
  - image validation: image MIME only, max 5MB

### SubcategoryEditPage

- Same backend-aligned fields as create
- Existing cover image displays on load
- Removing existing image adds URL to `removeUrls`
- If cover image exists, full-width dropzone is hidden until removed

Files:

- `src/pages/dashboard/categories/SubcategoryCreatePage.tsx`
- `src/pages/dashboard/categories/SubcategoryEditPage.tsx`

## 18. Subcategory Listing Page (Categories-like Layout)

Added dedicated subcategory table page with category-style structure and deleted lifecycle:

- Active view route:
  - `/dashboard/subcategories`
- Deleted view route:
  - `/dashboard/subcategories/deleted`

### Active view

- top summary cards shown (same layout pattern as categories)
- searchable/paginated table
- row click opens subcategory detail page
- edit action opens subcategory edit page
- single and bulk soft-delete with confirmation modal

### Deleted view

- no top cards
- sudo-only entry via `View Deleted` button
- fetches deleted subcategories only
- per-row and bulk actions:
  - `Recover`
  - `Delete Permanently`
- all destructive/recovery actions gated by confirmation modal

Files:

- `src/pages/dashboard/categories/SubcategoriesPage.tsx`
- `src/app/router/AppRouter.tsx`

## 19. Navigation Entry for Subcategories

Added sidebar/module navigation entry so subcategory list is directly reachable:

- `Subcategories` under `Products`
- path: `/dashboard/subcategories`

File:

- `src/app/config/ecommerceModules.ts`
