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

const read = (v: unknown): string => (typeof v === "string" ? v : "");

const campaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  subject: z.string().trim().min(1, "Subject is required"),
  content: z.string().trim().min(1, "Content is required"),
  type: z.string().trim().min(1, "Type is required"),
  status: z.enum(["draft", "scheduled", "sent", "cancelled"]).default("draft"),
  scheduledAt: z.string().optional(),
});

type CampaignForm = {
  title: string;
  subject: string;
  content: string;
  type: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
  scheduledAt: string;
};

const initial: CampaignForm = { title: "", subject: "", content: "", type: "promotional", status: "draft", scheduledAt: "" };
type PostCreateAction = "audience" | "queue";

const getRecommendedPostCreateAction = (type: string): PostCreateAction =>
  type === "transactional" ? "queue" : "audience";

export const EmailCampaignFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.emailCampaigns.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.emailCampaigns.hooks.useCreate();
  const updateMutation = marketingApi.emailCampaigns.hooks.useUpdate();
  const [form, setForm] = React.useState<CampaignForm>(initial);
  const [createdCampaignId, setCreatedCampaignId] = React.useState<string | null>(null);
  const [showNextStepDialog, setShowNextStepDialog] = React.useState(false);
  const [recommendedAction, setRecommendedAction] = React.useState<PostCreateAction>("audience");

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({
      title: read(r.title || r.name),
      subject: read(r.subject),
      content: read(r.content || r.body),
      type: read(r.type) || "promotional",
      status: (read(r.status).toLowerCase() as CampaignForm["status"]) || "draft",
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
      title: parsed.title,
      subject: parsed.subject,
      content: parsed.content,
      type: parsed.type,
      status: parsed.status,
      scheduledAt: parsed.scheduledAt?.trim() || undefined,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
        toast.success("Campaign updated.");
        navigate("/dashboard/marketing/email-campaigns", { replace: true });
        return;
      } else {
        const result = await createMutation.mutateAsync(payload);
        const campaignId = typeof result === "object" && result !== null ? read((result as Record<string, unknown>).campaignId) : "";
        if (!campaignId) {
          toast.success("Campaign created.");
          navigate("/dashboard/marketing/email-campaigns", { replace: true });
          return;
        }
        setCreatedCampaignId(campaignId);
        setRecommendedAction(getRecommendedPostCreateAction(payload.type));
        setShowNextStepDialog(true);
        toast.success("Campaign created.");
        return;
      }
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const handlePostCreateAction = (action: PostCreateAction) => {
    if (!createdCampaignId) return;

    setShowNextStepDialog(false);
    const target =
      action === "audience"
        ? `/dashboard/marketing/email-recipients/select-audience?campaignId=${createdCampaignId}`
        : `/dashboard/marketing/email-queue/create-from-campaign?campaignId=${createdCampaignId}`;

    navigate(target);
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
            <FormField label="Campaign Title" required>
              <input type="text" value={form.title} placeholder="Summer sale announcement" onChange={(e) => up("title", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={(e) => up("status", e.target.value as CampaignForm["status"])} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>
          <FormField label="Email Subject" required>
            <input type="text" value={form.subject} placeholder="Your exclusive offer inside…" onChange={(e) => up("subject", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Campaign Type" required>
            <select value={form.type} onChange={(e) => up("type", e.target.value)} className={inputClass}>
              <option value="promotional">Promotional</option>
              <option value="newsletter">Newsletter</option>
              <option value="transactional">Transactional</option>
              <option value="announcement">Announcement</option>
              <option value="reminder">Reminder</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Scheduled At">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => up("scheduledAt", e.target.value)} className={inputClass} />
          </FormField>
        </FormSection>

        <FormSection title="Email Content">
          <FormField label="Content" required>
            <RichTextEditor
              initialContent={form.content}
              onChange={(v) => up("content", v)}
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

      <AlertDialog open={showNextStepDialog} onOpenChange={(open) => !open && setShowNextStepDialog(false)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Campaign created</AlertDialogTitle>
            <AlertDialogDescription>
              {recommendedAction === "queue"
                ? "This campaign type usually goes straight to queue setup."
                : "This campaign type usually starts with audience selection."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full" onClick={() => setShowNextStepDialog(false)}>
              Later
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
              onClick={() => handlePostCreateAction(recommendedAction)}
            >
              {recommendedAction === "queue" ? "Create Queue" : "Select Audience"} (Recommended)
            </AlertDialogAction>
            <AlertDialogAction
              className="rounded-full bg-[#1d1d1f] text-white hover:bg-[#2c2c2e]"
              onClick={() => handlePostCreateAction(recommendedAction === "queue" ? "audience" : "queue")}
            >
              {recommendedAction === "queue" ? "Select Audience" : "Create Queue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModernFormLayout>
  );
};
