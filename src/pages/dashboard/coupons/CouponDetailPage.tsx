import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Tag, Users, UserMinus, BarChart2, Edit, X, Search } from "lucide-react";
import { ModernFormLayout, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { commerceApi } from "@/features/commerce";

type CustomerOption = { id: string; name: string; email: string };

const useCustomerSearch = (search: string) => {
  const [debounced, setDebounced] = React.useState(search);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const q = useQuery({
    queryKey: ["customers", "search", debounced],
    queryFn: () => commerceApi.customers.getAll({ search: debounced, limit: 50 }),
    enabled: !!debounced.trim(),
    staleTime: 30_000,
  });

  const customers = React.useMemo<CustomerOption[]>(() => {
    if (!debounced.trim()) return [];
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
        const fn = typeof c.firstname === "string" ? c.firstname : "";
        const ln = typeof c.lastname === "string" ? c.lastname : "";
        return {
          id: typeof c.id === "string" ? c.id : "",
          name: [fn, ln].filter(Boolean).join(" ") || (typeof c.name === "string" ? c.name : "Unknown"),
          email: typeof c.email === "string" ? c.email : "",
        };
      })
      .filter((c) => c.id);
  }, [q.data, debounced]);

  const isPending = search !== debounced;
  const isLoading = isPending || q.isFetching;
  return { customers, isLoading, debounced };
};

interface CustomerMultiPickerProps {
  selected: CustomerOption[];
  onChange: (customers: CustomerOption[]) => void;
  chipColor?: "blue" | "red";
  chipTooltip?: string;
}

const CustomerMultiPicker: React.FC<CustomerMultiPickerProps> = ({
  selected,
  onChange,
  chipColor = "blue",
  chipTooltip,
}) => {
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const { customers, isLoading, debounced } = useCustomerSearch(search);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (c: CustomerOption) => {
    const already = selected.some((s) => s.id === c.id);
    onChange(already ? selected.filter((s) => s.id !== c.id) : [...selected, c]);
  };

  const filtered = customers.filter((c) => !selected.some((s) => s.id === c.id));

  const chipBg = chipColor === "red" ? "bg-red-50" : "bg-[#e8f0fe]";
  const chipText = chipColor === "red" ? "text-red-600" : "text-[var(--primary)]";
  const chipHover = chipColor === "red" ? "hover:bg-red-100/60" : "hover:bg-[var(--primary)]/20";
  const ringColor = chipColor === "red" ? "focus-within:border-red-400 focus-within:ring-red-400/10" : "focus-within:border-[var(--primary)] focus-within:ring-[var(--primary)]/10";
  const avatarBg = chipColor === "red" ? "bg-red-50 text-red-500" : "bg-[#e8f0fe] text-[var(--primary)]";

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1.5 rounded-full ${chipBg} px-3 py-1 text-xs font-medium ${chipText}`}
            >
              {c.name}
              <span className="group/tip relative inline-flex">
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((s) => s.id !== c.id))}
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${chipHover}`}
                  aria-label={chipTooltip ?? `Remove ${c.name}`}
                >
                  <X size={10} />
                </button>
                {chipTooltip && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1d1d1f] px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100">
                    {chipTooltip}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1d1d1f]" />
                  </span>
                )}
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className={`flex items-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2.5 transition focus-within:ring-2 ${ringColor}`}>
          <Search size={14} className="shrink-0 text-[#86868b]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search customers..."
            className="flex-1 bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
          />
          {isLoading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-[var(--primary)] shrink-0" />
          )}
        </div>
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[#d2d2d7] bg-white shadow-lg">
            {!search.trim() ? (
              <p className="px-4 py-3 text-xs text-[#86868b]">Type to search customers…</p>
            ) : isLoading ? (
              <p className="px-4 py-3 text-xs text-[#86868b]">Searching…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[#86868b]">{debounced ? "No customers found." : "Type to search customers…"}</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { toggle(c); setSearch(""); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f5f5f7]"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${avatarBg} text-xs font-semibold`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{c.name}</p>
                    <p className="text-xs text-[#86868b]">{c.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const num = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

export const CouponDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const couponQuery = commerceApi.coupons.crud.hooks.useGet(id, Boolean(id));

  const insightsQuery = useQuery({
    queryKey: ["coupon", "insights", id],
    queryFn: () => commerceApi.coupons.insights(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  const [issueCustomers, setIssueCustomers] = React.useState<CustomerOption[]>([]);
  const [unassignCustomers, setUnassignCustomers] = React.useState<CustomerOption[]>([]);
  const [issuing, setIssuing] = React.useState(false);
  const [unassigning, setUnassigning] = React.useState(false);

  const coupon = couponQuery.data as Record<string, unknown> | undefined;
  const insights = insightsQuery.data as Record<string, unknown> | undefined;

  const handleIssue = async () => {
    if (!issueCustomers.length) { toast.error("Select at least one customer"); return; }
    const customerIds = issueCustomers.map((c) => c.id);
    setIssuing(true);
    try {
      await commerceApi.coupons.issueUsers({ couponId: id!, customerIds });
      toast.success(`Coupon issued to ${customerIds.length} customer(s)`);
      setIssueCustomers([]);
      void insightsQuery.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setIssuing(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignCustomers.length) { toast.error("Select at least one customer"); return; }
    const customerIds = unassignCustomers.map((c) => c.id);
    setUnassigning(true);
    try {
      await commerceApi.coupons.unassignUsers({ couponId: id!, customerIds });
      toast.success(`Coupon removed from ${customerIds.length} customer(s)`);
      setUnassignCustomers([]);
      void insightsQuery.refetch();
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setUnassigning(false);
    }
  };

  if (couponQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading coupon...
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-gray-400">
        Coupon not found.
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={text(coupon.code, "Coupon")}
      subtitle={text(coupon.title)}
      onBack={() => navigate("/dashboard/coupons")}
    >
      {/* Edit button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/dashboard/coupons/${id}/edit`)}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          <Edit size={14} />
          Edit Coupon
        </button>
      </div>

      {/* Basic info */}
      <FormSection title="Coupon Info">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Discount</p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {text(coupon.discountType) === "PERCENTAGE"
                ? `${num(coupon.discountValue)}%`
                : `Rs ${num(coupon.discountValue)}`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Validity</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {text(coupon.startsAt, "—").slice(0, 10)} → {text(coupon.expiresAt, "—").slice(0, 10)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <div className="mt-1"><StatusBadge status={text(coupon.status, "Inactive")} /></div>
          </div>
        </div>
        {typeof coupon.description === "string" && coupon.description ? (
          <p className="text-sm text-gray-600">{coupon.description}</p>
        ) : null}
      </FormSection>

      {/* Insights */}
      <FormSection title="Insights">
        {insightsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Loading insights...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardV2
              label="Total Usage"
              value={num(insights?.totalUsage ?? coupon.usageCount)}
              icon={BarChart2}
              colorVariant="blue"
            />
            <StatCardV2
              label="Usage Limit"
              value={num(insights?.usageLimit ?? coupon.usageLimit) || "Unlimited"}
              icon={Tag}
              colorVariant="amber"
            />
            <StatCardV2
              label="Unique Users"
              value={num(insights?.uniqueUsers ?? insights?.userCount)}
              icon={Users}
              colorVariant="emerald"
            />
            <StatCardV2
              label="Total Discount Given"
              value={`Rs ${num(insights?.totalDiscountGiven ?? insights?.totalSavings).toFixed(0)}`}
              icon={BarChart2}
              colorVariant="blue"
            />
          </div>
        )}
      </FormSection>

      {/* Manage customers — issue + remove in one section */}
      <FormSection title="Manage Customers">
        <p className="text-sm text-[#86868b]">Search and select customers to grant this coupon.</p>
        <CustomerMultiPicker selected={issueCustomers} onChange={setIssueCustomers} />
        <button
          onClick={() => void handleIssue()}
          disabled={issuing || issueCustomers.length === 0}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {issuing ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
          Issue Coupon{issueCustomers.length > 0 ? ` (${issueCustomers.length})` : ""}
        </button>

        <div className="border-t border-[#f0f0f2] pt-4">
          <p className="mb-3 text-sm text-[#86868b]">Select customers to revoke coupon access. Click <span className="font-medium text-red-500">×</span> on a chip to deselect.</p>
          <CustomerMultiPicker
            selected={unassignCustomers}
            onChange={setUnassignCustomers}
            chipColor="red"
            chipTooltip="Remove this customer"
          />
          <button
            onClick={() => void handleUnassign()}
            disabled={unassigning || unassignCustomers.length === 0}
            className="mt-3 flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {unassigning ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
            Remove Coupon{unassignCustomers.length > 0 ? ` (${unassignCustomers.length})` : ""}
          </button>
        </div>
      </FormSection>
    </ModernFormLayout>
  );
};
