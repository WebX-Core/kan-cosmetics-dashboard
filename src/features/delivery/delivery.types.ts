export type CourierDto = Readonly<{
  name: string;
  providerCode?: string;
  apiProvider?: string;
  environment?: string;
  baseUrl?: string;
  testBaseUrl?: string;
  productionBaseUrl?: string;
  apiKeyEnvName?: string;
  apiSecretEnvName?: string;
  authHeaderPrefix?: string;
  partnerRef?: string;
  trackingUrl?: string;
  webhookSecretEnvName?: string;
  metadata?: Readonly<Record<string, unknown>> | null;
  isActive?: boolean;
  sortOrder?: number;
}>;

export type CourierBranchDto = Readonly<{
  courierId: string;
  externalId: string;
  branchName: string;
  branchCode?: string;
  branchType?: string;
  status?: string;
  areas?: ReadonlyArray<string>;
  rawPayload?: Readonly<Record<string, unknown>> | null;
  sortOrder?: number;
}>;

export type CourierPickupAddressDto = Readonly<{
  courierId: string;
  externalId?: string;
  title: string;
  address: string;
  branch?: string;
  area?: string;
  contactName?: string;
  contactPhone?: string;
  isDefault?: boolean;
  isActive?: boolean;
  rawPayload?: Readonly<Record<string, unknown>> | null;
  sortOrder?: number;
}>;

export type ShipmentDto = Readonly<{
  orderId: string;
  courierId: string;
  trackingNumber?: string;
  status: string;
  providerPayload?: Readonly<Record<string, unknown>> | null;
  sortOrder?: number;
}>;

export type ShipmentTrackingDto = Readonly<{
  shipmentId: string;
  status: string;
  providerStatus?: string;
  location?: string;
  message?: string;
  comments?: string;
  commentBy?: string;
  packageType?: string;
  epod?: string;
  eventTime?: string;
  rawPayload?: Readonly<Record<string, unknown>> | null;
  sortOrder?: number;
}>;

export type PickupRequestDto = Readonly<{
  courierId: string;
  shipmentId?: string;
  pickupAddressId?: string;
  externalPickupRequestId?: string;
  vendorAddress: string;
  status?: string;
  requestedAt?: string;
  responsePayload?: Readonly<Record<string, unknown>> | null;
  sortOrder?: number;
}>;

export type DeliveryApiLogDto = Readonly<{
  courierId?: string;
  shipmentId?: string;
  operation: string;
  method: string;
  endpoint: string;
  requestHeaders?: Readonly<Record<string, unknown>> | null;
  requestPayload?: Readonly<Record<string, unknown>> | null;
  responsePayload?: Readonly<Record<string, unknown>> | null;
  statusCode?: number;
  isSuccess?: boolean;
  errorMessage?: string;
  durationMs?: number;
  sortOrder?: number;
}>;

export type DeliveryWebhookEventDto = Readonly<{
  courierId?: string;
  shipmentId?: string;
  trackingNumber: string;
  status: string;
  comments?: string;
  epod?: string;
  packageType?: string;
  eventTime?: string;
  rawPayload: Readonly<Record<string, unknown>>;
  signatureValid?: boolean;
  isProcessed?: boolean;
  processedAt?: string;
  sortOrder?: number;
}>;
