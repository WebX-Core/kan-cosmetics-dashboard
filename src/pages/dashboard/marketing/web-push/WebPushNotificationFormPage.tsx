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
const textareaClass =
  "w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().min(1, "Body is required"),
  icon: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
});

type Form = { title: string; body: string; icon: string; url: string };
const initial: Form = { title: "", body: "", icon: "", url: "" };

const read = (v: unknown): string => (typeof v === "string" ? v : "");

export const WebPushNotificationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const getQuery = marketingApi.webPushNotifications.hooks.useGet(id, isEdit);
  const createMutation = marketingApi.webPushNotifications.hooks.useCreate();
  const updateMutation = marketingApi.webPushNotifications.hooks.useUpdate();
  const [form, setForm] = React.useState<Form>(initial);

  React.useEffect(() => {
    if (!isEdit || !getQuery.data) return;
    const r = getQuery.data as Record<string, unknown>;
    setForm({ title: read(r.title), body: read(r.body), icon: read(r.icon), url: read(r.url) });
  }, [getQuery.data, isEdit]);

  const saving = createMutation.isPending || updateMutation.isPending;
  const up = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const parsed = validateOrToast(schema, form, toast);
    if (!parsed) return;
    const payload = {
      title: parsed.title,
      body: parsed.body,
      icon: parsed.icon?.trim() || undefined,
      url: parsed.url?.trim() || undefined,
    };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, dto: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Notification updated." : "Notification created.");
      navigate("/dashboard/marketing/web-push/notifications", { replace: true });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (isEdit && getQuery.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-[14px] text-[#86868b]">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading notification…
      </div>
    );
  }

  return (
    <ModernFormLayout
      title={isEdit ? "Edit Notification" : "New Push Notification"}
      subtitle={isEdit ? "Update notification details." : "Create a browser push notification to send to subscribers."}
      onBack={() => navigate("/dashboard/marketing/web-push/notifications")}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Notification Content">
          <FormField label="Title" required>
            <input type="text" value={form.title} placeholder="Flash Sale — 30% off today only" onChange={(e) => up("title", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Body" required>
            <textarea value={form.body} placeholder="Write the notification message…" onChange={(e) => up("body", e.target.value)} rows={4} className={textareaClass} />
          </FormField>
        </FormSection>

        <FormSection title="Optional">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Icon URL">
              <input type="url" value={form.icon} placeholder="https://example.com/icon.png" onChange={(e) => up("icon", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Click URL">
              <input type="url" value={form.url} placeholder="https://example.com/sale" onChange={(e) => up("url", e.target.value)} className={inputClass} />
            </FormField>
          </div>
        </FormSection>

        <FormActions
          submitLabel={saving ? "Saving…" : isEdit ? "Update Notification" : "Create Notification"}
          submitIcon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
          isSubmitting={saving}
          onCancel={() => navigate("/dashboard/marketing/web-push/notifications")}
        />
      </form>
    </ModernFormLayout>
  );
};
