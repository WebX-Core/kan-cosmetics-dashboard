import { makeStandardCrud } from "@/shared/api/standardCrud";
import type {
  CourierDto,
  CourierBranchDto,
  CourierPickupAddressDto,
  ShipmentDto,
  ShipmentTrackingDto,
  PickupRequestDto,
  DeliveryApiLogDto,
  DeliveryWebhookEventDto,
} from "./delivery.types";

export const deliveryApi = {
  couriers: makeStandardCrud<Record<string, unknown>, CourierDto, CourierDto>({ key: "couriers", basePath: "/courier" }),
  courierBranches: makeStandardCrud<Record<string, unknown>, CourierBranchDto, CourierBranchDto>({ key: "courierBranches", basePath: "/courier-branch" }),
  courierPickupAddresses: makeStandardCrud<Record<string, unknown>, CourierPickupAddressDto, CourierPickupAddressDto>({ key: "courierPickupAddresses", basePath: "/courier-pickup-address" }),
  shipments: makeStandardCrud<Record<string, unknown>, ShipmentDto, ShipmentDto>({ key: "shipments", basePath: "/shipment" }),
  shipmentTracking: makeStandardCrud<Record<string, unknown>, ShipmentTrackingDto, ShipmentTrackingDto>({ key: "shipmentTracking", basePath: "/shipment-tracking" }),
  pickupRequests: makeStandardCrud<Record<string, unknown>, PickupRequestDto, PickupRequestDto>({ key: "pickupRequests", basePath: "/pickup-request" }),
  deliveryApiLogs: makeStandardCrud<Record<string, unknown>, DeliveryApiLogDto, DeliveryApiLogDto>({ key: "deliveryApiLogs", basePath: "/delivery-api-log" }),
  deliveryWebhookEvents: makeStandardCrud<Record<string, unknown>, DeliveryWebhookEventDto, DeliveryWebhookEventDto>({ key: "deliveryWebhookEvents", basePath: "/delivery-webhook-event" }),
};
