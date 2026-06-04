import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

export const EmailRecipientFromSubscribersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 100 }, true);
  const campaigns = React.useMemo(() => {
    const raw = campaignsQuery.data as { data?: unknown[] } | undefined;
    const items = Array.isArray(campaignsQuery.data) ? campaignsQuery.data : raw?.data ?? [];
    return items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }, [campaignsQuery.data]);

  const [campaignId, setCampaignId] = React.useState("");
  const [subscriberIds, setSubscriberIds] = React.useState("");
  const [dryRun, setDryRun] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const prefillCampaignId = searchParams.get("campaignId")?.trim();
    if (prefillCampaignId) setCampaignId(prefillCampaignId);
  }, [searchParams]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!campaignId) {
      toast.error("Please select a campaign.");
      return;
    }

    const ids = subscriberIds
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!ids.length) {
      toast.error("Enter at least one subscriber ID.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await marketingApi.createFromSubscribers({
        campaignId,
        subscriberIds: ids,
        dryRun,
      });
      setResult(response as Record<string, unknown>);
      toast.success(dryRun ? "Preview ready." : "Recipients created.");
      if (!dryRun) {
        navigate("/dashboard/marketing/email-recipients", { replace: true });
      }
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModernFormLayout
      title="From Subscribers"
      subtitle="Create recipients from newsletter subscriber IDs."
      onBack={() => navigate("/dashboard/marketing/email-recipients")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Campaign">
          <FormField label="Campaign" required>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
              <option value="">Select a campaign…</option>
              {campaigns.map((campaign) => (
                <option key={text(campaign.id)} value={text(campaign.id)}>
                  {text(campaign.title ?? campaign.name) || text(campaign.id)}
                </option>
              ))}
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Subscribers">
          <FormField label="Subscriber IDs" required>
            <textarea
              value={subscriberIds}
              placeholder="Paste subscriber IDs, one per line or comma-separated…"
              rows={8}
              onChange={(e) => setSubscriberIds(e.target.value)}
              className={textareaClass}
            />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1d1d1f]">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#0071e3]" />
            Dry run only
          </label>
        </FormSection>

        {result ? (
          <div className="rounded-2xl border border-[#d2d2d7] bg-[#f5f5f7] p-4 text-[13px] text-[#1d1d1f]">
            <div className="mb-2 font-medium">Preview result</div>
            <pre className="overflow-auto text-[12px] leading-6 text-[#6e6e73]">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}

        <FormActions
          submitLabel={submitting ? "Running…" : dryRun ? "Preview Recipients" : "Create Recipients"}
          submitIcon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={submitting}
          onCancel={() => navigate("/dashboard/marketing/email-recipients")}
        />
      </form>
    </ModernFormLayout>
  );
};
