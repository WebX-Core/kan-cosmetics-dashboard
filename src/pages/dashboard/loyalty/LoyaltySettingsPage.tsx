import React from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyaltySettings, useUpdateLoyaltySettings } from "@/features/loyalty";
import { ModernFormLayout, FormActions, FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { useToast } from "@/shared/components/feedback/ToastProvider";

type FormState = {
  signupRewardPoints: string;
  referralRewardPoints: string;
  statusPointsPerNpr: string;
  baseRewardPointsPerNpr: string;
  pointsPerNprValue: string;
  minimumRedeemPoints: string;
  redeemStepPoints: string;
  maxRedeemPercentWithoutCoupon: string;
  maxRedeemPercentWithCoupon: string;
  allowCouponWithPointRedeem: boolean;
  note: string;
};

const input =
  "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]";

const initial: FormState = {
  signupRewardPoints: "25",
  referralRewardPoints: "100",
  statusPointsPerNpr: "1",
  baseRewardPointsPerNpr: "0.25",
  pointsPerNprValue: "10",
  minimumRedeemPoints: "10",
  redeemStepPoints: "10",
  maxRedeemPercentWithoutCoupon: "25",
  maxRedeemPercentWithCoupon: "10",
  allowCouponWithPointRedeem: false,
  note: "",
};

const numberOrNull = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const LoyaltySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const query = useLoyaltySettings();
  const update = useUpdateLoyaltySettings();
  const [form, setForm] = React.useState<FormState>(initial);

  React.useEffect(() => {
    if (!query.data) return;
    setForm({
      signupRewardPoints: String(query.data.signupRewardPoints ?? 25),
      referralRewardPoints: String(query.data.referralRewardPoints ?? 100),
      statusPointsPerNpr: String(query.data.statusPointsPerNpr ?? 1),
      baseRewardPointsPerNpr: String(query.data.baseRewardPointsPerNpr ?? 0.25),
      pointsPerNprValue: String(query.data.pointsPerNprValue ?? 10),
      minimumRedeemPoints: String(query.data.minimumRedeemPoints ?? 10),
      redeemStepPoints: String(query.data.redeemStepPoints ?? 10),
      maxRedeemPercentWithoutCoupon: String(query.data.maxRedeemPercentWithoutCoupon ?? 25),
      maxRedeemPercentWithCoupon: String(query.data.maxRedeemPercentWithCoupon ?? 10),
      allowCouponWithPointRedeem: query.data.allowCouponWithPointRedeem === true,
      note: typeof query.data.metadata?.note === "string" ? query.data.metadata.note : "",
    });
  }, [query.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit: React.FormEventHandler = async (event) => {
    event.preventDefault();
    const signupRewardPoints = numberOrNull(form.signupRewardPoints);
    const referralRewardPoints = numberOrNull(form.referralRewardPoints);
    const statusPointsPerNpr = numberOrNull(form.statusPointsPerNpr);
    const baseRewardPointsPerNpr = numberOrNull(form.baseRewardPointsPerNpr);
    const pointsPerNprValue = numberOrNull(form.pointsPerNprValue);
    const minimumRedeemPoints = numberOrNull(form.minimumRedeemPoints);
    const redeemStepPoints = numberOrNull(form.redeemStepPoints);
    const maxRedeemPercentWithoutCoupon = numberOrNull(form.maxRedeemPercentWithoutCoupon);
    const maxRedeemPercentWithCoupon = numberOrNull(form.maxRedeemPercentWithCoupon);

    const values = [
      signupRewardPoints,
      referralRewardPoints,
      statusPointsPerNpr,
      baseRewardPointsPerNpr,
      pointsPerNprValue,
      minimumRedeemPoints,
      redeemStepPoints,
      maxRedeemPercentWithoutCoupon,
      maxRedeemPercentWithCoupon,
    ];
    if (values.some((value) => value == null || value < 0)) {
      return toast.error("All loyalty numbers must be zero or greater.");
    }
    if (!Number.isInteger(signupRewardPoints) || !Number.isInteger(referralRewardPoints)) {
      return toast.error("Signup and referral points must be whole numbers.");
    }
    if (!Number.isInteger(minimumRedeemPoints) || !Number.isInteger(redeemStepPoints)) {
      return toast.error("Redeem minimum and step must be whole numbers.");
    }
    const payloadValues = {
      signupRewardPoints: signupRewardPoints ?? 0,
      referralRewardPoints: referralRewardPoints ?? 0,
      statusPointsPerNpr: statusPointsPerNpr ?? 0,
      baseRewardPointsPerNpr: baseRewardPointsPerNpr ?? 0,
      pointsPerNprValue: pointsPerNprValue ?? 0,
      minimumRedeemPoints: minimumRedeemPoints ?? 0,
      redeemStepPoints: redeemStepPoints ?? 0,
      maxRedeemPercentWithoutCoupon: maxRedeemPercentWithoutCoupon ?? 0,
      maxRedeemPercentWithCoupon: maxRedeemPercentWithCoupon ?? 0,
    };

    if (payloadValues.pointsPerNprValue <= 0 || payloadValues.redeemStepPoints <= 0) {
      return toast.error("Points value and redeem step must be greater than zero.");
    }
    if (payloadValues.maxRedeemPercentWithoutCoupon > 100 || payloadValues.maxRedeemPercentWithCoupon > 100) {
      return toast.error("Redeem percentages cannot be greater than 100.");
    }

    await update.mutateAsync({
      ...payloadValues,
      allowCouponWithPointRedeem: form.allowCouponWithPointRedeem,
      metadata: form.note.trim()
        ? { ...(query.data?.metadata ?? {}), note: form.note.trim() }
        : query.data?.metadata ?? null,
    });
  };

  return (
    <ModernFormLayout
      title="Loyalty Settings"
      subtitle="Control earning rates, point value, and redemption limits from dashboard."
      onBack={() => navigate("/dashboard/loyalty")}
    >
      <form onSubmit={submit} className="space-y-6">
        <FormSection title="Earning rules" description="Status points move customers through phases. Reward points are spendable wallet points.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Signup reward points">
              <input type="number" min="0" step="1" value={form.signupRewardPoints} onChange={(e) => set("signupRewardPoints", e.target.value)} className={input} />
            </FormField>
            <FormField label="Referral reward points">
              <input type="number" min="0" step="1" value={form.referralRewardPoints} onChange={(e) => set("referralRewardPoints", e.target.value)} className={input} />
            </FormField>
            <FormField label="Status points per NPR" hint="Used for yearly phase and leaderboard progress.">
              <input type="number" min="0" step="0.0001" value={form.statusPointsPerNpr} onChange={(e) => set("statusPointsPerNpr", e.target.value)} className={input} />
            </FormField>
            <FormField label="Base reward points per NPR" hint="Example: 0.25 means Rs. 1000 earns 250 reward points before tier multiplier.">
              <input type="number" min="0" step="0.0001" value={form.baseRewardPointsPerNpr} onChange={(e) => set("baseRewardPointsPerNpr", e.target.value)} className={input} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Redemption controls" description="Limit how much of an order can be paid by reward wallet points.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Points per NPR value" hint="Default: 10 points = Rs. 1">
              <input type="number" min="0.0001" step="0.0001" value={form.pointsPerNprValue} onChange={(e) => set("pointsPerNprValue", e.target.value)} className={input} />
            </FormField>
            <FormField label="Minimum redeem points">
              <input type="number" min="0" step="1" value={form.minimumRedeemPoints} onChange={(e) => set("minimumRedeemPoints", e.target.value)} className={input} />
            </FormField>
            <FormField label="Redeem step points">
              <input type="number" min="1" step="1" value={form.redeemStepPoints} onChange={(e) => set("redeemStepPoints", e.target.value)} className={input} />
            </FormField>
            <FormField label="Max redeem percent without coupon">
              <input type="number" min="0" max="100" step="0.01" value={form.maxRedeemPercentWithoutCoupon} onChange={(e) => set("maxRedeemPercentWithoutCoupon", e.target.value)} className={input} />
            </FormField>
            <FormField label="Max redeem percent with coupon">
              <input type="number" min="0" max="100" step="0.01" value={form.maxRedeemPercentWithCoupon} onChange={(e) => set("maxRedeemPercentWithCoupon", e.target.value)} className={input} />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allowCouponWithPointRedeem} onChange={(e) => set("allowCouponWithPointRedeem", e.target.checked)} />
              Allow coupon and point redemption together
            </label>
          </div>
        </FormSection>

        <FormSection title="Admin note">
          <FormField label="Change note">
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} className="min-h-24 w-full rounded-xl border border-[#d2d2d7] p-3 text-sm" />
          </FormField>
        </FormSection>

        <FormActions
          submitLabel={update.isPending ? "Saving..." : "Save Settings"}
          submitIcon={update.isPending ? <Loader2 className="animate-spin" size={14} /> : undefined}
          isSubmitting={update.isPending || query.isLoading}
          onCancel={() => navigate("/dashboard/loyalty")}
        />
      </form>
    </ModernFormLayout>
  );
};
