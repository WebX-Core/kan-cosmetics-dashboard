import React from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyaltySettings, useUpdateLoyaltySettings } from "@/features/loyalty";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";

export const LoyaltySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const query = useLoyaltySettings();
  const update = useUpdateLoyaltySettings();
  const [points, setPoints] = React.useState("100");
  const [isActive, setIsActive] = React.useState(true);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!query.data) return;
    setPoints(String(query.data.referralRewardPoints));
    setIsActive(query.data.isActive);
    setNote(typeof query.data.metadata?.note === "string" ? query.data.metadata.note : "");
  }, [query.data]);

  const submit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    const value = Number(points);
    if (!Number.isInteger(value) || value < 0) return toast.error("Referral points must be a non-negative whole number.");
    await update.mutateAsync({ referralRewardPoints: value, isActive, metadata: note.trim() ? { ...(query.data?.metadata ?? {}), note: note.trim() } : query.data?.metadata ?? null });
  };

  return <ModernFormLayout title="Loyalty Settings" subtitle="Manage referral point awards and loyalty availability." onBack={() => navigate("/dashboard/loyalty")}>
    <form onSubmit={submit} className="space-y-6">
      <FormSection title="Referral rewards" description="Set referral points to 0 to disable referral point awards without deleting the settings record.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Referral reward points" required><input type="number" min="0" step="1" value={points} onChange={(e) => setPoints(e.target.value)} className="h-11 w-full rounded-xl border border-[#d2d2d7] px-3 text-sm" /></FormField>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Loyalty settings active</label>
          <FormField label="Change note"><textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24 w-full rounded-xl border border-[#d2d2d7] p-3 text-sm" /></FormField>
        </div>
      </FormSection>
      <FormActions submitLabel={update.isPending ? "Saving..." : "Save Settings"} submitIcon={update.isPending ? <Loader2 className="animate-spin" size={14} /> : undefined} isSubmitting={update.isPending || query.isLoading} onCancel={() => navigate("/dashboard/loyalty")} />
    </form>
  </ModernFormLayout>;
};
