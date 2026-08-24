export type NewsletterDto = Readonly<{
  email: string;
  name?: string;
}>;

export type BlogPostDto = Readonly<{
  title?: string;
  slug?: string;
  excerpt?: string;
  description?: unknown;
  isPublished?: boolean;
  publishedAt?: Date;
  authorId?: string;
  estimatedReadTime?: number;
  removedMediaIds?: ReadonlyArray<string>;
  mediaUrls?: ReadonlyArray<string>;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
  coverImage?: File | null;
}>;

export type AdvertisementDto = Readonly<{
  title: string;
  image: string | File;
  season?: string;
  date?: string;
  sortOrder?: number;
  targetType: "CATEGORY" | "SUBCATEGORY" | "PRODUCT" | "VARIANT";
  targetMode: "IDS" | "ALL";
  targetIds?: ReadonlyArray<string>;
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
}>;

export type AdvertisementMatchQuery = Readonly<{
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
  variantId?: string;
}>;

export type EmailCampaignDto = Readonly<{
  title: string;
  subject: string;
  content: string;
  type: string;
  status?: string;
  scheduledAt?: string;
  sortOrder?: number;
}>;

export type EmailRecipientDto = Readonly<{
  campaignId: string;
  email: string;
  name?: string;
  sortOrder?: number;
}>;

export type EmailQueueDto = Readonly<{
  to: string;
  subject: string;
  body?: string;
  status?: string;
  sortOrder?: number;
}>;

export type EmailLogDto = Readonly<{
  id?: string;
  createdAt?: string;
  campaign?: Readonly<{
    id: string;
    title: string;
    subject: string;
    type: string;
  }> | null;
  recipientEmail: string;
  status?: string;
  providerResponse?: Readonly<Record<string, unknown>> | null;
  errorMessage?: string | null;
  sentAt?: string | null;
  sortOrder?: number;
}>;

export type WebPushSubscriptionDto = Readonly<{
  customerId?: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  p256dh: string;
  authKey: string;
  contentEncoding?: string;
  isActive?: boolean;
  lastSeenAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureReason?: string;
  userAgent?: string;
  deviceType?: string;
  platform?: string;
  browser?: string;
  locale?: string;
  timezone?: string;
  ip?: string;
  metadata?: Record<string, unknown> | null;
  sortOrder?: number;
}>;

export type WebPushNotificationDto = Readonly<{
  broadcastAll?: boolean;
  subscriptionId?: string;
  customerId?: string;
  userId?: string;
  sessionId?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  clickAction?: string;
  tag?: string;
  ttl?: number;
  urgency?: string;
  payload?: Record<string, unknown> | null;
  idempotencyKey?: string;
  status?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  failureReason?: string;
  providerMessageId?: string;
  responseStatus?: number;
  responsePayload?: Record<string, unknown> | null;
  sortOrder?: number;
}>;

export type EmailRecipientBucketDto = Readonly<{
  name: string;
  description?: string;
  district?: string;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  limit?: number;
  sortOrder?: number;
}>;

export type SelectAudienceDto = Readonly<{
  campaignId: string;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  city?: string;
  state?: string;
  country?: string;
  keyword?: string;
  limit?: number;
  dryRun?: boolean;
}>;

export type CreateFromSubscribersDto = Readonly<{
  campaignId: string;
  subscriberIds: ReadonlyArray<string>;
  dryRun?: boolean;
}>;

export type CreateQueueFromCampaignDto = Readonly<{
  campaignId: string;
  scheduledAt?: string;
  limit?: number;
  batchSize?: number;
  batchDelayMinutes?: number;
  workerConcurrency?: number;
  workerRateLimitMax?: number;
  workerRateLimitDurationMs?: number;
  dryRun?: boolean;
  skipExistingQueued?: boolean;
}>;

export type CreateQueueFromBucketDto = Readonly<{
  campaignId: string;
  bucketId: string;
  scheduledAt?: string;
  limit?: number;
  batchSize?: number;
  batchDelayMinutes?: number;
  workerConcurrency?: number;
  workerRateLimitMax?: number;
  workerRateLimitDurationMs?: number;
  dryRun?: boolean;
  skipExistingQueued?: boolean;
}>;
