export type ActivityRow = Readonly<{
  id: string;
  who: string;
  activityLabel: string;
  entityLabel: string;
  path: string;
  method: string;
  referrer: string;
  sessionId: string;
  occurredAtLabel: string;
  metadata: unknown;
}>;
