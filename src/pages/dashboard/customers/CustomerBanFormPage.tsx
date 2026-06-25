import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { z } from "zod";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";
import { commerceApi, useCustomerBanLift } from "@/features/commerce";
import { useCustomerOptions } from "@/shared/hooks/useCustomerOptions";
import type { CustomerOption } from "@/shared/hooks/useCustomerOptions";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const schema = z.object({
  identifierMode: z.enum(["customer", "email", "phone"]),
  customerId: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  reason: z.string().trim().min(1, "Reason is required"),
  notes: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.identifierMode === "customer") {
    if (!value.customerId?.trim()) {
      ctx.addIssue({ code: "custom", message: "Please select a customer", path: ["customerId"] });
    }
    return;
  }

  if (value.identifierMode === "email") {
    if (!value.email?.trim()) {
      ctx.addIssue({ code: "custom", message: "Email is required", path: ["email"] });
      return;
    }
    if (!z.string().email().safeParse(value.email).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email", path: ["email"] });
    }
    return;
  }

  if (value.identifierMode === "phone") {
    if (!value.phone?.trim()) {
      ctx.addIssue({ code: "custom", message: "Phone is required", path: ["phone"] });
      return;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(value.phone.trim())) {
      ctx.addIssue({ code: "custom", message: "Phone number must be valid", path: ["phone"] });
    }
  }
});

type Form = {
  identifierMode: "customer" | "email" | "phone";
  customerId: string;
  email: string;
  phone: string;
  reason: string;
  notes: string;
};

type BanRecord = Readonly<{
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  notes: string;
  bannedUntil: string;
  createdAt: string;
}>;

type CustomerState = Readonly<{
  id: string;
  name: string;
  email: string;
}>;

const initialForm: Form = {
  identifierMode: "customer",
  customerId: "",
  email: "",
  phone: "",
  reason: "",
  notes: "",
};

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const formatDateTime = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getCustomerName = (customer: Record<string, unknown>): string => {
  const firstName = text(customer.firstname);
  const lastName = text(customer.lastname);
  const fullName = text(customer.fullname ?? customer.name);
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(" ").trim() || fullName || "—";
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizePhone = (value: string): string => value.trim();

const toBanRecord = (payload: unknown): BanRecord | null => {
  if (!payload || typeof payload !== "object") return null;

  const row = payload as Record<string, unknown>;
  const customer = (typeof row.customer === "object" && row.customer !== null ? row.customer : {}) as Record<string, unknown>;
  const customerId = text(row.customerId ?? customer.id);

  return {
    id: text(row.id),
    customerId,
    customerName: getCustomerName(customer),
    customerEmail: text(row.customerEmail ?? customer.email, "—"),
    reason: text(row.reason, "No reason provided"),
    notes: text(row.notes, ""),
    bannedUntil: text(row.bannedUntil ?? row.expiresAt, ""),
    createdAt: text(row.createdAt, ""),
  };
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-1 gap-1 border-b border-[#f0f0f2] py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
    <span className="text-[12px] font-medium text-[#86868b]">{label}</span>
    <span className="text-[14px] text-[#1d1d1f]">{value}</span>
  </div>
);

export const CustomerBanFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const createMutation = commerceApi.customerBans.hooks.useCreate();
  const liftMutation = useCustomerBanLift();
  const getQuery = commerceApi.customerBans.hooks.useGet(id, isEdit);
  const [form, setForm] = React.useState<Form>(initialForm);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [confirmUnbanOpen, setConfirmUnbanOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { customers, isLoading: customersLoading } = useCustomerOptions();

  React.useEffect(() => {
    if (!isEdit) return;
    const ban = toBanRecord(getQuery.data);
    if (!ban) return;

    setSelectedCustomer({
      id: ban.customerId,
      name: ban.customerName,
      email: ban.customerEmail,
    });
    setForm({
      identifierMode: "customer",
      customerId: ban.customerId,
      email: "",
      phone: "",
      reason: ban.reason,
      notes: ban.notes,
    });
  }, [getQuery.data, isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    const state = location.state as { customer?: CustomerState } | null;
    const customer = state?.customer;
    if (!customer || selectedCustomer) return;

    setSelectedCustomer(customer);
    setForm((prev) => ({
      ...prev,
      identifierMode: "customer",
      customerId: customer.id,
      email: "",
      phone: "",
    }));
  }, [isEdit, location.state, selectedCustomer]);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCustomers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => customer.name.toLowerCase().includes(query) || customer.email.toLowerCase().includes(query));
  }, [customers, search]);

  const selectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setForm((prev) => ({
      ...prev,
      identifierMode: "customer",
      customerId: customer.id,
      email: "",
      phone: "",
    }));
    setSearch("");
    setOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setForm((prev) => ({ ...prev, customerId: "", identifierMode: "customer" }));
    setSearch("");
  };

  const updateField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateIdentifierMode = (mode: Form["identifierMode"]) => {
    setForm((prev) => ({
      ...prev,
      identifierMode: mode,
      customerId: mode === "customer" ? prev.customerId : "",
      email: mode === "email" ? prev.email : "",
      phone: mode === "phone" ? prev.phone : "",
    }));
    if (mode !== "customer") {
      setSelectedCustomer(null);
    }
  };

  const saving = createMutation.isPending || liftMutation.isPending;

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (isEdit) {
      setConfirmUnbanOpen(true);
      return;
    }

    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;

    const payload =
      parsed.identifierMode === "email"
        ? {
            email: normalizeEmail(parsed.email ?? ""),
            reason: parsed.reason,
            notes: parsed.notes?.trim() || undefined,
          }
        : parsed.identifierMode === "phone"
          ? {
              phone: normalizePhone(parsed.phone ?? ""),
              reason: parsed.reason,
              notes: parsed.notes?.trim() || undefined,
            }
          : {
              customerId: parsed.customerId?.trim() || undefined,
              reason: parsed.reason,
              notes: parsed.notes?.trim() || undefined,
            };

    try {
      await createMutation.mutateAsync(payload);
      navigate("/dashboard/customers/bans", { replace: true });
    } catch {
      return;
    }
  };

  const handleConfirmUnban = async () => {
    const ban = toBanRecord(getQuery.data);
    if (!ban) return;

    const ids = [ban.customerId || ban.id].filter(Boolean);
    if (ids.length === 0) return;

    try {
      await liftMutation.mutateAsync({ ids });
      navigate("/dashboard/customers/bans", { replace: true });
    } catch {
      return;
    } finally {
      setConfirmUnbanOpen(false);
    }
  };

  if (isEdit) {
    const ban = toBanRecord(getQuery.data);

    return (
      <ModernFormLayout
        title="Ban Details"
        subtitle="This screen manages the active ban record. Editing is not supported by the backend; unban the customer instead."
        onBack={() => navigate("/dashboard/customers/bans")}
      >
        <div className="rounded-2xl border border-[#d2d2d7] bg-white p-5">
          {getQuery.isLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
              <Loader2 size={14} className="animate-spin" />
              Loading ban details...
            </div>
          ) : ban ? (
            <div className="space-y-2">
              <DetailRow label="Customer" value={ban.customerName} />
              <DetailRow label="Email" value={ban.customerEmail} />
              <DetailRow label="Reason" value={ban.reason} />
              <DetailRow label="Notes" value={ban.notes || "—"} />
              <DetailRow label="Banned Until" value={ban.bannedUntil ? formatDateTime(ban.bannedUntil) : "Permanent"} />
              <DetailRow label="Created At" value={formatDateTime(ban.createdAt)} />
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmUnbanOpen(true)}
                  disabled={saving}
                >
                  {saving ? "Unbanning..." : "Unban customer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard/customers/bans")}
                  disabled={saving}
                >
                  Back to bans
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#6e6e73]">Ban record not found.</div>
          )}
        </div>

        <AlertDialog open={confirmUnbanOpen} onOpenChange={(openValue) => setConfirmUnbanOpen(openValue)}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Unban customer?</AlertDialogTitle>
              <AlertDialogDescription>
                {ban ? `${ban.customerName} will regain access immediately.` : "This customer will regain access immediately."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-red-600 text-white hover:bg-red-700"
                onClick={() => void handleConfirmUnban()}
                disabled={liftMutation.isPending}
              >
                {liftMutation.isPending ? "Unbanning..." : "Unban customer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ModernFormLayout>
    );
  }

  return (
    <ModernFormLayout
      title="Ban Customer"
      subtitle="Restrict a customer account from accessing the platform."
      onBack={() => navigate("/dashboard/customers/bans")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Identifier">
          <FormField label="Ban by" required>
            <select
              value={form.identifierMode}
              onChange={(event) => updateIdentifierMode(event.target.value as Form["identifierMode"])}
              className={inputClass}
            >
              <option value="customer">Customer</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </FormField>

          {form.identifierMode === "customer" ? (
            <FormField label="Select Customer" required>
              <div ref={dropdownRef} className="relative">
                {selectedCustomer ? (
                  <div className="flex h-11 items-center justify-between rounded-xl border border-[#d2d2d7] bg-white px-4">
                    <div className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[#1d1d1f]">{selectedCustomer.name}</span>
                      {selectedCustomer.email && <span className="block truncate text-[12px] text-[#86868b]">{selectedCustomer.email}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="ml-2 shrink-0 rounded-full p-1 text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={search}
                        placeholder={customersLoading ? "Loading customers…" : "Search by name or email…"}
                        disabled={customersLoading}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 pr-10 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-50"
                      />
                      <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                    </div>
                    {open && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#d2d2d7] bg-white shadow-lg">
                        {customersLoading ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#86868b]">
                            <Loader2 size={14} className="animate-spin" />
                            Loading customers…
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="px-4 py-3 text-[13px] text-[#86868b]">No customers found.</div>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onMouseDown={() => selectCustomer(customer)}
                              className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-[#f5f5f7]"
                            >
                              <span className="text-[14px] font-medium text-[#1d1d1f]">{customer.name}</span>
                              {customer.email && <span className="text-[12px] text-[#86868b]">{customer.email}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FormField>
          ) : form.identifierMode === "email" ? (
            <FormField label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="customer@example.com"
                className={inputClass}
              />
            </FormField>
          ) : (
            <FormField label="Phone" required>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="+9779812345678"
                className={inputClass}
              />
            </FormField>
          )}
        </FormSection>

        <FormSection title="Ban Details">
          <FormField label="Reason" required>
            <textarea
              value={form.reason}
              placeholder="Reason for ban (visible to admins only)…"
              onChange={(event) => updateField("reason", event.target.value)}
              rows={3}
              className={textareaClass}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              value={form.notes}
              placeholder="Internal notes for admins…"
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className={textareaClass}
            />
          </FormField>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Banning..." : "Ban Customer"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/customers/bans")}
        />
      </form>
    </ModernFormLayout>
  );
};
