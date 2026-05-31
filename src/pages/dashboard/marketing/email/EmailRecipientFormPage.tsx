import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const recipientSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().optional(),
  campaignId: z.string().trim().min(1, "Campaign ID is required"),
});

type RecipientForm = { email: string; name: string; campaignId: string };
const initial: RecipientForm = { email: "", name: "", campaignId: "" };

export const EmailRecipientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.emailRecipients.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.emailRecipients.hooks.useCreate();
  const updateMutation = marketingApi.emailRecipients.hooks.useUpdate();
  const [form, setForm] = React.useState<RecipientForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({ email: read(r.email), name: read(r.name), campaignId: read(r.campaignId) });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof RecipientForm>(k: K, v: RecipientForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(recipientSchema, form, toast);
    if (!parsed) return;
    const payload = { email: parsed.email, name: parsed.name?.trim() || undefined, campaignId: parsed.campaignId };
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email Address" required>
              <input type="email" value={form.email} placeholder="recipient@example.com" onChange={(e) => up("email", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Name">
              <input type="text" value={form.name} placeholder="Full name" onChange={(e) => up("name", e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Campaign ID" required>
            <input type="text" value={form.campaignId} placeholder="Paste campaign UUID" onChange={(e) => up("campaignId", e.target.value)} className={inputClass} />
          </FormField>
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
