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
  landmark: string;
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
  landmark: "",
  postalCode: "",
  country: "Nepal",
};

const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "ONLINE", label: "Online Payment" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
];

const ORDER_SOURCE_OPTIONS = [
  { value: "ADMIN_DASHBOARD", label: "Admin Dashboard" },
  { value: "WEBSITE", label: "Website" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "OTHER", label: "Other" },
];

// ── helpers ────────────────────────────────────────────────────────────────

const str = (v: unknown, fb = ""): string => (typeof v === "string" && v ? v : fb);
const num = (v: unknown): number => (typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0);
const money = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

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

const normalizeLookup = (value: string) => value.trim().toLowerCase();

const scoreLookupMatch = (candidate: string, query: string): number => {
  const normalizedCandidate = normalizeLookup(candidate);
  const normalizedQuery = normalizeLookup(query);
  if (!normalizedCandidate || !normalizedQuery) return 0;

  if (normalizedCandidate === normalizedQuery) return 1000;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 900;
  if (new RegExp(`(^|\\s)${normalizedQuery}(\\s|$)`).test(normalizedCandidate)) return 800;
  if (normalizedCandidate.includes(normalizedQuery)) return 100;
  return 0;
};

const splitCommaSeparatedValues = (values: ReadonlyArray<string>): string[] =>
  Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

const getBranchAreas = (branch: DeliveryBranch): string[] =>
  splitCommaSeparatedValues(branch.areas ?? []);

const findBranchByNameOrCode = (
  branches: ReadonlyArray<DeliveryBranch>,
  value: string,
): DeliveryBranch | null => {
  const lookup = normalizeLookup(value);
  if (!lookup) return null;
  return (
    branches.find(
      (branch) =>
        normalizeLookup(branch.name) === lookup || normalizeLookup(branch.code) === lookup,
    ) ?? null
  );
};

const findBranchByArea = (
  branches: ReadonlyArray<DeliveryBranch>,
  value: string,
): { branch: DeliveryBranch; area: string } | null => {
  const lookup = normalizeLookup(value);
  if (!lookup) return null;

  for (const branch of branches) {
    const area = getBranchAreas(branch).find((item) => normalizeLookup(item) === lookup);
    if (area) return { branch, area };
  }

  return null;
};

type BranchAreaSelection = {
  branch: DeliveryBranch;
  area?: string;
};

// ── address form ───────────────────────────────────────────────────────────

const BranchAreaPicker: React.FC<{
  value: AddressForm;
  branches: ReadonlyArray<DeliveryBranch>;
  disabled?: boolean;
  onPick: (selection: BranchAreaSelection) => void;
}> = ({ value, branches, disabled, onPick }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const selectedBranch = React.useMemo(
    () => findBranchByNameOrCode(branches, value.destinationBranch),
    [branches, value.destinationBranch],
  );

  const filteredBranches = React.useMemo(() => {
    const lookup = normalizeLookup(search);

    return branches
      .map((branch) => {
        const areas = getBranchAreas(branch);

        if (!lookup) {
          return {
            branch,
            branchScore: 0,
            areas,
          };
        }

        const branchScore = Math.max(
          scoreLookupMatch(branch.name, lookup),
          scoreLookupMatch(branch.code, lookup),
        );

        const matchingAreas = areas
          .map((area) => ({ area, score: scoreLookupMatch(area, lookup) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score || a.area.localeCompare(b.area))
          .map((item) => item.area);

        if (branchScore === 0 && matchingAreas.length === 0) {
          return null;
        }

        return {
          branch,
          branchScore,
          areas: matchingAreas.length > 0 ? matchingAreas : areas,
        };
      })
      .filter(
        (
          item,
        ): item is {
          branch: DeliveryBranch;
          branchScore: number;
          areas: string[];
        } => item !== null,
      )
      .sort((a, b) => b.branchScore - a.branchScore || a.branch.name.localeCompare(b.branch.name));
  }, [branches, search]);

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const pick = (branch: DeliveryBranch, area?: string) => {
    onPick({ branch, area });
    if (area) setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-2 block text-xs font-semibold text-slate-600">
        Destination Branch <span className="text-rose-500">*</span>
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${inputCls} flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:bg-slate-50`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={value.destinationBranch ? "truncate text-slate-900" : "truncate text-slate-400"}>
            {value.destinationBranch || "Search branch or delivery area"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Choose an area from the selected branch, or type an area to auto-select its branch.
      </p>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-3 rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2 ring-2 ring-emerald-100">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search branch or delivery area..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto overscroll-contain p-3">
            {filteredBranches.length === 0 ? (
              <p className="px-1 py-6 text-sm text-slate-500">No matching delivery branches found</p>
            ) : (
              filteredBranches.map(({ branch, areas }) => {
                const isSelected = selectedBranch?.code === branch.code;
                const totalAreas = getBranchAreas(branch).length;

                return (
                  <div
                    key={branch.code || branch.name}
                    className={`rounded-2xl border p-3 ${isSelected ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
                      }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => pick(branch)}
                        className="truncate text-left text-sm font-bold uppercase tracking-wide text-slate-800"
                      >
                        {branch.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => pick(branch)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                    <p className="mb-3 text-xs text-slate-500">
                      {branch.code} · {totalAreas} areas
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {areas.map((area) => {
                        const areaSelected =
                          isSelected && normalizeLookup(value.destinationCityArea) === normalizeLookup(area);
                        return (
                          <button
                            key={`${branch.code || branch.name}-${area}`}
                            type="button"
                            onClick={() => pick(branch, area)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${areaSelected
                              ? "border-slate-800 bg-slate-800 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                              }`}
                          >
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const DeliveryAreaInput: React.FC<{
  value: AddressForm;
  branches: ReadonlyArray<DeliveryBranch>;
  disabled?: boolean;
  onChange: (next: AddressForm) => void;
}> = ({ value, branches, disabled, onChange }) => {
  const [focused, setFocused] = React.useState(false);
  const selectedBranch = React.useMemo(
    () => findBranchByNameOrCode(branches, value.destinationBranch),
    [branches, value.destinationBranch],
  );

  const areaOptions = React.useMemo(() => {
    const sourceBranches = selectedBranch ? [selectedBranch] : branches;
    return sourceBranches.flatMap((branch) =>
      getBranchAreas(branch).map((area) => ({ branch, area })),
    );
  }, [branches, selectedBranch]);

  const filteredAreas = React.useMemo(() => {
    const lookup = normalizeLookup(value.destinationCityArea);
    if (!lookup) return areaOptions.slice(0, 80);

    const exactMatches = areaOptions.filter(
      ({ area }) => normalizeLookup(area) === lookup,
    );
    if (exactMatches.length > 0) return exactMatches.slice(0, 80);

    return areaOptions
      .filter(
        ({ branch, area }) =>
          normalizeLookup(area).includes(lookup) || normalizeLookup(branch.name).includes(lookup),
      )
      .slice(0, 80);
  }, [areaOptions, value.destinationCityArea]);

  const updateArea = (destinationCityArea: string) => {
    const matched = findBranchByArea(branches, destinationCityArea);
    if (matched) {
      onChange({
        ...value,
        destinationBranch: matched.branch.name,
        destinationBranchCode: matched.branch.code,
        destinationCityArea: matched.area,
      });
      return;
    }

    onChange({ ...value, destinationCityArea });
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-xs font-semibold text-slate-600">
        Delivery Area <span className="text-rose-500">*</span>
      </label>
      <input
        className={inputCls}
        placeholder="Search or type delivery area"
        value={value.destinationCityArea}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onChange={(event) => updateArea(event.target.value)}
      />
      <p className="mt-2 text-xs text-slate-500">
        This must match an area supported by the selected branch.
      </p>

      {focused && filteredAreas.length > 0 ? (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {filteredAreas.map(({ branch, area }) => (
            <button
              key={`${branch.code || branch.name}-${area}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                onChange({
                  ...value,
                  destinationBranch: branch.name,
                  destinationBranchCode: branch.code,
                  destinationCityArea: area,
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-800">{area}</span>
              <span className="shrink-0 text-xs text-slate-400">{branch.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const InputBlock: React.FC<{
  label: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, className, children }) => (
  <label
    className={[
      "space-y-2 text-xs font-semibold uppercase tracking-wide text-slate-500",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span>{label}</span>
    {children}
  </label>
);

const AddressForm: React.FC<{
  title: string;
  value: AddressForm;
  branches: ReadonlyArray<DeliveryBranch>;
  disabled?: boolean;
  onChange: (v: AddressForm) => void;
}> = ({ title, value, branches, disabled, onChange }) => {
  const set = (field: keyof AddressForm, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
          <MapPin className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">Shipping and billing information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputBlock label="Full Name *" className="md:col-span-2">
          <input
            className={inputCls}
            placeholder="Full name"
            value={value.fullName}
            disabled={disabled}
            onChange={(event) => set("fullName", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Phone *">
          <input
            className={inputCls}
            placeholder="Phone number"
            value={value.phone}
            disabled={disabled}
            onChange={(event) => set("phone", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Secondary Phone">
          <input
            className={inputCls}
            placeholder="Secondary phone (optional)"
            value={value.secondaryPhone}
            disabled={disabled}
            onChange={(event) => set("secondaryPhone", event.target.value)}
          />
        </InputBlock>
        <BranchAreaPicker
          value={value}
          branches={branches}
          disabled={disabled}
          onPick={({ branch, area }) =>
            onChange({
              ...value,
              destinationBranch: branch.name,
              destinationBranchCode: branch.code,
              destinationCityArea: area ?? value.destinationCityArea,
            })
          }
        />
        <DeliveryAreaInput
          value={value}
          branches={branches}
          disabled={disabled}
          onChange={onChange}
        />
        <InputBlock label="Address Line 1 *" className="md:col-span-2">
          <input
            className={inputCls}
            placeholder="Street address"
            value={value.addressLine1}
            disabled={disabled}
            onChange={(event) => set("addressLine1", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Address Line 2" className="md:col-span-2">
          <input
            className={inputCls}
            placeholder="Apt, floor, landmark (optional)"
            value={value.addressLine2}
            disabled={disabled}
            onChange={(event) => set("addressLine2", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="City *">
          <input
            className={inputCls}
            placeholder="City"
            value={value.city}
            disabled={disabled}
            onChange={(event) => set("city", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="District">
          <input
            className={inputCls}
            placeholder="District"
            value={value.district}
            disabled={disabled}
            onChange={(event) => set("district", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Landmark">
          <input
            className={inputCls}
            placeholder="Landmark"
            value={value.landmark}
            disabled={disabled}
            onChange={(event) => set("landmark", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Postal Code">
          <input
            className={inputCls}
            placeholder="Postal code"
            value={value.postalCode}
            disabled={disabled}
            onChange={(event) => set("postalCode", event.target.value)}
          />
        </InputBlock>
        <InputBlock label="Country *" className="md:col-span-2">
          <input
            className={inputCls}
            placeholder="Country"
            value={value.country}
            disabled={disabled}
            onChange={(event) => set("country", event.target.value)}
          />
        </InputBlock>
      </div>
    </div>
  );
};

// ── main page ──────────────────────────────────────────────────────────────

export const OrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [customer, setCustomer] = React.useState<SelectedCustomer | null>(null);
  const [guestEmail, setGuestEmail] = React.useState("");
  const [items, setItems] = React.useState<LineItem[]>([]);
  const [shipping, setShipping] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [billing, setBilling] = React.useState<AddressForm>(EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = React.useState(true);
  const [paymentMethod, setPaymentMethod] = React.useState("COD");
  const [orderSource, setOrderSource] = React.useState("ADMIN_DASHBOARD");
  const [customOrderSource, setCustomOrderSource] = React.useState("");
  const [couponCode, setCouponCode] = React.useState("");
  const [shippingAmount, setShippingAmount] = React.useState("");
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = React.useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = React.useState("");
  const [syncDelivery, setSyncDelivery] = React.useState(false);
  const deliveryQuoteRequestId = React.useRef(0);

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
        const branch = findBranchByNameOrCode(deliveryBranches, address.destinationBranch);
        if (!branch) throw new Error("Select a valid Pick & Drop destination branch.");

        const area = findBranchByArea([branch], address.destinationCityArea)?.area;
        if (!area) {
          throw new Error("Select a valid Pick & Drop delivery area for the destination branch.");
        }

        return {
          type: "shipping",
          fullName: address.fullName.trim(),
          phone: address.phone.trim(),
          secondaryPhone: address.secondaryPhone.trim() || undefined,
          destinationBranch: branch.name,
          destinationBranchCode: branch.code,
          destinationCityArea: area,
          addressLine1: address.addressLine1.trim(),
          addressLine2: address.addressLine2.trim() || undefined,
          city: address.city.trim(),
          district: address.district.trim() || undefined,
          landmark: address.landmark.trim() || undefined,
          postalCode: address.postalCode.trim() || undefined,
          country: address.country.trim() || "Nepal",
        };
      };

      const normalizedShipping = normalizeAddress(shipping);
      const normalizedBilling = sameAsBilling ? { ...normalizedShipping } : normalizeAddress(billing);
      const addresses = [
        { ...normalizedShipping, type: "shipping" },
        { ...normalizedBilling, type: "billing" },
      ];
      const resolvedOrderSource =
        orderSource === "OTHER" ? customOrderSource.trim() : orderSource.trim();

      return commerceApi.orders.createDashboard({
        ...(customer ? { customerId: customer.id } : {}),
        ...(!customer && guestEmail.trim() ? { guestEmail: guestEmail.trim() } : {}),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          ...(i.productVariantId ? { productVariantId: i.productVariantId } : {}),
        })),
        addresses,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        shippingAmount: shippingAmount.trim() ? money(shippingAmount) : undefined,
        orderSource: resolvedOrderSource || "ADMIN_DASHBOARD",
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
    items.length > 0 &&
    Boolean(shipping.fullName) &&
    Boolean(shipping.phone) &&
    Boolean(shipping.addressLine1) &&
    Boolean(shipping.city) &&
    Boolean(shipping.destinationBranch) &&
    Boolean(shipping.destinationCityArea);

  const formValidationMessage =
    items.length === 0
      ? "Add at least one product."
      : !shipping.fullName || !shipping.phone || !shipping.addressLine1 || !shipping.city || !shipping.destinationBranch || !shipping.destinationCityArea
        ? "Complete the shipping address, destination branch, and delivery area."
        : orderSource === "OTHER" && !customOrderSource.trim()
          ? "Enter a custom order source."
          : null;

  const subtotal = React.useMemo(
    () => items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0),
    [items],
  );
  const deliveryCharge = React.useMemo(() => money(shippingAmount), [shippingAmount]);
  const grandTotal = subtotal + deliveryCharge;

  React.useEffect(() => {
    const branch = shipping.destinationBranch.trim();
    const area = shipping.destinationCityArea.trim();
    if (!items.length || !branch || !area) {
      deliveryQuoteRequestId.current += 1;
      setDeliveryQuoteLoading(false);
      setDeliveryQuoteError("");
      setShippingAmount("");
      return;
    }

    const requestId = ++deliveryQuoteRequestId.current;
    setDeliveryQuoteLoading(true);
    setDeliveryQuoteError("");

    const timeout = window.setTimeout(async () => {
      try {
        const payload = {
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
          })),
          destinationBranch: branch,
          destinationCityArea: area,
          codAmount: subtotal,
        };

        const response = await api.post("/order/delivery-quote-dashboard", payload);
        if (deliveryQuoteRequestId.current !== requestId) return;

        const quote = (response.data as { data?: { deliveryCharge?: string | number } } | undefined)?.data;
        const nextCharge = quote?.deliveryCharge ?? 0;
        setShippingAmount(String(nextCharge));
        setDeliveryQuoteLoading(false);
      } catch (error) {
        if (deliveryQuoteRequestId.current !== requestId) return;
        setShippingAmount("");
        setDeliveryQuoteLoading(false);
        setDeliveryQuoteError(parseApiError(error).message || "Unable to calculate delivery charge.");
      }
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    items,
    shipping.destinationBranch,
    shipping.destinationCityArea,
    subtotal,
  ]);

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
            {!customer && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Customer Email <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="guest@example.com"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Leave blank if you do not want an email receipt for this guest order.
                </p>
              </div>
            )}
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
            <AddressForm title="Shipping Address" value={shipping} onChange={setShipping} branches={deliveryBranches} />

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
              <AddressForm title="Billing Address" value={billing} onChange={setBilling} branches={deliveryBranches} />
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
              <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Order Source *</label>
              <div className="relative">
                <select
                  value={orderSource}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setOrderSource(nextValue);
                    if (nextValue !== "OTHER") setCustomOrderSource("");
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-sm text-[#1d1d1f] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                >
                  {ORDER_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b]"
                />
              </div>
            </div>

            {orderSource === "OTHER" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Custom Order Source *</label>
                <input
                  type="text"
                  value={customOrderSource}
                  onChange={(e) => setCustomOrderSource(e.target.value)}
                  placeholder="Enter source name"
                  className={inputCls}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#86868b]">Delivery Charge (NPR)</label>
              <input
                type="number"
                min="0"
                value={shippingAmount}
                readOnly
                placeholder={deliveryQuoteLoading ? "Calculating..." : "Select destination and area"}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#86868b]">
                {deliveryQuoteLoading
                  ? "Calculating delivery charge from the selected destination."
                  : deliveryQuoteError || "Auto-calculated after selecting destination branch and area."}
              </p>
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
                  {customer?.name ?? <span className="text-[#86868b] italic">Guest order</span>}
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
                    NPR {subtotal.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#86868b]">Delivery Charge</span>
                <span className="font-medium text-[#1d1d1f]">
                  {deliveryQuoteLoading
                    ? "Calculating..."
                    : `NPR ${deliveryCharge.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#f5f5f7] pt-2">
                <span className="text-[#86868b]">Grand Total</span>
                <span className="font-semibold text-[#1d1d1f]">NPR {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Payment</span>
                <span className="font-medium text-[#1d1d1f]">
                  {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#86868b]">Source</span>
                <span className="font-medium text-[#1d1d1f] text-right max-w-[140px] truncate">
                  {orderSource === "OTHER" ? customOrderSource.trim() || "Other" : (ORDER_SOURCE_OPTIONS.find((m) => m.value === orderSource)?.label ?? orderSource)}
                </span>
              </div>
            </div>

            {formValidationMessage && (
              <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                {formValidationMessage}
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
