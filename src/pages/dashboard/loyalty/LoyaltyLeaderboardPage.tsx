import React from "react";
import { useNavigate } from "react-router-dom";
import { Award, Coins, Trophy, Users } from "lucide-react";
import { useLoyaltyCustomers } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { RankBadge, TierBadge, customerName, date, number, text } from "./loyaltyUi";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";

export const LoyaltyLeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const query = useLoyaltyCustomers({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const rows = query.data?.data ?? [];
  const columns = [
    { key: "rank", label: "Rank", render: (row: typeof rows[number]) => <RankBadge rank={number(row.rank)} /> },
    { key: "customer", label: "Customer", render: (row: typeof rows[number]) => <div><p className="font-medium text-gray-900">{customerName(row.customer)}</p><p className="text-xs text-gray-500">{text(row.customer?.email)}</p></div> },
    { key: "currentTierCode", label: "Tier", render: (row: typeof rows[number]) => <TierBadge code={row.currentTierCode} /> },
    { key: "yearlyPoints", label: "Yearly Points", render: (row: typeof rows[number]) => <span className="font-semibold">{number(row.yearlyPoints).toLocaleString()}</span> },
    { key: "lifetimePoints", label: "Lifetime", render: (row: typeof rows[number]) => number(row.lifetimePoints).toLocaleString() },
    { key: "referralCode", label: "Referral Code", render: (row: typeof rows[number]) => <span className="font-mono text-xs">{text(row.referralCode)}</span> },
    { key: "lastTierEvaluatedAt", label: "Evaluated", render: (row: typeof rows[number]) => date(row.lastTierEvaluatedAt) },
  ];
  const pageYearly = rows.reduce((sum, row) => sum + number(row.yearlyPoints), 0);
  return <PageLayout title="Loyalty Leaderboard" subtitle="Yearly customer ranking, points, tiers, and referral codes." actions={<ExportMenu basePath="/customer-loyalty/admin/customers" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="loyalty-customers"/>} searchValue={state.search} onSearchChange={(search) => setState((prev) => ({ ...prev, page: 1, search }))} searchPlaceholder="Search customers...">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCardV2 label="Loyalty Members" value={query.data?.total ?? rows.length} icon={Users} colorVariant="blue" /><StatCardV2 label="Page Yearly Points" value={pageYearly.toLocaleString()} icon={Coins} colorVariant="emerald" /><StatCardV2 label="Top Rank" value={rows[0]?.rank ? `#${rows[0].rank}` : "—"} icon={Trophy} colorVariant="amber" /><StatCardV2 label="Tiers Represented" value={new Set(rows.map((row) => row.currentTierCode)).size} icon={Award} colorVariant="cyan" /></div>
    <DataTableV2 columns={columns} data={rows} searchValue={state.search} onRowClick={(row) => navigate(`/dashboard/loyalty/customers/${row.customerId}`)} emptyMessage={query.isLoading ? "Loading leaderboard..." : "No loyalty customers found."} showPagination currentPage={state.page} totalPages={query.data?.totalPages ?? 1} onPageChange={(page) => setState((prev) => ({ ...prev, page }))} />
  </PageLayout>;
};
