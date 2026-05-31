import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, X, ChevronDown } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { commerceApi } from "@/features/commerce";
import { useCustomerOptions } from "@/shared/hooks/useCustomerOptions";
import type { CustomerOption } from "@/shared/hooks/useCustomerOptions";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const schema = z.object({
  customerId: z.string().trim().min(1, "Please select a customer"),
  reason: z.string().trim().optional(),
  bannedUntil: z.string().optional(),
  isPermanent: z.boolean().default(false),
});

type Form = { customerId: string; reason: string; bannedUntil: string; isPermanent: boolean };
const initial: Form = { customerId: "", reason: "", bannedUntil: "", isPermanent: false };

export const CustomerBanFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const createMutation = commerceApi.customerBans.hooks.useCreate();
  const updateMutation = commerceApi.customerBans.hooks.useUpdate();
  const getQuery = commerceApi.customerBans.hooks.useGet(id, isEdit);
  const [form, setForm] = React.useState<Form>(initial);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { customers, isLoading: customersLoading } = useCustomerOptions();

  React.useEffect(() => {
    const row = getQuery.data as Record<string, unknown> | undefined;
    if (!row) return;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const customerId = str((row.customer as Record<string, unknown> | undefined)?.id ?? row.customerId);
    const customerName = str((row.customer as Record<string, unknown> | undefined)?.firstname ?? "") +
      " " + str((row.customer as Record<string, unknown> | undefined)?.lastname ?? "");
    const customerEmail = str((row.customer as Record<string, unknown> | undefined)?.email ?? "");
    if (customerId) {
      setSelectedCustomer({ id: customerId, name: customerName.trim() || customerId, email: customerEmail });
      setForm({
        customerId,
        reason: str(row.reason),
        bannedUntil: str(row.bannedUntil).slice(0, 16),
        isPermanent: row.bannedUntil == null,
      });
    }
  }, [getQuery.data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [customers, search]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setForm((p) => ({ ...p, customerId: c.id }));
    setSearch("");
    setOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setForm((p) => ({ ...p, customerId: "" }));
    setSearch("");
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;
    const payload = {
      customerId: parsed.customerId,
      reason: parsed.reason?.trim() || undefined,
      bannedUntil: parsed.isPermanent ? undefined : parsed.bannedUntil?.trim() || undefined,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
        toast.success("Ban updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Customer banned.");
      }
      navigate("/dashboard/customers/bans", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Ban" : "Ban Customer"}
      subtitle={isEdit ? "Update the ban details for this customer." : "Restrict a customer account from accessing the platform."}
      onBack={() => navigate("/dashboard/customers/bans")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Customer">
          <FormField label="Select Customer" required>
            <div ref={dropdownRef} className="relative">
              {selectedCustomer ? (
                <div className="flex h-11 items-center justify-between rounded-xl border border-[#d2d2d7] bg-white px-4">
                  <div className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#1d1d1f]">{selectedCustomer.name}</span>
                    {selectedCustomer.email && (
                      <span className="block truncate text-[12px] text-[#86868b]">{selectedCustomer.email}</span>
                    )}
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
                      onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                      onFocus={() => setOpen(true)}
                      className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 pr-10 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10 disabled:opacity-50"
                    />
                    <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
                  </div>
                  {open && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#d2d2d7] bg-white shadow-lg">
                      {customersLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#86868b]">
                          <Loader2 size={14} className="animate-spin" /> Loading customers…
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[13px] text-[#86868b]">No customers found.</div>
                      ) : (
                        filtered.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectCustomer(c)}
                            className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-[#f5f5f7]"
                          >
                            <span className="text-[14px] font-medium text-[#1d1d1f]">{c.name}</span>
                            {c.email && <span className="text-[12px] text-[#86868b]">{c.email}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </FormField>
        </FormSection>

        <FormSection title="Ban Details">
          <FormField label="Reason">
            <textarea
              value={form.reason}
              placeholder="Reason for ban (visible to admins only)…"
              onChange={(e) => up("reason", e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </FormField>

          <label className="inline-flex items-center gap-2 text-[14px] text-[#1d1d1f]">
            <input
              type="checkbox"
              checked={form.isPermanent}
              onChange={(e) => up("isPermanent", e.target.checked)}
            />
            Permanent ban (no expiry)
          </label>

          {!form.isPermanent && (
            <FormField label="Banned Until">
              <input
                type="datetime-local"
                value={form.bannedUntil}
                onChange={(e) => up("bannedUntil", e.target.value)}
                className={inputClass}
              />
            </FormField>
          )}
        </FormSection>

        <FormActions
          submitLabel={saving ? (isEdit ? "Saving…" : "Banning…") : (isEdit ? "Save Changes" : "Ban Customer")}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/customers/bans")}
        />
      </form>
    </ModernFormLayout>
  );
};
