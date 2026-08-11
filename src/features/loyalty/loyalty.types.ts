export type RewardType = "DIGITAL" | "PHYSICAL";
export type RewardStatus = "PENDING" | "ASSIGNED" | "FULFILLED" | "REDEEMED" | "EXPIRED";

export type LoyaltyRewardConfig = Readonly<{
  rewardType?: RewardType;
  type?: RewardType;
  rewardStatus?: RewardStatus;
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
  currentTierCode: string;
  yearlyResetAt?: string | null;
  lastTierEvaluatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}>;

export type LoyaltyReward = Readonly<{
  id: string;
  customerId?: string;
  customer?: Record<string, unknown> | null;
  tierCode?: string;
  rewardType: RewardType;
  rewardStatus: RewardStatus;
  title: string;
  description?: string | null;
  benefitValue?: number | string | null;
  benefitMeta?: Record<string, unknown> | null;
  assignedToStaffId?: string | null;
  fulfilledAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}>;

export type CreateTierDto = Omit<LoyaltyTier, "id" | "createdAt" | "updatedAt">;
export type UpdateTierDto = Partial<CreateTierDto>;
export type AdjustPointsDto = Readonly<{ points: number; reason: string; sourceType: string }>;
export type FulfillRewardDto = Readonly<{ rewardStatus?: RewardStatus; assignedToStaffId?: string; fulfilledAt?: string; metadata?: Record<string, unknown> }>;
export type ResetYearlyCycleDto = Readonly<{ resetAt?: string; reason?: string }>;

export type LoyaltyList<T> = Readonly<{ data: ReadonlyArray<T>; page?: number; limit?: number; total?: number; totalPages?: number }>;
export type LoyaltyQuery = Readonly<{ page?: number; limit?: number; search?: string; status?: string; type?: string; tier?: string }>;
