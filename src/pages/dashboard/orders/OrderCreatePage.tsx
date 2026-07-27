import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, X, Plus, Minus, ShoppingCart, User, MapPin, Settings, ChevronDown } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { commerceApi } from "@/features/commerce";
import { catalogApi } from "@/features/catalog";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { api, unwrap } from "@/shared/api/api";
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState<T>(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── types ──────────────────────────────────────────────────────────────────

type LineItem = {
  productId: string;
  productName: string;
  productPrice: number;
  thumbnail: string;
  quantity: number;
  productVariantId?: string;
};

type AddressForm = {
  fullName: string;
  phone: string;
  secondaryPhone: string;
  destinationBranch: string;
  destinationBranchCode: string;
  destinationCityArea: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  area: string;
  landmark: string;
  municipality: string;
  ward: string;
  tole: string;
  state: string;
  postalCode: string;
  country: string;
};

type DeliveryBranch = {
  name: string;
  code: string;
  areas: string[];
};

type SelectedCustomer = { id: string; name: string; email: string; phone: string };

const EMPTY_ADDRESS: AddressForm = {
  fullName: "",
  phone: "",
  secondaryPhone: "",
  destinationBranch: "",
  destinationBranchCode: "",
  destinationCityArea: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  area: "",
  landmark: "",
  municipality: "",
  ward: "",
  tole: "",
  state: "",
  postalCode: "",
  country: "Nepal",
};

const PAYMENT_METHODS = [
  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
  { value: "ONLINE", label: "Online Payment" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
];

// ── helpers ────────────────────────────────────────────────────────────────

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0);

const inputCls =
  "h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:bg-[#f5f5f7] disabled:text-[#86868b]";

const sectionCls = "rounded-2xl border border-[#d2d2d7] bg-white p-6 space-y-4";

// ── sub-components ─────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-start gap-3 pb-1 border-b border-[#f5f5f7]">
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-[var(--primary)]">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-[#1d1d1f]">{title}</p>
      {subtitle && <p className="text-xs text-[#86868b]">{subtitle}</p>}
    </div>
  </div>
);

// ── customer picker ────────────────────────────────────────────────────────

const CustomerPicker: React.FC<{
  value: SelectedCustomer | null;
  onChange: (c: SelectedCustomer | null) => void;
}> = ({ value, onChange }) => {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const debouncedSearch = useDebounce(search, 500);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (search !== debouncedSearch) {
      setIsPending(true);
    } else {
      setIsPending(false);
    }
  }, [search, debouncedSearch]);

  const q = useQuery({
    queryKey: ["customers", "search", debouncedSearch],
    queryFn: () => commerceApi.customers.getAll({ search: debouncedSearch, limit: 50 }),
    enabled: !!debouncedSearch,
    staleTime: 30_000,
  });

  const isLoading = isPending || q.isFetching;

  const customers = React.useMemo<SelectedCustomer[]>(() => {
    const raw = q.data as Record<string, unknown> | undefined;
    const items: unknown[] = Array.isArray(q.data)
      ? q.data
      : Array.isArray(raw?.customers)
      ? (raw.customers as unknown[])
      : Array.isArray(raw?.data)
      ? (raw.data as unknown[])
      : [];
    return items
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((c) => {
        const firstname = str(c.firstname ?? "");
        const lastname = str(c.lastname ?? "");
        return {
          id: str(c.id),
          name: [firstname, lastname].filter(Boolean).join(" ") || str(c.fullname ?? c.name, "Unknown"),
          email: str(c.email, "—"),
          phone: str(c.phone, "—"),
        };
      })
      .filter((c) => c.id);
  }, [q.data]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-[#d2d2d7] bg-[#f0f7ff] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">{value.name}</p>
          <p className="text-xs text-[#86868b]">{value.email} · {value.phone}</p>
          <p className="font-mono text-[10px] text-[#86868b] mt-0.5">{value.id}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-3 rounded-full p-1.5 text-[#86868b] hover:bg-white hover:text-[#1d1d1f] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search customer by name or email…"
          className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white pl-9 pr-9 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-[var(--primary)]" />
          </div>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#d2d2d7] bg-white shadow-lg overflow-hidden">
          {!search.trim() ? (
            <p className="px-4 py-3 text-xs text-[#86868b]">Type to search customers…</p>
          ) : isLoading ? (
            <p className="px-4 py-3 text-xs text-[#86868b]">Searching…</p>
          ) : customers.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#86868b]">No customers found.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y divide-[#f5f5f7]">
              {customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(c); setOpen(false); setSearch(""); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#f5f5f7] transition-colors"
                  >
                    <p className="text-sm font-medium text-[#1d1d1f]">{c.name}</p>
                    <p className="text-xs text-[#86868b]">{c.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ── product picker ─────────────────────────────────────────────────────────

const ProductPicker: React.FC<{
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}> = ({ items, onChange }) => {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const ref = React.useRef<HTMLDivElement>(null);

  const q = catalogApi.products.hooks.useList(
    { search: debouncedSearch || undefined, limit: 20 },
  );

  const results = React.useMemo(() => {
    const raw = q.data;
    const arr: unknown[] = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] } | undefined)?.data ?? []);
    return arr
      .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
      .map((p) => ({
        id: str(p.id ?? p._id),
        name: str(p.title ?? p.name, "Unnamed"),
        price: num(p.salePrice ?? p.price ?? p.regularPrice),
        thumbnail: str(p.coverImage ?? p.thumbnail ?? p.image),
        sku: str(p.sku),
      }))
      .filter((p) => p.id);
  }, [q.data]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addProduct = (p: (typeof results)[number]) => {
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      onChange(items.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      onChange([...items, { productId: p.id, productName: p.name, productPrice: p.price, thumbnail: p.thumbnail, quantity: 1 }]);
    }
    setSearch("");
    setOpen(false);
  };

  const updateQty = (productId: string, delta: number) => {
    onChange(
      items
        .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId: string) => onChange(items.filter((i) => i.productId !== productId));

  const subtotal = items.reduce((s, i) => s + i.productPrice * i.quantity, 0);

  return (
    <div className="space-y-3">
      <div ref={ref} className="relative">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search products to add…"
            className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white pl-9 pr-4 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
          />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#d2d2d7] bg-white shadow-lg overflow-hidden">
            {q.isLoading ? (
              <p className="px-4 py-3 text-xs text-[#86868b]">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#86868b]">No products found.</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-[#f5f5f7]">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f5f5f7] transition-colors"
                    >
                      {p.thumbnail ? (
                        <img src={p.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover bg-[#f5f5f7] shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#f5f5f7] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1d1d1f] truncate">{p.name}</p>
                        {p.sku && <p className="text-xs text-[#86868b]">SKU: {p.sku}</p>}
                      </div>
                      {p.price > 0 && (
                        <span className="shrink-0 text-sm font-medium text-[#1d1d1f]">
                          NPR {p.price.toLocaleString()}
                        </span>
                      )}
                      <Plus size={14} className="shrink-0 text-[var(--primary)]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-xl border border-[#d2d2d7] overflow-hidden">
          <ul className="divide-y divide-[#f5f5f7]">
            {items.map((item) => (
              <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="h-10 w-10 rounded-lg object-cover bg-[#f5f5f7] shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-[#f5f5f7] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1d1d1f] truncate">{item.productName}</p>
                  {item.productPrice > 0 && (
                    <p className="text-xs text-[#86868b]">
                      NPR {item.productPrice.toLocaleString()} × {item.quantity} = NPR {(item.productPrice * item.quantity).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-[#1d1d1f]">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.productId, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="ml-1 shrink-0 rounded-full p-1 text-[#86868b] hover:bg-[#f5f5f7] hover:text-red-600 transition-colors"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
          {subtotal > 0 && (
            <div className="border-t border-[#f5f5f7] bg-[#f9f9f9] px-4 py-2.5 flex justify-end">
              <span className="text-sm font-semibold text-[#1d1d1f]">
                Subtotal: NPR {subtotal.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#d2d2d7] py-8 text-center">
          <ShoppingCart size={22} className="mx-auto mb-2 text-[#d2d2d7]" />
          <p className="text-xs text-[#86868b]">No products added yet</p>
        </div>
      )}
    </div>
  );
};

// ── address form ───────────────────────────────────────────────────────────

const AddressForm: React.FC<{
  label: string;
  value: AddressForm;
  onChange: (v: AddressForm) => void;
  branches: ReadonlyArray<DeliveryBranch>;
  disabled?: boolean;
}> = ({ label, value, onChange, branches, disabled }) => {
  const set = (field: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value });

  const branchOptions = React.useMemo(() => branches.map((branch) => branch.name), [branches]);
  const matchedBranch = React.useMemo(
    () => branches.find((branch) => branch.name.toLowerCase() === value.destinationBranch.trim().toLowerCase()),
    [branches, value.destinationBranch],
  );
  const areaOptions = React.useMemo(() => matchedBranch?.areas ?? [], [matchedBranch]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Full Name *</label>
          <input type="text" value={value.fullName} onChange={set("fullName")} placeholder="Full name" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Phone *</label>
          <input type="text" value={value.phone} onChange={set("phone")} placeholder="Phone number" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Secondary Phone</label>
          <input type="text" value={value.secondaryPhone} onChange={set("secondaryPhone")} placeholder="Secondary phone (optional)" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Destination Branch *</label>
          <input
            list={`${label}-branch-list`}
            type="text"
            value={value.destinationBranch}
            onChange={(e) => {
              const nextBranch = e.target.value;
              const branch = branches.find((item) => item.name.toLowerCase() === nextBranch.trim().toLowerCase());
              onChange({
                ...value,
                destinationBranch: nextBranch,
                destinationBranchCode: branch?.code ?? "",
                destinationCityArea:
                  branch && !branch.areas.some((item) => item.toLowerCase() === value.destinationCityArea.trim().toLowerCase())
                    ? ""
                    : value.destinationCityArea,
              });
            }}
            placeholder="Select destination branch"
            className={inputCls}
            disabled={disabled}
          />
          <datalist id={`${label}-branch-list`}>
            {branchOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Delivery Area *</label>
          <input
            list={`${label}-area-list`}
            type="text"
            value={value.destinationCityArea}
            onChange={set("destinationCityArea")}
            placeholder={matchedBranch ? "Select delivery area" : "Select branch first"}
            className={inputCls}
            disabled={disabled || !matchedBranch}
          />
          <datalist id={`${label}-area-list`}>
            {areaOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Country</label>
          <input type="text" value={value.country} onChange={set("country")} placeholder="Country" className={inputCls} disabled={disabled} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Address Line 1 *</label>
          <input type="text" value={value.addressLine1} onChange={set("addressLine1")} placeholder="Street address" className={inputCls} disabled={disabled} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Address Line 2</label>
          <input type="text" value={value.addressLine2} onChange={set("addressLine2")} placeholder="Apt, floor, landmark (optional)" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">City *</label>
          <input type="text" value={value.city} onChange={set("city")} placeholder="City" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">District</label>
          <input type="text" value={value.district} onChange={set("district")} placeholder="District" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Municipality / City</label>
          <input type="text" value={value.municipality} onChange={set("municipality")} placeholder="Municipality / city" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Ward</label>
          <input type="text" value={value.ward} onChange={set("ward")} placeholder="Ward" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Tole</label>
          <input type="text" value={value.tole} onChange={set("tole")} placeholder="Street / tole" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Landmark</label>
          <input type="text" value={value.landmark} onChange={set("landmark")} placeholder="Landmark" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">State / Province</label>
          <input type="text" value={value.state} onChange={set("state")} placeholder="State" className={inputCls} disabled={disabled} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#86868b]">Postal Code</label>
          <input type="text" value={value.postalCode} onChange={set("postalCode")} placeholder="Postal code" className={inputCls} disabled={disabled} />
        </div>
      </div>
    </div>
  );
};

// ── main page ──────────────────────────────────────────────────────────────

export const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [customer, setCustomer] = React.useState<SelectedCustomer | null>(null);
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [shipping, setShipping] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [billing, setBilling] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = React.useState(true);
  const [paymentMethod, setPaymentMethod] = React.useState("CASH_ON_DELIVERY");
  const [couponCode, setCouponCode] = React.useState("");
  const [shippingAmount, setShippingAmount] = React.useState("");
  const [syncDelivery, setSyncDelivery] = React.useState(false);

  const branchesQuery = useQuery({
    queryKey: ["pickndrop", "branches"],
    queryFn: async () => unwrap<DeliveryBranch[]>(await api.get("/delivery/pickndrop/branches")),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const deliveryBranches = React.useMemo(
    () => (Array.isArray(branchesQuery.data) ? branchesQuery.data : []),
    [branchesQuery.data],
  );

  const createOrder = useMutation({
    mutationFn: () => {
      const normalizeAddress = (address: AddressForm) => {
        const branch = deliveryBranches.find(
          (item) => item.name.toLowerCase() === address.destinationBranch.trim().toLowerCase(),
        );
        if (!branch) {
          throw new Error(`Select a valid destination branch for ${address.fullName || "the address"}`);
        }
        const area = branch.areas.find(
          (item) => item.toLowerCase() === address.destinationCityArea.trim().toLowerCase(),
        );
        if (!area) {
          throw new Error(`Select a valid delivery area for branch ${branch.name}`);
        }
        return {
          ...address,
          destinationBranch: branch.name,
          destinationBranchCode: branch.code,
          destinationCityArea: area,
          area,
        };
      };

      const normalizedShipping = normalizeAddress(shipping);
      const normalizedBilling = sameAsBilling ? { ...normalizedShipping } : normalizeAddress(billing);
      const addresses = [
        { ...normalizedShipping, type: "shipping" },
        { ...normalizedBilling, type: "billing" },
      ];
      return commerceApi.orders.create({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          ...(i.productVariantId ? { productVariantId: i.productVariantId } : {}),
        })),
        addresses,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        shippingAmount: shippingAmount ? parseFloat(shippingAmount) : undefined,
        orderSource: "ADMIN_DASHBOARD",
        syncDeliveryNow: syncDelivery,
      });
    },
    onSuccess: (data) => {
      const id = (data as Record<string, unknown>)?.id as string | undefined;
      toast.success("Order created successfully.");
      navigate(id ? `/dashboard/orders/${id}` : "/dashboard/orders");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const canSubmit =
    customer !== null &&
    items.length > 0 &&
    Boolean(shipping.fullName) &&
    Boolean(shipping.phone) &&
    Boolean(shipping.addressLine1) &&
    Boolean(shipping.city) &&
    Boolean(shipping.destinationBranch) &&
    Boolean(shipping.destinationCityArea);

  const validationMessage = !customer
    ? "Select a customer to continue."
    : items.length === 0
    ? "Add at least one product."
    : !shipping.fullName || !shipping.phone || !shipping.addressLine1 || !shipping.city || !shipping.destinationBranch || !shipping.destinationCityArea
    ? "Complete the shipping address, destination branch, and delivery area."
    : null;

  return (
    <PageLayout
      title="Create Order"
      subtitle="Place a new order on behalf of a customer."
      onBack={() => navigate("/dashboard/orders")}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* Customer */}
          <div className={sectionCls}>
            <SectionHeader icon={<User size={16} />} title="Customer" subtitle="Who is this order for?" />
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          {/* Products */}
          <div className={sectionCls}>
            <SectionHeader
              icon={<ShoppingCart size={16} />}
              title="Products"
              subtitle="Search and add products to the order"
            />
            <ProductPicker items={items} onChange={setItems} />
          </div>

          {/* Addresses */}
          <div className={sectionCls}>
            <SectionHeader icon={<MapPin size={16} />} title="Addresses" subtitle="Shipping and billing information" />
            <AddressForm label="Shipping Address" value={shipping} onChange={setShipping} branches={deliveryBranches} />

            <div className="flex items-center gap-2 pt-1">
              <input
                id="sameAsBilling"
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="h-4 w-4 rounded border-[#d2d2d7] text-[var(--primary)]"
              />
              <label htmlFor="sameAsBilling" className="text-sm text-[#1d1d1f] cursor-pointer select-none">
                Billing address same as shipping
              </label>
            </div>

            {!sameAsBilling && (
              <AddressForm label="Billing Address" value={billing} onChange={setBilling} branches={deliveryBranches} />
            )}
          </div>

        </div>

        {/* Right column — order settings + summary */}
        <div className="space-y-6">

          {/* Order settings */}
          <div className={sectionCls}>
            <SectionHeader icon={<Settings size={16} />} title="Order Settings" />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Payment Method *</label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-sm text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Coupon Code</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Optional coupon code"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Shipping Charge (NPR)</label>
              <input
                type="number"
                min="0"
                value={shippingAmount}
                onChange={(e) => setShippingAmount(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="syncDelivery"
                type="checkbox"
                checked={syncDelivery}
                onChange={(e) => setSyncDelivery(e.target.checked)}
                className="h-4 w-4 rounded border-[#d2d2d7] text-[var(--primary)]"
              />
              <label htmlFor="syncDelivery" className="text-sm text-[#1d1d1f] cursor-pointer select-none">
                Sync delivery now
              </label>
            </div>

            {branchesQuery.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Delivery branches could not be loaded. Refresh and try again.
              </p>
            )}
          </div>

          {/* Summary */}
          <div className={sectionCls}>
            <p className="text-sm font-semibold text-[#1d1d1f]">Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#86868b]">Customer</span>
                <span className="font-medium text-[#1d1d1f] text-right max-w-[140px] truncate">
                  {customer?.name ?? <span className="text-[#86868b] italic">Not selected</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Items</span>
                <span className="font-medium text-[#1d1d1f]">
                  {items.length === 0 ? <span className="text-[#86868b] italic">None</span> : `${items.reduce((s, i) => s + i.quantity, 0)} item${items.reduce((s, i) => s + i.quantity, 0) === 1 ? "" : "s"}`}
                </span>
              </div>
              {items.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Subtotal</span>
                  <span className="font-medium text-[#1d1d1f]">
                    NPR {items.reduce((s, i) => s + i.productPrice * i.quantity, 0).toLocaleString()}
                  </span>
                </div>
              )}
              {shippingAmount && parseFloat(shippingAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#86868b]">Shipping</span>
                  <span className="font-medium text-[#1d1d1f]">NPR {parseFloat(shippingAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#86868b]">Payment</span>
                <span className="font-medium text-[#1d1d1f]">
                  {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}
                </span>
              </div>
            </div>

            {validationMessage && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                {validationMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => createOrder.mutate()}
              disabled={!canSubmit || createOrder.isPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] active:scale-[0.982] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createOrder.isPending ? "Creating order…" : "Place Order"}
            </button>
          </div>

        </div>
      </div>
    </PageLayout>
  );
};
