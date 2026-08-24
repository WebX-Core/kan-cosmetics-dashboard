import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import {
  useBulkPickupNotification,
  useReadyForPickupOrders,
  useSyncOrderDelivery,
} from "@/features/commerce";

type Row = Readonly<Record<string, unknown>>;

type ReadyPickupList = Readonly<{
  orders: ReadonlyArray<Row>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

const isRecord = (value: unknown): value is Row =>
  typeof value === "object" && value !== null;

const record = (value: unknown): Row => (isRecord(value) ? value : {});

const text = (value: unknown, fallback = "-"): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const numeric = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value: unknown): string =>
  `Rs ${new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(numeric(value))}`;

const dateTime = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const listFromPayload = (payload: unknown): ReadyPickupList => {
  const root = record(payload);
  const data = record(root.data ?? root);
  const orders = Array.isArray(data.orders) ? data.orders.filter(isRecord) : [];

  return {
    orders,
    total: numeric(data.total, orders.length),
    page: numeric(data.page, 1),
    limit: numeric(data.limit, 50),
    totalPages: Math.max(1, numeric(data.totalPages, 1)),
  };
};

const customerName = (row: Row): string => {
  const customer = record(row.customer);
  const address = record(row.shippingAddress);
  const first = text(customer.firstname, "");
  const last = text(customer.lastname, "");
  return [first, last].filter(Boolean).join(" ") || text(address.fullName);
};

const customerPhone = (row: Row): string => {
  const customer = record(row.customer);
  const address = record(row.shippingAddress);
  return text(address.phone, text(customer.phone));
};

const addressSummary = (row: Row): string => {
  const address = record(row.shippingAddress);
  const parts = [
    address.destinationBranch,
    address.destinationCityArea,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
  ]
    .map((part) => text(part, ""))
    .filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
};

const shipmentLabel = (row: Row): string => {
  const shipment = record(row.shipment);
  return text(
    shipment.providerTrackingNumber,
    text(
      shipment.trackingNumber,
      text(shipment.externalOrderId, text(shipment.status)),
    ),
  );
};

const columns = [
  {
    key: "order",
    label: "Order",
    render: (row: Row) => (
      <div className="min-w-37.5">
        <p className="text-[13px] font-semibold text-[#1d1d1f]">
          {text(row.orderNumber)}
        </p>
        <p className="mt-0.75 text-[12px] text-[#86868b]">
          {dateTime(row.createdAt)}
        </p>
      </div>
    ),
  },
  {
    key: "customer",
    label: "Customer",
    render: (row: Row) => (
      <div className="min-w-45">
        <p className="text-[13px] font-semibold text-[#1d1d1f]">
          {customerName(row)}
        </p>
        <p className="mt-0.75 text-[12px] text-[#86868b]">
          {customerPhone(row)}
        </p>
      </div>
    ),
  },
  {
    key: "destination",
    label: "Destination",
    render: (row: Row) => (
      <p className="max-w-90 text-[12px] leading-4.5 text-[#52525b]">
        {addressSummary(row)}
      </p>
    ),
  },
  {
    key: "shipment",
    label: "Shipment",
    render: (row: Row) => (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        {shipmentLabel(row)}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    render: (row: Row) => (
      <div className="text-[13px] font-semibold text-[#1d1d1f]">
        {money(row.totalAmount)}
        <p className="mt-0.75 text-[12px] font-normal text-[#86868b]">
          Shipping {money(row.shippingAmount)}
        </p>
      </div>
    ),
  },
];

export const ReadyForPickupPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 50,
    search: "",
  });
  const queryParams = React.useMemo(
    () => ({
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch, state.limit, state.page],
  );
  const query = useReadyForPickupOrders(queryParams);
  const bulkPickup = useBulkPickupNotification();
  const syncDelivery = useSyncOrderDelivery();
  const toast = useToast();
  const [syncingAll, setSyncingAll] = React.useState(false);
  const payload = React.useMemo(
    () => listFromPayload(query.data),
    [query.data],
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const visible = new Set(
      payload.orders.map((row) => text(row.id, "")).filter(Boolean),
    );
    setSelectedIds(
      (previous) =>
        new Set(Array.from(previous).filter((id) => visible.has(id))),
    );
  }, [payload.orders]);

  const requestPickup = async (
    ids: Set<string>,
    clearSelection: () => void,
  ) => {
    await bulkPickup.mutateAsync(Array.from(ids));
    clearSelection();
    setSelectedIds(new Set());
    await query.refetch();
  };

  const handleSyncDelivery = async () => {
    const ids = payload.orders.map((row) => text(row.id, "")).filter(Boolean);
    if (!ids.length) return;
    setSyncingAll(true);
    try {
      for (const orderId of ids) {
        await syncDelivery.mutateAsync({ orderId });
      }
      await query.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSyncingAll(false);
    }
  };

  const handlePickupNotification = async () => {
    const ids = payload.orders.map((row) => text(row.id, "")).filter(Boolean);
    if (!ids.length) return;
    await bulkPickup.mutateAsync(ids);
    await query.refetch();
  };

  return (
    <PageLayout
      title="Ready for Pickup"
      subtitle='Orders marked "READY FOR SHIPMENT" are ready to be included in one Pick & Drop pickup request.'
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSyncDelivery()}
            disabled={syncingAll || !payload.orders.length}
            className="inline-flex h-8.5 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            {syncingAll ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Sync delivery
          </button>
          <button
            type="button"
            onClick={() => void handlePickupNotification()}
            disabled={bulkPickup.isPending || !payload.orders.length}
            className="inline-flex h-8.5 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            {bulkPickup.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Bell size={13} />
            )}
            Pickup notification
          </button>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex h-8.5 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 text-[13px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      }
    >
      <div className="grid gap-3.25 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-700">
            <PackageCheck size={16} />
            Pickup-ready orders
          </div>
          <p className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
            {payload.total}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-blue-700">
            <Truck size={16} />
            Selected for pickup
          </div>
          <p className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
            {selectedIds.size}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5e5e7] bg-white p-4.5">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">
            How it works
          </p>
          <p className="mt-2 text-[12px] leading-4.5 text-[#6e6e73]">
            Select packed orders, then send one pickup notification. Pick & Drop
            handles rider pickup after they accept the request.
          </p>
        </div>
      </div>

      <DataTableV2
        title="Packed Orders"
        subtitle="Only READY_FOR_SHIPMENT orders with a delivery shipment are listed here."
        columns={columns}
        data={payload.orders}
        rowId={(row) => text(row.id, "")}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        searchValue={state.search}
        onSearchChange={(value) =>
          setState((previous) => ({ ...previous, page: 1, search: value }))
        }
        searchPlaceholder="Search order, customer, phone..."
        emptyMessage={
          query.isLoading
            ? "Loading pickup-ready orders..."
            : "No pickup-ready orders are available."
        }
        currentPage={state.page}
        totalPages={payload.totalPages}
        onPageChange={(page) => setState((previous) => ({ ...previous, page }))}
        showPagination
        onRowClick={(row) => navigate(`/dashboard/orders/${text(row.id, "")}`)}
        rowActions={(row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/dashboard/orders/${text(row.id, "")}`);
            }}
            className="rounded-full border border-[#d2d2d7] px-3 py-1.25 text-[12px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
          >
            View
          </button>
        )}
        bulkActions={(ids, clearSelection) => (
          <button
            type="button"
            disabled={bulkPickup.isPending || ids.size === 0}
            onClick={() => void requestPickup(ids, clearSelection)}
            className="inline-flex h-8.5 items-center gap-2 rounded-full bg-(--primary) px-4 text-[13px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkPickup.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Truck size={14} />
            )}
            Request pickup ({ids.size})
          </button>
        )}
      />
    </PageLayout>
  );
};
