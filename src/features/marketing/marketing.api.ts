import { api, unwrap } from "@/shared/api/api";
import type { ApiListQuery } from "@/shared/types/common.types";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type {
  NewsletterDto,
  BlogPostDto,
  AdvertisementDto,
  EmailCampaignDto,
  EmailRecipientDto,
  EmailQueueDto,
  EmailLogDto,
  WebPushSubscriptionDto,
  WebPushNotificationDto,
} from "./marketing.types";

export const marketingApi = {
  newsletters: makeStandardCrud<Record<string, unknown>, NewsletterDto, NewsletterDto>({ key: "newsletters", basePath: "/newsletter", getOne: false, update: false }),
  blogs: makeStandardCrud<Record<string, unknown>, BlogPostDto, BlogPostDto>({ key: "blogs", basePath: "/blog" }),
  advertisements: makeStandardCrud<Record<string, unknown>, AdvertisementDto, AdvertisementDto>({ key: "advertisements", basePath: "/advertisement" }),
  advertisementsMatch: async (q?: ApiListQuery) => unwrap<unknown>(await api.get("/advertisement/match", { params: q })),
  emailCampaigns: makeStandardCrud<Record<string, unknown>, EmailCampaignDto, EmailCampaignDto>({ key: "emailCampaigns", basePath: "/email-campaign" }),
  emailRecipients: makeStandardCrud<Record<string, unknown>, EmailRecipientDto, EmailRecipientDto>({ key: "emailRecipients", basePath: "/email-recipient" }),
  emailQueues: makeStandardCrud<Record<string, unknown>, EmailQueueDto, EmailQueueDto>({ key: "emailQueues", basePath: "/email-queue", update: false }),
  emailLogs: makeStandardCrud<Record<string, unknown>, EmailLogDto, EmailLogDto>({ key: "emailLogs", basePath: "/email-log", update: false, destroy: false }),
  webPushSubscriptions: makeStandardCrud<Record<string, unknown>, WebPushSubscriptionDto, WebPushSubscriptionDto>({ key: "webPushSubscriptions", basePath: "/web-push-subscription", update: false }),
  webPushNotifications: makeStandardCrud<Record<string, unknown>, WebPushNotificationDto, WebPushNotificationDto>({ key: "webPushNotifications", basePath: "/web-push-notification" }),
};
