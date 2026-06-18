import { marketingApi } from "./marketing.api";

export const useBlogList = marketingApi.blogs.hooks.useList;
export const useNewsletterList = marketingApi.newsletters.hooks.useList;
export const useWebPushNotificationList = marketingApi.webPushNotifications.hooks.useList;
export const useWebPushNotification = marketingApi.webPushNotifications.hooks.useGet;
export const useWebPushSubscriptionList = marketingApi.webPushSubscriptions.hooks.useList;
export const useWebPushSubscription = marketingApi.webPushSubscriptions.hooks.useGet;
