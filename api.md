# Full Backend API Coverage (2026-04-30)

File date: 2026-04-30

## Base

- Prefix source: `.env` -> `API_PREFIX`
- Runtime default prefix: `/api/v1/kan`
- Full path format: `{{BASE_URL}}{{API_PREFIX}}<module><endpoint>`

## Auth Middleware Legend

- `authentication`: admin/user cookie auth
- `customerAuthentication`: customer cookie auth
- `isVerifiedUser`: verified user gate
- `isAdminOrSudoAdmin`: admin/sudo gate
- `isSudoAdmin`: sudo-only gate

## Global Response Pattern

Most controllers return one of these forms:

```json
{ "status": 200, "message": "FOUND", "data": {} }
```

```json
{ "status": 201, "message": "CREATED" }
```

```json
{ "status": 200, "message": "UPDATED" }
```

```json
{ "status": 200, "message": "DELETED" }
```

For exact response keys, controller is the source of truth under `src/controller/**`.

## Complete Endpoint Coverage

### Module: `/auth`

Route file: `src/routes/authentication/auth.route.ts`

| Method | Endpoint           | Full Path Template                                | Middleware                                  | Validation                            | Handler                            |
| ------ | ------------------ | ------------------------------------------------- | ------------------------------------------- | ------------------------------------- | ---------------------------------- |
| POST   | `/signup`          | `{{BASE_URL}}{{API_PREFIX}}/auth/signup`          | authentication, isVerifiedUser, isSudoAdmin | UserDto on body (create)              | `signup.signup.bind(signup`        |
| POST   | `/signin`          | `{{BASE_URL}}{{API_PREFIX}}/auth/signin`          | none                                        | none                                  | `signin.signin.bind(signin`        |
| POST   | `/forgot-password` | `{{BASE_URL}}{{API_PREFIX}}/auth/forgot-password` | none                                        | GenerateResetLinkDto on body (create) | `auth.generateResetLink.bind(auth` |
| PATCH  | `/reset-password`  | `{{BASE_URL}}{{API_PREFIX}}/auth/reset-password`  | none                                        | ResetPasswordDto on body (create)     | `auth.resetPassword.bind(auth`     |
| PATCH  | `/change-password` | `{{BASE_URL}}{{API_PREFIX}}/auth/change-password` | authentication, isVerifiedUser              | ChangePasswordDto on body (update)    | `auth.changePassword.bind(auth`    |
| DELETE | `/logout`          | `{{BASE_URL}}{{API_PREFIX}}/auth/logout`          | authentication, isVerifiedUser              | none                                  | `auth.logout.bind(auth`            |

### Module: `/admin`

Route file: `src/routes/authentication/admin.route.ts`

| Method | Endpoint            | Full Path Template                                  | Middleware                     | Validation               | Handler                         |
| ------ | ------------------- | --------------------------------------------------- | ------------------------------ | ------------------------ | ------------------------------- |
| POST   | `/create-users`     | `{{BASE_URL}}{{API_PREFIX}}/admin/create-users`     | authentication, isVerifiedUser | UserDto on body (create) | `admin.createUsers.bind(admin`  |
| GET    | `/get-all-users`    | `{{BASE_URL}}{{API_PREFIX}}/admin/get-all-users`    | authentication, isVerifiedUser | none                     | `admin.getAllUsers.bind(admin`  |
| GET    | `/get-users/:id`    | `{{BASE_URL}}{{API_PREFIX}}/admin/get-users/:id`    | authentication, isVerifiedUser | none                     | `admin.getUsersById.bind(admin` |
| PUT    | `/update-users/:id` | `{{BASE_URL}}{{API_PREFIX}}/admin/update-users/:id` | authentication, isVerifiedUser | UserDto on body (update) | `admin.updateUsers.bind(admin`  |
| DELETE | `/delete-users/:id` | `{{BASE_URL}}{{API_PREFIX}}/admin/delete-users/:id` | authentication, isVerifiedUser | none                     | `admin.deleteUsers.bind(admin`  |

### Module: `/inquiry`

Route file: `src/routes/inquiry/inquiry.route.ts`

| Method | Endpoint        | Full Path Template                                | Middleware                                  | Validation                  | Handler                                       |
| ------ | --------------- | ------------------------------------------------- | ------------------------------------------- | --------------------------- | --------------------------------------------- |
| POST   | `/create`       | `{{BASE_URL}}{{API_PREFIX}}/inquiry/create`       | none                                        | InquiryDto on body (create) | `inquiry.create.bind(inquiry`                 |
| GET    | `/export/excel` | `{{BASE_URL}}{{API_PREFIX}}/inquiry/export/excel` | authentication, isVerifiedUser              | none                        | `inquiry.exportInquiriesToExcel.bind(inquiry` |
| GET    | `/export/pdf`   | `{{BASE_URL}}{{API_PREFIX}}/inquiry/export/pdf`   | authentication, isVerifiedUser              | none                        | `inquiry.exportInquiriesToPdf.bind(inquiry`   |
| GET    | `/get-all`      | `{{BASE_URL}}{{API_PREFIX}}/inquiry/get-all`      | authentication, isVerifiedUser              | none                        | `inquiry.getAll.bind(inquiry`                 |
| GET    | `/get/:id`      | `{{BASE_URL}}{{API_PREFIX}}/inquiry/get/:id`      | authentication, isVerifiedUser              | none                        | `inquiry.getByIdentifier.bind(inquiry`        |
| PUT    | `/update/:id`   | `{{BASE_URL}}{{API_PREFIX}}/inquiry/update/:id`   | authentication, isVerifiedUser              | InquiryDto on body (update) | `inquiry.update.bind(inquiry`                 |
| DELETE | `/delete/:id`   | `{{BASE_URL}}{{API_PREFIX}}/inquiry/delete/:id`   | authentication, isVerifiedUser              | none                        | `inquiry.delete.bind(inquiry`                 |
| GET    | `/deleted`      | `{{BASE_URL}}{{API_PREFIX}}/inquiry/deleted`      | authentication, isVerifiedUser              | none                        | `inquiry.getDeleted.bind(inquiry`             |
| PUT    | `/recover`      | `{{BASE_URL}}{{API_PREFIX}}/inquiry/recover`      | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body          | `inquiry.recover.bind(inquiry`                |
| DELETE | `/destroy/:id`  | `{{BASE_URL}}{{API_PREFIX}}/inquiry/destroy/:id`  | authentication, isVerifiedUser, isSudoAdmin | none                        | `inquiry.destroy.bind(inquiry`                |

### Module: `/reply`

Route file: `src/routes/reply/reply.route.ts`

| Method | Endpoint       | Full Path Template                             | Middleware                                  | Validation                | Handler                            |
| ------ | -------------- | ---------------------------------------------- | ------------------------------------------- | ------------------------- | ---------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/reply/create`      | authentication, isVerifiedUser              | ReplyDto on body (create) | `reply.create.bind(reply`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/reply/get-all`     | authentication, isVerifiedUser              | none                      | `reply.getAll.bind(reply`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/reply/get/:id`     | authentication, isVerifiedUser              | none                      | `reply.getByIdentifier.bind(reply` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/reply/update/:id`  | authentication, isVerifiedUser              | ReplyDto on body (update) | `reply.update.bind(reply`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/reply/delete/:id`  | authentication, isVerifiedUser              | none                      | `reply.delete.bind(reply`          |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/reply/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                      | `reply.destroy.bind(reply`         |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/reply/deleted`     | authentication, isVerifiedUser              | none                      | `reply.getDeleted.bind(reply`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/reply/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body        | `reply.recover.bind(reply`         |

### Module: `/faq`

Route file: `src/routes/faq/faq.route.ts`

| Method | Endpoint       | Full Path Template                           | Middleware                                  | Validation              | Handler                        |
| ------ | -------------- | -------------------------------------------- | ------------------------------------------- | ----------------------- | ------------------------------ |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/faq/create`      | authentication, isVerifiedUser              | FaqDto on body (create) | `faq.create.bind(faq`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/faq/get-all`     | none                                        | none                    | `faq.getAll.bind(faq`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/faq/get/:id`     | authentication, isVerifiedUser              | none                    | `faq.getByIdentifier.bind(faq` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/faq/update/:id`  | authentication, isVerifiedUser              | FaqDto on body (update) | `faq.update.bind(faq`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/faq/delete/:id`  | authentication, isVerifiedUser              | none                    | `faq.delete.bind(faq`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/faq/deleted`     | authentication, isVerifiedUser              | none                    | `faq.getDeleted.bind(faq`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/faq/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body      | `faq.recover.bind(faq`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/faq/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                    | `faq.destroy.bind(faq`         |

### Module: `/blog`

Route file: `src/routes/blog/blog.route.ts`

| Method | Endpoint           | Full Path Template                                | Middleware                                  | Validation                   | Handler                          |
| ------ | ------------------ | ------------------------------------------------- | ------------------------------------------- | ---------------------------- | -------------------------------- |
| POST   | `/create`          | `{{BASE_URL}}{{API_PREFIX}}/blog/create`          | authentication, isVerifiedUser              | BlogPostDto on body (create) | `blog.create.bind(blog`          |
| PUT    | `/update/:id`      | `{{BASE_URL}}{{API_PREFIX}}/blog/update/:id`      | authentication, isVerifiedUser              | BlogPostDto on body (update) | `blog.update.bind(blog`          |
| GET    | `/get-all`         | `{{BASE_URL}}{{API_PREFIX}}/blog/get-all`         | none                                        | none                         | `blog.getAll.bind(blog`          |
| GET    | `/get/:identifier` | `{{BASE_URL}}{{API_PREFIX}}/blog/get/:identifier` | none                                        | none                         | `blog.getByIdentifier.bind(blog` |
| DELETE | `/delete/:id`      | `{{BASE_URL}}{{API_PREFIX}}/blog/delete/:id`      | authentication, isVerifiedUser              | none                         | `blog.delete.bind(blog`          |
| GET    | `/deleted`         | `{{BASE_URL}}{{API_PREFIX}}/blog/deleted`         | authentication, isVerifiedUser              | none                         | `blog.getDeleted.bind(blog`      |
| PUT    | `/recover`         | `{{BASE_URL}}{{API_PREFIX}}/blog/recover`         | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body           | `blog.recover.bind(blog`         |
| DELETE | `/destroy/:id`     | `{{BASE_URL}}{{API_PREFIX}}/blog/destroy/:id`     | authentication, isVerifiedUser, isSudoAdmin | none                         | `blog.destroy.bind(blog`         |

### Module: `/category`

Route file: `src/routes/category/category.route.ts`

| Method | Endpoint           | Full Path Template                                    | Middleware                                  | Validation                   | Handler                                  |
| ------ | ------------------ | ----------------------------------------------------- | ------------------------------------------- | ---------------------------- | ---------------------------------------- |
| POST   | `/create`          | `{{BASE_URL}}{{API_PREFIX}}/category/create`          | authentication, isVerifiedUser              | CategoryDto on body (create) | `category.create.bind(category`          |
| GET    | `/get-all`         | `{{BASE_URL}}{{API_PREFIX}}/category/get-all`         | none                                        | none                         | `category.getAll.bind(category`          |
| GET    | `/get/:identifier` | `{{BASE_URL}}{{API_PREFIX}}/category/get/:identifier` | none                                        | none                         | `category.getByIdentifier.bind(category` |
| PUT    | `/update/:id`      | `{{BASE_URL}}{{API_PREFIX}}/category/update/:id`      | authentication, isVerifiedUser              | CategoryDto on body (update) | `category.update.bind(category`          |
| DELETE | `/delete/:id`      | `{{BASE_URL}}{{API_PREFIX}}/category/delete/:id`      | authentication, isVerifiedUser              | none                         | `category.delete.bind(category`          |
| GET    | `/deleted`         | `{{BASE_URL}}{{API_PREFIX}}/category/deleted`         | authentication, isVerifiedUser              | none                         | `category.getDeleted.bind(category`      |
| PUT    | `/recover`         | `{{BASE_URL}}{{API_PREFIX}}/category/recover`         | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body           | `category.recover.bind(category`         |
| DELETE | `/destroy/:id`     | `{{BASE_URL}}{{API_PREFIX}}/category/destroy/:id`     | authentication, isVerifiedUser, isSudoAdmin | none                         | `category.destroy.bind(category`         |

### Module: `/subcategory`

Route file: `src/routes/subcategory/subcategory.route.ts`

| Method | Endpoint           | Full Path Template                                       | Middleware                                  | Validation                      | Handler                                        |
| ------ | ------------------ | -------------------------------------------------------- | ------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| POST   | `/create`          | `{{BASE_URL}}{{API_PREFIX}}/subcategory/create`          | authentication, isVerifiedUser              | SubcategoryDto on body (create) | `subcategory.create.bind(subcategory`          |
| GET    | `/get-all`         | `{{BASE_URL}}{{API_PREFIX}}/subcategory/get-all`         | none                                        | none                            | `subcategory.getAll.bind(subcategory`          |
| GET    | `/get/:identifier` | `{{BASE_URL}}{{API_PREFIX}}/subcategory/get/:identifier` | none                                        | none                            | `subcategory.getByIdentifier.bind(subcategory` |
| PUT    | `/update/:id`      | `{{BASE_URL}}{{API_PREFIX}}/subcategory/update/:id`      | authentication, isVerifiedUser              | SubcategoryDto on body (update) | `subcategory.update.bind(subcategory`          |
| DELETE | `/delete/:id`      | `{{BASE_URL}}{{API_PREFIX}}/subcategory/delete/:id`      | authentication, isVerifiedUser              | none                            | `subcategory.delete.bind(subcategory`          |
| GET    | `/deleted`         | `{{BASE_URL}}{{API_PREFIX}}/subcategory/deleted`         | authentication, isVerifiedUser              | none                            | `subcategory.getDeleted.bind(subcategory`      |
| PUT    | `/recover`         | `{{BASE_URL}}{{API_PREFIX}}/subcategory/recover`         | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body              | `subcategory.recover.bind(subcategory`         |
| DELETE | `/destroy/:id`     | `{{BASE_URL}}{{API_PREFIX}}/subcategory/destroy/:id`     | authentication, isVerifiedUser, isSudoAdmin | none                            | `subcategory.destroy.bind(subcategory`         |

### Module: `/product`

Route file: `src/routes/product/product.route.ts`

| Method | Endpoint              | Full Path Template                                      | Middleware                                  | Validation                  | Handler                                 |
| ------ | --------------------- | ------------------------------------------------------- | ------------------------------------------- | --------------------------- | --------------------------------------- |
| POST   | `/bulk-create`        | `{{BASE_URL}}{{API_PREFIX}}/product/bulk-create`        | authentication, isVerifiedUser              | none                        | `product.bulkCreate.bind(product`       |
| POST   | `/bulk-upload-images` | `{{BASE_URL}}{{API_PREFIX}}/product/bulk-upload-images` | authentication, isVerifiedUser              | none                        | `product.bulkUploadImages.bind(product` |
| POST   | `/create`             | `{{BASE_URL}}{{API_PREFIX}}/product/create`             | authentication, isVerifiedUser              | ProductDto on body (create) | `product.create.bind(product`           |
| GET    | `/get-all`            | `{{BASE_URL}}{{API_PREFIX}}/product/get-all`            | none                                        | none                        | `product.getAll.bind(product`           |
| GET    | `/get/:identifier`    | `{{BASE_URL}}{{API_PREFIX}}/product/get/:identifier`    | none                                        | none                        | `product.getByIdentifier.bind(product`  |
| PUT    | `/update/:id`         | `{{BASE_URL}}{{API_PREFIX}}/product/update/:id`         | authentication, isVerifiedUser              | ProductDto on body (update) | `product.update.bind(product`           |
| DELETE | `/delete/:id`         | `{{BASE_URL}}{{API_PREFIX}}/product/delete/:id`         | authentication, isVerifiedUser              | none                        | `product.delete.bind(product`           |
| GET    | `/deleted`            | `{{BASE_URL}}{{API_PREFIX}}/product/deleted`            | authentication, isVerifiedUser              | none                        | `product.getDeleted.bind(product`       |
| PUT    | `/recover`            | `{{BASE_URL}}{{API_PREFIX}}/product/recover`            | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body          | `product.recover.bind(product`          |
| DELETE | `/destroy/:id`        | `{{BASE_URL}}{{API_PREFIX}}/product/destroy/:id`        | authentication, isVerifiedUser, isSudoAdmin | none                        | `product.destroy.bind(product`          |

### Module: `/product-variant`

Route file: `src/routes/product-variant/product-variant.route.ts`

| Method | Endpoint           | Full Path Template                                           | Middleware                                  | Validation                         | Handler                                              |
| ------ | ------------------ | ------------------------------------------------------------ | ------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| POST   | `/create`          | `{{BASE_URL}}{{API_PREFIX}}/product-variant/create`          | authentication, isVerifiedUser              | ProductVariantDto on body (create) | `productVariant.create.bind(productVariant`          |
| GET    | `/get-all`         | `{{BASE_URL}}{{API_PREFIX}}/product-variant/get-all`         | none                                        | none                               | `productVariant.getAll.bind(productVariant`          |
| GET    | `/get/:identifier` | `{{BASE_URL}}{{API_PREFIX}}/product-variant/get/:identifier` | none                                        | none                               | `productVariant.getByIdentifier.bind(productVariant` |
| PUT    | `/update/:id`      | `{{BASE_URL}}{{API_PREFIX}}/product-variant/update/:id`      | authentication, isVerifiedUser              | ProductVariantDto on body (update) | `productVariant.update.bind(productVariant`          |
| DELETE | `/delete/:id`      | `{{BASE_URL}}{{API_PREFIX}}/product-variant/delete/:id`      | authentication, isVerifiedUser              | none                               | `productVariant.delete.bind(productVariant`          |
| GET    | `/deleted`         | `{{BASE_URL}}{{API_PREFIX}}/product-variant/deleted`         | authentication, isVerifiedUser              | none                               | `productVariant.getDeleted.bind(productVariant`      |
| PUT    | `/recover`         | `{{BASE_URL}}{{API_PREFIX}}/product-variant/recover`         | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body                 | `productVariant.recover.bind(productVariant`         |
| DELETE | `/destroy/:id`     | `{{BASE_URL}}{{API_PREFIX}}/product-variant/destroy/:id`     | authentication, isVerifiedUser, isSudoAdmin | none                               | `productVariant.destroy.bind(productVariant`         |

### Module: `/product-tag`

Route file: `src/routes/product-tag/product-tag.route.ts`

| Method | Endpoint       | Full Path Template                                   | Middleware                                  | Validation                     | Handler                                 |
| ------ | -------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------ | --------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/product-tag/create`      | authentication, isVerifiedUser              | ProductTagDto on body (create) | `productTag.create.bind(productTag`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/product-tag/get-all`     | none                                        | none                           | `productTag.getAll.bind(productTag`     |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/product-tag/get/:id`     | none                                        | none                           | `productTag.getById.bind(productTag`    |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/product-tag/update/:id`  | authentication, isVerifiedUser              | ProductTagDto on body (update) | `productTag.update.bind(productTag`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/product-tag/delete/:id`  | authentication, isVerifiedUser              | none                           | `productTag.delete.bind(productTag`     |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/product-tag/deleted`     | authentication, isVerifiedUser              | none                           | `productTag.getDeleted.bind(productTag` |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/product-tag/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body             | `productTag.recover.bind(productTag`    |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/product-tag/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                           | `productTag.destroy.bind(productTag`    |

### Module: `/product-attribute`

Route file: `src/routes/product-attribute/product-attribute.route.ts`

| Method | Endpoint       | Full Path Template                                         | Middleware                                  | Validation                           | Handler                                             |
| ------ | -------------- | ---------------------------------------------------------- | ------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/create`      | authentication, isVerifiedUser              | ProductAttributeDto on body (create) | `productAttribute.create.bind(productAttribute`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/get-all`     | none                                        | none                                 | `productAttribute.getAll.bind(productAttribute`     |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/get/:id`     | none                                        | none                                 | `productAttribute.getById.bind(productAttribute`    |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/update/:id`  | authentication, isVerifiedUser              | ProductAttributeDto on body (update) | `productAttribute.update.bind(productAttribute`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/delete/:id`  | authentication, isVerifiedUser              | none                                 | `productAttribute.delete.bind(productAttribute`     |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/deleted`     | authentication, isVerifiedUser              | none                                 | `productAttribute.getDeleted.bind(productAttribute` |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body                   | `productAttribute.recover.bind(productAttribute`    |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/product-attribute/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                                 | `productAttribute.destroy.bind(productAttribute`    |

### Module: `/inventory`

Route file: `src/routes/inventory/inventory.route.ts`

| Method | Endpoint       | Full Path Template                                 | Middleware                                  | Validation                    | Handler                               |
| ------ | -------------- | -------------------------------------------------- | ------------------------------------------- | ----------------------------- | ------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/inventory/create`      | authentication, isVerifiedUser              | InventoryDto on body (create) | `inventory.create.bind(inventory`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/inventory/get-all`     | none                                        | none                          | `inventory.getAll.bind(inventory`     |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/inventory/get/:id`     | none                                        | none                          | `inventory.getById.bind(inventory`    |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/inventory/update/:id`  | authentication, isVerifiedUser              | InventoryDto on body (update) | `inventory.update.bind(inventory`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/inventory/delete/:id`  | authentication, isVerifiedUser              | none                          | `inventory.delete.bind(inventory`     |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/inventory/deleted`     | authentication, isVerifiedUser              | none                          | `inventory.getDeleted.bind(inventory` |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/inventory/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body            | `inventory.recover.bind(inventory`    |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/inventory/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                          | `inventory.destroy.bind(inventory`    |

### Module: `/contact`

Route file: `src/routes/contact/contact.route.ts`

| Method | Endpoint       | Full Path Template                               | Middleware                                  | Validation                  | Handler                                |
| ------ | -------------- | ------------------------------------------------ | ------------------------------------------- | --------------------------- | -------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/contact/create`      | none                                        | ContactDto on body (create) | `contact.create.bind(contact`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/contact/get-all`     | authentication, isVerifiedUser              | none                        | `contact.getAll.bind(contact`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/contact/get/:id`     | authentication, isVerifiedUser              | none                        | `contact.getByIdentifier.bind(contact` |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/contact/delete/:id`  | authentication, isVerifiedUser              | none                        | `contact.delete.bind(contact`          |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/contact/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                        | `contact.destroy.bind(contact`         |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/contact/deleted`     | authentication, isVerifiedUser              | none                        | `contact.getDeleted.bind(contact`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/contact/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body          | `contact.recover.bind(contact`         |

### Module: `/review`

Route file: `src/routes/review/review.route.ts`

| Method | Endpoint                  | Full Path Template                                         | Middleware                                  | Validation                 | Handler                                |
| ------ | ------------------------- | ---------------------------------------------------------- | ------------------------------------------- | -------------------------- | -------------------------------------- |
| POST   | `/create`                 | `{{BASE_URL}}{{API_PREFIX}}/review/create`                 | none                                        | ReviewDto on body (create) | `review.create.bind(review`            |
| GET    | `/get-all`                | `{{BASE_URL}}{{API_PREFIX}}/review/get-all`                | none                                        | none                       | `review.getAll.bind(review`            |
| GET    | `/get-site`               | `{{BASE_URL}}{{API_PREFIX}}/review/get-site`               | none                                        | none                       | `review.getSiteReviews.bind(review`    |
| GET    | `/get-product/:productId` | `{{BASE_URL}}{{API_PREFIX}}/review/get-product/:productId` | none                                        | none                       | `review.getProductReviews.bind(review` |
| GET    | `/get/:id`                | `{{BASE_URL}}{{API_PREFIX}}/review/get/:id`                | none                                        | none                       | `review.getByIdentifier.bind(review`   |
| PUT    | `/update/:id`             | `{{BASE_URL}}{{API_PREFIX}}/review/update/:id`             | authentication, isVerifiedUser              | ReviewDto on body (update) | `review.update.bind(review`            |
| DELETE | `/delete/:id`             | `{{BASE_URL}}{{API_PREFIX}}/review/delete/:id`             | authentication, isVerifiedUser              | none                       | `review.delete.bind(review`            |
| DELETE | `/destroy/:id`            | `{{BASE_URL}}{{API_PREFIX}}/review/destroy/:id`            | authentication, isVerifiedUser, isSudoAdmin | none                       | `review.destroy.bind(review`           |
| GET    | `/deleted`                | `{{BASE_URL}}{{API_PREFIX}}/review/deleted`                | authentication, isVerifiedUser              | none                       | `review.getDeleted.bind(review`        |
| PUT    | `/recover`                | `{{BASE_URL}}{{API_PREFIX}}/review/recover`                | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body         | `review.recover.bind(review`           |

### Module: `/seo`

Route file: `src/routes/seo/seo.route.ts`

| Method | Endpoint                 | Full Path Template                                     | Middleware | Validation | Handler                                       |
| ------ | ------------------------ | ------------------------------------------------------ | ---------- | ---------- | --------------------------------------------- |
| GET    | `/page`                  | `{{BASE_URL}}{{API_PREFIX}}/seo/page`                  | none       | none       | `controller.getSeoByRouteKey.bind(controller` |
| GET    | `/:entityType/:entityId` | `{{BASE_URL}}{{API_PREFIX}}/seo/:entityType/:entityId` | none       | none       | `controller.getSeoByEntityId.bind(controller` |

### Module: `/newsletter`

Route file: `src/routes/newsletter/newsletter.route.ts`

| Method | Endpoint       | Full Path Template                                  | Middleware                                  | Validation                     | Handler                                 |
| ------ | -------------- | --------------------------------------------------- | ------------------------------------------- | ------------------------------ | --------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/newsletter/create`      | none                                        | NewsletterDto on body (create) | `newsletter.create.bind(newsletter`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/newsletter/get-all`     | authentication, isVerifiedUser              | none                           | `newsletter.getAll.bind(newsletter`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/newsletter/delete/:id`  | authentication, isVerifiedUser              | none                           | `newsletter.delete.bind(newsletter`     |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/newsletter/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                           | `newsletter.destroy.bind(newsletter`    |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/newsletter/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body             | `newsletter.recover.bind(newsletter`    |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/newsletter/deleted`     | authentication, isVerifiedUser              | none                           | `newsletter.getDeleted.bind(newsletter` |

### Module: `/purchase-history`

Route file: `src/routes/purchase-history/purchase-history.route.ts`

| Method | Endpoint                     | Full Path Template                                                      | Middleware                                  | Validation | Handler                                                |
| ------ | ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------ |
| POST   | `/sync/order/:orderId`       | `{{BASE_URL}}{{API_PREFIX}}/purchase-history/sync/order/:orderId`       | authentication, isVerifiedUser, isSudoAdmin | none       | `purchaseHistory.syncByOrder.bind(purchaseHistory`     |
| POST   | `/sync/customer/:customerId` | `{{BASE_URL}}{{API_PREFIX}}/purchase-history/sync/customer/:customerId` | authentication, isVerifiedUser, isSudoAdmin | none       | `purchaseHistory.syncByCustomer.bind(purchaseHistory`  |
| GET    | `/customer/:customerId`      | `{{BASE_URL}}{{API_PREFIX}}/purchase-history/customer/:customerId`      | authentication, isVerifiedUser              | none       | `purchaseHistory.getByCustomer.bind(purchaseHistory`   |
| GET    | `/get/:id`                   | `{{BASE_URL}}{{API_PREFIX}}/purchase-history/get/:id`                   | authentication, isVerifiedUser              | none       | `purchaseHistory.getByIdentifier.bind(purchaseHistory` |

### Module: `/customer-auth`

Route file: `src/routes/customer/customer-auth.route.ts`

| Method | Endpoint          | Full Path Template                                        | Middleware                             | Validation                                | Handler                                        |
| ------ | ----------------- | --------------------------------------------------------- | -------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| POST   | `/signup`         | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/signup`         | none                                   | CustomerSignupDto on body (create)        | `customerAuth.signup.bind(customerAuth`        |
| POST   | `/signin`         | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/signin`         | none                                   | CustomerSigninDto on body (create)        | `customerAuth.signin.bind(customerAuth`        |
| POST   | `/google-signin`  | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/google-signin`  | none                                   | CustomerGoogleSigninDto on body (create)  | `customerAuth.googleSignin.bind(customerAuth`  |
| POST   | `/logout`         | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/logout`         | none                                   | none                                      | `customerAuth.logout.bind(customerAuth`        |
| GET    | `/me`             | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/me`             | customerAuthentication, isVerifiedUser | none                                      | `customerAuth.getProfile.bind(customerAuth`    |
| PATCH  | `/update-profile` | `{{BASE_URL}}{{API_PREFIX}}/customer-auth/update-profile` | customerAuthentication, isVerifiedUser | CustomerProfileUpdateDto on body (update) | `customerAuth.updateProfile.bind(customerAuth` |

### Module: `/cart`

Route file: `src/routes/cart/cart.route.ts`

| Method | Endpoint                | Full Path Template                                     | Middleware                                         | Validation                                                              | Handler                             |
| ------ | ----------------------- | ------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| POST   | `/add-item`             | `{{BASE_URL}}{{API_PREFIX}}/cart/add-item`             | customerAuthentication, isVerifiedUser             | CartAddItemDto on body (create)                                         | `cart.addItem.bind(cart`            |
| GET    | `/my`                   | `{{BASE_URL}}{{API_PREFIX}}/cart/my`                   | customerAuthentication, isVerifiedUser             | CartQueryDto on query (create)                                          | `cart.getMyCart.bind(cart`          |
| GET    | `/customer/:customerId` | `{{BASE_URL}}{{API_PREFIX}}/cart/customer/:customerId` | authentication, isVerifiedUser, isAdminOrSudoAdmin | CartCustomerParamDto on params (create); CartQueryDto on query (create) | `cart.getCustomerCart.bind(cart`    |
| PATCH  | `/item/:itemId`         | `{{BASE_URL}}{{API_PREFIX}}/cart/item/:itemId`         | customerAuthentication, isVerifiedUser             | CartUpdateItemDto on body (update)                                      | `cart.updateItemQuantity.bind(cart` |
| DELETE | `/item/:itemId`         | `{{BASE_URL}}{{API_PREFIX}}/cart/item/:itemId`         | customerAuthentication, isVerifiedUser             | none                                                                    | `cart.removeItem.bind(cart`         |
| DELETE | `/clear`                | `{{BASE_URL}}{{API_PREFIX}}/cart/clear`                | customerAuthentication, isVerifiedUser             | none                                                                    | `cart.clearMyCart.bind(cart`        |

### Module: `/wishlist`

Route file: `src/routes/wishlist/wishlist.route.ts`

| Method | Endpoint                | Full Path Template                                         | Middleware                                         | Validation                                                                      | Handler                                      |
| ------ | ----------------------- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| POST   | `/add-item`             | `{{BASE_URL}}{{API_PREFIX}}/wishlist/add-item`             | customerAuthentication, isVerifiedUser             | WishlistAddItemDto on body (create)                                             | `wishlist.addItem.bind(wishlist`             |
| GET    | `/my`                   | `{{BASE_URL}}{{API_PREFIX}}/wishlist/my`                   | customerAuthentication, isVerifiedUser             | WishlistQueryDto on query (create)                                              | `wishlist.getMyWishlist.bind(wishlist`       |
| GET    | `/customer/:customerId` | `{{BASE_URL}}{{API_PREFIX}}/wishlist/customer/:customerId` | authentication, isVerifiedUser, isAdminOrSudoAdmin | WishlistCustomerParamDto on params (create); WishlistQueryDto on query (create) | `wishlist.getCustomerWishlist.bind(wishlist` |
| DELETE | `/item/:itemId`         | `{{BASE_URL}}{{API_PREFIX}}/wishlist/item/:itemId`         | customerAuthentication, isVerifiedUser             | none                                                                            | `wishlist.removeItem.bind(wishlist`          |
| DELETE | `/clear`                | `{{BASE_URL}}{{API_PREFIX}}/wishlist/clear`                | customerAuthentication, isVerifiedUser             | none                                                                            | `wishlist.clearMyWishlist.bind(wishlist`     |

### Module: `/role`

Route file: `src/routes/role/role.route.ts`

| Method | Endpoint       | Full Path Template                            | Middleware | Validation               | Handler                     |
| ------ | -------------- | --------------------------------------------- | ---------- | ------------------------ | --------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/role/create`      | none       | RoleDto on body (create) | `role.create.bind(role`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/role/get-all`     | none       | none                     | `role.getAll.bind(role`     |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/role/get/:id`     | none       | none                     | `role.getOne.bind(role`     |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/role/update/:id`  | none       | RoleDto on body (update) | `role.update.bind(role`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/role/delete/:id`  | none       | none                     | `role.delete.bind(role`     |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/role/deleted`     | none       | none                     | `role.getDeleted.bind(role` |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/role/recover`     | none       | RecoverDto on body       | `role.recover.bind(role`    |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/role/destroy/:id` | none       | none                     | `role.destroy.bind(role`    |

### Module: `/permission`

Route file: `src/routes/permission/permission.route.ts`

| Method | Endpoint       | Full Path Template                                  | Middleware | Validation                     | Handler                                 |
| ------ | -------------- | --------------------------------------------------- | ---------- | ------------------------------ | --------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/permission/create`      | none       | PermissionDto on body (create) | `permission.create.bind(permission`     |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/permission/get-all`     | none       | none                           | `permission.getAll.bind(permission`     |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/permission/get/:id`     | none       | none                           | `permission.getOne.bind(permission`     |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/permission/update/:id`  | none       | PermissionDto on body (update) | `permission.update.bind(permission`     |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/permission/delete/:id`  | none       | none                           | `permission.delete.bind(permission`     |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/permission/deleted`     | none       | none                           | `permission.getDeleted.bind(permission` |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/permission/recover`     | none       | RecoverDto on body             | `permission.recover.bind(permission`    |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/permission/destroy/:id` | none       | none                           | `permission.destroy.bind(permission`    |

### Module: `/user-role`

Route file: `src/routes/user-role/user-role.route.ts`

| Method | Endpoint              | Full Path Template                                        | Middleware | Validation                         | Handler                      |
| ------ | --------------------- | --------------------------------------------------------- | ---------- | ---------------------------------- | ---------------------------- |
| POST   | `/assign`             | `{{BASE_URL}}{{API_PREFIX}}/user-role/assign`             | none       | UserRoleAssignDto on body (create) | `ctrl.assign.bind(ctrl`      |
| GET    | `/user/:userId`       | `{{BASE_URL}}{{API_PREFIX}}/user-role/user/:userId`       | none       | none                               | `ctrl.listByUser.bind(ctrl`  |
| DELETE | `/remove/:id`         | `{{BASE_URL}}{{API_PREFIX}}/user-role/remove/:id`         | none       | none                               | `ctrl.remove.bind(ctrl`      |
| DELETE | `/clear/user/:userId` | `{{BASE_URL}}{{API_PREFIX}}/user-role/clear/user/:userId` | none       | none                               | `ctrl.clearByUser.bind(ctrl` |

### Module: `/role-permission`

Route file: `src/routes/role-permission/role-permission.route.ts`

| Method | Endpoint              | Full Path Template                                              | Middleware | Validation                               | Handler                      |
| ------ | --------------------- | --------------------------------------------------------------- | ---------- | ---------------------------------------- | ---------------------------- |
| POST   | `/assign`             | `{{BASE_URL}}{{API_PREFIX}}/role-permission/assign`             | none       | RolePermissionAssignDto on body (create) | `ctrl.assign.bind(ctrl`      |
| GET    | `/role/:roleId`       | `{{BASE_URL}}{{API_PREFIX}}/role-permission/role/:roleId`       | none       | none                                     | `ctrl.listByRole.bind(ctrl`  |
| DELETE | `/remove/:id`         | `{{BASE_URL}}{{API_PREFIX}}/role-permission/remove/:id`         | none       | none                                     | `ctrl.remove.bind(ctrl`      |
| DELETE | `/clear/role/:roleId` | `{{BASE_URL}}{{API_PREFIX}}/role-permission/clear/role/:roleId` | none       | none                                     | `ctrl.clearByRole.bind(ctrl` |

### Module: `/user-permission`

Route file: `src/routes/user-permission/user-permission.route.ts`

| Method | Endpoint              | Full Path Template                                              | Middleware | Validation                               | Handler                      |
| ------ | --------------------- | --------------------------------------------------------------- | ---------- | ---------------------------------------- | ---------------------------- |
| POST   | `/assign`             | `{{BASE_URL}}{{API_PREFIX}}/user-permission/assign`             | none       | UserPermissionAssignDto on body (create) | `ctrl.assign.bind(ctrl`      |
| GET    | `/user/:userId`       | `{{BASE_URL}}{{API_PREFIX}}/user-permission/user/:userId`       | none       | none                                     | `ctrl.listByUser.bind(ctrl`  |
| DELETE | `/remove/:id`         | `{{BASE_URL}}{{API_PREFIX}}/user-permission/remove/:id`         | none       | none                                     | `ctrl.remove.bind(ctrl`      |
| DELETE | `/clear/user/:userId` | `{{BASE_URL}}{{API_PREFIX}}/user-permission/clear/user/:userId` | none       | none                                     | `ctrl.clearByUser.bind(ctrl` |

### Module: `/audit-log`

Route file: `src/routes/audit-log/audit-log.route.ts`

| Method | Endpoint       | Full Path Template                                 | Middleware                                         | Validation                         | Handler                                  |
| ------ | -------------- | -------------------------------------------------- | -------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/audit-log/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | AuditLogDto on body (create)       | `auditLog.create.bind(auditLog`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/audit-log/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | AuditLogQueryDto on query (create) | `auditLog.getAll.bind(auditLog`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/audit-log/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `auditLog.getByIdentifier.bind(auditLog` |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/audit-log/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `auditLog.delete.bind(auditLog`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/audit-log/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | AuditLogQueryDto on query (create) | `auditLog.getDeleted.bind(auditLog`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/audit-log/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                 | `auditLog.recover.bind(auditLog`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/audit-log/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `auditLog.destroy.bind(auditLog`         |

### Module: `/advertisement`

Route file: `src/routes/advertisement/advertisement.route.ts`

| Method | Endpoint       | Full Path Template                                     | Middleware                                         | Validation                                   | Handler                                            |
| ------ | -------------- | ------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/advertisement/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | AdvertisementDto on body (create)            | `advertisement.create.bind(advertisement`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/advertisement/get-all`     | none                                               | AdvertisementQueryDto on query (create)      | `advertisement.getAll.bind(advertisement`          |
| GET    | `/match`       | `{{BASE_URL}}{{API_PREFIX}}/advertisement/match`       | none                                               | AdvertisementMatchQueryDto on query (create) | `advertisement.getApplicable.bind(advertisement`   |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/advertisement/get/:id`     | none                                               | none                                         | `advertisement.getByIdentifier.bind(advertisement` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/advertisement/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | AdvertisementDto on body (update)            | `advertisement.update.bind(advertisement`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/advertisement/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                         | `advertisement.delete.bind(advertisement`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/advertisement/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | AdvertisementQueryDto on query (create)      | `advertisement.getDeleted.bind(advertisement`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/advertisement/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                           | `advertisement.recover.bind(advertisement`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/advertisement/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                         | `advertisement.destroy.bind(advertisement`         |

### Module: `/coupon`

Route file: `src/routes/coupon/coupon.route.ts`

| Method | Endpoint          | Full Path Template                                 | Middleware                                         | Validation                                  | Handler                                   |
| ------ | ----------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| POST   | `/create`         | `{{BASE_URL}}{{API_PREFIX}}/coupon/create`         | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponDto on body (create)                  | `coupon.create.bind(coupon`               |
| GET    | `/get-all`        | `{{BASE_URL}}{{API_PREFIX}}/coupon/get-all`        | none                                               | CouponQueryDto on query (create)            | `coupon.getAll.bind(coupon`               |
| GET    | `/get/:id`        | `{{BASE_URL}}{{API_PREFIX}}/coupon/get/:id`        | none                                               | none                                        | `coupon.getByIdentifier.bind(coupon`      |
| PUT    | `/update/:id`     | `{{BASE_URL}}{{API_PREFIX}}/coupon/update/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponDto on body (update)                  | `coupon.update.bind(coupon`               |
| POST   | `/issue-users`    | `{{BASE_URL}}{{API_PREFIX}}/coupon/issue-users`    | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponIssueToUsersDto on body (create)      | `coupon.issueToUsers.bind(coupon`         |
| POST   | `/unassign-users` | `{{BASE_URL}}{{API_PREFIX}}/coupon/unassign-users` | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponUnassignUsersDto on body (create)     | `coupon.unassignFromUsers.bind(coupon`    |
| GET    | `/insights/:id`   | `{{BASE_URL}}{{API_PREFIX}}/coupon/insights/:id`   | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                        | `coupon.getInsights.bind(coupon`          |
| POST   | `/validate`       | `{{BASE_URL}}{{API_PREFIX}}/coupon/validate`       | customerAuthentication, isVerifiedUser             | CouponValidateDto on body (create)          | `coupon.validateMyCoupon.bind(coupon`     |
| GET    | `/my-eligible`    | `{{BASE_URL}}{{API_PREFIX}}/coupon/my-eligible`    | customerAuthentication, isVerifiedUser             | CouponEligibilityQueryDto on query (create) | `coupon.getMyEligibleCoupons.bind(coupon` |
| GET    | `/my-usage`       | `{{BASE_URL}}{{API_PREFIX}}/coupon/my-usage`       | customerAuthentication, isVerifiedUser             | CouponQueryDto on query (create)            | `coupon.getMyUsage.bind(coupon`           |
| POST   | `/apply`          | `{{BASE_URL}}{{API_PREFIX}}/coupon/apply`          | customerAuthentication, isVerifiedUser             | CouponApplyDto on body (create)             | `coupon.applyMyCoupon.bind(coupon`        |
| DELETE | `/delete/:id`     | `{{BASE_URL}}{{API_PREFIX}}/coupon/delete/:id`     | none                                               | none                                        | `coupon.delete.bind(coupon`               |
| GET    | `/deleted`        | `{{BASE_URL}}{{API_PREFIX}}/coupon/deleted`        | none                                               | CouponQueryDto on query (create)            | `coupon.getDeleted.bind(coupon`           |
| PUT    | `/recover`        | `{{BASE_URL}}{{API_PREFIX}}/coupon/recover`        | none                                               | RecoverDto on body                          | `coupon.recover.bind(coupon`              |
| DELETE | `/destroy/:id`    | `{{BASE_URL}}{{API_PREFIX}}/coupon/destroy/:id`    | none                                               | none                                        | `coupon.destroy.bind(coupon`              |

### Module: `/coupon-usage`

Route file: `src/routes/coupon-usage/coupon-usage.route.ts`

| Method | Endpoint    | Full Path Template                                 | Middleware                                         | Validation                               | Handler                                        |
| ------ | ----------- | -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| GET    | `/get-all`  | `{{BASE_URL}}{{API_PREFIX}}/coupon-usage/get-all`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponUsageQueryDto on query (create)    | `couponUsage.getAll.bind(couponUsage`          |
| GET    | `/get/:id`  | `{{BASE_URL}}{{API_PREFIX}}/coupon-usage/get/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | CouponUsageIdParamDto on params (create) | `couponUsage.getByIdentifier.bind(couponUsage` |
| GET    | `/my-usage` | `{{BASE_URL}}{{API_PREFIX}}/coupon-usage/my-usage` | customerAuthentication, isVerifiedUser             | CouponUsageQueryDto on query (create)    | `couponUsage.getMyUsage.bind(couponUsage`      |

### Module: `/order`

Route file: `src/routes/order/order.route.ts`

| Method | Endpoint                   | Full Path Template                                         | Middleware                                         | Validation                                    | Handler                                     |
| ------ | -------------------------- | ---------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| POST   | `/create`                  | `{{BASE_URL}}{{API_PREFIX}}/order/create`                  | customerAuthentication, isVerifiedUser             | OrderCreateDto on body (create)               | `order.createMyOrder.bind(order`            |
| GET    | `/my`                      | `{{BASE_URL}}{{API_PREFIX}}/order/my`                      | customerAuthentication, isVerifiedUser             | OrderQueryDto on query (create)               | `order.getMyOrders.bind(order`              |
| GET    | `/my/:id`                  | `{{BASE_URL}}{{API_PREFIX}}/order/my/:id`                  | customerAuthentication, isVerifiedUser             | none                                          | `order.getMyOrderById.bind(order`           |
| PATCH  | `/cancel/:id`              | `{{BASE_URL}}{{API_PREFIX}}/order/cancel/:id`              | customerAuthentication, isVerifiedUser             | none                                          | `order.cancelMyOrder.bind(order`            |
| GET    | `/get-all`                 | `{{BASE_URL}}{{API_PREFIX}}/order/get-all`                 | authentication, isVerifiedUser, isAdminOrSudoAdmin | OrderQueryDto on query (create)               | `order.getAll.bind(order`                   |
| GET    | `/sales-analytics`         | `{{BASE_URL}}{{API_PREFIX}}/order/sales-analytics`         | authentication, isVerifiedUser, isAdminOrSudoAdmin | OrderSalesAnalyticsQueryDto on query (create) | `order.getSalesAnalytics.bind(order`        |
| GET    | `/get/:id`                 | `{{BASE_URL}}{{API_PREFIX}}/order/get/:id`                 | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                          | `order.getAnyOrderById.bind(order`          |
| PATCH  | `/status/:id`              | `{{BASE_URL}}{{API_PREFIX}}/order/status/:id`              | authentication, isVerifiedUser, isAdminOrSudoAdmin | OrderStatusUpdateDto on body (update)         | `order.updateStatus.bind(order`             |
| POST   | `/sync-delivery/:id`       | `{{BASE_URL}}{{API_PREFIX}}/order/sync-delivery/:id`       | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                          | `order.syncDeliveryStatus.bind(order`       |
| POST   | `/delivery-webhook`        | `{{BASE_URL}}{{API_PREFIX}}/order/delivery-webhook`        | none                                               | none                                          | `order.deliveryWebhook.bind(order`          |
| POST   | `/sync-branches`           | `{{BASE_URL}}{{API_PREFIX}}/order/sync-branches`           | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                          | `order.syncBranches.bind(order`             |
| POST   | `/pickup-notification/:id` | `{{BASE_URL}}{{API_PREFIX}}/order/pickup-notification/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                          | `order.createPickupNotification.bind(order` |

### Module: `/payment`

Route file: `src/routes/payment/payment.route.ts`

| Method | Endpoint          | Full Path Template                                  | Middleware                                         | Validation                        | Handler                           |
| ------ | ----------------- | --------------------------------------------------- | -------------------------------------------------- | --------------------------------- | --------------------------------- |
| GET    | `/order/:orderId` | `{{BASE_URL}}{{API_PREFIX}}/payment/order/:orderId` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                              | `payment.getByOrder.bind(payment` |
| PATCH  | `/update/:id`     | `{{BASE_URL}}{{API_PREFIX}}/payment/update/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | PaymentUpdateDto on body (update) | `payment.update.bind(payment`     |

### Module: `/site-inquiry`

Route file: `src/routes/site-inquiry/site-inquiry.route.ts`

| Method | Endpoint       | Full Path Template                                    | Middleware                                  | Validation                                                                | Handler                                        |
| ------ | -------------- | ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/create`      | none                                        | SiteInquiryDto on body (create)                                           | `siteInquiry.create.bind(siteInquiry`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/get-all`     | authentication, isVerifiedUser              | SiteInquiryQueryDto on query (create)                                     | `siteInquiry.getAll.bind(siteInquiry`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/get/:id`     | authentication, isVerifiedUser              | SiteInquiryIdParamDto on params (create)                                  | `siteInquiry.getByIdentifier.bind(siteInquiry` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/update/:id`  | authentication, isVerifiedUser              | SiteInquiryIdParamDto on params (create); SiteInquiryDto on body (update) | `siteInquiry.update.bind(siteInquiry`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/delete/:id`  | authentication, isVerifiedUser              | none                                                                      | `siteInquiry.delete.bind(siteInquiry`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/deleted`     | authentication, isVerifiedUser              | SiteInquiryQueryDto on query (create)                                     | `siteInquiry.getDeleted.bind(siteInquiry`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/recover`     | authentication, isVerifiedUser, isSudoAdmin | RecoverDto on body                                                        | `siteInquiry.recover.bind(siteInquiry`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/site-inquiry/destroy/:id` | authentication, isVerifiedUser, isSudoAdmin | none                                                                      | `siteInquiry.destroy.bind(siteInquiry`         |

### Module: `/user-activity`

Route file: `src/routes/user-activity/user-activity.route.ts`

| Method | Endpoint             | Full Path Template                                           | Middleware                                         | Validation                                 | Handler                                      |
| ------ | -------------------- | ------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| POST   | `/track`             | `{{BASE_URL}}{{API_PREFIX}}/user-activity/track`             | none                                               | UserActivityDto on body (create)           | `activity.track.bind(activity`               |
| POST   | `/create`            | `{{BASE_URL}}{{API_PREFIX}}/user-activity/create`            | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserActivityDto on body (create)           | `activity.create.bind(activity`              |
| GET    | `/get-all`           | `{{BASE_URL}}{{API_PREFIX}}/user-activity/get-all`           | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserActivityQueryDto on query (create)     | `activity.getAll.bind(activity`              |
| GET    | `/funnel`            | `{{BASE_URL}}{{API_PREFIX}}/user-activity/funnel`            | authentication, isVerifiedUser, isAdminOrSudoAdmin | FunnelQueryDto on query (create)           | `activity.getFunnel.bind(activity`           |
| GET    | `/discard-analytics` | `{{BASE_URL}}{{API_PREFIX}}/user-activity/discard-analytics` | authentication, isVerifiedUser, isAdminOrSudoAdmin | DiscardAnalyticsQueryDto on query (create) | `activity.getDiscardAnalytics.bind(activity` |
| GET    | `/get/:id`           | `{{BASE_URL}}{{API_PREFIX}}/user-activity/get/:id`           | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserActivityIdParamDto on params (create)  | `activity.getByIdentifier.bind(activity`     |
| DELETE | `/delete/:id`        | `{{BASE_URL}}{{API_PREFIX}}/user-activity/delete/:id`        | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                       | `activity.delete.bind(activity`              |
| GET    | `/deleted`           | `{{BASE_URL}}{{API_PREFIX}}/user-activity/deleted`           | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserActivityQueryDto on query (create)     | `activity.getDeleted.bind(activity`          |
| PUT    | `/recover`           | `{{BASE_URL}}{{API_PREFIX}}/user-activity/recover`           | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                         | `activity.recover.bind(activity`             |
| DELETE | `/destroy/:id`       | `{{BASE_URL}}{{API_PREFIX}}/user-activity/destroy/:id`       | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                       | `activity.destroy.bind(activity`             |

### Module: `/user-metadata`

Route file: `src/routes/user-metadata/user-metadata.route.ts`

| Method | Endpoint       | Full Path Template                                     | Middleware                                         | Validation                                | Handler                                  |
| ------ | -------------- | ------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserMetadataDto on body (create)          | `metadata.create.bind(metadata`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserMetadataQueryDto on query (create)    | `metadata.getAll.bind(metadata`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserMetadataIdParamDto on params (create) | `metadata.getByIdentifier.bind(metadata` |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                      | `metadata.delete.bind(metadata`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | UserMetadataQueryDto on query (create)    | `metadata.getDeleted.bind(metadata`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                        | `metadata.recover.bind(metadata`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/user-metadata/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                      | `metadata.destroy.bind(metadata`         |

### Module: `/courier`

Route file: `src/routes/courier/courier.route.ts`

| Method | Endpoint       | Full Path Template                               | Middleware                                         | Validation                        | Handler                                |
| ------ | -------------- | ------------------------------------------------ | -------------------------------------------------- | --------------------------------- | -------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/courier/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierDto on body (create)       | `courier.create.bind(courier`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/courier/get-all`     | none                                               | CourierQueryDto on query (create) | `courier.getAll.bind(courier`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/courier/get/:id`     | none                                               | none                              | `courier.getByIdentifier.bind(courier` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierDto on body (update)       | `courier.update.bind(courier`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                              | `courier.delete.bind(courier`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/courier/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierQueryDto on query (create) | `courier.getDeleted.bind(courier`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/courier/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                | `courier.recover.bind(courier`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/courier/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                              | `courier.destroy.bind(courier`         |

### Module: `/courier-branch`

Route file: `src/routes/courier-branch/courier-branch.route.ts`

| Method | Endpoint       | Full Path Template                                      | Middleware                                         | Validation                              | Handler                              |
| ------ | -------------- | ------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- | ------------------------------------ |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierBranchDto on body (create)       | `branch.create.bind(branch`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/get-all`     | none                                               | CourierBranchQueryDto on query (create) | `branch.getAll.bind(branch`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/get/:id`     | none                                               | none                                    | `branch.getByIdentifier.bind(branch` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierBranchDto on body (update)       | `branch.update.bind(branch`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                    | `branch.delete.bind(branch`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierBranchQueryDto on query (create) | `branch.getDeleted.bind(branch`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                      | `branch.recover.bind(branch`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/courier-branch/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                    | `branch.destroy.bind(branch`         |

### Module: `/courier-pickup-address`

Route file: `src/routes/courier-pickup-address/courier-pickup-address.route.ts`

| Method | Endpoint       | Full Path Template                                              | Middleware                                         | Validation                                     | Handler                                            |
| ------ | -------------- | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierPickupAddressDto on body (create)       | `pickupAddress.create.bind(pickupAddress`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/get-all`     | none                                               | CourierPickupAddressQueryDto on query (create) | `pickupAddress.getAll.bind(pickupAddress`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/get/:id`     | none                                               | none                                           | `pickupAddress.getByIdentifier.bind(pickupAddress` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierPickupAddressDto on body (update)       | `pickupAddress.update.bind(pickupAddress`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                           | `pickupAddress.delete.bind(pickupAddress`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | CourierPickupAddressQueryDto on query (create) | `pickupAddress.getDeleted.bind(pickupAddress`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                             | `pickupAddress.recover.bind(pickupAddress`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/courier-pickup-address/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                           | `pickupAddress.destroy.bind(pickupAddress`         |

### Module: `/shipment`

Route file: `src/routes/shipment/shipment.route.ts`

| Method | Endpoint       | Full Path Template                                | Middleware                                         | Validation                         | Handler                                  |
| ------ | -------------- | ------------------------------------------------- | -------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/shipment/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentDto on body (create)       | `shipment.create.bind(shipment`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/shipment/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentQueryDto on query (create) | `shipment.getAll.bind(shipment`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/shipment/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `shipment.getByIdentifier.bind(shipment` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/shipment/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentDto on body (update)       | `shipment.update.bind(shipment`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/shipment/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `shipment.delete.bind(shipment`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/shipment/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentQueryDto on query (create) | `shipment.getDeleted.bind(shipment`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/shipment/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                 | `shipment.recover.bind(shipment`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/shipment/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                               | `shipment.destroy.bind(shipment`         |

### Module: `/shipment-tracking`

Route file: `src/routes/shipment-tracking/shipment-tracking.route.ts`

| Method | Endpoint       | Full Path Template                                         | Middleware                                         | Validation                                 | Handler                                  |
| ------ | -------------- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentTrackingDto on body (create)       | `tracking.create.bind(tracking`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentTrackingQueryDto on query (create) | `tracking.getAll.bind(tracking`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                       | `tracking.getByIdentifier.bind(tracking` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentTrackingDto on body (update)       | `tracking.update.bind(tracking`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                       | `tracking.delete.bind(tracking`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | ShipmentTrackingQueryDto on query (create) | `tracking.getDeleted.bind(tracking`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                         | `tracking.recover.bind(tracking`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/shipment-tracking/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                       | `tracking.destroy.bind(tracking`         |

### Module: `/pickup-request`

Route file: `src/routes/pickup-request/pickup-request.route.ts`

| Method | Endpoint       | Full Path Template                                      | Middleware                                         | Validation                              | Handler                                            |
| ------ | -------------- | ------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | PickupRequestDto on body (create)       | `pickupRequest.create.bind(pickupRequest`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | PickupRequestQueryDto on query (create) | `pickupRequest.getAll.bind(pickupRequest`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                    | `pickupRequest.getByIdentifier.bind(pickupRequest` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | PickupRequestDto on body (update)       | `pickupRequest.update.bind(pickupRequest`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                    | `pickupRequest.delete.bind(pickupRequest`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | PickupRequestQueryDto on query (create) | `pickupRequest.getDeleted.bind(pickupRequest`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                      | `pickupRequest.recover.bind(pickupRequest`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/pickup-request/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                    | `pickupRequest.destroy.bind(pickupRequest`         |

### Module: `/delivery-api-log`

Route file: `src/routes/delivery-api-log/delivery-api-log.route.ts`

| Method | Endpoint       | Full Path Template                                        | Middleware                                         | Validation                               | Handler                              |
| ------ | -------------- | --------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryApiLogDto on body (create)       | `apiLog.create.bind(apiLog`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryApiLogQueryDto on query (create) | `apiLog.getAll.bind(apiLog`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                     | `apiLog.getByIdentifier.bind(apiLog` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryApiLogDto on body (update)       | `apiLog.update.bind(apiLog`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                     | `apiLog.delete.bind(apiLog`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryApiLogQueryDto on query (create) | `apiLog.getDeleted.bind(apiLog`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                       | `apiLog.recover.bind(apiLog`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/delivery-api-log/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                     | `apiLog.destroy.bind(apiLog`         |

### Module: `/delivery-webhook-event`

Route file: `src/routes/delivery-webhook-event/delivery-webhook-event.route.ts`

| Method | Endpoint       | Full Path Template                                              | Middleware                                         | Validation                                     | Handler                                                          |
| ------ | -------------- | --------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| POST   | `/create`      | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/create`      | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryWebhookEventDto on body (create)       | `deliveryWebhookEvent.create.bind(deliveryWebhookEvent`          |
| GET    | `/get-all`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/get-all`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryWebhookEventQueryDto on query (create) | `deliveryWebhookEvent.getAll.bind(deliveryWebhookEvent`          |
| GET    | `/get/:id`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/get/:id`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                           | `deliveryWebhookEvent.getByIdentifier.bind(deliveryWebhookEvent` |
| PUT    | `/update/:id`  | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/update/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryWebhookEventDto on body (update)       | `deliveryWebhookEvent.update.bind(deliveryWebhookEvent`          |
| DELETE | `/delete/:id`  | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/delete/:id`  | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                           | `deliveryWebhookEvent.delete.bind(deliveryWebhookEvent`          |
| GET    | `/deleted`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/deleted`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | DeliveryWebhookEventQueryDto on query (create) | `deliveryWebhookEvent.getDeleted.bind(deliveryWebhookEvent`      |
| PUT    | `/recover`     | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/recover`     | authentication, isVerifiedUser, isAdminOrSudoAdmin | RecoverDto on body                             | `deliveryWebhookEvent.recover.bind(deliveryWebhookEvent`         |
| DELETE | `/destroy/:id` | `{{BASE_URL}}{{API_PREFIX}}/delivery-webhook-event/destroy/:id` | authentication, isVerifiedUser, isAdminOrSudoAdmin | none                                           | `deliveryWebhookEvent.destroy.bind(deliveryWebhookEvent`         |

## DTO and Payload Source

- Exact body/query/params fields are defined in `src/dto/**`.
- Search by DTO name listed above to get strict validation rules.

## Notes

- This file is generated from mounted routes in `src/routes/index.route.ts` and each module route file.
- Any endpoint not mounted in `index.route.ts` is intentionally out of runtime coverage.
