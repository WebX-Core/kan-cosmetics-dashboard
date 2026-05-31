import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/shared/components/RichTextEditor";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { validateOrToast } from "@/shared/utils/validation";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().optional(),
  status: z.enum(["Draft", "Scheduled", "Sent", "Cancelled"]).default("Draft"),
  scheduledAt: z.string().optional(),
});

type CampaignForm = {
  name: string;
  subject: string;
  body: string;
  status: "Draft" | "Scheduled" | "Sent" | "Cancelled";
  scheduledAt: string;
};

const initial: CampaignForm = { name: "", subject: "", body: "", status: "Draft", scheduledAt: "" };

export const EmailCampaignFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.emailCampaigns.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.emailCampaigns.hooks.useCreate();
  const updateMutation = marketingApi.emailCampaigns.hooks.useUpdate();
  const [form, setForm] = React.useState<CampaignForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({
      name: read(r.name),
      subject: read(r.subject),
      body: read(r.body),
      status: (read(r.status) as CampaignForm["status"]) || "Draft",
      scheduledAt: read(r.scheduledAt).slice(0, 16),
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(campaignSchema, form, toast);
    if (!parsed) return;
    const payload = {
      name: parsed.name,
      subject: parsed.subject,
      body: parsed.body?.trim() || undefined,
      status: parsed.status,
      scheduledAt: parsed.scheduledAt?.trim() || undefined,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Campaign updated." : "Campaign created.");
      navigate("/dashboard/marketing/email-campaigns", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading campaign...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Campaign" : "New Email Campaign"}
      subtitle={isEdit ? "Update campaign details." : "Create a new email marketing campaign."}
      onBack={() => navigate("/dashboard/marketing/email-campaigns")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Campaign Details">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Campaign Name" required>
              <input type="text" value={form.name} placeholder="Summer sale announcement" onChange={(e) => up("name", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={(e) => up("status", e.target.value as CampaignForm["status"])} className={inputClass}>
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Sent">Sent</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>
          <FormField label="Email Subject" required>
            <input type="text" value={form.subject} placeholder="Your exclusive offer inside…" onChange={(e) => up("subject", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Scheduled At">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => up("scheduledAt", e.target.value)} className={inputClass} />
          </FormField>
        </FormSection>

        <FormSection title="Email Body">
          <FormField label="Body">
            <RichTextEditor
              initialContent={form.body}
              onChange={(v) => up("body", v)}
              placeholder="Write the email content…"
            />
          </FormField>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Campaign" : "Create Campaign"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/marketing/email-campaigns")}
        />
      </form>
    </ModernFormLayout>
  );
};
