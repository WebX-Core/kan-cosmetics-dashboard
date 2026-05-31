import React from "react";
import { useNavigate } from "react-router-dom";
import { Tag, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { commerceApi } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

type CouponRow = Readonly<{
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: string;
  usageLimit: number;
  usageCount: number;
  status: "Active" | "Expired" | "Scheduled" | "Inactive";
  validFrom: string;
  validUntil: string;
}>;

const readString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : fallback;

const toStatus = (value: unknown): CouponRow["status"] => {
  if (typeof value !== "string") return "Inactive";
  const n = value.toLowerCase();
  if (n === "active") return "Active";
  if (n === "expired") return "Expired";
  if (n === "scheduled") return "Scheduled";
  return "Inactive";
};

const toCouponRow = (record: unknown): CouponRow => {
  const item = (typeof record === "object" && record !== null ? record : {}) as Record<string, unknown>;
  return {
    id: readString(item.id, crypto.randomUUID()),
    code: readString(item.code, ""),
    description: readString(item.description, "—"),
    discountType: readString(item.discountType, "Fixed"),
    discountValue: readString(item.discountValue, "0"),
    usageLimit: readNumber(item.usageLimit),
    usageCount: readNumber(item.usageCount),
    status: toStatus(item.status),
    validFrom: readString(item.validFrom, "—"),
    validUntil: readString(item.validUntil, "—"),
  };
};

export const CouponsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = React.useState("all");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const couponsQuery = commerceApi.coupons.crud.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });
  const deleteCoupon = commerceApi.coupons.crud.hooks.useSoftDelete();

  const coupons = React.useMemo(
    () => (couponsQuery.data?.data ?? []).map(toCouponRow),
    [couponsQuery.data?.data]
  );
  const totalPages = couponsQuery.data?.totalPages ?? 1;
  const totalCoupons = couponsQuery.data?.total ?? coupons.length;

  const tabFiltered = React.useMemo(() => {
    if (activeTab === "all") return coupons;
    return coupons.filter((c) => c.status.toLowerCase() === activeTab);
  }, [coupons, activeTab]);

  const stats = React.useMemo(() => ({
    total: totalCoupons,
    active: coupons.filter((c) => c.status === "Active").length,
    expired: coupons.filter((c) => c.status === "Expired").length,
    scheduled: coupons.filter((c) => c.status === "Scheduled").length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usageCount, 0),
  }), [coupons, totalCoupons]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction("Delete this coupon?");
    if (!confirmed) return;
    await deleteCoupon.mutateAsync(id);
    toast.success("Coupon deleted.");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setState((p) => ({ ...p, page: 1 }));
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "scheduled", label: "Scheduled" },
    { key: "expired", label: "Expired" },
  ];

  const columns = [
    { key: "code", label: "Code", render: (row: CouponRow) => (
      <span className="font-mono font-semibold text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded">{row.code}</span>
    )},
    { key: "description", label: "Description", render: (row: CouponRow) => (
      <span className="text-gray-600 line-clamp-1">{row.description}</span>
    )},
    { key: "discount", label: "Discount", render: (row: CouponRow) => (
      <span className="text-gray-700">{row.discountType}: {row.discountValue}</span>
    )},
    { key: "usage", label: "Usage", render: (row: CouponRow) => (
      <span className="font-medium text-gray-900">{row.usageCount}/{row.usageLimit}</span>
    )},
    { key: "status", label: "Status", render: (row: CouponRow) => <StatusBadge status={row.status} /> },
    { key: "validity", label: "Validity", render: (row: CouponRow) => (
      <span className="text-xs text-gray-500">{row.validFrom} – {row.validUntil}</span>
    )},
  ];

  return (
    <PageLayout
      title="Coupons"
      subtitle="Manage discount codes, activation windows, and usage tracking."
      onNew={() => navigate("/dashboard/coupons/create")}
      newButtonLabel="New Coupon"
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search coupons..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCardV2 label="Total Coupons" value={stats.total} icon={Tag} colorVariant="blue" />
        <StatCardV2 label="Active" value={stats.active} icon={CheckCircle} colorVariant="emerald" />
        <StatCardV2 label="Scheduled" value={stats.scheduled} icon={Clock} colorVariant="amber" />
        <StatCardV2 label="Expired" value={stats.expired} icon={XCircle} colorVariant="red" />
        <StatCardV2 label="Total Usage" value={stats.totalUsage} icon={TrendingUp} colorVariant="blue" />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        columns={columns}
        data={tabFiltered}
        searchValue={state.search}
        onEdit={(row) => navigate(`/dashboard/coupons/${row.id}`)}
        onDelete={(row) => void handleDelete(row.id)}
        emptyMessage={couponsQuery.isLoading ? "Loading coupons..." : "No coupons found."}
        showPagination={true}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />
    </PageLayout>
  );
};
