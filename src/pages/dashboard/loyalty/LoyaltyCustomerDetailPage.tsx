import React from "react";
import { Coins, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdjustLoyaltyPoints, useLoyaltyCustomer } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { FormField, FormSection } from "@/shared/components/forms/ModernFormLayout";
import { customerName, number, text } from "./loyaltyUtils";

const input = "h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
export const LoyaltyCustomerDetailPage: React.FC = () => {
  const { customerId } = useParams(); const navigate = useNavigate(); const query = useLoyaltyCustomer(customerId); const adjust = useAdjustLoyaltyPoints();
  const [points, setPoints] = React.useState(""); const [reason, setReason] = React.useState(""); const [sourceReferenceId, setSourceReferenceId] = React.useState("");
  const raw = query.data as Record<string, unknown> | undefined;
  const profile = (raw?.profile as Record<string, unknown> | undefined) ?? (raw?.data as Record<string, unknown> | undefined) ?? raw ?? {};
  const customer = (profile.customer as Record<string, unknown> | undefined) ?? {};
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const amount = Number(points); if (!customerId || !Number.isInteger(amount) || amount === 0 || !reason.trim()) return; await adjust.mutateAsync({ customerId, dto: { points: amount, sourceType: "MANUAL_ADJUSTMENT", reason: reason.trim(), sourceReferenceId: sourceReferenceId.trim() || null } }); setPoints(""); setReason(""); setSourceReferenceId(""); await query.refetch(); };
  return <PageLayout title={customerName(customer)} subtitle={text(customer.email, customerId)} onBack={() => navigate("/dashboard/loyalty/leaderboard")}>
    <div className="grid gap-4 sm:grid-cols-3"><StatCardV2 label="Available Points" value={number(profile.availablePoints).toLocaleString()} icon={Coins} colorVariant="emerald"/><StatCardV2 label="Yearly Points" value={number(profile.yearlyPoints).toLocaleString()} icon={Coins} colorVariant="blue"/><StatCardV2 label="Lifetime Points" value={number(profile.lifetimePoints).toLocaleString()} icon={UserRound} colorVariant="cyan"/></div>
    <form onSubmit={submit}><FormSection title="Manual Point Adjustment"><p className="text-sm text-[#86868b]">Use a positive value to credit points and a negative value to deduct them. Every adjustment is recorded in the loyalty ledger.</p><div className="grid gap-4 md:grid-cols-2"><FormField label="Points" required><input type="number" step="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 100 or -50" className={input}/></FormField><FormField label="Reference"><input value={sourceReferenceId} onChange={(e) => setSourceReferenceId(e.target.value)} placeholder="Optional ticket or reference" className={input}/></FormField></div><FormField label="Reason" required><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for this adjustment" className={`${input} h-auto py-3`}/></FormField><button type="submit" disabled={adjust.isPending || !points || !reason.trim() || Number(points) === 0} className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{adjust.isPending ? "Saving..." : "Apply adjustment"}</button></FormSection></form>
  </PageLayout>;
};
