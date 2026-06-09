import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { CustomerSearchPicker } from "@/shared/components/forms/CustomerSearchPicker";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const recipientSchema = z.object({
  campaignId: z.string().trim().min(1, "Campaign is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  name: z.string().trim().optional(),
});

type CustomerOption = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
}>;

type RecipientForm = {
  campaignId: string;
  customer: CustomerOption | null;
  email: string;
  name: string;
};

const initial: RecipientForm = {
  campaignId: "",
  customer: null,
  email: "",
  name: "",
};

export const EmailRecipientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.emailRecipients.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.emailRecipients.hooks.useCreate();
  const updateMutation = marketingApi.emailRecipients.hooks.useUpdate();
  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 100 }, true);
  const campaigns = React.useMemo(() => {
    const rows = Array.isArray(campaignsQuery.data)
      ? campaignsQuery.data
      : ((campaignsQuery.data as { data?: unknown[] } | undefined)?.data ?? []);
    return rows.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
  }, [campaignsQuery.data]);

  const [form, setForm] = React.useState<RecipientForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const recipient = getQuery.data as Record<string, unknown>;
    const customer = recipient.customer as Record<string, unknown> | undefined;
    setForm({
      campaignId: read((recipient.campaign as Record<string, unknown> | undefined)?.id ?? recipient.campaignId),
      customer: customer
        ? {
            id: read(customer.id),
            name: read(customer.fullname || customer.name || [read(customer.firstname), read(customer.lastname)].filter(Boolean).join(" ")),
            email: read(customer.email),
            phone: read(customer.phone),
          }
        : null,
      email: read(recipient.email),
      name: read(recipient.name),
    });
  }, [getQuery.data, isEdit]);

  React.useEffect(() => {
    const campaignId = searchParams.get("campaignId")?.trim();
    if (!campaignId || isEdit) return;
    setForm((prev) => (prev.campaignId ? prev : { ...prev, campaignId }));
  }, [isEdit, searchParams]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof RecipientForm>(k: K, v: RecipientForm[K]) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleCustomerChange = (customer: CustomerOption | null) => {
    setForm((prev) => ({
      ...prev,
      customer,
      email: customer ? customer.email : prev.email,
      name: customer ? customer.name : prev.name,
    }));
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const parsed = validateOrToast(recipientSchema, form, toast);
    if (!parsed) return;
    if (!form.customer) {
      toast.error("Please select a customer.");
      return;
    }

    const payload = {
      campaignId: parsed.campaignId,
      customerId: form.customer.id,
      email: parsed.email?.trim() || form.customer.email,
      name: parsed.name?.trim() || undefined,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Recipient updated." : "Recipient added.");
      navigate("/dashboard/marketing/email-recipients", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading recipient…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Recipient" : "Add Recipient"}
      subtitle={isEdit ? "Update recipient details." : "Add a recipient to an email campaign."}
      onBack={() => navigate("/dashboard/marketing/email-recipients")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Recipient Details">
          <FormField label="Campaign" required>
            <select value={form.campaignId} onChange={(e) => up("campaignId", e.target.value)} className={inputClass}>
              <option value="">Select a campaign…</option>
              {campaigns.map((campaign) => (
                <option key={read(campaign.id)} value={read(campaign.id)}>
                  {read(campaign.title ?? campaign.name) || read(campaign.id)}
                </option>
              ))}
            </select>
          </FormField>

          <CustomerSearchPicker
            label="Customer"
            required
            value={form.customer}
            onChange={handleCustomerChange}
            helperText="Search by customer name, email, or phone. The selected customer fills email automatically."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Recipient Name">
              <input
                type="text"
                value={form.name}
                placeholder="Full name"
                onChange={(e) => up("name", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Email Override">
              <input
                type="email"
                value={form.email}
                placeholder="recipient@example.com"
                onChange={(e) => up("email", e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Recipient" : "Add Recipient"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/marketing/email-recipients")}
        />
      </form>
    </ModernFormLayout>
  );
};
