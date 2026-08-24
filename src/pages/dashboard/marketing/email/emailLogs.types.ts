export type EmailLogRow = Readonly<{
  id: string;
  recipientEmail: string;
  campaignTitle: string;
  subject: string;
  status: string;
  errorMessage: string;
  messageId: string;
  providerMessage: string;
  sentAt: string;
}>;
