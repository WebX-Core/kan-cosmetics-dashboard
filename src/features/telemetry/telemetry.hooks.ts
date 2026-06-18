import { telemetryApi } from "./telemetry.api";
import { useQuery } from "@tanstack/react-query";
import type { ApiListQuery } from "@/shared/types/common.types";

export const useAuditLogList = telemetryApi.auditLogs.hooks.useList;
export const useUserActivityList = telemetryApi.userActivity.crud.hooks.useList;
export const useUserMetadataList = telemetryApi.userMetadata.hooks.useList;

export const useUserActivityFunnel = (q?: ApiListQuery) =>
  useQuery({
    queryKey: ["telemetry", "user-activity", "funnel", q],
    queryFn: () => telemetryApi.userActivity.funnel(q),
    staleTime: 60_000,
  });

export const useUserActivityDiscardAnalytics = (q?: ApiListQuery) =>
  useQuery({
    queryKey: ["telemetry", "user-activity", "discard-analytics", q],
    queryFn: () => telemetryApi.userActivity.discardAnalytics(q),
    staleTime: 60_000,
  });
