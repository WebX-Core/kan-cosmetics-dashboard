import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
type Subscriber = Readonly<{ id: string; name: string; email: string }>;

export const EmailRecipientFromSubscribersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 100 }, true);
  const subscribersQuery = marketingApi.newsletters.hooks.useList({ page: 1, limit: 1000 }, true);
  const campaigns = React.useMemo(() => {
    const raw = campaignsQuery.data as { data?: unknown[] } | undefined;
    const items = Array.isArray(campaignsQuery.data) ? campaignsQuery.data : raw?.data ?? [];
    return items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }, [campaignsQuery.data]);
  const subscribers = React.useMemo<ReadonlyArray<Subscriber>>(() => {
    const items = subscribersQuery.data?.data ?? [];
    return items
      .filter((item) => item.isSubscribed !== false)
      .map((item) => ({
        id: text(item.id),
        name: text(item.name, "Subscriber"),
        email: text(item.email),
      }))
      .filter((item) => item.id && item.email);
  }, [subscribersQuery.data]);

  const [campaignId, setCampaignId] = React.useState("");
  const [selectedSubscriberIds, setSelectedSubscriberIds] = React.useState<ReadonlyArray<string>>([]);
  const [subscriberSearch, setSubscriberSearch] = React.useState("");
  const [dryRun, setDryRun] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const prefillCampaignId = searchParams.get("campaignId")?.trim();
    if (prefillCampaignId) setCampaignId(prefillCampaignId);
  }, [searchParams]);

  const filteredSubscribers = React.useMemo(() => {
    const search = subscriberSearch.trim().toLowerCase();
    if (!search) return subscribers;
    return subscribers.filter((subscriber) =>
      `${subscriber.name} ${subscriber.email}`.toLowerCase().includes(search),
    );
  }, [subscriberSearch, subscribers]);

  const visibleIds = React.useMemo(() => filteredSubscribers.map((subscriber) => subscriber.id), [filteredSubscribers]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSubscriberIds.includes(id));
  const toggleSubscriber = (id: string, checked: boolean) =>
    setSelectedSubscriberIds((previous) =>
      checked
        ? previous.includes(id) ? previous : [...previous, id]
        : previous.filter((selectedId) => selectedId !== id),
    );
  const toggleAllVisible = (checked: boolean) =>
    setSelectedSubscriberIds((previous) =>
      checked
        ? Array.from(new Set([...previous, ...visibleIds]))
        : previous.filter((id) => !visibleIds.includes(id)),
    );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!campaignId) {
      toast.error("Please select a campaign.");
      return;
    }

    if (!selectedSubscriberIds.length) {
      toast.error("Select at least one subscriber.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await marketingApi.createFromSubscribers({
        campaignId,
        subscriberIds: selectedSubscriberIds,
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
      subtitle="Select newsletter subscribers to add to an email campaign."
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="search"
                  value={subscriberSearch}
                  onChange={(event) => setSubscriberSearch(event.target.value)}
                  placeholder="Search subscribers by name or email…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <span className="text-[12px] font-medium text-[#6e6e73]">
                {selectedSubscriberIds.length} selected
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#d2d2d7] bg-white">
              <label className="flex cursor-pointer items-center gap-3 border-b border-[#e5e5ea] bg-[#f5f5f7] px-4 py-3 text-[13px] font-medium text-[#1d1d1f]">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]"
                />
                Select all visible ({filteredSubscribers.length})
              </label>
              <div className="max-h-80 divide-y divide-[#e5e5ea] overflow-y-auto">
                {subscribersQuery.isLoading ? (
                  <div className="flex items-center justify-center px-4 py-10 text-[13px] text-[#86868b]">
                    <Loader2 size={14} className="mr-2 animate-spin" /> Loading subscribers…
                  </div>
                ) : filteredSubscribers.length ? (
                  filteredSubscribers.map((subscriber) => (
                    <label key={subscriber.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7]">
                      <input
                        type="checkbox"
                        checked={selectedSubscriberIds.includes(subscriber.id)}
                        onChange={(event) => toggleSubscriber(subscriber.id, event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-[#1d1d1f]">{subscriber.name}</span>
                        <span className="block truncate text-[12px] text-[#6e6e73]">{subscriber.email}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-[13px] text-[#86868b]">No active subscribers found.</div>
                )}
              </div>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#1d1d1f]">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--primary)]" />
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
