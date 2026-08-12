import React from "react";
import { useNavigate } from "react-router-dom";
import { Award, ChevronDown, RotateCcw, Settings2, Trophy, Users } from "lucide-react";
import { useLoyaltyCustomers, useLoyaltyTiers, useResetYearlyCycle } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { RankBadge, TierBadge, customerName, number, text } from "./loyaltyUi";

export const LoyaltyOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const customers = useLoyaltyCustomers({ page: 1, limit: 5 });
  const tiers = useLoyaltyTiers();
  const reset = useResetYearlyCycle();
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [reason, setReason] = React.useState("");
  const top = customers.data?.data ?? [];

  const performReset = async () => {
    if (confirmation !== "RESET YEARLY POINTS") return;
    await reset.mutateAsync({ resetAt: new Date().toISOString(), reason: reason.trim() || "Manual dashboard yearly reset" });
    setOpen(false);
    setConfirmation("");
    setReason("");
  };

  const columns = [
    { key: "rank", label: "Rank", render: (row: typeof top[number]) => <RankBadge rank={row.rank} /> },
    { key: "customer", label: "Customer", render: (row: typeof top[number]) => <div><p className="font-medium text-[#1d1d1f]">{customerName(row.customer)}</p><p className="text-xs text-[#86868b]">{text(row.customer?.email)}</p></div> },
    { key: "tier", label: "Tier", render: (row: typeof top[number]) => <TierBadge code={row.currentTierCode} /> },
    { key: "yearlyPoints", label: "Yearly Points", render: (row: typeof top[number]) => <span className="font-semibold text-[#1d1d1f]">{row.yearlyPoints.toLocaleString()}</span> },
    { key: "lifetimePoints", label: "Lifetime Points", render: (row: typeof top[number]) => <span className="text-[#6e6e73]">{row.lifetimePoints.toLocaleString()}</span> },
  ];

  return (
    <PageLayout
      title="Loyalty"
      subtitle="Leaderboard, yearly points, dynamic tiers, and yearly-cycle administration."
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="h-[34px] rounded-full bg-[var(--primary)] px-[17px] text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]">
                <Settings2 size={13} />
                Manage Loyalty
                <ChevronDown size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Loyalty management</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/loyalty/leaderboard")}>
                <Trophy className="mr-2 h-4 w-4 text-amber-600" />
                <div><p>Leaderboard</p><p className="text-xs text-[#86868b]">Ranks and yearly-point analytics</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/loyalty/tiers")}>
                <Award className="mr-2 h-4 w-4 text-violet-600" />
                <div><p>Loyalty Tiers</p><p className="text-xs text-[#86868b]">Thresholds, benefits, and automatic rewards</p></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-[34px] items-center gap-2 rounded-full border border-red-200 bg-white px-[15px] text-[13px] font-medium text-red-600 transition hover:bg-red-50">
            <RotateCcw size={13} />
            Reset Cycle
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCardV2 label="Loyalty Members" value={customers.data?.total ?? top.length} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Active Tiers" value={(tiers.data?.data ?? []).filter((tier) => tier.isActive).length} icon={Award} colorVariant="cyan" />
        <StatCardV2 label="Top Yearly Score" value={number(top[0]?.yearlyPoints).toLocaleString()} icon={Trophy} colorVariant="emerald" />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1d1d1f]">Top Customers</h2>
            <p className="mt-1 text-[13px] text-[#86868b]">Highest yearly-point earners in the current loyalty cycle.</p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/loyalty/leaderboard")} className="inline-flex h-[34px] items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-[15px] text-[13px] font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7]">
            <Trophy size={13} />
            View Leaderboard
          </button>
        </div>
        <DataTableV2 columns={columns} data={top} emptyMessage={customers.isLoading ? "Loading top customers..." : "No loyalty customers yet."} />
      </section>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader><AlertDialogTitle>Reset yearly loyalty cycle?</AlertDialogTitle><AlertDialogDescription>This resets yearly points and returns customers to the base tier. Lifetime points and historical records are preserved.</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-4"><label className="block text-sm font-medium">Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border p-3" /></label><label className="block text-sm font-medium">Type RESET YEARLY POINTS<input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" /></label></div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={confirmation !== "RESET YEARLY POINTS" || reset.isPending} className="bg-red-600 hover:bg-red-700" onClick={(event) => { event.preventDefault(); void performReset(); }}>Reset cycle</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
