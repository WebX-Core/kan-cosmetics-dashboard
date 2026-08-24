import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { marketingApi } from "@/features/marketing";
import { withoutUtcSuffix } from "./emailDateTime";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const checkboxClass = "h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]";
const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const numericValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
};

export const EmailQueueFromBucketPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 100 }, true);
  const bucketsQuery = marketingApi.emailRecipientBuckets.hooks.useList({ page: 1, limit: 100 }, true);
  const campaigns = React.useMemo(() => {
    const raw = campaignsQuery.data as { data?: unknown[] } | undefined;
    const items = Array.isArray(campaignsQuery.data) ? campaignsQuery.data : raw?.data ?? [];
    return items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }, [campaignsQuery.data]);
  const buckets = React.useMemo(() => {
    const raw = bucketsQuery.data as { data?: unknown[] } | undefined;
    const items = Array.isArray(bucketsQuery.data) ? bucketsQuery.data : raw?.data ?? [];
    return items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }, [bucketsQuery.data]);

  const [campaignId, setCampaignId] = React.useState("");
  const [bucketId, setBucketId] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [batchSize, setBatchSize] = React.useState("100");
  const [batchDelayMinutes, setBatchDelayMinutes] = React.useState("2");
  const [workerConcurrency, setWorkerConcurrency] = React.useState("5");
  const [workerRateLimitMax, setWorkerRateLimitMax] = React.useState("60");
  const [workerRateLimitDurationMs, setWorkerRateLimitDurationMs] = React.useState("60000");
  const [dryRun, setDryRun] = React.useState(true);
  const [skipExistingQueued, setSkipExistingQueued] = React.useState(true);
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
    if (!bucketId) {
      toast.error("Please select a recipient bucket.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await marketingApi.createQueueFromBucket({
        campaignId,
        bucketId,
        scheduledAt: withoutUtcSuffix(scheduledAt),
        limit: numericValue(limit),
        batchSize: numericValue(batchSize),
        batchDelayMinutes: numericValue(batchDelayMinutes),
        workerConcurrency: numericValue(workerConcurrency),
        workerRateLimitMax: numericValue(workerRateLimitMax),
        workerRateLimitDurationMs: numericValue(workerRateLimitDurationMs),
        dryRun,
        skipExistingQueued,
      });
      setResult(response as Record<string, unknown>);
      toast.success(dryRun ? "Preview ready." : "Queue created.");
      if (!dryRun) {
        navigate("/dashboard/marketing/email-queue", { replace: true });
      }
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModernFormLayout
      title="Create Queue from Bucket"
      subtitle="Turn a recipient bucket into queue entries."
      onBack={() => navigate("/dashboard/marketing/email-queue")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Target">
          <div className="grid gap-4 md:grid-cols-2">
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
            <FormField label="Recipient Bucket" required>
              <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} className={inputClass}>
                <option value="">Select a bucket…</option>
                {buckets.map((bucket) => (
                  <option key={text(bucket.id)} value={text(bucket.id)}>
                    {text(bucket.name) || text(bucket.id)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Queue Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Scheduled At">
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Limit">
              <input type="number" min={1} value={limit} placeholder="No limit" onChange={(e) => setLimit(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Batch Size">
              <input type="number" min={1} max={1000} value={batchSize} placeholder="100 recipients per batch" onChange={(e) => setBatchSize(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Batch Delay Minutes">
              <input type="number" min={0} max={1440} value={batchDelayMinutes} placeholder="2 minutes between batches" onChange={(e) => setBatchDelayMinutes(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Worker Concurrency">
              <input type="number" min={1} max={100} value={workerConcurrency} placeholder="5 parallel email jobs" onChange={(e) => setWorkerConcurrency(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Rate Limit Max">
              <input type="number" min={1} max={10000} value={workerRateLimitMax} placeholder="60 emails per window" onChange={(e) => setWorkerRateLimitMax(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Rate Limit Duration Ms">
              <input type="number" min={1000} max={86400000} value={workerRateLimitDurationMs} placeholder="60000 ms window" onChange={(e) => setWorkerRateLimitDurationMs(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1d1d1f]">
            <input type="checkbox" checked={skipExistingQueued} onChange={(e) => setSkipExistingQueued(e.target.checked)} className={checkboxClass} />
            Skip already queued recipients
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1d1d1f]">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className={checkboxClass} />
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
          submitLabel={submitting ? "Running…" : dryRun ? "Preview Queue" : "Create Queue"}
          submitIcon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={submitting}
          onCancel={() => navigate("/dashboard/marketing/email-queue")}
        />
      </form>
    </ModernFormLayout>
  );
};
