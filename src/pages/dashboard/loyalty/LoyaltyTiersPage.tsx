import React from "react";
import { useNavigate } from "react-router-dom";
import { Award, Gift, Layers, ToggleRight } from "lucide-react";
import { useDeleteLoyaltyTier, useLoyaltyTiers } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { TierBadge, number } from "./loyaltyUi";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";

export const LoyaltyTiersPage: React.FC = () => {
  const navigate = useNavigate(); const query = useLoyaltyTiers(); const remove = useDeleteLoyaltyTier(); const rows = query.data?.data ?? [];
  const columns = [
    { key: "sortOrder", label: "Order", render: (row: typeof rows[number]) => number(row.sortOrder) },
    { key: "name", label: "Tier", render: (row: typeof rows[number]) => <div><p className="font-semibold">{row.name}</p><div className="mt-1"><TierBadge code={row.code} /></div></div> },
    { key: "range", label: "Yearly Points", render: (row: typeof rows[number]) => `${row.minYearlyPoints.toLocaleString()} – ${row.maxYearlyPoints == null ? "∞" : row.maxYearlyPoints.toLocaleString()}` },
    { key: "benefits", label: "Benefits", render: (row: typeof rows[number]) => <div className="text-xs text-gray-600">{row.benefits?.freeDelivery ? "Free delivery · " : ""}{number(row.benefits?.discountPercent ?? row.benefits?.percentOff)}% off</div> },
    { key: "reward", label: "Reward", render: (row: typeof rows[number]) => row.benefits?.reward?.title ?? "Fallback tier reward" },
    { key: "isActive", label: "Status", render: (row: typeof rows[number]) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{row.isActive ? "Active" : "Inactive"}</span> },
  ];
  return <PageLayout title="Loyalty Tiers" subtitle="Configure dynamic levels, thresholds, benefits, and tier rewards." onNew={() => navigate("/dashboard/loyalty/tiers/create")} newButtonLabel="New Tier" onBack={() => navigate("/dashboard/loyalty")} actions={<ExportMenu basePath="/customer-loyalty/admin/tiers" filename="loyalty-tiers"/>}>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCardV2 label="Total Tiers" value={rows.length} icon={Layers} colorVariant="blue" /><StatCardV2 label="Active" value={rows.filter((row) => row.isActive).length} icon={ToggleRight} colorVariant="emerald" /><StatCardV2 label="Configured Rewards" value={rows.filter((row) => row.benefits?.reward).length} icon={Gift} colorVariant="amber" /><StatCardV2 label="Highest Threshold" value={Math.max(0, ...rows.map((row) => row.minYearlyPoints)).toLocaleString()} icon={Award} colorVariant="cyan" /></div>
    <DataTableV2 columns={columns} data={rows} onEdit={(row) => navigate(`/dashboard/loyalty/tiers/${row.id}/edit`)} onDelete={(row) => { if (window.confirm(`Delete ${row.name}?`)) void remove.mutateAsync(row.id); }} emptyMessage={query.isLoading ? "Loading tiers..." : "No configured tiers. Backend fallback tiers remain active."} />
  </PageLayout>;
};
