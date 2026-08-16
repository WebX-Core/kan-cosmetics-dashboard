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
export type LoyaltySettings = Readonly<{ id?: string; referralRewardPoints: number; isActive: boolean; metadata?: Record<string, unknown> | null }>;
export type UpdateLoyaltySettingsDto = Readonly<{ referralRewardPoints: number; isActive?: boolean; metadata?: Record<string, unknown> | null }>;
export type LoyaltyPointSource = "SIGNUP" | "ORDER_COMPLETED" | "PAYMENT_SETTLED" | "REFERRAL" | "ADMIN_BONUS" | "MANUAL_ADJUSTMENT" | "YEARLY_RESET";
export type LoyaltyPointLedger = Readonly<{ id: string; customerId: string; customer?: Record<string, unknown> | null; points: number; sourceType: LoyaltyPointSource; sourceReferenceId?: string | null; reason?: string | null; yearBucket?: string | number | null; cycleStartAt?: string | null; cycleEndAt?: string | null; metadata?: Record<string, unknown> | null; createdById?: string | null; createdAt?: string }>;
export type LoyaltyPointsQuery = Readonly<{ page?: number; limit?: number; search?: string; sourceType?: LoyaltyPointSource }>;
