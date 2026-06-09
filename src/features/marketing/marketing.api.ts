import { api, unwrap } from "@/shared/api/api";
import type { ApiListQuery } from "@/shared/types/common.types";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type { FormFieldValue, FormFileValue } from "@/shared/api/api";
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
  EmailRecipientBucketDto,
  SelectAudienceDto,
  CreateFromSubscribersDto,
  CreateQueueFromCampaignDto,
  CreateQueueFromBucketDto,
} from "./marketing.types";

export const marketingApi = {
  newsletters: makeStandardCrud<Record<string, unknown>, NewsletterDto, NewsletterDto>({ key: "newsletters", basePath: "/newsletter", getOne: false, update: false }),
  blogs: makeStandardCrud<Record<string, unknown>, BlogPostDto, BlogPostDto>(
    { key: "blogs", basePath: "/blog" },
    {
      create: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
      update: (dto) => {
        const { coverImage, ...rest } = dto;
        return {
          fields: rest as Readonly<Record<string, FormFieldValue>>,
          files: { coverImage: (coverImage ?? undefined) as FormFileValue },
        };
      },
    }
  ),
  advertisements: makeStandardCrud<Record<string, unknown>, AdvertisementDto, AdvertisementDto>({ key: "advertisements", basePath: "/advertisement" }),
  advertisementsMatch: async (q?: ApiListQuery) => unwrap<unknown>(await api.get("/advertisement/match", { params: q })),
  emailCampaigns: makeStandardCrud<Record<string, unknown>, EmailCampaignDto, EmailCampaignDto>({ key: "emailCampaigns", basePath: "/email-campaign" }),
  emailRecipients: makeStandardCrud<Record<string, unknown>, EmailRecipientDto, EmailRecipientDto>({ key: "emailRecipients", basePath: "/email-recipient" }),
  emailRecipientBuckets: makeStandardCrud<Record<string, unknown>, EmailRecipientBucketDto, EmailRecipientBucketDto>({ key: "emailRecipientBuckets", basePath: "/email-recipient-bucket" }),
  emailQueues: makeStandardCrud<Record<string, unknown>, EmailQueueDto, EmailQueueDto>({ key: "emailQueues", basePath: "/email-queue", update: false }),
  emailLogs: makeStandardCrud<Record<string, unknown>, EmailLogDto, EmailLogDto>({ key: "emailLogs", basePath: "/email-log", update: false, destroy: false }),
  webPushSubscriptions: makeStandardCrud<Record<string, unknown>, WebPushSubscriptionDto, WebPushSubscriptionDto>({ key: "webPushSubscriptions", basePath: "/web-push-subscription" }),
  webPushNotifications: makeStandardCrud<Record<string, unknown>, WebPushNotificationDto, WebPushNotificationDto>({ key: "webPushNotifications", basePath: "/web-push-notification" }),
  selectAudience: async (dto: SelectAudienceDto) => unwrap<unknown>(await api.post("/email-recipient/select-audience", dto)),
  createFromSubscribers: async (dto: CreateFromSubscribersDto) => unwrap<unknown>(await api.post("/email-recipient/create-from-subscribers", dto)),
  createQueueFromCampaign: async (dto: CreateQueueFromCampaignDto) => unwrap<unknown>(await api.post("/email-queue/create-from-campaign", dto)),
  createQueueFromBucket: async (dto: CreateQueueFromBucketDto) => unwrap<unknown>(await api.post("/email-queue/create-from-bucket", dto)),
};
