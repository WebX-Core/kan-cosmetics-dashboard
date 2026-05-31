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
}>;

export type AdvertisementDto = Readonly<{
  title: string;
  image: string;
  season?: string;
  date?: string;
  sortOrder?: number;
  targetType: string;
  targetMode: string;
  targetIds?: ReadonlyArray<string>;
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
}>;

export type EmailCampaignDto = Readonly<{
  name: string;
  subject: string;
  body?: string;
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
  to: string;
  subject: string;
  status?: string;
  sortOrder?: number;
}>;

export type WebPushSubscriptionDto = Readonly<{
  endpoint: string;
  p256dh?: string;
  auth?: string;
  sortOrder?: number;
}>;

export type WebPushNotificationDto = Readonly<{
  title: string;
  body: string;
  icon?: string;
  url?: string;
  sortOrder?: number;
}>;
