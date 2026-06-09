import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Shield, ChevronLeft, ChevronRight, ShieldCheck, Key, Trash2, MoreHorizontal, Pencil } from "lucide-react";
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
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { confirmAction } from "@/shared/utils/confirm";
import { formatDateTime } from "@/shared/utils/date";
import { useAdminUsersList, useDeleteAdminUsers } from "@/features/adminUsers";
import type { Gender, Role } from "@/features/adminUsers/adminUsers.types";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useUserStore } from "@/store/UserStore";
import { api, unwrap } from "@/shared/api/api";

type CustomerRow = Readonly<{
  id: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string;
  role: "CUSTOMER";
  isVerified: boolean;
  createdAt?: string;
}>;

type CombinedRow = Readonly<{
  id: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  gender: Gender;
  role: Role | "CUSTOMER";
  isVerified: boolean;
  createdAt?: string;
  rowType: "admin" | "customer";
}>;

const toCustomerRows = (payload: unknown): ReadonlyArray<CustomerRow> => {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const rows = (obj.customers ?? obj.items ?? obj.data) as unknown;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id ?? ""),
      firstname: String(item.firstname ?? ""),
      middlename: typeof item.middlename === "string" ? item.middlename : undefined,
      lastname: String(item.lastname ?? ""),
      email: String(item.email ?? ""),
      phone: String(item.phone ?? ""),
      role: "CUSTOMER" as const,
      isVerified: Boolean(item.isVerified),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
    }))
    .filter((item) => item.id.length > 0);
};

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const viewerRole = useUserStore((state) => (state.user?.role ?? "").toUpperCase());
  const [activeTab, setActiveTab] = React.useState<"all" | "system" | "customers">("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 15, search: "" });

  const listQuery = useAdminUsersList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
  });
  const customersQuery = useQuery({
    queryKey: ["customerUsers", state.page, state.limit, debouncedSearch],
    queryFn: async () => {
      const res = await api.get("/customer/get-all", {
        params: {
          page: state.page,
          limit: state.limit,
          search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        },
      });
      return toCustomerRows(unwrap<unknown>(res));
    },
    staleTime: 30_000,
  });
  const del = useDeleteAdminUsers();

  const adminRows: ReadonlyArray<CombinedRow> = (listQuery.data?.data ?? []).map((row) => ({ ...row, rowType: "admin" }));
  const customerRows: ReadonlyArray<CombinedRow> = (customersQuery.data ?? []).map((row) => ({
    ...row,
    rowType: "customer",
    gender: "OTHER",
    address: "",
    role: "CUSTOMER" as const,
  }));
  const rows: ReadonlyArray<CombinedRow> = [...adminRows, ...customerRows];
  const resolveRole = React.useCallback((user: CombinedRow) => (user.role ?? "USER").toUpperCase(), []);
  const totalPages = listQuery.data?.totalPages ?? 1;
  const roleScopedRows = React.useMemo<ReadonlyArray<CombinedRow>>(() => {
    if (viewerRole === "SUDOADMIN") return rows;
    return rows.filter((u) => u.rowType === "customer" || resolveRole(u) !== "SUDOADMIN");
  }, [rows, viewerRole, resolveRole]);
  const filteredRows = React.useMemo(() => {
    if (activeTab === "customers") {
      return roleScopedRows.filter((u) => u.rowType === "customer");
    }
    if (activeTab === "system") {
      return roleScopedRows.filter((u) => {
        const role = resolveRole(u);
        return role === "ADMIN";
      });
    }
    return roleScopedRows;
  }, [activeTab, roleScopedRows, resolveRole]);

  const stats = React.useMemo(() => ({
    total: filteredRows.length,
    verified: filteredRows.filter((u) => u.isVerified).length,
    admins: filteredRows.filter((u) => {
      const role = resolveRole(u);
      return role === "ADMIN" || role === "SUDOADMIN";
    }).length,
  }), [filteredRows, resolveRole]);
  const tabs = React.useMemo(
    () => [
      { key: "all", label: "All Users", count: roleScopedRows.length },
      { key: "customers", label: "Customers", count: roleScopedRows.filter((u) => u.rowType === "customer").length },
      {
        key: "system",
        label: "System Users",
        count: roleScopedRows.filter((u) => {
          const role = resolveRole(u);
          return role === "ADMIN";
        }).length,
      },
    ],
    [roleScopedRows, resolveRole],
  );

  const handleDelete = async (id: string) => {
    const ok = await confirmAction("Delete this user?");
    if (!ok) return;
    await del.mutateAsync(id);
    toast.success("User deleted.");
  };

  const handleBanCustomer = async (row: CombinedRow) => {
    const reason = window.prompt("Enter ban reason:");
    if (!reason || reason.trim().length === 0) {
      toast.error("Ban reason is required.");
      return;
    }
    try {
      await api.post("/customer-ban/create", {
        customerId: row.id,
        reason: reason.trim(),
      });
      toast.success("Customer banned.");
    } catch {
      toast.error("Failed to ban customer.");
    }
  };

  const columns = [
    {
      key: "user",
      label: "User",
      render: (u: CombinedRow) => (
        <div>
          <div className="font-medium text-gray-900">
            {u.firstname} {u.middlename ? `${u.middlename} ` : ""}{u.lastname}
          </div>
          <div className="text-xs text-gray-400">{u.email}</div>
        </div>
      ),
    },
    { key: "phone", label: "Phone", render: (u: CombinedRow) => <span className="text-gray-600">{u.phone ?? "—"}</span> },
    {
      key: "role",
      label: "Role",
      render: (u: CombinedRow) => (
        (() => { const role = resolveRole(u); return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          role === "SUDOADMIN" ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
          role === "ADMIN" ? "bg-brand/10 text-brand" : "bg-gray-50 text-gray-600"
        }`}>
          {role}
        </span>
      ); })()
      ),
    },
    {
      key: "verified",
      label: "Verified",
      render: (u: CombinedRow) => <StatusBadge status={u.isVerified ? "Verified" : "Unverified"} />,
    },
    { key: "createdAt", label: "Created", render: (u: CombinedRow) => <span className="text-xs text-gray-400">{formatDateTime(u.createdAt)}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (u: CombinedRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {u.rowType === "admin" && (
              <DropdownMenuItem
                className="text-[#1d1d1f] focus:text-[#1d1d1f]"
                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/users/${u.id}/edit`); }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {u.rowType === "customer" ? (
              <DropdownMenuItem
                className="text-[#b42318] focus:text-[#b42318]"
                onClick={(e) => { e.stopPropagation(); void handleBanCustomer(u); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Ban Customer
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-[#b42318] focus:text-[#b42318]"
                onClick={(e) => { e.stopPropagation(); void handleDelete(u.id); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="Admin Users"
      subtitle="Manage admin panel users and roles."
      onNew={() => navigate("/dashboard/users/create")}
      newButtonLabel="New User"
      actions={
        <>
          <button
            type="button"
            onClick={() => navigate("/dashboard/rbac/roles")}
            className="flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <Key size={13} />
            Roles
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/permissions/users")}
            className="flex items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
          >
            <ShieldCheck size={13} />
            Permissions
          </button>
        </>
      }
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search email, name..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardV2 label="Total Users" value={stats.total} icon={Users} colorVariant="blue" />
        <StatCardV2 label="Verified" value={stats.verified} icon={UserCheck} colorVariant="emerald" />
        <StatCardV2 label="Admins" value={stats.admins} icon={Shield} colorVariant="blue" />
      </div>

      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "all" | "system" | "customers")}
        columns={columns}
        data={[...filteredRows]}
        searchValue={state.search}
        emptyMessage={listQuery.isLoading || customersQuery.isLoading ? "Loading users..." : "No users found."}
        showPagination={false}
        rowId={(row) => String((row as unknown as CombinedRow).id ?? "")}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clear) => (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Delete ${ids.size} user(s)?`)) return;
              await Promise.all([...ids].map((id) => del.mutateAsync(id)));
              clear();
              toast.success(`${ids.size} user(s) deleted.`);
            }}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} /> Delete selected
          </button>
        )}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            disabled={state.page <= 1}
            onClick={() => setState((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-500">{state.page} / {Math.max(1, totalPages)}</span>
          <button
            disabled={state.page >= totalPages}
            onClick={() => setState((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
            className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </PageLayout>
  );
};
