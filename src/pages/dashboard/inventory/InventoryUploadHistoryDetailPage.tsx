import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { catalogApi } from "@/features/catalog";
import {
  type InventoryBulkUploadDetailRow,
  toUploadDetail,
} from "./uploadHistory";

const showNum = (v: number | null) => (v === null ? "—" : v);

const rowColumns = [
  { key: "rowNumber", label: "Row", sortValue: (r: InventoryBulkUploadDetailRow) => r.rowNumber, render: (r: InventoryBulkUploadDetailRow) => r.rowNumber },
  { key: "targetType", label: "Type", sortValue: (r: InventoryBulkUploadDetailRow) => r.targetType, render: (r: InventoryBulkUploadDetailRow) => <span className="text-[#6e6e73]">{r.targetType}</span> },
  {
    key: "item",
    label: "Item",
    sortValue: (r: InventoryBulkUploadDetailRow) => r.itemName,
    render: (r: InventoryBulkUploadDetailRow) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-[#1d1d1f]">{r.itemName}</div>
        <div className="truncate text-[11px] text-[#86868b]">
          {r.sku}
          {r.variantName && r.variantName !== "—" ? ` · ${r.variantName}` : ""}
        </div>
      </div>
    ),
  },
  { key: "status", label: "Status", sortValue: (r: InventoryBulkUploadDetailRow) => r.status, render: (r: InventoryBulkUploadDetailRow) => <StatusBadge status={r.status} /> },
  {
    key: "stock",
    label: "Stock (before → after)",
    render: (r: InventoryBulkUploadDetailRow) => (
      <span className="text-[#6e6e73]">
        {showNum(r.beforeStockQuantity)} → {showNum(r.afterStockQuantity)}
      </span>
    ),
  },
  {
    key: "errorMessage",
    label: "Error",
    render: (r: InventoryBulkUploadDetailRow) => (
      <span className={r.errorMessage && r.errorMessage !== "—" ? "text-red-600" : "text-[#86868b]"}>
        {r.errorMessage}
      </span>
    ),
  },
];

const statusTabs = [
  { key: "all", label: "All" },
  { key: "CREATED", label: "Created" },
  { key: "UPDATED", label: "Updated" },
  { key: "SKIPPED", label: "Skipped" },
  { key: "FAILED", label: "Failed" },
] as const;

export const InventoryUploadHistoryDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [tab, setTab] = React.useState<string>("all");

  const detailQuery = useQuery({
    queryKey: ["inventory", "bulk-upload-detail", id, page, limit, tab],
    queryFn: () =>
      catalogApi.inventory.getBulkUploadDetail(id, {
        page,
        limit,
        ...(tab === "all" ? {} : { status: tab }),
      }),
    enabled: id.length > 0,
  });

  const detail = React.useMemo(
    () => toUploadDetail(detailQuery.data),
    [detailQuery.data],
  );
  const { upload, rows, meta } = detail;

  const summary: ReadonlyArray<readonly [string, React.ReactNode]> = [
    ["Status", <StatusBadge status={upload.status} />],
    ["Rows", upload.totalRows],
    ["Created", upload.createdRows],
    ["Updated", upload.updatedRows],
    ["Skipped", upload.skippedRows],
    ["Failed", <span className={upload.failedRows > 0 ? "font-semibold text-red-600" : undefined}>{upload.failedRows}</span>],
    ["Uploaded by", `${upload.uploadedByName} (${upload.uploadedByEmail})`],
    ["Uploaded", upload.createdAt ? new Date(upload.createdAt).toLocaleString() : "—"],
    ["Note", upload.note],
  ];

  return (
    <PageLayout
      title={upload.fileName || "Upload detail"}
      subtitle="Per-row outcomes for this inventory sheet upload."
      onBack={() => navigate("/dashboard/inventory/upload-history")}
    >
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm sm:grid-cols-3 lg:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#86868b]">
              {label}
            </div>
            <div className="mt-0.5 truncate text-[#1d1d1f]">{value}</div>
          </div>
        ))}
      </div>

      <DataTableV2
        columns={rowColumns}
        data={rows}
        rowId={(row) => row.id}
        tabs={statusTabs.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          setPage(1);
        }}
        emptyMessage={
          detailQuery.isLoading ? "Loading rows..." : "No rows for this filter."
        }
        currentPage={meta.page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        pageSize={limit}
        pageSizeOptions={[20, 50, 100]}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
        showPagination
        alwaysShowPagination
      />
    </PageLayout>
  );
};

export default InventoryUploadHistoryDetailPage;
