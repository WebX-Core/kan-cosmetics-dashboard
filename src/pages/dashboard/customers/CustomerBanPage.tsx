import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { commerceApi, useCustomerBanLift } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const formatDateTime = (value: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type BanRow = Readonly<{
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  bannedUntil: string;
  isActive: boolean;
  createdAt: string;
}>;

const getCustomerName = (customer: Record<string, unknown>): string => {
  const firstName = text(customer.firstname);
  const lastName = text(customer.lastname);
  const fullName = text(customer.fullname ?? customer.name);
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(" ").trim() || fullName || "—";
};

const toRows = (payload: unknown): ReadonlyArray<BanRow> => {
  const items = Array.isArray(payload)
    ? payload
    : ((payload as { data?: unknown[] } | undefined)?.data ?? []);

  return items
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const customer = (typeof item.customer === "object" && item.customer !== null ? item.customer : {}) as Record<string, unknown>;
      const bannedUntil = text(item.bannedUntil ?? item.expiresAt);
      const isExpired = bannedUntil ? new Date(bannedUntil).getTime() < Date.now() : false;

      return {
        id: text(item.id, crypto.randomUUID()),
        customerId: text(item.customerId ?? customer.id),
        customerName: getCustomerName(customer),
        customerEmail: text(item.customerEmail ?? customer.email, "—"),
        reason: text(item.reason, "No reason provided"),
        bannedUntil,
        isActive: !isExpired && item.isActive !== false,
        createdAt: text(item.createdAt),
      };
    });
};

type CustomerBanActionsProps = Readonly<{
  onManage: () => void;
  onUnban: () => void;
}>;

const CustomerBanActions: React.FC<CustomerBanActionsProps> = ({ onManage, onUnban }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal size={15} />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onManage();
        }}
      >
        View details
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-[#b42318] focus:text-[#b42318]"
        onClick={(event) => {
          event.stopPropagation();
          onUnban();
        }}
      >
        Unban customer
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const CustomerBanPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("all");
  const [pendingUnban, setPendingUnban] = React.useState<BanRow | null>(null);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const liftMutation = useCustomerBanLift();

  const query = commerceApi.customerBans.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const filtered = React.useMemo(() => {
    if (activeTab === "active") return rows.filter((row) => row.isActive);
    if (activeTab === "expired") return rows.filter((row) => !row.isActive);
    return rows;
  }, [rows, activeTab]);

  const stats = React.useMemo(
    () => ({
      total,
      active: rows.filter((row) => row.isActive).length,
      expired: rows.filter((row) => !row.isActive).length,
      permanent: rows.filter((row) => !row.bannedUntil).length,
    }),
    [rows, total],
  );

  const tabs = [
    { key: "all", label: "All Bans", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "expired", label: "Expired", count: stats.expired },
  ];

  const handleOpenBan = (row: BanRow) => {
    setPendingUnban(row);
  };

  const handleConfirmUnban = async () => {
    if (!pendingUnban) return;
    const ids = [pendingUnban.customerId || pendingUnban.id].filter(Boolean);
    if (ids.length === 0) return;

    try {
      await liftMutation.mutateAsync({ ids });
    } finally {
      setPendingUnban(null);
    }
  };

  const columns = [
    {
      key: "customer",
      label: "Customer",
      sortValue: (row: BanRow) => row.customerName,
      render: (row: BanRow) => (
        <div>
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-xs text-gray-400">{row.customerEmail}</div>
        </div>
      ),
    },
    { key: "reason", label: "Reason", render: (row: BanRow) => <span className="line-clamp-1 text-gray-600">{row.reason}</span> },
    {
      key: "status",
      label: "Status",
      render: (row: BanRow) => <StatusBadge status={row.isActive ? "inactive" : "expired"} label={row.isActive ? "Banned" : "Expired"} />,
    },
    {
      key: "bannedUntil",
      label: "Banned Until",
      sortValue: (row: BanRow) => row.bannedUntil || "",
      render: (row: BanRow) => <span className="text-xs text-gray-500">{row.bannedUntil ? formatDateTime(row.bannedUntil) : "Permanent"}</span>,
    },
    { key: "createdAt", label: "Banned At", sortValue: (row: BanRow) => row.createdAt || "", render: (row: BanRow) => <span className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</span> },
  ];

  return (
    <PageLayout
      title="Customer Bans"
      subtitle="View and manage banned customer accounts."
      onNew={() => navigate("/dashboard/customers/bans/create")}
      newButtonLabel="Ban Customer"
      searchValue={state.search}
      onSearchChange={(value) => setState((prev) => ({ ...prev, page: 1, search: value }))}
      searchPlaceholder="Search banned customers..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2 label="Total Bans" value={stats.total} icon={ShieldOff} colorVariant="red" />
        <StatCardV2 label="Active Bans" value={stats.active} icon={AlertTriangle} colorVariant="rose" />
        <StatCardV2 label="Expired" value={stats.expired} icon={ShieldCheck} colorVariant="emerald" />
        <StatCardV2 label="Permanent" value={stats.permanent} icon={Clock} colorVariant="amber" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setState((prev) => ({ ...prev, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        emptyMessage={query.isLoading ? "Loading bans..." : "No customer bans found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
        pageSize={state.limit}
        onPageSizeChange={(limit) => setState((prev) => ({ ...prev, page: 1, limit }))}
        rowActions={(row) => (
          <CustomerBanActions
            onManage={() => navigate(`/dashboard/customers/bans/${row.id}/edit`)}
            onUnban={() => handleOpenBan(row)}
          />
        )}
      />

      <AlertDialog open={pendingUnban !== null} onOpenChange={(open) => !open && setPendingUnban(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unban customer?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUnban
                ? `${pendingUnban.customerName} will be removed from the ban list and regain access.`
                : "This customer will be removed from the ban list and regain access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={() => setPendingUnban(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirmUnban()}
              disabled={liftMutation.isPending}
            >
              {liftMutation.isPending ? "Unbanning..." : "Unban customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
