import { api, unwrap } from "@/shared/api/api";
import type { ApiListQuery } from "@/shared/types/common.types";
import { makeStandardCrud } from "@/shared/api/standardCrud";
import type { AuditLogDto, UserActivityDto, UserMetadataDto } from "./telemetry.types";

export const telemetryApi = {
  auditLogs: makeStandardCrud<Record<string, unknown>, AuditLogDto, AuditLogDto>({ key: "auditLogs", basePath: "/audit-log", update: false }),
  userActivity: {
    crud: makeStandardCrud<Record<string, unknown>, UserActivityDto, UserActivityDto>({ key: "userActivity", basePath: "/user-activity", update: false }),
    track: async (payload: UserActivityDto) => unwrap<unknown>(await api.post("/user-activity/track", payload)),
    funnel: async (q?: ApiListQuery) => unwrap<unknown>(await api.get("/user-activity/funnel", { params: q })),
    discardAnalytics: async (q?: ApiListQuery) => unwrap<unknown>(await api.get("/user-activity/discard-analytics", { params: q })),
  },
  userMetadata: makeStandardCrud<Record<string, unknown>, UserMetadataDto, UserMetadataDto>({ key: "userMetadata", basePath: "/user-metadata", update: false }),
};
