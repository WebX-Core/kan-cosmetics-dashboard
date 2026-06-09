import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ModernFormLayout, FormSection, FormField, FormActions } from "@/shared/components/forms/ModernFormLayout";
import { CustomerSearchPicker } from "@/shared/components/forms/CustomerSearchPicker";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import { marketingApi } from "@/features/marketing";

const inputClass =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const checkboxClass = "h-4 w-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]";

type CustomerOption = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
}>;

type AudienceMode = "single" | "filtered" | "all";

export const EmailRecipientSelectAudiencePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const campaignsQuery = marketingApi.emailCampaigns.hooks.useList({ page: 1, limit: 100 }, true);
  const campaigns = React.useMemo(() => {
    const raw = campaignsQuery.data as { data?: unknown[] } | undefined;
    const items = Array.isArray(campaignsQuery.data) ? campaignsQuery.data : raw?.data ?? [];
    return items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }, [campaignsQuery.data]);

  const createMutation = marketingApi.selectAudience;
  const [mode, setMode] = React.useState<AudienceMode>("filtered");
  const [campaignId, setCampaignId] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [minTotalSpent, setMinTotalSpent] = React.useState("");
  const [maxTotalSpent, setMaxTotalSpent] = React.useState("");
  const [limit, setLimit] = React.useState("");
  const [dryRun, setDryRun] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    const prefillCampaignId = searchParams.get("campaignId")?.trim();
    if (prefillCampaignId) setCampaignId(prefillCampaignId);
  }, [searchParams]);

  const selectedCampaign = React.useMemo(
    () => campaigns.find((campaign) => String(campaign.id ?? "") === campaignId) ?? null,
    [campaignId, campaigns]
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!campaignId) {
      toast.error("Please select a campaign.");
      return;
    }
    if (mode === "single" && !selectedCustomer) {
      toast.error("Please select a customer.");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await createMutation({
        campaignId,
        ...(mode === "single"
          ? { customerId: selectedCustomer?.id }
          : mode === "all"
            ? { selectAllUsers: true }
            : {
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                country: country.trim() || undefined,
                keyword: keyword.trim() || undefined,
                minTotalSpent: minTotalSpent ? Number(minTotalSpent) : undefined,
                maxTotalSpent: maxTotalSpent ? Number(maxTotalSpent) : undefined,
                limit: limit ? Number(limit) : undefined,
              }),
        dryRun,
      });
      setResult(response as Record<string, unknown>);
      toast.success(dryRun ? "Audience preview ready." : "Audience selected.");
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
      title="Select Audience"
      subtitle="Choose one customer, a filtered audience, or all verified users."
      onBack={() => navigate("/dashboard/marketing/email-recipients")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Campaign">
          <FormField label="Campaign" required>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={inputClass}>
              <option value="">Select a campaign…</option>
              {campaigns.map((campaign) => (
                <option key={String(campaign.id)} value={String(campaign.id)}>
                  {String(campaign.title ?? campaign.name) || String(campaign.id)}
                </option>
              ))}
            </select>
          </FormField>
          {selectedCampaign ? (
            <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#6e6e73]">
              Selected campaign: <span className="font-medium text-[#1d1d1f]">{String(selectedCampaign.title ?? selectedCampaign.name)}</span>
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Targeting">
          <div className="flex flex-wrap gap-2">
            {(["single", "filtered", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  mode === item
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]"
                }`}
              >
                {item === "single" ? "Single Customer" : item === "filtered" ? "Filtered Audience" : "All Users"}
              </button>
            ))}
          </div>

          {mode === "single" ? (
            <CustomerSearchPicker
              label="Customer"
              required
              value={selectedCustomer}
              onChange={setSelectedCustomer}
              helperText="Search by customer name, email, or phone."
            />
          ) : null}

          {mode === "filtered" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="City">
                <input type="text" value={city} placeholder="Kathmandu" onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="State">
                <input type="text" value={state} placeholder="Bagmati" onChange={(e) => setState(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Country">
                <input type="text" value={country} placeholder="NP" onChange={(e) => setCountry(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Keyword">
                <input type="text" value={keyword} placeholder="Search term…" onChange={(e) => setKeyword(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Min Total Spent">
                <input type="number" min={0} value={minTotalSpent} placeholder="1000" onChange={(e) => setMinTotalSpent(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Max Total Spent">
                <input type="number" min={0} value={maxTotalSpent} placeholder="50000" onChange={(e) => setMaxTotalSpent(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Limit">
                <input type="number" min={1} value={limit} placeholder="No limit" onChange={(e) => setLimit(e.target.value)} className={inputClass} />
              </FormField>
            </div>
          ) : null}

          {mode === "all" ? (
            <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#6e6e73]">
              This will target all verified users.
            </div>
          ) : null}

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
          submitLabel={submitting ? "Running…" : dryRun ? "Preview Audience" : "Select Audience"}
          submitIcon={submitting ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={submitting}
          onCancel={() => navigate("/dashboard/marketing/email-recipients")}
        />
      </form>
    </ModernFormLayout>
  );
};
