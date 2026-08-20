import React from "react";
import { Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyaltyPoints, type LoyaltyPointSource } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { customerName, date, number, text } from "./loyaltyUi";

const sources: Array<LoyaltyPointSource | ""> = ["", "SIGNUP", "ORDER_COMPLETED", "ORDER_SETTLED", "REFERRAL", "ADMIN_BONUS", "MANUAL_ADJUSTMENT", "POINT_REDEMPTION", "YEARLY_RESET"];
export const LoyaltyPointsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [sourceType, setSourceType] = React.useState<LoyaltyPointSource | "">("");
  const query = useLoyaltyPoints({ page: state.page, limit: state.limit, search: debouncedSearch || undefined, sourceType: sourceType || undefined });
  const rows = query.data?.data ?? [];
  const columns = [
    { key: "customer", label: "Customer", render: (row: typeof rows[number]) => <div><p className="font-medium">{customerName(row.customer)}</p><p className="text-xs text-gray-500">{text(row.customer?.email, row.customerId)}</p></div> },
    { key: "points", label: "Status Points", render: (row: typeof rows[number]) => <span className={`font-semibold ${number(row.points) < 0 ? "text-red-600" : "text-emerald-700"}`}>{number(row.points) > 0 ? "+" : ""}{number(row.points).toLocaleString()}</span> },
    { key: "rewardPoints", label: "Wallet Points", render: (row: typeof rows[number]) => <span className={`font-semibold ${number(row.rewardPoints) < 0 ? "text-red-600" : "text-emerald-700"}`}>{number(row.rewardPoints) > 0 ? "+" : ""}{number(row.rewardPoints).toLocaleString()}</span> },
    { key: "sourceType", label: "Source", render: (row: typeof rows[number]) => <span className="text-xs font-medium">{row.sourceType.replaceAll("_", " ")}</span> },
    { key: "reason", label: "Reason", render: (row: typeof rows[number]) => text(row.reason) },
    { key: "reference", label: "Reference", render: (row: typeof rows[number]) => <span className="font-mono text-xs">{text(row.sourceReferenceId)}</span> },
    { key: "cycle", label: "Cycle", render: (row: typeof rows[number]) => <span className="text-xs">{date(row.cycleStartAt)} – {date(row.cycleEndAt)}</span> },
    { key: "createdAt", label: "Created", render: (row: typeof rows[number]) => date(row.createdAt) },
  ];
  return <PageLayout title="Loyalty Point History" subtitle="Audit all point earnings, adjustments, referrals, and yearly resets." onBack={() => navigate("/dashboard/loyalty")} searchValue={state.search} onSearchChange={(search) => setState((prev) => ({ ...prev, page: 1, search }))} actions={<select value={sourceType} onChange={(e) => { setSourceType(e.target.value as LoyaltyPointSource | ""); setState((prev) => ({ ...prev, page: 1 })); }} className="h-[34px] rounded-full border border-[#d2d2d7] bg-white px-3 text-xs">{sources.map((source) => <option key={source || "ALL"} value={source}>{source ? source.replaceAll("_", " ") : "All sources"}</option>)}</select>}>
    <div className="rounded-2xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 text-sm text-gray-600"><Coins size={16} />{query.data?.total ?? rows.length} ledger entries</div><DataTableV2 columns={columns} data={rows} emptyMessage={query.isLoading ? "Loading point history..." : "No point entries found."} showPagination currentPage={state.page} totalPages={query.data?.totalPages ?? 1} onPageChange={(page) => setState((prev) => ({ ...prev, page }))} /></div>
  </PageLayout>;
};
