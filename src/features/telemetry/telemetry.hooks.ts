import { telemetryApi } from "./telemetry.api";

export const useAuditLogList = telemetryApi.auditLogs.hooks.useList;
export const useUserActivityList = telemetryApi.userActivity.crud.hooks.useList;
