export type AuditLogRow = Readonly<{
  id: string;
  admin: string;
  adminEmail: string;
  action: "Created" | "Updated" | "Deleted" | "Viewed";
  entity: string;
  method: string;
  statusCode: number;
  timestamp: string;
  changedBody: Readonly<Record<string, unknown>>;
}>;
