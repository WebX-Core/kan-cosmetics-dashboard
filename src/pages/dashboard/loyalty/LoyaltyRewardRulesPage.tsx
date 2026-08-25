import React from "react";
import { Gift, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDeleteLoyaltyRewardRule, useLoyaltyRewardRules } from "@/features/loyalty";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (value: unknown, fallback = "-") =>
  typeof value === "string" && value.trim() ? value : fallback;

const money = (value: unknown) =>
  value == null || value === "" ? "-" : `Rs ${Number(value).toLocaleString()}`;

export const LoyaltyRewardRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const query = useLoyaltyRewardRules({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const remove = useDeleteLoyaltyRewardRule();
  const rows = query.data?.data ?? [];

  const columns = [
    {
      key: "rule",
      label: "Rule",
      render: (row: typeof rows[number]) => (
        <div>
          <p className="font-medium text-[#1d1d1f]">{row.title}</p>
          <p className="text-xs text-[#86868b]">{row.code}</p>
        </div>
      ),
    },
    {
      key: "tier",
      label: "Tier",
      render: (row: typeof rows[number]) => (
        <div>
          <p className="font-medium text-[#1d1d1f]">{text(row.tier?.name, text(row.tierCode))}</p>
          <p className="text-xs text-[#86868b]">{text(row.triggerType, "Any trigger")}</p>
        </div>
      ),
    },
    {
      key: "benefit",
      label: "Benefit",
      render: (row: typeof rows[number]) => {
        const parts = [
          row.rewardMultiplier ? `${row.rewardMultiplier}x reward` : "",
          row.birthdayRewardMultiplier ? `${row.birthdayRewardMultiplier}x birthday` : "",
          row.discountValue ? `${money(row.discountValue)} ${text(row.discountType, "discount")}` : "",
          row.freeShippingCount ? `${row.freeShippingCount} free shipping` : "",
          row.physicalGiftTitle || row.freeProductTitle || "",
        ].filter(Boolean);
        return <span className="text-sm text-[#424245]">{parts.join(" · ") || "-"}</span>;
      },
    },
    {
      key: "packing",
      label: "Packing",
      render: (row: typeof rows[number]) =>
        row.isPhysical || row.physicalGiftTitle || row.freeProductTitle ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <Gift size={12} />
            Physical
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            <Sparkles size={12} />
            Digital
          </span>
        ),
    },
    { key: "status", label: "Status", render: (row: typeof rows[number]) => <StatusBadge status={row.isActive ? "Active" : "Inactive"} /> },
  ];

  return (
    <PageLayout
      title="Loyalty Reward Rules"
      subtitle="Dynamic order rewards, point multipliers, coupons, birthday benefits, and packing gifts."
      onBack={() => navigate("/dashboard/loyalty")}
      searchValue={state.search}
      onSearchChange={(search) => setState((prev) => ({ ...prev, page: 1, search }))}
      searchPlaceholder="Search reward rules..."
      actions={
        <button
          type="button"
          onClick={() => navigate("/dashboard/loyalty/reward-rules/create")}
          className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[var(--primary)] px-[15px] text-[13px] font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          <Plus size={14} />
          New Rule
        </button>
      }
    >
      <DataTableV2
        columns={columns}
        data={rows}
        onEdit={(row) => navigate(`/dashboard/loyalty/reward-rules/${row.id}/edit`)}
        onDelete={(row) => {
          if (window.confirm(`Delete reward rule ${row.title}?`)) void remove.mutateAsync(row.id);
        }}
        emptyMessage={query.isLoading ? "Loading reward rules..." : "No reward rules configured."}
        showPagination
        currentPage={state.page}
        totalPages={query.data?.totalPages ?? 1}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
      />
    </PageLayout>
  );
};
