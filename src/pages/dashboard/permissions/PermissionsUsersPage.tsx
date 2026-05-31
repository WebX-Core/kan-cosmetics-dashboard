import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useAdminUsersList } from "@/features/adminUsers";
import type { User } from "@/features/adminUsers/adminUsers.types";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { useListQueryState } from "@/shared/hooks/useListQueryState";

const fmtRole = (v: string | undefined) => (v && v.length > 0 ? v : "USER");

export const PermissionsUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const listQuery = useAdminUsersList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
  });

  const rows: ReadonlyArray<User> = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const columns = [
    {
      key: "user",
      label: "User",
      render: (u: User) => (
        <div>
          <div className="font-medium text-gray-900">
            {u.firstname} {u.middlename ? `${u.middlename} ` : ""}{u.lastname}
          </div>
          <div className="text-xs text-gray-400">{u.email}</div>
        </div>
      ),
    },
    { key: "phone", label: "Phone", render: (u: User) => <span className="text-gray-600">{u.phone ?? "—"}</span> },
    { key: "role", label: "Role", render: (u: User) => <span className="font-medium text-gray-700">{fmtRole(u.role)}</span> },
    { key: "verified", label: "Verified", render: (u: User) => <StatusBadge status={u.isVerified ? "Verified" : "Unverified"} /> },
  ];

  return (
    <PageLayout
      title="Permissions"
      subtitle="Select a user to set their module permissions."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search users..."
    >
      <DataTableV2
        title="Users"
        subtitle="Manage user permission assignments"
        icon={<ShieldCheck size={16} className="text-[#0071e3]" />}
        columns={columns}
        data={[...rows] as unknown as Record<string, unknown>[]}
        emptyMessage={listQuery.isLoading ? "Loading users..." : "No users found."}
        searchValue={state.search}
        onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(page) => setState((p) => ({ ...p, page }))}
        onRowClick={(row) => navigate(`/dashboard/permissions/users/${(row as unknown as User).id}`)}
        onEdit={(row) => navigate(`/dashboard/permissions/users/${(row as unknown as User).id}`)}
        rowId={(row) => String((row as unknown as User).id ?? "")}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clear) => (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Remove permissions for ${ids.size} user(s)?`)) {
                clear();
              }
            }}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} /> Remove permissions
          </button>
        )}
      />
    </PageLayout>
  );
};
