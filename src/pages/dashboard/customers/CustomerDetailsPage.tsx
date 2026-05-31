import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2, ShoppingBag, Heart, Package, Pencil, X, Check } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useOrders, useOrderGet, useCartAggregate, useWishlistAggregate } from "@/features/commerce";
import { customerAuthApi } from "@/features/customerAuth";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);

type OrderRow = Readonly<{
  id: string;
  orderNumber: string;
  total: string;
  status: string;
  date: string;
}>;

type CartItem = Readonly<{ id: string; name: string; qty: number; price: string }>;
type WishlistItem = Readonly<{ id: string; name: string }>;

const toOrderRow = (o: unknown): OrderRow => {
  const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
  return {
    id: text(r.id, crypto.randomUUID()),
    orderNumber: text(r.orderNumber ?? r.orderId, "—"),
    total: text(r.total ?? r.totalAmount, "0"),
    status: text(r.status, "Pending"),
    date: text(r.createdAt ?? r.date, "—"),
  };
};

const toCartItems = (payload: unknown): CartItem[] => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[]; items?: unknown[] } | undefined)?.items ?? (payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((i) => {
    const r = (typeof i === "object" && i !== null ? i : {}) as Record<string, unknown>;
    return {
      id: text(r.id, crypto.randomUUID()),
      name: text(r.productName ?? r.name ?? r.title, "—"),
      qty: typeof r.quantity === "number" ? r.quantity : 1,
      price: text(r.price ?? r.salePrice, "0"),
    };
  });
};

type Address = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const toAddress = (a: unknown): Address => {
  const r = (typeof a === "object" && a !== null ? a : {}) as Record<string, unknown>;
  return {
    fullName: text(r.fullName ?? r.fullname ?? r.name, "—"),
    phone: text(r.phone ?? r.phoneNumber, "—"),
    addressLine1: text(r.addressLine1 ?? r.address1 ?? r.street, "—"),
    addressLine2: text(r.addressLine2 ?? r.address2, ""),
    city: text(r.city, "—"),
    state: text(r.state ?? r.province, "—"),
    postalCode: text(r.postalCode ?? r.zip ?? r.zipCode, "—"),
    country: text(r.country, "—"),
  };
};

const toWishlistItems = (payload: unknown): WishlistItem[] => {
  const items = Array.isArray(payload) ? payload : ((payload as { data?: unknown[]; items?: unknown[] } | undefined)?.items ?? (payload as { data?: unknown[] } | undefined)?.data ?? []);
  return items.map((i) => {
    const r = (typeof i === "object" && i !== null ? i : {}) as Record<string, unknown>;
    return { id: text(r.id, crypto.randomUUID()), name: text(r.productName ?? r.name ?? r.title, "—") };
  });
};

const AddressCard: React.FC<{ label: string; address: Address }> = ({ label, address }) => (
  <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
    <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[#86868b]">{label}</div>
    <div className="space-y-1 text-[14px] text-[#1d1d1f]">
      <div className="font-medium">{address.fullName}</div>
      {address.phone !== "—" && <div className="text-[#86868b]">{address.phone}</div>}
      <div>{address.addressLine1}</div>
      {address.addressLine2 && <div>{address.addressLine2}</div>}
      <div>{[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</div>
      {address.country !== "—" && <div>{address.country}</div>}
    </div>
  </div>
);

const inputClass =
  "h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

type ProfileForm = { firstname: string; lastname: string; phone: string; address: string; gender: string; profilePicture: string };

const GENDER_OPTIONS = ["", "male", "female", "other", "prefer_not_to_say"];

const EditProfilePanel: React.FC<{ defaultValues: Partial<ProfileForm>; onClose: () => void }> = ({ defaultValues, onClose }) => {
  const toast = useToast();
  const [form, setForm] = React.useState<ProfileForm>({
    firstname: defaultValues.firstname ?? "",
    lastname: defaultValues.lastname ?? "",
    phone: defaultValues.phone ?? "",
    address: defaultValues.address ?? "",
    gender: defaultValues.gender ?? "",
    profilePicture: defaultValues.profilePicture ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      customerAuthApi.updateProfile({
        firstname: form.firstname || undefined,
        lastname: form.lastname || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        gender: form.gender || undefined,
        profilePicture: form.profilePicture || undefined,
      }),
    onSuccess: () => { toast.success("Profile updated."); onClose(); },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const set = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1d1d1f]">Edit Profile</p>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]">
          <X size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">First Name</label>
          <input type="text" value={form.firstname} onChange={set("firstname")} placeholder="First name" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Last Name</label>
          <input type="text" value={form.lastname} onChange={set("lastname")} placeholder="Last name" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Phone</label>
          <input type="text" value={form.phone} onChange={set("phone")} placeholder="Phone number" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Gender</label>
          <select value={form.gender} onChange={set("gender")} className={inputClass}>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g || "Not specified"}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Address</label>
          <input type="text" value={form.address} onChange={set("address")} placeholder="Address" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Profile Picture URL</label>
          <input type="text" value={form.profilePicture} onChange={set("profilePicture")} placeholder="https://…" className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="flex h-9 items-center rounded-full border border-[#d2d2d7] px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex h-9 items-center gap-1.5 rounded-full bg-[#0071e3] px-4 text-sm font-medium text-white hover:bg-[#0066cc] disabled:opacity-50"
        >
          <Check size={14} /> {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

export const CustomerDetailsPage: React.FC = () => {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const [editingProfile, setEditingProfile] = React.useState(false);

  const ordersQuery = useOrders(undefined, true);
  const cartAgg = useCartAggregate();
  const wishlistAgg = useWishlistAggregate();

  const rawOrders = React.useMemo<unknown[]>(() => {
    const payload = ordersQuery.data;
    if (Array.isArray(payload)) return payload;
    return (payload as { data?: unknown[] } | undefined)?.data ?? [];
  }, [ordersQuery.data]);

  const customerOrders = React.useMemo(() =>
    rawOrders
      .filter((o) => {
        const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
        return text(r.customerId) === customerId;
      })
      .map(toOrderRow),
    [rawOrders, customerId]
  );

  const customerInfo = React.useMemo(() => {
    if (customerOrders.length === 0) return null;
    const first = rawOrders.find((o) => {
      const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
      return text(r.customerId) === customerId;
    });
    const r = (typeof first === "object" && first !== null ? first : {}) as Record<string, unknown>;
    return {
      name: text(r.customerName ?? r.fullname, "Unknown"),
      email: text(r.customerEmail ?? r.email, "—"),
      phone: text(r.phone ?? r.customerPhone, "—"),
    };
  }, [customerOrders, rawOrders, customerId]);

  const cartItems = React.useMemo(() => {
    const entry = (cartAgg.data ?? []).find((d) => {
      const r = (typeof d === "object" && d !== null ? d : {}) as Record<string, unknown>;
      return text(r.customerId) === customerId;
    });
    return entry ? toCartItems(entry) : toCartItems(cartAgg.data?.find?.(() => true));
  }, [cartAgg.data, customerId]);

  const wishlistItems = React.useMemo(() => {
    const entry = (wishlistAgg.data ?? []).find((d) => {
      const r = (typeof d === "object" && d !== null ? d : {}) as Record<string, unknown>;
      return text(r.customerId) === customerId;
    });
    return entry ? toWishlistItems(entry) : toWishlistItems(wishlistAgg.data?.find?.(() => true));
  }, [wishlistAgg.data, customerId]);

  const latestOrderId = customerOrders[0]?.id;
  const orderDetailQuery = useOrderGet(latestOrderId, !!latestOrderId);

  const { shippingAddress, billingAddress } = React.useMemo(() => {
    const detail = orderDetailQuery.data as Record<string, unknown> | undefined;
    const addresses = Array.isArray(detail?.addresses) ? detail.addresses : [];
    const ship = addresses.find((a) => {
      const r = (typeof a === "object" && a !== null ? a : {}) as Record<string, unknown>;
      return text(r.type).toLowerCase() === "shipping";
    });
    const bill = addresses.find((a) => {
      const r = (typeof a === "object" && a !== null ? a : {}) as Record<string, unknown>;
      return text(r.type).toLowerCase() === "billing";
    });
    return {
      shippingAddress: ship ? toAddress(ship) : addresses[0] ? toAddress(addresses[0]) : null,
      billingAddress: bill ? toAddress(bill) : addresses[1] ? toAddress(addresses[1]) : null,
    };
  }, [orderDetailQuery.data]);

  const totalSpent = customerOrders.reduce((s, o) => s + parseFloat(o.total || "0"), 0);

  if (ordersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading customer...
      </div>
    );
  }

  return (
    <PageLayout
      title={customerInfo?.name ?? "Customer Details"}
      subtitle={customerInfo ? `${customerInfo.email} · ${customerInfo.phone}` : "Customer not found"}
      onBack={() => navigate("/dashboard/customers")}
      actions={
        !editingProfile ? (
          <button
            type="button"
            onClick={() => setEditingProfile(true)}
            className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Pencil size={13} strokeWidth={2} /> Edit Profile
          </button>
        ) : undefined
      }
    >
      {editingProfile && (
        <EditProfilePanel
          defaultValues={{
            firstname: customerInfo?.name.split(" ")[0],
            phone: customerInfo?.phone !== "—" ? customerInfo?.phone : undefined,
          }}
          onClose={() => setEditingProfile(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Orders" value={customerOrders.length} icon={ShoppingBag} colorVariant="blue" />
        <StatCardV2 label="Total Spent" value={`Rs ${totalSpent.toFixed(0)}`} icon={Package} colorVariant="emerald" />
        <StatCardV2 label="Wishlist Items" value={wishlistItems.length} icon={Heart} colorVariant="blue" />
      </div>

      {(shippingAddress || billingAddress) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shippingAddress && <AddressCard label="Address 1 (Shipping)" address={shippingAddress} />}
          {billingAddress && <AddressCard label="Address 2 (Billing)" address={billingAddress} />}
        </div>
      )}

      <DataTableV2
        title="Orders"
        columns={[
          { key: "orderNumber", label: "Order #", render: (r: OrderRow) => <span className="font-medium text-gray-900">{r.orderNumber}</span> },
          { key: "total", label: "Total", render: (r: OrderRow) => <span>Rs {r.total}</span> },
          { key: "status", label: "Status", render: (r: OrderRow) => <StatusBadge status={r.status} /> },
          { key: "date", label: "Date", render: (r: OrderRow) => <span className="text-xs text-gray-500">{r.date}</span> },
        ]}
        data={customerOrders}
        emptyMessage="No orders found for this customer."
        showPagination={false}
      />

      {cartItems.length > 0 && (
        <DataTableV2
          title="Cart"
          columns={[
            { key: "name", label: "Product", render: (r: CartItem) => <span className="font-medium text-gray-900">{r.name}</span> },
            { key: "qty", label: "Qty", render: (r: CartItem) => <span>{r.qty}</span> },
            { key: "price", label: "Price", render: (r: CartItem) => <span>Rs {r.price}</span> },
          ]}
          data={cartItems}
          emptyMessage="Empty cart."
          showPagination={false}
        />
      )}

      {wishlistItems.length > 0 && (
        <DataTableV2
          title="Wishlist"
          columns={[
            { key: "name", label: "Product", render: (r: WishlistItem) => <span className="font-medium text-gray-900">{r.name}</span> },
          ]}
          data={wishlistItems}
          emptyMessage="Empty wishlist."
          showPagination={false}
        />
      )}
    </PageLayout>
  );
};
