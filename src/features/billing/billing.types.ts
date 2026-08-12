export type BillType = "SHIPPING_LABEL" | "VAT_BILL";

export type CompanySetting = Readonly<{
  id: string; companyName: string; legalName?: string | null; senderName?: string | null;
  logoUrl?: string | null; address: string; city?: string | null; district?: string | null;
  country?: string | null; phone?: string | null; email?: string | null; website?: string | null;
  vatNumber?: string | null; panNumber?: string | null; registrationNumber?: string | null;
  invoicePrefix: string; fiscalYear?: string | null; invoiceStartNumber: number;
  billingNote?: string | null; termsAndConditions?: string | null; isActive: boolean;
}>;

export type CompanySettingDto = Omit<CompanySetting, "id" | "logoUrl"> & Readonly<{ logoUrl?: string; logo?: File | null }>;

export type MoneyParts = Readonly<{ value: number; rupees: number; paisa: number; display: string }>;
export type BillPayload = Readonly<{
  bill: Readonly<{ id: string; billType: BillType; billNumber: string; fiscalYear?: string | null; printedAt?: string | null; lastPrintedAt?: string | null; printCount: number; createdAt?: string }>;
  templateKey: string;
  company: Record<string, unknown>;
  sender: Record<string, unknown>;
  receiver: Record<string, unknown>;
  customer: Record<string, unknown>;
  order: Record<string, unknown>;
  items: ReadonlyArray<Record<string, unknown>>;
  totals: Record<string, unknown>;
  vatInvoice?: Readonly<{
    title: string; seller: Record<string, unknown>; buyer: Record<string, unknown>;
    invoice: Record<string, unknown>; rows: ReadonlyArray<Record<string, unknown>>;
    summary: Record<string, unknown>; signature: Record<string, unknown>;
  }>;
}>;

export type BulkBillPayload = Readonly<{ billType: BillType; bills: ReadonlyArray<BillPayload>; missingOrderIds: ReadonlyArray<string>; total: number }>;
