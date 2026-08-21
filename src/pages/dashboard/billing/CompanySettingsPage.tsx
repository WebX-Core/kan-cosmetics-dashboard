import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Edit3, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import {
  useCompanySettings,
  useDeleteCompanySetting,
  useDeletedCompanySettings,
  useDestroyCompanySetting,
  useRecoverCompanySettings,
  type CompanySetting,
} from "@/features/billing";
import { usePermission } from "@/shared/hooks/usePermission";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";

export const CompanySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const canCreate = usePermission("company-setting:create");
  const canUpdate = usePermission("company-setting:update");
  const canDelete = usePermission("company-setting:delete");
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 10, search: "" });
  const query = useCompanySettings({ page: state.page, limit: state.limit, search: debouncedSearch || undefined });
  const remove = useDeleteCompanySetting();
  const recover = useRecoverCompanySettings();
  const destroy = useDestroyCompanySetting();
  const [showDeleted] = React.useState(false);
  const deletedQuery = useDeletedCompanySettings(showDeleted);
  const deletedPayload = deletedQuery.data as { settings?: CompanySetting[]; data?: CompanySetting[] } | CompanySetting[] | undefined;
  const deletedRows = Array.isArray(deletedPayload) ? deletedPayload : deletedPayload?.settings ?? deletedPayload?.data ?? [];
  const columns = [
    {
      key: "company",
      label: "Company",
      render: (row: CompanySetting) => <div className="flex min-w-[210px] items-center gap-3">{row.logoUrl ? <img src={row.logoUrl} alt="" className="h-10 w-10 rounded-lg border border-[#e5e5e7] object-contain"/> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><Building2 size={18} className="text-indigo-600"/></span>}<div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{row.companyName}</p><p className="mt-0.5 truncate text-[11px] text-[#86868b]">{row.legalName || row.senderName || "—"}</p></div></div>,
    },
    { key: "address", label: "Address", render: (row: CompanySetting) => <div className="min-w-[150px]"><p className="text-[12px] text-[#1d1d1f]">{row.address}</p><p className="mt-0.5 text-[11px] text-[#86868b]">{[row.city, row.district, row.country].filter(Boolean).join(", ") || "—"}</p></div> },
    { key: "tax", label: "Tax Details", render: (row: CompanySetting) => <div className="min-w-[130px] text-[11px]"><p><span className="text-[#86868b]">PAN</span> <span className="font-medium text-[#1d1d1f]">{row.panNumber || "—"}</span></p><p className="mt-1"><span className="text-[#86868b]">VAT</span> <span className="font-medium text-[#1d1d1f]">{row.vatNumber || "—"}</span></p></div> },
    { key: "invoicePrefix", label: "Prefix", render: (row: CompanySetting) => <span className="text-[12px] font-semibold text-[#1d1d1f]">{row.invoicePrefix}</span> },
    { key: "fiscalYear", label: "Fiscal Year", render: (row: CompanySetting) => <span className="text-[12px] text-[#1d1d1f]">{row.fiscalYear || "—"}</span> },
    { key: "invoiceStartNumber", label: "Start No.", render: (row: CompanySetting) => <span className="text-[12px] text-[#1d1d1f]">{row.invoiceStartNumber}</span> },
    { key: "status", label: "Status", render: (row: CompanySetting) => row.isActive ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 size={11}/> Active</span> : <span className="inline-flex rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[10px] font-semibold text-[#6e6e73]">Inactive</span> },
    { key: "actions", label: "Actions", render: (row: CompanySetting) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()} className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/><span className="sr-only">Open actions</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}><DropdownMenuLabel>Actions</DropdownMenuLabel>{canUpdate && <DropdownMenuItem onClick={() => navigate(`/dashboard/company-settings/${row.id}/edit`)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>}{canUpdate && canDelete && <DropdownMenuSeparator/>}{canDelete && <DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]" onClick={() => void remove.mutateAsync(row.id)}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu> },
  ];
  const deletedColumns = [
    ...columns.filter((column) => column.key !== "status" && column.key !== "actions"),
    { key: "actions", label: "Actions", render: (row: CompanySetting) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()} className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/><span className="sr-only">Open actions</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => void recover.mutateAsync([row.id])}><RotateCcw className="mr-2 h-4 w-4"/> Recover</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="text-[#b42318] focus:text-[#b42318]" onClick={() => { if (window.confirm("Permanently delete this company profile?")) void destroy.mutateAsync(row.id); }}><Trash2 className="mr-2 h-4 w-4"/> Delete Permanently</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ];

  return (
    <PageLayout
      title="Company Settings"
      subtitle="Manage the active seller identity used for shipping labels and VAT invoices."
      searchValue={state.search}
      onSearchChange={showDeleted ? undefined : (search) => setState((previous) => ({ ...previous, page: 1, search }))}
      searchPlaceholder="Search company profiles..."
      actions={
        <div className="flex gap-2">
          {canCreate && <button type="button" onClick={() => navigate("/dashboard/company-settings/create")} className="flex h-[34px] items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-[13px] font-semibold text-white"><Plus size={14}/> Add profile</button>}
        </div>
      }
    >
      {showDeleted ? <DataTableV2 columns={deletedColumns} data={deletedRows} emptyMessage={deletedQuery.isLoading ? "Loading deleted company profiles..." : "No deleted company profiles."} showPagination={false}/> : <DataTableV2 columns={columns} data={query.data?.settings ?? []} emptyMessage={query.isLoading ? "Loading company profiles..." : "No company profiles found."} showPagination currentPage={state.page} totalPages={query.data?.totalPages ?? 1} onPageChange={(page) => setState((previous) => ({ ...previous, page }))}/>} 
    </PageLayout>
  );
};
