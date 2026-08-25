import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Users, UserCheck, ShieldOff, Eye, MoreHorizontal } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useCustomers } from "@/features/commerce";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const text = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
};

type CustomerRow = Readonly<{
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  isVerified: boolean;
  profilePicture: string;
  createdAt: string;
  profileCompletion: number;
}>;

type CompletionItem = Readonly<{
  filled: boolean;
  weight: number;
}>;

const computeProfileCompletion = (row: Pick<CustomerRow, "name" | "email" | "phone" | "gender" | "address" | "profilePicture">): number => {
  const items: ReadonlyArray<CompletionItem> = [
    { filled: row.name.trim().length > 0 && row.name !== "—", weight: 20 },
    { filled: row.email.trim().length > 0 && row.email !== "—", weight: 20 },
    { filled: row.phone.trim().length > 0 && row.phone !== "—", weight: 15 },
    { filled: row.gender.trim().length > 0 && row.gender !== "—", weight: 10 },
    { filled: row.address.trim().length > 0 && row.address !== "—", weight: 20 },
    { filled: row.profilePicture.trim().length > 0, weight: 15 },
  ];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items.reduce((sum, item) => sum + (item.filled ? item.weight : 0), 0);
  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
};

const toRow = (entry: unknown): CustomerRow => {
  const r = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
  const firstname = text(r.firstname, "");
  const middlename = text(r.middlename ?? "", "");
  const lastname = text(r.lastname, "");
  const name = [firstname, middlename, lastname].filter(Boolean).join(" ") || "—";
  return {
    id: text(r.id, crypto.randomUUID()),
    name,
    email: text(r.email, "—"),
    phone: text(r.phone, "—"),
    gender: text(r.gender, "—"),
    address: text(r.address, "—"),
    isVerified: Boolean(r.isVerified),
    profilePicture: text(r.profilePicture ?? "", ""),
    createdAt: text(r.createdAt, ""),
    profileCompletion: 0,
  };
};

const toRows = (payload: unknown): ReadonlyArray<CustomerRow> => {
  const envelope = payload as { customers?: unknown[]; data?: unknown[] } | undefined;
  const items = Array.isArray(payload)
    ? payload
    : (envelope?.customers ?? envelope?.data ?? []);
  return (items as unknown[]).map((item) => {
    const row = toRow(item);
    return {
      ...row,
      profileCompletion: computeProfileCompletion(row),
    };
  });
};

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });

  const query = useCustomers({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => toRows(query.data), [query.data]);
  const totalPages = (query.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total = (query.data as { total?: number } | undefined)?.total ?? rows.length;

  const stats = React.useMemo(() => ({
    total,
    verified: rows.filter((r) => r.isVerified).length,
    unverified: rows.filter((r) => !r.isVerified).length,
  }), [rows, total]);

  const columns = [
    {
      key: "customer",
      label: "Customer",
      sortValue: (row: CustomerRow) => row.name,
      render: (row: CustomerRow) => (
        <div className="flex items-center gap-3">
          {row.profilePicture ? (
            <img src={row.profilePicture} alt={row.name} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f7ff] text-[12px] font-semibold text-[var(--primary)]">
              {row.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-xs text-gray-400">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (row: CustomerRow) => <span className="text-gray-600">{row.phone}</span>,
    },
    {
      key: "gender",
      label: "Gender",
      render: (row: CustomerRow) => (
        <span className="capitalize text-gray-600">{row.gender !== "—" ? row.gender.toLowerCase() : "—"}</span>
      ),
    },
    {
      key: "profileCompletion",
      label: "Profile",
      sortValue: (row: CustomerRow) => row.profileCompletion,
      render: (row: CustomerRow) => (
        <div className="min-w-[170px] space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-700">{row.profileCompletion}%</span>
            <span className="text-[11px] text-gray-500">
              {row.profileCompletion === 100 ? "Complete" : "In progress"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${row.name} profile completion`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.profileCompletion}
            className="h-2 overflow-hidden rounded-full bg-[#ececf0]"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300 ease-out"
              style={{ width: `${row.profileCompletion}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <CheckCircle2 size={11} className={row.profileCompletion === 100 ? "text-emerald-600" : "text-[#8e8e93]"} />
            <span>{row.profileCompletion === 100 ? "Profile ready" : "Needs attention"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Verified",
      render: (row: CustomerRow) => <StatusBadge status={row.isVerified ? "Active" : "Inactive"} />,
    },
    {
      key: "createdAt",
      label: "Joined",
      sortValue: (row: CustomerRow) => row.createdAt || "",
      render: (row: CustomerRow) => <span className="text-xs text-gray-500">{fmt(row.createdAt)}</span>,
    },
  ];

  return (
    <PageLayout
      title="Customers"
      subtitle="All registered customers."
      searchValue={state.search}
      onSearchChange={(v) => { setState((p) => ({ ...p, page: 1, search: v })); }}
      searchPlaceholder="Search name, email, phone..."
      actions={
        <><ExportMenu basePath="/customer" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="customers"/><button
          type="button"
          onClick={() => navigate("/dashboard/customers/bans")}
          className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[14px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
        >
          <ShieldOff size={13} strokeWidth={2} /> Bans
        </button></>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Customers" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Verified" value={stats.verified} icon={UserCheck} colorVariant="emerald" />
        <StatCardV2 label="Unverified" value={stats.unverified} icon={ShieldOff} colorVariant="amber" />
      </div>
      <DataTableV2
        columns={columns}
        data={rows}
        searchValue={state.search}
        onRowClick={(row) => navigate(`/dashboard/customers/${(row as CustomerRow).id}`, { state: { customer: row } })}
        emptyMessage={query.isLoading ? "Loading customers..." : "No customers found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(limit) => setState((prev) => ({ ...prev, page: 1, limit }))}
        rowActions={(row) => (
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
                  navigate(`/dashboard/customers/${row.id}`, { state: { customer: row } });
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-[#b42318] focus:text-[#b42318]"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/dashboard/customers/bans/create", { state: { customer: row } });
                }}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Ban customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
    </PageLayout>
  );
};
