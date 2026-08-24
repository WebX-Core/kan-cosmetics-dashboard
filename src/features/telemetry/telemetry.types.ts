export type AuditLogDto = Readonly<{
  id?: string;
  createdAt?: string;
  userId?: string;
  user?: Readonly<{
    id: string;
    firstname: string;
    lastname: string | null;
    email: string;
  }> | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Readonly<Record<string, unknown>> | null;
  newValues?: Readonly<Record<string, unknown>> | null;
  ip?: string | null;
  userAgent?: string | null;
  sortOrder?: number;
}>;

export type UserActivityDto = Readonly<{
  userId?: string;
  customerId?: string;
  sessionId?: string;
  activityType: string;
  entityType?: string;
  entityId?: string;
  path?: string;
  method?: string;
  referrer?: string;
  metadata?: Readonly<Record<string, unknown>> | null;
  occurredAt?: string;
  sortOrder?: number;
}>;

export type UserMetadataDto = Readonly<{
  userId?: string;
  sessionId?: string;
  ip?: string;
  country?: string;
  city?: string;
  region?: string;
  os?: string;
  browser?: string;
  device?: string;
  deviceType?: string;
  userAgent?: string;
  sortOrder?: number;
}>;
