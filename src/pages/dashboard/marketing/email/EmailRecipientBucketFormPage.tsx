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
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

const read = (v: unknown): string => (typeof v === "string" ? v : "");
const readNum = (v: unknown): string => (typeof v === "number" ? String(v) : "");

const bucketSchema = z.object({
  name: z.string().trim().min(1, "Bucket name is required"),
  description: z.string().trim().optional(),
  district: z.string().trim().optional(),
  minTotalSpent: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional(),
  ),
  maxTotalSpent: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.number().nonnegative().optional(),
  ),
  limit: z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});

type BucketForm = {
  name: string;
  description: string;
  district: string;
  minTotalSpent: string;
  maxTotalSpent: string;
  limit: string;
};

const initial: BucketForm = {
  name: "",
  description: "",
  district: "",
  minTotalSpent: "",
  maxTotalSpent: "",
  limit: "",
};

export const EmailRecipientBucketFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.emailRecipientBuckets.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.emailRecipientBuckets.hooks.useCreate();
  const updateMutation = marketingApi.emailRecipientBuckets.hooks.useUpdate();
  const [form, setForm] = React.useState<BucketForm>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({
      name: read(r.name),
      description: read(r.description),
      district: read(r.district),
      minTotalSpent: readNum(r.minTotalSpent),
      maxTotalSpent: readNum(r.maxTotalSpent),
      limit: readNum(r.limit),
    });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof BucketForm>(k: K, v: BucketForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(bucketSchema, form, toast);
    if (!parsed) return;
    const payload = {
      name: parsed.name,
      description: parsed.description?.trim() || undefined,
      district: parsed.district?.trim() || undefined,
      minTotalSpent: parsed.minTotalSpent,
      maxTotalSpent: parsed.maxTotalSpent,
      limit: parsed.limit,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Bucket updated." : "Bucket created.");
      navigate("/dashboard/marketing/email-recipient-buckets", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading bucket...
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Recipient Bucket" : "New Recipient Bucket"}
      subtitle={isEdit ? "Update the audience bucket details." : "Create a new audience bucket for targeted email campaigns."}
      onBack={() => navigate("/dashboard/marketing/email-recipient-buckets")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Bucket Details">
          <FormField label="Bucket Name" required>
            <input
              type="text"
              value={form.name}
              placeholder="High-value customers — Kathmandu"
              onChange={(e) => up("name", e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={form.description}
              placeholder="Brief description of this audience segment…"
              rows={3}
              onChange={(e) => up("description", e.target.value)}
              className={textareaClass}
            />
          </FormField>
        </FormSection>

        <FormSection title="Audience Filters">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="District">
              <input
                type="text"
                value={form.district}
                placeholder="e.g. Kathmandu"
                onChange={(e) => up("district", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Max Customers">
              <input
                type="number"
                value={form.limit}
                placeholder="Leave empty for no limit"
                min={1}
                onChange={(e) => up("limit", e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Min Total Spent (Rs)">
              <input
                type="number"
                value={form.minTotalSpent}
                placeholder="e.g. 1000"
                min={0}
                onChange={(e) => up("minTotalSpent", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Max Total Spent (Rs)">
              <input
                type="number"
                value={form.maxTotalSpent}
                placeholder="e.g. 50000"
                min={0}
                onChange={(e) => up("maxTotalSpent", e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Bucket" : "Create Bucket"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/marketing/email-recipient-buckets")}
        />
      </form>
    </ModernFormLayout>
  );
};
