import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { deliveryApi } from "@/features/delivery";
import { ShipmentDetailPage } from "./ShipmentDetailPage";
import { ShipmentViewPage } from "./ShipmentViewPage";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";
import { parseApiError } from "@/shared/utils/apiError";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";

type Row = Readonly<Record<string, unknown>>;

type DeliveryEntity = Readonly<{
  hooks: {
    useList: (q?: Readonly<{ page?: number; limit?: number; search?: string }>) => {
      data?: Readonly<{ data: ReadonlyArray<Row> }>;
      isLoading: boolean;
    };
    useGet: (id?: string) => { data?: Row; isLoading: boolean };
    useCreate: () => { mutateAsync: (dto: Record<string, unknown>) => Promise<unknown>; isPending: boolean };
    useUpdate: () => { mutateAsync: (payload: Readonly<{ id: string; dto: Record<string, unknown> }>) => Promise<unknown>; isPending: boolean };
    useSoftDelete: () => { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
  };
}>;

type FieldType = "text" | "number" | "checkbox";

type FieldConfig = Readonly<{
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
}>;

type ModuleConfig = Readonly<{
  key: string;
  label: string;
  basePath: string;
  entity: DeliveryEntity;
  fields: ReadonlyArray<FieldConfig>;
}>;

const asText = (value: unknown): string => (typeof value === "string" ? value : "");
const asNumber = (value: unknown): string => (typeof value === "number" ? String(value) : "");
const asBool = (value: unknown): boolean => Boolean(value);

const toRows = (value: unknown): ReadonlyArray<Row> => {
  if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object") as ReadonlyArray<Row>;
  if (!value || typeof value !== "object") return [];
  const source = value as Record<string, unknown>;
  const direct = source.data;
  if (Array.isArray(direct)) return direct.filter((x) => x && typeof x === "object") as ReadonlyArray<Row>;
  for (const candidate of Object.values(source)) {
    if (Array.isArray(candidate)) {
      return candidate.filter((x) => x && typeof x === "object") as ReadonlyArray<Row>;
    }
  }
  return [];
};

const makeSchema = (fields: ReadonlyArray<FieldConfig>) =>
  z.object(
    Object.fromEntries(
      fields.map((field) => {
        if (field.type === "number") {
          return [field.key, field.required ? z.coerce.number({ message: `${field.label} is required` }) : z.coerce.number().optional()];
        }
        if (field.type === "checkbox") {
          return [field.key, z.boolean().optional()];
        }
        return [
          field.key,
          field.required
            ? z
                .string()
                .trim()
                .min(1, `${field.label} is required`)
            : z.string().optional(),
        ];
      }),
    ),
  );

const initialFor = (fields: ReadonlyArray<FieldConfig>, row?: Row): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field) => {
      const value = row?.[field.key];
      if (field.type === "number") return [field.key, asNumber(value) || "0"];
      if (field.type === "checkbox") return [field.key, asBool(value)];
      return [field.key, asText(value)];
    }),
  );

const payloadFor = (fields: ReadonlyArray<FieldConfig>, values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field) => {
      if (field.type === "number") {
        const raw = values[field.key];
        const numeric = typeof raw === "number" ? raw : Number(raw ?? 0);
        return [field.key, Number.isNaN(numeric) ? 0 : numeric];
      }
      if (field.type === "checkbox") {
        return [field.key, Boolean(values[field.key])];
      }
      return [field.key, asText(values[field.key]).trim()];
    }),
  );

const DeliveryListPage: React.FC<Readonly<{ config: ModuleConfig }>> = ({ config }) => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const query = config.entity.hooks.useList({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const remove = config.entity.hooks.useSoftDelete();

  const rows = React.useMemo(() => toRows(query.data?.data), [query.data]);
  const totalPages = 1;
  const visibleIds = React.useMemo(
    () => rows.map((row) => String(row.id ?? "")),
    [rows],
  );
  const isAllVisibleSelected = React.useMemo(
    () => visibleIds.length > 0 && visibleIds.every((entry) => selectedIds.includes(entry)),
    [visibleIds, selectedIds],
  );
  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((entry) => entry !== id),
    );
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const columns = React.useMemo(() => {
    const keys = new Set<string>(["id", ...config.fields.map((field) => field.key)]);
    const visibleKeys = Array.from(keys).slice(0, 7);
    return [
      {
        key: "select",
        label: (
          <input
            type="checkbox"
            checked={isAllVisibleSelected}
            onChange={(event) => toggleSelectAllVisible(event.target.checked)}
            aria-label={`Select all ${config.label.toLowerCase()}`}
          />
        ),
        render: (row: Row) => {
          const id = String(row.id ?? "");
          return (
            <input
              type="checkbox"
              checked={selectedIds.includes(id)}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => toggleSelectOne(id, event.target.checked)}
              aria-label={`Select ${id}`}
            />
          );
        },
        width: "44px",
      },
      ...visibleKeys.map((column) => ({
        key: column,
        label: column,
        render: (row: Row) => (
          <span className="text-sm text-zinc-700">
            {typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column] ?? "-")}
          </span>
        ),
      })),
    ];
  }, [config.fields, config.label, isAllVisibleSelected, selectedIds]);

  const handleDelete = async (id: string) => {
    await remove.mutateAsync(id);
    setSelectedIds((prev) => prev.filter((entry) => entry !== id));
  };

  const isShipmentModule = config.key === "shipments";
  const getDetailPath = (id: string) =>
    `${config.basePath}/${id}${isShipmentModule ? "" : "/edit"}`;
  const getEditPath = (id: string) =>
    `${config.basePath}/${id}/edit`;

  const tableActions = selectedIds.length > 0 ? (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-[#6e6e73]">{selectedIds.length} selected</span>
      <button
        type="button"
        onClick={() => setSelectedIds([])}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        aria-label="Clear selected rows"
      >
        <X size={12} />
      </button>
    </div>
  ) : undefined;

  return (
    <PageLayout
      title={config.label}
      subtitle={`Manage ${config.label.toLowerCase()} records.`}
      onNew={() => navigate(`${config.basePath}/create`)}
      newButtonLabel={`New ${config.label.slice(0, -1)}`}
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder={`Search ${config.label.toLowerCase()}...`}
    >
      <DataTableV2
        columns={columns}
        data={rows}
        actions={tableActions}
        onRowClick={(row) => navigate(getDetailPath(String(row.id)))}
        onEdit={(row) => navigate(getEditPath(String(row.id)))}
        onDelete={(row) => void handleDelete(String(row.id))}
        emptyMessage={query.isLoading ? "Loading..." : "No records found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(nextPage) => setState((prev) => ({ ...prev, page: nextPage }))}
      />
    </PageLayout>
  );
};

const DeliveryFormPage: React.FC<Readonly<{ config: ModuleConfig; mode: "create" | "edit" }>> = ({ config, mode }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const get = config.entity.hooks.useGet(mode === "edit" ? id : undefined);
  const create = config.entity.hooks.useCreate();
  const update = config.entity.hooks.useUpdate();
  const schema = React.useMemo(() => makeSchema(config.fields), [config.fields]);

  const [values, setValues] = React.useState<Record<string, unknown>>(() => initialFor(config.fields));

  React.useEffect(() => {
    if (mode !== "edit") return;
    if (!get.data) return;
    setValues(initialFor(config.fields, get.data));
  }, [config.fields, get.data, mode]);

  const saving = create.isPending || update.isPending;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(schema, values, toast);
    if (!parsed) return;
    const payload = payloadFor(config.fields, parsed as Record<string, unknown>);

    try {
      if (mode === "create") {
        await create.mutateAsync(payload);
      } else if (id) {
        await update.mutateAsync({ id, dto: payload });
      }
      navigate(config.basePath, { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (mode === "edit" && get.isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <ModernFormLayout
      title={mode === "create" ? `Create ${config.label.slice(0, -1)}` : `Edit ${config.label.slice(0, -1)}`}
      subtitle={mode === "create" ? "Add a new record." : "Update existing record."}
      onBack={() => navigate(config.basePath)}
    >
      <form onSubmit={onSubmit} className="space-y-[21px]">
        <FormSection title="Details">
          <div className="grid gap-[13px] md:grid-cols-2">
            {config.fields.map((field) => (
              <FormField key={field.key} label={field.label} required={field.required}>
                {field.type === "checkbox" ? (
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-3 text-[14px] text-[#1d1d1f]">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.key])}
                      onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.checked }))}
                    />
                    Enabled
                  </label>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(values[field.key] ?? "")}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                  />
                )}
              </FormField>
            ))}
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving..." : mode === "create" ? "Create" : "Update"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate(config.basePath)}
        />
      </form>
    </ModernFormLayout>
  );
};

const modules: Readonly<Record<string, ModuleConfig>> = {
  couriers: {
    key: "couriers",
    label: "Couriers",
    basePath: "/dashboard/delivery/couriers",
    entity: deliveryApi.couriers as unknown as DeliveryEntity,
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "providerCode", label: "Provider Code" },
      { key: "apiProvider", label: "API Provider" },
      { key: "environment", label: "Environment" },
      { key: "trackingUrl", label: "Tracking URL" },
      { key: "isActive", label: "Active", type: "checkbox" },
    ],
  },
  courierBranches: {
    key: "courierBranches",
    label: "Courier Branches",
    basePath: "/dashboard/delivery/courier-branches",
    entity: deliveryApi.courierBranches as unknown as DeliveryEntity,
    fields: [
      { key: "courierId", label: "Courier ID", required: true },
      { key: "externalId", label: "External ID", required: true },
      { key: "branchName", label: "Branch Name", required: true },
      { key: "branchCode", label: "Branch Code" },
      { key: "branchType", label: "Branch Type" },
      { key: "status", label: "Status" },
    ],
  },
  courierPickupAddresses: {
    key: "courierPickupAddresses",
    label: "Courier Pickup Addresses",
    basePath: "/dashboard/delivery/courier-pickup-addresses",
    entity: deliveryApi.courierPickupAddresses as unknown as DeliveryEntity,
    fields: [
      { key: "courierId", label: "Courier ID", required: true },
      { key: "title", label: "Title", required: true },
      { key: "address", label: "Address", required: true },
      { key: "contactName", label: "Contact Name" },
      { key: "contactPhone", label: "Contact Phone" },
      { key: "isDefault", label: "Default", type: "checkbox" },
      { key: "isActive", label: "Active", type: "checkbox" },
    ],
  },
  shipments: {
    key: "shipments",
    label: "Shipments",
    basePath: "/dashboard/delivery/shipments",
    entity: deliveryApi.shipments as unknown as DeliveryEntity,
    fields: [
      { key: "orderId", label: "Order ID", required: true },
      { key: "courierId", label: "Courier ID", required: true },
      { key: "trackingNumber", label: "Tracking Number" },
      { key: "status", label: "Status", required: true },
    ],
  },
  shipmentTracking: {
    key: "shipmentTracking",
    label: "Shipment Tracking",
    basePath: "/dashboard/delivery/shipment-tracking",
    entity: deliveryApi.shipmentTracking as unknown as DeliveryEntity,
    fields: [
      { key: "shipmentId", label: "Shipment ID", required: true },
      { key: "status", label: "Status", required: true },
      { key: "providerStatus", label: "Provider Status" },
      { key: "location", label: "Location" },
      { key: "message", label: "Message" },
    ],
  },
  pickupRequests: {
    key: "pickupRequests",
    label: "Pickup Requests",
    basePath: "/dashboard/delivery/pickup-requests",
    entity: deliveryApi.pickupRequests as unknown as DeliveryEntity,
    fields: [
      { key: "courierId", label: "Courier ID", required: true },
      { key: "shipmentId", label: "Shipment ID" },
      { key: "pickupAddressId", label: "Pickup Address ID" },
      { key: "vendorAddress", label: "Vendor Address", required: true },
      { key: "status", label: "Status" },
    ],
  },
  deliveryApiLogs: {
    key: "deliveryApiLogs",
    label: "Delivery API Logs",
    basePath: "/dashboard/delivery/api-logs",
    entity: deliveryApi.deliveryApiLogs as unknown as DeliveryEntity,
    fields: [
      { key: "courierId", label: "Courier ID" },
      { key: "shipmentId", label: "Shipment ID" },
      { key: "operation", label: "Operation", required: true },
      { key: "method", label: "Method", required: true },
      { key: "endpoint", label: "Endpoint", required: true },
      { key: "statusCode", label: "Status Code", type: "number" },
      { key: "isSuccess", label: "Success", type: "checkbox" },
    ],
  },
  deliveryWebhookEvents: {
    key: "deliveryWebhookEvents",
    label: "Delivery Webhook Events",
    basePath: "/dashboard/delivery/webhook-events",
    entity: deliveryApi.deliveryWebhookEvents as unknown as DeliveryEntity,
    fields: [
      { key: "courierId", label: "Courier ID" },
      { key: "shipmentId", label: "Shipment ID" },
      { key: "trackingNumber", label: "Tracking Number", required: true },
      { key: "status", label: "Status", required: true },
      { key: "packageType", label: "Package Type" },
      { key: "isProcessed", label: "Processed", type: "checkbox" },
    ],
  },
};

const makePages = (moduleKey: keyof typeof modules) => {
  const config = modules[moduleKey];
  const ListPage: React.FC = () => <DeliveryListPage config={config} />;
  const CreatePage: React.FC = () => <DeliveryFormPage config={config} mode="create" />;
  const EditPage: React.FC = () => <DeliveryFormPage config={config} mode="edit" />;
  return { ListPage, CreatePage, EditPage };
};

const couriers = makePages("couriers");
const courierBranches = makePages("courierBranches");
const courierPickupAddresses = makePages("courierPickupAddresses");
const shipments = makePages("shipments");
const shipmentTracking = makePages("shipmentTracking");
const pickupRequests = makePages("pickupRequests");
const deliveryApiLogs = makePages("deliveryApiLogs");
const deliveryWebhookEvents = makePages("deliveryWebhookEvents");

export const CouriersListPage = couriers.ListPage;
export const CouriersCreatePage = couriers.CreatePage;
export const CouriersEditPage = couriers.EditPage;

export const CourierBranchesListPage = courierBranches.ListPage;
export const CourierBranchesCreatePage = courierBranches.CreatePage;
export const CourierBranchesEditPage = courierBranches.EditPage;

export const CourierPickupAddressesListPage = courierPickupAddresses.ListPage;
export const CourierPickupAddressesCreatePage = courierPickupAddresses.CreatePage;
export const CourierPickupAddressesEditPage = courierPickupAddresses.EditPage;

export const ShipmentsListPage = shipments.ListPage;
export const ShipmentsCreatePage = shipments.CreatePage;
export const ShipmentsEditPage = ShipmentDetailPage;
export const ShipmentsViewPage = ShipmentViewPage;

export const ShipmentTrackingListPage = shipmentTracking.ListPage;
export const ShipmentTrackingCreatePage = shipmentTracking.CreatePage;
export const ShipmentTrackingEditPage = shipmentTracking.EditPage;

export const PickupRequestsListPage = pickupRequests.ListPage;
export const PickupRequestsCreatePage = pickupRequests.CreatePage;
export const PickupRequestsEditPage = pickupRequests.EditPage;

export const DeliveryApiLogsListPage = deliveryApiLogs.ListPage;
export const DeliveryApiLogsCreatePage = deliveryApiLogs.CreatePage;
export const DeliveryApiLogsEditPage = deliveryApiLogs.EditPage;

export const DeliveryWebhookEventsListPage = deliveryWebhookEvents.ListPage;
export const DeliveryWebhookEventsCreatePage = deliveryWebhookEvents.CreatePage;
export const DeliveryWebhookEventsEditPage = deliveryWebhookEvents.EditPage;
