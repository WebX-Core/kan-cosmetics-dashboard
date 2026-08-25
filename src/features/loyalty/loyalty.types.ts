export type RewardType = "DIGITAL" | "PHYSICAL";

export type LoyaltyRewardConfig = Readonly<{
  rewardType?: RewardType;
  type?: RewardType;
  title?: string;
  description?: string | null;
  benefitValue?: number | string | null;
  benefitMeta?: Record<string, unknown> | null;
  expiresAt?: string | null;
}>;

export type LoyaltyTierBenefits = Readonly<{
  freeDelivery?: boolean;
  discountPercent?: number;
  percentOff?: number;
  fixedAmountOff?: number;
  amountOff?: number;
  physicalGift?: boolean;
  rewardMultiplier?: number;
  orderRewards?: ReadonlyArray<Record<string, unknown>>;
  reward?: LoyaltyRewardConfig;
  [key: string]: unknown;
}>;

export type LoyaltyTier = Readonly<{
  id: string;
  code: string;
  name: string;
  minYearlyPoints: number;
  maxYearlyPoints?: number | null;
  sortOrder?: number;
  benefits?: LoyaltyTierBenefits;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}>;

export type LoyaltyCustomer = Readonly<{
  rank: number;
  customerId: string;
  customer?: Record<string, unknown> | null;
  referralCode?: string;
  lifetimePoints: number;
  yearlyPoints: number;
  availablePoints: number;
  lifetimeRewardPoints?: number;
  redeemedRewardPoints?: number;
  expiredRewardPoints?: number;
  currentTierCode: string | null;
  currentCycleStartAt?: string | null;
  currentCycleEndAt?: string | null;
  yearlyResetAt?: string | null;
  lastTierEvaluatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}>;

export type CreateTierDto = Omit<LoyaltyTier, "id" | "createdAt" | "updatedAt">;
export type UpdateTierDto = Partial<CreateTierDto>;
export type ResetYearlyCycleDto = Readonly<{ resetAt?: string; reason?: string }>;

export type LoyaltyList<T> = Readonly<{ data: ReadonlyArray<T>; page?: number; limit?: number; total?: number; totalPages?: number }>;
export type LoyaltyQuery = Readonly<{ page?: number; limit?: number; search?: string; status?: string; type?: string; tier?: string }>;
export type LoyaltySettings = Readonly<{
  id?: string;
  signupRewardPoints?: number;
  referralRewardPoints: number;
  statusPointsPerNpr?: number;
  baseRewardPointsPerNpr?: number;
  pointsPerNprValue?: number;
  minimumRedeemPoints?: number;
  redeemStepPoints?: number;
  maxRedeemPercentWithoutCoupon?: number;
  maxRedeemPercentWithCoupon?: number;
  allowCouponWithPointRedeem?: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
}>;
export type UpdateLoyaltySettingsDto = Readonly<{
  signupRewardPoints?: number;
  referralRewardPoints?: number;
  statusPointsPerNpr?: number;
  baseRewardPointsPerNpr?: number;
  pointsPerNprValue?: number;
  minimumRedeemPoints?: number;
  redeemStepPoints?: number;
  maxRedeemPercentWithoutCoupon?: number;
  maxRedeemPercentWithCoupon?: number;
  allowCouponWithPointRedeem?: boolean;
  metadata?: Record<string, unknown> | null;
}>;
export type LoyaltyPointSource = "SIGNUP" | "ORDER_COMPLETED" | "ORDER_SETTLED" | "PAYMENT_SETTLED" | "REFERRAL" | "ADMIN_BONUS" | "MANUAL_ADJUSTMENT" | "POINT_REDEMPTION" | "YEARLY_RESET";
export type LoyaltyPointLedger = Readonly<{ id: string; customerId: string; customer?: Record<string, unknown> | null; points: number; rewardPoints?: number; sourceType: LoyaltyPointSource; sourceReferenceId?: string | null; reason?: string | null; yearBucket?: string | number | null; cycleStartAt?: string | null; cycleEndAt?: string | null; metadata?: Record<string, unknown> | null; createdById?: string | null; createdAt?: string }>;
export type LoyaltyPointsQuery = Readonly<{ page?: number; limit?: number; search?: string; sourceType?: LoyaltyPointSource }>;
export type LoyaltyReward = Readonly<{ id: string; customerId: string; customer?: Record<string, unknown> | null; tierCode?: string | null; rewardType: RewardType; rewardStatus: string; title: string; description?: string | null; benefitValue?: number | string | null; assignedToStaffId?: string | null; fulfilledAt?: string | null; expiresAt?: string | null; createdAt?: string }>;
export type LoyaltyRewardUpdateDto = Readonly<{ rewardStatus?: string; assignedToStaffId?: string | null; fulfilledAt?: string | null; metadata?: Record<string, unknown> | null }>;
export type LoyaltyPointAdjustmentDto = Readonly<{ points: number; sourceType?: LoyaltyPointSource; reason: string; sourceReferenceId?: string | null; metadata?: Record<string, unknown> | null }>;

export type LoyaltyRewardRule = Readonly<{
  id: string;
  tierId?: string | null;
  tier?: LoyaltyTier | null;
  tierCode?: string | null;
  code: string;
  title: string;
  description?: string | null;
  triggerType?: string | null;
  rewardType?: RewardType | null;
  rewardStatus?: string | null;
  isPhysical?: boolean;
  isDigital?: boolean;
  minOrderAmount?: number | string | null;
  maxOrderAmount?: number | string | null;
  minProductSubtotal?: number | string | null;
  maxProductSubtotal?: number | string | null;
  minYearlyPoints?: number | null;
  maxYearlyPoints?: number | null;
  minLifetimePoints?: number | null;
  maxLifetimePoints?: number | null;
  rewardMultiplier?: number | string | null;
  birthdayRewardMultiplier?: number | string | null;
  statusPointMultiplier?: number | string | null;
  birthdayMonthOnly?: boolean;
  firstOrderOnly?: boolean;
  selectedProductIds?: ReadonlyArray<string> | null;
  selectedProductVariantIds?: ReadonlyArray<string> | null;
  selectedCategoryIds?: ReadonlyArray<string> | null;
  selectedSubcategoryIds?: ReadonlyArray<string> | null;
  discountType?: string | null;
  discountValue?: number | string | null;
  maximumDiscountAmount?: number | string | null;
  minimumOrderAmountForCoupon?: number | string | null;
  couponValidityDays?: number | null;
  usageLimit?: number | null;
  perUserUsageLimit?: number | null;
  codePrefix?: string | null;
  freeShippingCount?: number | null;
  freeShippingPercent?: number | string | null;
  bonusRewardPoints?: number | null;
  bonusStatusPoints?: number | null;
  physicalGiftTitle?: string | null;
  freeProductTitle?: string | null;
  freeProductWorth?: number | string | null;
  packingNote?: string | null;
  quantity?: number | null;
  oncePerCustomer?: boolean;
  oncePerCycle?: boolean;
  allowWithCoupon?: boolean | null;
  stackable?: boolean | null;
  priority?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}>;

export type LoyaltyRewardRuleDto = Partial<Omit<LoyaltyRewardRule, "id" | "tier" | "createdAt" | "updatedAt">> & {
  code: string;
  title: string;
};
