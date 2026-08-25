import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { catalogApi } from "@/features/catalog";
import { engagementApi } from "@/features/engagement";
import { commerceApi } from "@/features/commerce";
import { identityApi } from "@/features/identity";
import { telemetryApi } from "@/features/telemetry";
import { deliveryApi } from "@/features/delivery";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SimpleApiTablePage } from "@/pages/dashboard/common/SimpleApiTablePage";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { ExportMenu } from "@/shared/components/dashboard/ExportMenu";
// import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
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
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  RefreshCw,
  Database,
  Package,
  Plus,
} from "lucide-react";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { confirmAction } from "@/shared/utils/confirm";
import { parseApiError } from "@/shared/utils/apiError";

const toRows = (
  value: unknown,
): ReadonlyArray<Readonly<Record<string, unknown>>> => {
  if (Array.isArray(value))
    return value.filter(
      (item) => typeof item === "object" && item !== null,
    ) as ReadonlyArray<Readonly<Record<string, unknown>>>;
  if (typeof value !== "object" || value === null) return [];
  const obj = value as Record<string, unknown>;
  const nested = Object.values(obj).find(Array.isArray);
  return Array.isArray(nested)
    ? (nested.filter(
        (item) => typeof item === "object" && item !== null,
      ) as ReadonlyArray<Readonly<Record<string, unknown>>>)
    : [];
};

const fmt = (v: string): string => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d);
};

const str = (v: unknown, fb = "—"): string =>
  typeof v === "string" && v ? v : fb;

type PageProps = Readonly<{
  title: string;
  description: string;
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  isLoading?: boolean;
  isError?: boolean;
}>;

const renderPage = ({
  title,
  description,
  rows,
  isLoading,
  isError,
}: PageProps) => (
  <SimpleApiTablePage
    title={title}
    description={description}
    rows={rows}
    isLoading={isLoading}
    errorMessage={isError ? "Failed to load." : null}
  />
);

const inputClass =
  "h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";

export const ProductVariantsPage: React.FC = () => {
  const q = catalogApi.productVariants.hooks.useList();
  return renderPage({
    title: "Product Variants",
    description: "Variant records from /product-variant.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const ProductAttributesTagsPage: React.FC = () => {
  const tags = catalogApi.productTags.hooks.useList();
  const attrs = catalogApi.productAttributes.hooks.useList();
  const rows = [...toRows(tags.data?.data), ...toRows(attrs.data?.data)];
  return renderPage({
    title: "Product Attributes & Tags",
    description: "Combined /product-tag and /product-attribute records.",
    rows,
    isLoading: tags.isLoading || attrs.isLoading,
    isError: tags.isError || attrs.isError,
  });
};

export const CouponUsagePage: React.FC = () => {
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [lookupId, setLookupId] = React.useState("");
  const [submittedId, setSubmittedId] = React.useState("");

  const q = useQuery({
    queryKey: ["couponUsage", "all", state.page, state.limit, debouncedSearch],
    queryFn: () =>
      commerceApi.couponUsage.all({
        page: state.page,
        limit: state.limit,
        search: debouncedSearch || undefined,
      }),
  });

  const singleQ = useQuery({
    queryKey: ["couponUsage", "single", submittedId],
    queryFn: () => commerceApi.couponUsage.get(submittedId),
    enabled: submittedId.trim().length > 0,
  });

  const usageRows = React.useMemo(() => {
    const items = Array.isArray(q.data)
      ? q.data
      : ((q.data as { usages?: unknown[] } | undefined)?.usages ?? []);
    return items
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null,
      )
      .map((item) => ({
        id: String(item.id ?? ""),
        couponCode: String(
          (item.coupon as Record<string, unknown> | undefined)?.code ??
            item.couponCode ??
            "—",
        ),
        customerId: String((item.customer as Record<string, unknown> | undefined)?.email ?? item.customerId ?? "—"),
        orderId: String((item.order as Record<string, unknown> | undefined)?.orderNumber ?? item.orderId ?? "—"),
        usedAt: String(item.usedAt ?? item.createdAt ?? ""),
      }));
  }, [q.data]);

  const totalPages =
    (q.data as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const singlePayload = singleQ.data as Record<string, unknown> | undefined;
  const singleResult = (singlePayload?.usage as Record<string, unknown> | undefined) ?? singlePayload;

  const columns = [
    {
      key: "couponCode",
      label: "Coupon Code",
      sortValue: (r: (typeof usageRows)[number]) => r.couponCode,
      render: (r: (typeof usageRows)[number]) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {r.couponCode}
        </span>
      ),
    },
    {
      key: "customerId",
      label: "Customer ID",
      render: (r: (typeof usageRows)[number]) => (
        <span className="font-mono text-xs text-gray-500">{r.customerId}</span>
      ),
    },
    {
      key: "orderId",
      label: "Order ID",
      render: (r: (typeof usageRows)[number]) => (
        <span className="font-mono text-xs text-gray-500">{r.orderId}</span>
      ),
    },
    {
      key: "usedAt",
      label: "Used At",
      sortValue: (r: (typeof usageRows)[number]) => r.usedAt,
      render: (r: (typeof usageRows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.usedAt)}</span>
      ),
    },
  ];

  return (
    <PageLayout
      title="Coupon Usage"
      subtitle="Track how coupons have been applied across orders."
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search by coupon code or customer…"
      actions={<ExportMenu basePath="/coupon-usage" params={{ search: debouncedSearch || undefined, limit: 10000 }} filename="coupon-usage"/>}
    >
      <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-[#1d1d1f]">Look up by ID</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmittedId(lookupId);
            }}
            placeholder="Coupon Usage ID…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setSubmittedId(lookupId)}
            disabled={!lookupId.trim()}
            className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            Look up
          </button>
          {submittedId && (
            <button
              type="button"
              onClick={() => {
                setLookupId("");
                setSubmittedId("");
              }}
              className="flex h-10 shrink-0 items-center rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
            >
              Clear
            </button>
          )}
        </div>
        {singleQ.isLoading && (
          <p className="text-xs text-[#86868b]">Loading…</p>
        )}
        {singleQ.isError && (
          <p className="text-xs text-red-600">Not found or error.</p>
        )}
        {singleResult && !singleQ.isLoading && (
          <div className="rounded-lg border border-[#d2d2d7] divide-y divide-[#f5f5f7] text-sm">
            {Object.entries(singleResult).map(([k, v]) => (
              <div key={k} className="flex gap-4 px-4 py-2">
                <span className="w-36 shrink-0 font-medium text-[#86868b] text-xs">
                  {k}
                </span>
                <span className="text-[#1d1d1f] break-all text-xs">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DataTableV2
        columns={columns}
        data={usageRows}
        searchValue={state.search}
        emptyMessage={
          q.isLoading
            ? "Loading usage records…"
            : "No coupon usage records found."
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((prev) => ({ ...prev, page: 1, limit: size }))}
      />
    </PageLayout>
  );
};

export const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [activeTab, setActiveTab] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const softDeleteRole = identityApi.roles.hooks.useSoftDelete();
  const updateRole = identityApi.roles.hooks.useUpdate();
  const syncPermissions = useMutation({
    mutationFn: identityApi.permissions.sync,
    onSuccess: () => toast.success("Permissions synchronized."),
    onError: (error) => toast.error(parseApiError(error).message),
  });
  const q = identityApi.roles.hooks.useList({
    page: state.page,
    limit: state.limit,
    search: debouncedSearch || undefined,
  });

  const rows = React.useMemo(() => {
    const list = toRows(q.data?.data);
    return list.map((row) => {
      const isActive = row.isActive ?? row.is_active;
      const sortOrder = row.sortOrder ?? row.sort_order;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? "—"),
        slug: String(row.slug ?? "—"),
        description: String(row.description ?? "—"),
        status: isActive === false ? "Inactive" : "Active",
        sortOrder:
          typeof sortOrder === "number"
            ? sortOrder
            : Number(sortOrder ?? 0) || 0,
        createdAt: String(row.createdAt ?? row.created_at ?? ""),
      };
    });
  }, [q.data]);

  const stats = React.useMemo(
    () => ({
      total: (q.data?.total as number | undefined) ?? rows.length,
      active: rows.filter((row) => row.status === "Active").length,
      inactive: rows.filter((row) => row.status === "Inactive").length,
    }),
    [q.data?.total, rows],
  );

  const tabs = React.useMemo(
    () => [
      { key: "all", label: "All Roles", count: stats.total },
      { key: "active", label: "Active", count: stats.active },
      { key: "inactive", label: "Inactive", count: stats.inactive },
    ],
    [stats],
  );

  const filtered = React.useMemo(() => {
    if (activeTab === "active")
      return rows.filter((row) => row.status === "Active");
    if (activeTab === "inactive")
      return rows.filter((row) => row.status === "Inactive");
    return rows;
  }, [activeTab, rows]);

  const handleToggleActive = async (row: (typeof rows)[number]) => {
    try {
      await updateRole.mutateAsync({
        id: row.id,
        dto: {
          name: row.name,
          slug: row.slug,
          description: row.description === "—" ? undefined : row.description,
          isActive: row.status !== "Active",
          sortOrder: row.sortOrder || undefined,
        },
      });
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const handleDelete = async (row: (typeof rows)[number]) => {
    const confirmed = await confirmAction(`Delete role ${row.name}?`);
    if (!confirmed) return;
    try {
      await softDeleteRole.mutateAsync(row.id);
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Role",
      sortValue: (row: (typeof rows)[number]) => row.name,
      render: (row: (typeof rows)[number]) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
        </div>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (row: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-500">{row.slug}</span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: (typeof rows)[number]) => (
        <span className="text-gray-600">{row.description}</span>
      ),
    },
    {
      key: "sortOrder",
      label: "Sort Order",
      sortValue: (row: (typeof rows)[number]) => row.sortOrder || 0,
      render: (row: (typeof rows)[number]) => (
        <span className="text-gray-700">{row.sortOrder || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row: (typeof rows)[number]) => row.status,
      render: (row: (typeof rows)[number]) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            row.status === "Active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortValue: (row: (typeof rows)[number]) => row.createdAt,
      render: (row: (typeof rows)[number]) => (
        <span className="text-xs text-gray-500">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: (typeof rows)[number]) => (
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
              className="text-[#1d1d1f] focus:text-[#1d1d1f]"
              onClick={(event) => {
                event.stopPropagation();
                navigate(
                  `/dashboard/rbac/roles/create?edit=${encodeURIComponent(row.id)}`,
                );
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[#1d1d1f] focus:text-[#1d1d1f]"
              onClick={async (event) => {
                event.stopPropagation();
                await handleToggleActive(row);
              }}
            >
              {row.status === "Active" ? (
                <ToggleLeft className="mr-2 h-4 w-4" />
              ) : (
                <ToggleRight className="mr-2 h-4 w-4" />
              )}
              {row.status === "Active" ? "Set Inactive" : "Set Active"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#b42318] focus:text-[#b42318]"
              onClick={async (event) => {
                event.stopPropagation();
                await handleDelete(row);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageLayout
      title="Roles"
      subtitle="Manage dashboard roles."
      onNew={undefined}
      actions={
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => syncPermissions.mutate()} disabled={syncPermissions.isPending} className="flex h-[34px] items-center gap-[8px] rounded-full border border-[#d2d2d7] bg-white px-[17px] text-[13px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] disabled:opacity-50">
            <RefreshCw size={13} className={syncPermissions.isPending ? "animate-spin" : ""} />
            {syncPermissions.isPending ? "Syncing..." : "Sync Permissions"}
          </button>
          <Link
            to="/dashboard/rbac/roles/create"
            className="flex h-[34px] items-center gap-[8px] rounded-full bg-[var(--primary)] px-[21px] text-[13px] font-semibold text-white! transition-colors hover:bg-[var(--primary-hover)] hover:text-white active:scale-[0.982]"
          >
            <Plus size={14} /> New Role
          </Link>
        </div>
      }
      searchValue={state.search}
      onSearchChange={(value) =>
        setState((previous) => ({ ...previous, page: 1, search: value }))
      }
      searchPlaceholder="Search roles..."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardV2
          label="Total Roles"
          value={stats.total}
          icon={Layers}
          colorVariant="blue"
        />
        <StatCardV2
          label="Active Roles"
          value={stats.active}
          icon={UserCheck}
          colorVariant="emerald"
        />
        <StatCardV2
          label="Inactive Roles"
          value={stats.inactive}
          icon={UserX}
          colorVariant="amber"
        />
        <StatCardV2
          label="Permissions Ready"
          value={stats.active}
          icon={ShieldCheck}
          colorVariant="indigo"
        />
      </div>
      <DataTableV2
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setState((previous) => ({ ...previous, page: 1 }));
        }}
        columns={columns}
        data={filtered}
        searchValue={state.search}
        emptyMessage={q.isLoading ? "Loading roles..." : "No roles found."}
        showPagination
        currentPage={state.page}
        totalPages={(q.data?.totalPages as number | undefined) ?? 1}
        onPageChange={(page) => setState((previous) => ({ ...previous, page }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((previous) => ({ ...previous, page: 1, limit: size }))}
        rowId={(row) => String((row as { id: string }).id ?? "")}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids, clear) => (
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm(`Delete ${ids.size} role(s)?`)) return;
              await Promise.all([...ids].map((id) => softDeleteRole.mutateAsync(id)));
              clear();
            }}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={12} /> Delete selected
          </button>
        )}
      />
    </PageLayout>
  );
};

export const UserRolesPage: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [userIdInput, setUserIdInput] = React.useState(userId);
  const [roleIdInput, setRoleIdInput] = React.useState("");
  const confirm = useConfirmAction();

  const q = useQuery({
    queryKey: ["userRoles", userId],
    queryFn: () => identityApi.userRoles.listByUser(userId),
    enabled: userId.trim().length > 0,
  });

  const assignMutation = useMutation({
    mutationFn: ({ uid, rid }: { uid: string; rid: string }) =>
      identityApi.userRoles.assign({ userId: uid, roleId: rid }),
    onSuccess: async () => {
      await q.refetch();
      setRoleIdInput("");
      toast.success("Role assigned.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => identityApi.userRoles.remove(id),
    onSuccess: async () => {
      await q.refetch();
      toast.success("Role removed.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const clearMutation = useMutation({
    mutationFn: (uid: string) => identityApi.userRoles.clearByUser(uid),
    onSuccess: async () => {
      await q.refetch();
      toast.success("All roles cleared.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (action === "delete" && ids[0]) await removeMutation.mutateAsync(ids[0]);
    else if (action === "destroy") await clearMutation.mutateAsync(userId);
  };

  const rows = React.useMemo(
    () =>
      toRows(q.data).map((item) => ({
        id: str(item.id),
        roleId: str(item.roleId ?? item.role_id),
        roleName: str((item.role as Record<string, unknown> | undefined)?.name),
        roleSlug: str((item.role as Record<string, unknown> | undefined)?.slug),
        assignedAt: str(item.createdAt ?? item.assignedAt, ""),
      })),
    [q.data],
  );

  const columns = [
    {
      key: "role",
      label: "Role",
      sortValue: (r: (typeof rows)[number]) => r.roleName,
      render: (r: (typeof rows)[number]) => (
        <div>
          <div className="font-medium text-gray-900">{r.roleName}</div>
          <div className="font-mono text-xs text-gray-400">{r.roleSlug}</div>
        </div>
      ),
    },
    {
      key: "roleId",
      label: "Role ID",
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-500">{r.roleId}</span>
      ),
    },
    {
      key: "assignedAt",
      label: "Assigned",
      sortValue: (r: (typeof rows)[number]) => r.assignedAt,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.assignedAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: (typeof rows)[number]) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            confirm.prompt("delete", [r.id]);
          }}
          className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          <Trash2 size={11} /> Remove
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="User Roles"
      subtitle="View and manage role assignments for a user."
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setSearchParams(userIdInput ? { userId: userIdInput } : {});
          }}
          placeholder="Enter User ID to look up roles…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() =>
            setSearchParams(userIdInput ? { userId: userIdInput } : {})
          }
          className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          Look up
        </button>
      </div>

      {userId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={roleIdInput}
            onChange={(e) => setRoleIdInput(e.target.value)}
            placeholder="Role ID to assign…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() =>
              assignMutation.mutate({ uid: userId, rid: roleIdInput })
            }
            disabled={!roleIdInput.trim() || assignMutation.isPending}
            className="flex h-10 shrink-0 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Assign
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => confirm.prompt("destroy", [userId])}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={
          !userId
            ? "Enter a user ID above to view assigned roles."
            : q.isLoading
              ? "Loading roles…"
              : "No roles assigned to this user."
        }
      />

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.dismiss()}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "destroy"
                ? "Clear all roles?"
                : "Remove role?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "destroy"
                ? "This will remove all role assignments for this user."
                : "This will unassign the selected role from the user."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              onClick={confirm.dismiss}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "destroy" ? "Clear All" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export const RolePermissionsPage: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleId = searchParams.get("roleId") ?? "";
  const [roleIdInput, setRoleIdInput] = React.useState(roleId);
  const [permissionIdInput, setPermissionIdInput] = React.useState("");
  const confirm = useConfirmAction();

  const q = useQuery({
    queryKey: ["rolePermissions", roleId],
    queryFn: () => identityApi.rolePermissions.listByRole(roleId),
    enabled: roleId.trim().length > 0,
  });

  const assignMutation = useMutation({
    mutationFn: ({ rid, pid }: { rid: string; pid: string }) =>
      identityApi.rolePermissions.assign({ roleId: rid, permissionId: pid }),
    onSuccess: async () => {
      await q.refetch();
      setPermissionIdInput("");
      toast.success("Permission assigned to role.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => identityApi.rolePermissions.remove(id),
    onSuccess: async () => {
      await q.refetch();
      toast.success("Permission removed.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const clearMutation = useMutation({
    mutationFn: (rid: string) => identityApi.rolePermissions.clearByRole(rid),
    onSuccess: async () => {
      await q.refetch();
      toast.success("All permissions cleared from role.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (action === "delete" && ids[0]) await removeMutation.mutateAsync(ids[0]);
    else if (action === "destroy") await clearMutation.mutateAsync(roleId);
  };

  const rows = React.useMemo(
    () =>
      toRows(q.data).map((item) => ({
        id: str(item.id),
        permissionId: str(item.permissionId ?? item.permission_id),
        permKey: str(
          (item.permission as Record<string, unknown> | undefined)?.key ??
            item.permissionKey ??
            item.permission_key,
        ),
        permModule: str(
          (item.permission as Record<string, unknown> | undefined)?.module,
        ),
        permAction: str(
          (item.permission as Record<string, unknown> | undefined)?.action,
        ),
        assignedAt: str(item.createdAt ?? item.assignedAt, ""),
      })),
    [q.data],
  );

  const columns = [
    {
      key: "permission",
      label: "Permission",
      sortValue: (r: (typeof rows)[number]) => r.permKey,
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {r.permKey}
        </span>
      ),
    },
    {
      key: "permModule",
      label: "Module",
      sortValue: (r: (typeof rows)[number]) => r.permModule,
      render: (r: (typeof rows)[number]) => (
        <span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
          {r.permModule}
        </span>
      ),
    },
    {
      key: "permAction",
      label: "Action",
      sortValue: (r: (typeof rows)[number]) => r.permAction,
      render: (r: (typeof rows)[number]) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {r.permAction}
        </span>
      ),
    },
    {
      key: "assignedAt",
      label: "Assigned",
      sortValue: (r: (typeof rows)[number]) => r.assignedAt,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.assignedAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: (typeof rows)[number]) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            confirm.prompt("delete", [r.id]);
          }}
          className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          <Trash2 size={11} /> Remove
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Role Permissions"
      subtitle="View and manage permission assignments for a role."
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={roleIdInput}
          onChange={(e) => setRoleIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setSearchParams(roleIdInput ? { roleId: roleIdInput } : {});
          }}
          placeholder="Enter Role ID to look up permissions…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() =>
            setSearchParams(roleIdInput ? { roleId: roleIdInput } : {})
          }
          className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          Look up
        </button>
      </div>

      {roleId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={permissionIdInput}
            onChange={(e) => setPermissionIdInput(e.target.value)}
            placeholder="Permission ID to assign…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() =>
              assignMutation.mutate({ rid: roleId, pid: permissionIdInput })
            }
            disabled={!permissionIdInput.trim() || assignMutation.isPending}
            className="flex h-10 shrink-0 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Assign
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => confirm.prompt("destroy", [roleId])}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={
          !roleId
            ? "Enter a role ID above to view assigned permissions."
            : q.isLoading
              ? "Loading permissions…"
              : "No permissions assigned to this role."
        }
      />

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.dismiss()}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "destroy"
                ? "Clear all permissions?"
                : "Remove permission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "destroy"
                ? "This will remove all permission assignments from this role."
                : "This will unassign the selected permission from the role."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              onClick={confirm.dismiss}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "destroy" ? "Clear All" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export const UserPermissionsPage: React.FC = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [userIdInput, setUserIdInput] = React.useState(userId);
  const [permissionIdInput, setPermissionIdInput] = React.useState("");
  const confirm = useConfirmAction();

  const q = useQuery({
    queryKey: ["userPermissions", userId],
    queryFn: () => identityApi.userPermissions.listByUser(userId),
    enabled: userId.trim().length > 0,
  });

  const assignMutation = useMutation({
    mutationFn: ({ uid, pid }: { uid: string; pid: string }) =>
      identityApi.userPermissions.assign({ userId: uid, permissionId: pid }),
    onSuccess: async () => {
      await q.refetch();
      setPermissionIdInput("");
      toast.success("Permission assigned to user.");
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => identityApi.userPermissions.remove(id),
    onSuccess: async () => {
      await q.refetch();
      toast.success("Permission removed.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const clearMutation = useMutation({
    mutationFn: (uid: string) => identityApi.userPermissions.clearByUser(uid),
    onSuccess: async () => {
      await q.refetch();
      toast.success("All direct permissions cleared.");
      confirm.dismiss();
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
      confirm.dismiss();
    },
  });

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (action === "delete" && ids[0]) await removeMutation.mutateAsync(ids[0]);
    else if (action === "destroy") await clearMutation.mutateAsync(userId);
  };

  const rows = React.useMemo(
    () =>
      toRows(q.data).map((item) => ({
        id: str(item.id),
        permissionId: str(item.permissionId ?? item.permission_id),
        permKey: str(
          (item.permission as Record<string, unknown> | undefined)?.key ??
            item.permissionKey ??
            item.permission_key,
        ),
        permModule: str(
          (item.permission as Record<string, unknown> | undefined)?.module,
        ),
        permAction: str(
          (item.permission as Record<string, unknown> | undefined)?.action,
        ),
        assignedAt: str(item.createdAt ?? item.assignedAt, ""),
      })),
    [q.data],
  );

  const columns = [
    {
      key: "permission",
      label: "Permission",
      sortValue: (r: (typeof rows)[number]) => r.permKey,
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {r.permKey}
        </span>
      ),
    },
    {
      key: "permModule",
      label: "Module",
      sortValue: (r: (typeof rows)[number]) => r.permModule,
      render: (r: (typeof rows)[number]) => (
        <span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
          {r.permModule}
        </span>
      ),
    },
    {
      key: "permAction",
      label: "Action",
      sortValue: (r: (typeof rows)[number]) => r.permAction,
      render: (r: (typeof rows)[number]) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {r.permAction}
        </span>
      ),
    },
    {
      key: "assignedAt",
      label: "Assigned",
      sortValue: (r: (typeof rows)[number]) => r.assignedAt,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.assignedAt)}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: (typeof rows)[number]) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            confirm.prompt("delete", [r.id]);
          }}
          className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          <Trash2 size={11} /> Remove
        </button>
      ),
    },
  ];

  return (
    <PageLayout
      title="User Permissions"
      subtitle="View and manage direct permission assignments for a user."
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setSearchParams(userIdInput ? { userId: userIdInput } : {});
          }}
          placeholder="Enter User ID to look up direct permissions…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() =>
            setSearchParams(userIdInput ? { userId: userIdInput } : {})
          }
          className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
        >
          Look up
        </button>
      </div>

      {userId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={permissionIdInput}
            onChange={(e) => setPermissionIdInput(e.target.value)}
            placeholder="Permission ID to assign…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() =>
              assignMutation.mutate({ uid: userId, pid: permissionIdInput })
            }
            disabled={!permissionIdInput.trim() || assignMutation.isPending}
            className="flex h-10 shrink-0 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Assign
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => confirm.prompt("destroy", [userId])}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={
          !userId
            ? "Enter a user ID above to view direct permissions."
            : q.isLoading
              ? "Loading permissions…"
              : "No direct permissions assigned to this user."
        }
      />

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.dismiss()}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "destroy"
                ? "Clear all permissions?"
                : "Remove permission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "destroy"
                ? "This will remove all direct permission assignments from this user."
                : "This will unassign the selected permission from the user."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              onClick={confirm.dismiss}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "destroy" ? "Clear All" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export const UserMetadataPage: React.FC = () => {
  const toast = useToast();
  const { state, setState, debouncedSearch } = useListQueryState({
    page: 1,
    limit: 20,
    search: "",
  });
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>(
    [],
  );
  const [isDeletedView, setIsDeletedView] = React.useState(false);
  const confirm = useConfirmAction();

  const q = telemetryApi.userMetadata.hooks.useList(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    !isDeletedView,
  );
  const deletedQ = telemetryApi.userMetadata.hooks.useDeleted(
    {
      page: state.page,
      limit: state.limit,
      search: debouncedSearch || undefined,
    },
    isDeletedView,
  );
  const del = telemetryApi.userMetadata.hooks.useSoftDelete();
  const recover = telemetryApi.userMetadata.hooks.useRecover();
  const destroy = telemetryApi.userMetadata.hooks.useDestroy();

  const sourceData = isDeletedView ? deletedQ.data : q.data;

  const rows = React.useMemo(() => {
    const items = Array.isArray(sourceData)
      ? sourceData
      : ((sourceData as { data?: unknown[] } | undefined)?.data ?? []);
    return items
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null,
      )
      .map((item) => ({
        id: str(item.id),
        userId: str(item.userId ?? item.user_id),
        sessionId: str(item.sessionId ?? item.session_id),
        ip: str(item.ip),
        country: str(item.country),
        city: str(item.city),
        device: str(item.device),
        browser: str(item.browser),
        os: str(item.os),
        createdAt: str(item.createdAt ?? "", ""),
      }));
  }, [sourceData]);

  const totalPages =
    (sourceData as { totalPages?: number } | undefined)?.totalPages ?? 1;
  const total =
    (sourceData as { total?: number } | undefined)?.total ?? rows.length;
  const allVisibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);
  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.includes(id));
  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) =>
      checked
        ? prev.includes(id)
          ? prev
          : [...prev, id]
        : prev.filter((x) => x !== id),
    );
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, ...allVisibleIds]))
        : prev.filter((id) => !allVisibleIds.includes(id)),
    );

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (!ids.length) return;
    try {
      if (action === "delete") await del.mutateAsync(ids.join(","));
      if (action === "recover") await recover.mutateAsync({ ids });
      if (action === "destroy") await destroy.mutateAsync(ids.join(","));
      await q.refetch();
      await deletedQ.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success(
        action === "recover"
          ? "Recovered."
          : action === "destroy"
            ? "Permanently deleted."
            : "Deleted.",
      );
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => toggleAll(e.target.checked)}
          aria-label="Select all"
        />
      ),
      render: (r: (typeof rows)[number]) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => toggleOne(r.id, e.target.checked)}
          aria-label={`Select ${r.id}`}
        />
      ),
      width: "44px",
    },
    {
      key: "userId",
      label: "User ID",
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-700">{r.userId}</span>
      ),
    },
    {
      key: "sessionId",
      label: "Session",
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-400 max-w-[100px] truncate block">
          {r.sessionId}
        </span>
      ),
    },
    {
      key: "ip",
      label: "IP",
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-600">{r.ip}</span>
      ),
    },
    {
      key: "location",
      label: "Location",
      sortValue: (r: (typeof rows)[number]) => [r.city, r.country].filter((v) => v !== "—").join(", "),
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-600">
          {[r.city, r.country].filter((v) => v !== "—").join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "device",
      label: "Device / OS",
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-600">
          {[r.device, r.os].filter((v) => v !== "—").join(" / ") || "—"}
        </span>
      ),
    },
    {
      key: "browser",
      label: "Browser",
      sortValue: (r: (typeof rows)[number]) => r.browser,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-600">{r.browser}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Recorded",
      sortValue: (r: (typeof rows)[number]) => r.createdAt,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.createdAt)}</span>
      ),
    },
    {
      key: "del",
      label: "",
      render: (r: (typeof rows)[number]) => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isDeletedView ? (
            <>
              <button
                type="button"
                onClick={() => confirm.prompt("recover", [r.id])}
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <RotateCcw size={11} /> Recover
              </button>
              <button
                type="button"
                onClick={() => confirm.prompt("destroy", [r.id])}
                className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                <Trash2 size={11} /> Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => confirm.prompt("delete", [r.id])}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  const isLoading = isDeletedView ? deletedQ.isLoading : q.isLoading;

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted User Metadata" : "User Metadata"}
      subtitle="Session and device metadata captured for users."
      onBack={isDeletedView ? () => setIsDeletedView(false) : undefined}
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search user metadata…"
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCardV2
            label="Total Records"
            value={total}
            icon={Database}
            colorVariant="blue"
          />
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={rows}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              {isDeletedView ? (
                <>
                  <button
                    type="button"
                    onClick={() => confirm.prompt("recover", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <RotateCcw size={12} /> Recover ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm.prompt("destroy", selectedIds)}
                    className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={12} /> Delete Permanently (
                    {selectedIds.length})
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => confirm.prompt("delete", selectedIds)}
                  className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  <Trash2 size={12} /> Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        emptyMessage={
          isLoading ? "Loading metadata…" : "No user metadata records found."
        }
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
        pageSize={state.limit}
        onPageSizeChange={(size) => setState((prev) => ({ ...prev, page: 1, limit: size }))}
      />

      <AlertDialog
        open={confirm.open}
        onOpenChange={(o) => !o && confirm.dismiss()}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover"
                ? "Recover metadata?"
                : confirm.action === "destroy"
                  ? "Delete permanently?"
                  : "Delete metadata?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover"
                ? "This will restore the selected records."
                : confirm.action === "destroy"
                  ? "This cannot be undone."
                  : "This will soft-delete the selected records."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              onClick={confirm.dismiss}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm.action === "recover"
                  ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  : "rounded-full bg-red-600 text-white hover:bg-red-700"
              }
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "recover"
                ? "Recover"
                : confirm.action === "destroy"
                  ? "Delete Permanently"
                  : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export const CouriersPage: React.FC = () => {
  const q = deliveryApi.couriers.hooks.useList();
  return renderPage({
    title: "Couriers",
    description: "Courier records from /courier.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const CourierBranchesPage: React.FC = () => {
  const q = deliveryApi.courierBranches.hooks.useList();
  return renderPage({
    title: "Courier Branches",
    description: "Branch records from /courier-branch.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const CourierPickupAddressesPage: React.FC = () => {
  const q = deliveryApi.courierPickupAddresses.hooks.useList();
  return renderPage({
    title: "Courier Pickup Addresses",
    description: "Pickup address records from /courier-pickup-address.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const ShipmentTrackingPage: React.FC = () => {
  const q = deliveryApi.shipmentTracking.hooks.useList();
  return renderPage({
    title: "Shipment Tracking",
    description: "Tracking records from /shipment-tracking.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const PickupRequestsPage: React.FC = () => {
  const q = deliveryApi.pickupRequests.hooks.useList();
  return renderPage({
    title: "Pickup Requests",
    description: "Pickup request records from /pickup-request.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const DeliveryApiLogsPage: React.FC = () => {
  const q = deliveryApi.deliveryApiLogs.hooks.useList();
  return renderPage({
    title: "Delivery API Logs",
    description: "Delivery API log records.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const DeliveryWebhookEventsPage: React.FC = () => {
  const q = deliveryApi.deliveryWebhookEvents.hooks.useList();
  return renderPage({
    title: "Delivery Webhook Events",
    description: "Delivery webhook event records.",
    rows: toRows(q.data?.data),
    isLoading: q.isLoading,
    isError: q.isError,
  });
};

export const PurchaseHistoryPage: React.FC = () => {
  const toast = useToast();
  const [customerId, setCustomerId] = React.useState("");
  const [orderId, setOrderId] = React.useState("");
  const [syncing, setSyncing] = React.useState<"customer" | "order" | null>(
    null,
  );
  const [lookupId, setLookupId] = React.useState("");
  const [submittedLookupId, setSubmittedLookupId] = React.useState("");

  const q = useQuery({
    queryKey: ["purchaseHistory", "customer", customerId],
    queryFn: () => commerceApi.purchaseHistory.byCustomer(customerId),
    enabled: customerId.trim().length > 0,
  });

  const singleQ = useQuery({
    queryKey: ["purchaseHistory", "single", submittedLookupId],
    queryFn: () => commerceApi.purchaseHistory.get(submittedLookupId),
    enabled: submittedLookupId.trim().length > 0,
  });

  const rows = React.useMemo(() => {
    const items = Array.isArray(q.data)
      ? q.data
      : ((q.data as { data?: unknown[] } | undefined)?.data ?? []);
    return items
      .filter(
        (i): i is Record<string, unknown> =>
          typeof i === "object" && i !== null,
      )
      .map((item) => ({
        id: str(item.id),
        orderId: str(item.orderId ?? item.order_id),
        productId: str(item.productId ?? item.product_id),
        productName: str(
          (item.product as Record<string, unknown> | undefined)?.name ??
            (item.product as Record<string, unknown> | undefined)?.title,
        ),
        quantity: typeof item.quantity === "number" ? item.quantity : 0,
        price:
          typeof item.price === "number"
            ? `NPR ${item.price.toLocaleString()}`
            : str(item.price),
        purchasedAt: str(item.purchasedAt ?? item.createdAt ?? "", ""),
      }));
  }, [q.data]);

  const handleSyncByCustomer = async () => {
    if (!customerId.trim()) return;
    setSyncing("customer");
    try {
      await commerceApi.purchaseHistory.syncByCustomer(customerId);
      await q.refetch();
      toast.success("Purchase history synced for customer.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncByOrder = async () => {
    if (!orderId.trim()) return;
    setSyncing("order");
    try {
      await commerceApi.purchaseHistory.syncByOrder(orderId);
      if (customerId.trim()) await q.refetch();
      toast.success("Purchase history synced for order.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      setSyncing(null);
    }
  };

  const columns = [
    {
      key: "orderId",
      label: "Order ID",
      render: (r: (typeof rows)[number]) => (
        <span className="font-mono text-xs text-gray-700">{r.orderId}</span>
      ),
    },
    {
      key: "product",
      label: "Product",
      sortValue: (r: (typeof rows)[number]) => r.productName,
      render: (r: (typeof rows)[number]) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {r.productName}
          </div>
          <div className="font-mono text-xs text-gray-400">{r.productId}</div>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      sortValue: (r: (typeof rows)[number]) => r.quantity,
      render: (r: (typeof rows)[number]) => (
        <span className="text-sm text-gray-700">{r.quantity || "—"}</span>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (r: (typeof rows)[number]) => (
        <span className="text-sm font-medium text-gray-900">{r.price}</span>
      ),
    },
    {
      key: "purchasedAt",
      label: "Purchased",
      sortValue: (r: (typeof rows)[number]) => r.purchasedAt,
      render: (r: (typeof rows)[number]) => (
        <span className="text-xs text-gray-400">{fmt(r.purchasedAt)}</span>
      ),
    },
  ];

  const singleResult = singleQ.data as Record<string, unknown> | undefined;

  return (
    <PageLayout
      title="Purchase History"
      subtitle="View and sync purchase history records by customer or order."
    >
      <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-[#1d1d1f]">Look up by ID</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmittedLookupId(lookupId);
            }}
            placeholder="Purchase History ID…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setSubmittedLookupId(lookupId)}
            disabled={!lookupId.trim()}
            className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            Look up
          </button>
          {submittedLookupId && (
            <button
              type="button"
              onClick={() => {
                setLookupId("");
                setSubmittedLookupId("");
              }}
              className="flex h-10 shrink-0 items-center rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
            >
              Clear
            </button>
          )}
        </div>
        {singleQ.isLoading && (
          <p className="text-xs text-[#86868b]">Loading…</p>
        )}
        {singleQ.isError && (
          <p className="text-xs text-red-600">Not found or error.</p>
        )}
        {singleResult && !singleQ.isLoading && (
          <div className="rounded-lg border border-[#d2d2d7] divide-y divide-[#f5f5f7] text-sm">
            {Object.entries(singleResult).map(([k, v]) => (
              <div key={k} className="flex gap-4 px-4 py-2">
                <span className="w-36 shrink-0 font-medium text-[#86868b] text-xs">
                  {k}
                </span>
                <span className="text-[#1d1d1f] break-all text-xs">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#d2d2d7] bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-[#1d1d1f]">Customer Lookup</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Customer ID…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void handleSyncByCustomer()}
            disabled={!customerId.trim() || syncing === "customer"}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            <Package size={14} />{" "}
            {syncing === "customer" ? "Syncing…" : "Sync by Customer"}
          </button>
        </div>
        <p className="text-sm font-medium text-[#1d1d1f]">Order Sync</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => void handleSyncByOrder()}
            disabled={!orderId.trim() || syncing === "order"}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
          >
            <Package size={14} />{" "}
            {syncing === "order" ? "Syncing…" : "Sync by Order"}
          </button>
        </div>
      </div>

      <DataTableV2
        columns={columns}
        data={rows}
        emptyMessage={
          !customerId
            ? "Enter a customer ID above to view purchase history."
            : q.isLoading
              ? "Loading history…"
              : "No purchase history found for this customer."
        }
      />
    </PageLayout>
  );
};

export const SeoMetadataPage: React.FC = () => {
  const [tab, setTab] = React.useState<"page" | "entity">("page");
  const [routeKey, setRouteKey] = React.useState("home");
  const [entityType, setEntityType] = React.useState("product");
  const [entityId, setEntityId] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const pageQuery = useQuery({
    queryKey: ["seoPage", routeKey, submitted],
    queryFn: () => engagementApi.seo.byPage(routeKey),
    enabled: tab === "page" && submitted && routeKey.trim().length > 0,
  });

  const entityQuery = useQuery({
    queryKey: ["seoEntity", entityType, entityId, submitted],
    queryFn: () => engagementApi.seo.byEntity(entityType, entityId),
    enabled:
      tab === "entity" &&
      submitted &&
      entityType.trim().length > 0 &&
      entityId.trim().length > 0,
  });

  const activeQuery = tab === "page" ? pageQuery : entityQuery;
  const result = activeQuery.data as Record<string, unknown> | undefined;

  const seoFields: Array<{ key: string; label: string }> = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "keywords", label: "Keywords" },
    { key: "ogTitle", label: "OG Title" },
    { key: "ogDescription", label: "OG Description" },
    { key: "ogImage", label: "OG Image" },
    { key: "canonicalUrl", label: "Canonical URL" },
    { key: "noIndex", label: "No Index" },
    { key: "routeKey", label: "Route Key" },
    { key: "entityType", label: "Entity Type" },
    { key: "entityId", label: "Entity ID" },
  ];

  return (
    <PageLayout
      title="SEO Metadata"
      subtitle="Look up SEO metadata by page route key or entity."
    >
      <div className="flex gap-2 rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] p-1 w-fit">
        <button
          type="button"
          onClick={() => {
            setTab("page");
            setSubmitted(false);
          }}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "page" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"}`}
        >
          By Page
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("entity");
            setSubmitted(false);
          }}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === "entity" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"}`}
        >
          By Entity
        </button>
      </div>

      {tab === "page" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={routeKey}
            onChange={(e) => {
              setRouteKey(e.target.value);
              setSubmitted(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmitted(true);
            }}
            placeholder="Route key (e.g. home, about, product-detail)…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            Look up
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setSubmitted(false);
            }}
            placeholder="Entity type (product, category…)"
            className={inputClass}
          />
          <input
            type="text"
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setSubmitted(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmitted(true);
            }}
            placeholder="Entity ID (UUID)…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="flex h-10 shrink-0 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            Look up
          </button>
        </div>
      )}

      {activeQuery.isLoading && (
        <div className="text-center py-8 text-sm text-[#86868b]">
          Loading SEO metadata…
        </div>
      )}

      {activeQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No SEO metadata found or an error occurred.
        </div>
      )}

      {result && !activeQuery.isLoading && (
        <div className="rounded-xl border border-[#d2d2d7] bg-white overflow-hidden">
          <div className="border-b border-[#d2d2d7] px-5 py-3">
            <p className="text-sm font-semibold text-[#1d1d1f]">SEO Metadata</p>
            <p className="text-xs text-[#86868b]">ID: {str(result.id)}</p>
          </div>
          <div className="divide-y divide-[#f5f5f7]">
            {seoFields.map(({ key, label }) => {
              const val = result[key];
              if (val === undefined || val === null || val === "") return null;
              return (
                <div key={key} className="flex gap-4 px-5 py-3">
                  <span className="w-36 shrink-0 text-xs font-medium text-[#86868b]">
                    {label}
                  </span>
                  <span className="text-sm text-[#1d1d1f] break-all">
                    {typeof val === "boolean"
                      ? val
                        ? "Yes"
                        : "No"
                      : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!submitted && !activeQuery.isLoading && (
        <div className="text-center py-8 text-sm text-[#86868b]">
          {tab === "page"
            ? "Enter a route key to look up SEO metadata."
            : "Enter an entity type and ID to look up SEO metadata."}
        </div>
      )}
    </PageLayout>
  );
};

export const ProductMediaPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = catalogApi.products.hooks.useList({ page: 1, limit: 100 });
  const detail = catalogApi.products.hooks.useGet(id, Boolean(id));
  const source = id ? (detail.data ? [detail.data as Readonly<Record<string, unknown>>] : []) : toRows(q.data?.data);
  const rows = source.map((row) => {
    const media = Array.isArray(row.mediaAssets) ? row.mediaAssets : Array.isArray(row.images) ? row.images : [];
    return {
      id: String(row.id ?? ""),
      title: str(row.title ?? row.name, "Untitled product"),
      thumbnail: str(row.thumbnail ?? row.image ?? row.coverImage, ""),
      mediaCount: media.length,
    };
  });

  return (
    <PageLayout
      title={id ? "Product Media Details" : "Product Media"}
      subtitle="Review product thumbnails and media coverage. Media is managed from the product editor."
      onBack={id ? () => navigate("/dashboard/product-media") : undefined}
    >
      <DataTableV2
        columns={[
          {
            key: "thumbnail",
            label: "Preview",
            render: (row: typeof rows[number]) => row.thumbnail ? <img src={row.thumbnail} alt="" className="h-12 w-12 rounded-lg border border-[#e5e5e7] object-cover" /> : <span className="text-xs text-[#86868b]">No image</span>,
          },
          { key: "title", label: "Product" },
          { key: "mediaCount", label: "Media Assets" },
        ]}
        data={rows}
        onRowClick={id ? undefined : (row) => navigate(`/dashboard/product-media/${row.id}`)}
        onEdit={(row) => navigate(`/dashboard/products/${row.id}/edit`)}
        emptyMessage={(id ? detail.isLoading : q.isLoading) ? "Loading product media…" : "No product media found."}
        showPagination={false}
      />
    </PageLayout>
  );
};
