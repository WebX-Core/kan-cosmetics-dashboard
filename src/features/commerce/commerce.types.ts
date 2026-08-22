export type CartAddItemDto = Readonly<{
  productId: string;
  productVariantId?: string;
  quantity: number;
}>;

export type CartUpdateItemDto = Readonly<{
  quantity: number;
}>;

export type WishlistAddItemDto = Readonly<{
  productId: string;
  productVariantId?: string;
}>;

export type CouponDiscountType = "PERCENTAGE" | "FLAT";

export type CouponDto = Readonly<{
  code: string;
  title: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number;
  perUserUsageLimit?: number;
  startsAt: string;
  expiresAt: string;
  isActive?: boolean;
  appliesToAllUsers?: boolean;
  eligibleCustomerIds?: ReadonlyArray<string>;
  firstSignupOnly?: boolean;
  issueOnSignup?: boolean;
  campaignId?: string;
  sortOrder?: number;
  categoryIds?: ReadonlyArray<string>;
  subcategoryIds?: ReadonlyArray<string>;
  productIds?: ReadonlyArray<string>;
  productVariantIds?: ReadonlyArray<string>;
}>;

export type CouponIssueToUsersDto = Readonly<{
  couponId: string;
  customerIds: ReadonlyArray<string>;
}>;

export type CouponUnassignUsersDto = CouponIssueToUsersDto;

export type CouponValidateDto = Readonly<{
  code: string;
  orderAmount: number;
  orderId?: string;
}>;

export type CouponApplyDto = Readonly<{
  code: string;
  orderAmount: number;
  orderId: string;
}>;

export type OrderCreateItemDto = Readonly<{
  productId: string;
  productVariantId?: string;
  quantity: number;
}>;

export type OrderCreateAddressDto = Readonly<{
  type: string;
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  panNumber?: string;
  destinationBranch?: string;
  destinationBranchCode?: string;
  destinationCityArea?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  landmark?: string;
  postalCode?: string;
  country: string;
}>;

export type OrderCreateDto = Readonly<{
  items: ReadonlyArray<OrderCreateItemDto>;
  addresses: ReadonlyArray<OrderCreateAddressDto>;
  shippingAmount?: number;
  paymentMethod: string;
  couponCode?: string;
  redeemPoints?: number;
  orderSource?: string;
  guestEmail?: string | null;
  syncDeliveryNow?: boolean;
}>;

export type OrderCreateByAdminDto = OrderCreateDto & Readonly<{
  customerId?: string;
}>;

export type OrderStatusUpdateDto = Readonly<{
  orderStatus: string;
  preventStatusDowngrade?: boolean;
}>;

export type OrderDeliverySyncDto = Readonly<{
  preventStatusDowngrade?: boolean;
}>;

export type OrderBulkPickupNotificationDto = Readonly<{
  orderIds: ReadonlyArray<string>;
}>;

export type PaymentUpdateDto = Readonly<{
  paymentStatus: string;
  transactionId?: string;
  paymentMethod?: string;
  paymentSource?: string;
  providerName?: string;
  providerTransactionId?: string;
  providerStatusRaw?: string;
  settlementStatus?: string;
  settlementDueAt?: string;
  settledAt?: string;
  settlementReference?: string;
  settlementNote?: string;
}>;

export type CustomerBanDto = Readonly<{
  customerId?: string;
  email?: string;
  phone?: string;
  reason: string;
  notes?: string;
}>;

export type CustomerBanLiftDto = Readonly<{
  ids: ReadonlyArray<string>;
}>;

export type CustomerAddressDto = Readonly<{
  customerId: string;
  type?: string;
  fullName?: string;
  phone?: string;
  secondaryPhone?: string;
  panNumber?: string;
  destinationBranch?: string;
  destinationBranchCode?: string;
  destinationCityArea?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  area?: string;
  landmark?: string;
  municipality?: string;
  ward?: string;
  tole?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}>;
