import React from "react";
import { Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFulfillLoyaltyReward, useLoyaltyRewards } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { customerName, date, text } from "./loyaltyUtils";

export const LoyaltyRewardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const query = useLoyaltyRewards({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const fulfill = useFulfillLoyaltyReward();
  const rows = query.data?.data ?? [];
  const columns = [
    { key: "customer", label: "Customer", render: (row: typeof rows[number]) => <div><p className="font-medium text-[#1d1d1f]">{customerName(row.customer)}</p><p className="text-xs text-[#86868b]">{text(row.customer?.email, row.customerId)}</p></div> },
    { key: "reward", label: "Reward", render: (row: typeof rows[number]) => <div><p className="font-medium">{row.title}</p><p className="text-xs text-[#86868b]">{row.rewardType} · {text(row.tierCode)}</p></div> },
    { key: "status", label: "Status", render: (row: typeof rows[number]) => <StatusBadge status={row.rewardStatus} /> },
    { key: "expires", label: "Expires", render: (row: typeof rows[number]) => date(row.expiresAt) },
    { key: "action", label: "Action", render: (row: typeof rows[number]) => row.rewardStatus === "FULFILLED" ? <span className="text-xs text-[#86868b]">{date(row.fulfilledAt)}</span> : <button type="button" disabled={fulfill.isPending} onClick={(event) => { event.stopPropagation(); void fulfill.mutateAsync({ id: row.id, dto: { rewardStatus: "FULFILLED", fulfilledAt: new Date().toISOString() } }); }} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Mark fulfilled</button> },
  ];
  return <PageLayout title="Loyalty Rewards" subtitle="Assign, track, and fulfill digital and physical loyalty rewards." onBack={() => navigate("/dashboard/loyalty")} searchValue={state.search} onSearchChange={(search) => setState((prev) => ({ ...prev, page: 1, search }))} searchPlaceholder="Search rewards or customers..."><div className="rounded-2xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 text-sm text-[#6e6e73]"><Gift size={16} />{query.data?.total ?? rows.length} rewards</div><DataTableV2 columns={columns} data={rows} emptyMessage={query.isLoading ? "Loading rewards..." : "No rewards found."} showPagination currentPage={state.page} totalPages={query.data?.totalPages ?? 1} onPageChange={(page) => setState((prev) => ({ ...prev, page }))} /></div></PageLayout>;
};
