import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { catalogApi } from "@/features/catalog";
import {
  type InventoryBulkUploadHistoryRow,
  toUploadHistoryRows,
  toUploadHistoryMeta,
} from "./uploadHistory";

const historyColumns = [
  { key: "fileName", label: "File", render: (r: InventoryBulkUploadHistoryRow) => <span className="font-medium text-[#1d1d1f]">{r.fileName}</span> },
  { key: "status", label: "Status", sortValue: (r: InventoryBulkUploadHistoryRow) => r.status, render: (r: InventoryBulkUploadHistoryRow) => <StatusBadge status={r.status} /> },
  { key: "totalRows", label: "Rows", sortValue: (r: InventoryBulkUploadHistoryRow) => r.totalRows, render: (r: InventoryBulkUploadHistoryRow) => r.totalRows },
  { key: "createdRows", label: "Created", sortValue: (r: InventoryBulkUploadHistoryRow) => r.createdRows, render: (r: InventoryBulkUploadHistoryRow) => r.createdRows },
  { key: "updatedRows", label: "Updated", sortValue: (r: InventoryBulkUploadHistoryRow) => r.updatedRows, render: (r: InventoryBulkUploadHistoryRow) => r.updatedRows },
  { key: "skippedRows", label: "Skipped", sortValue: (r: InventoryBulkUploadHistoryRow) => r.skippedRows, render: (r: InventoryBulkUploadHistoryRow) => r.skippedRows },
  { key: "failedRows", label: "Failed", sortValue: (r: InventoryBulkUploadHistoryRow) => r.failedRows, render: (r: InventoryBulkUploadHistoryRow) => <span className={r.failedRows > 0 ? "font-semibold text-red-600" : undefined}>{r.failedRows}</span> },
  {
    key: "uploadedBy",
    label: "Uploaded by",
    sortValue: (r: InventoryBulkUploadHistoryRow) => r.uploadedByName,
    render: (r: InventoryBulkUploadHistoryRow) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-[#1d1d1f]">{r.uploadedByName}</div>
        <div className="truncate text-[11px] text-[#86868b]">{r.uploadedByEmail}</div>
      </div>
    ),
  },
  { key: "createdAt", label: "Uploaded", sortValue: (r: InventoryBulkUploadHistoryRow) => r.createdAt, render: (r: InventoryBulkUploadHistoryRow) => <span className="text-[#6e6e73]">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</span> },
];

export const InventoryUploadHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const historyQuery = useQuery({
    queryKey: ["inventory", "bulk-upload-history", page, limit],
    queryFn: () => catalogApi.inventory.getBulkUploadHistory({ page, limit }),
  });

  const rows = React.useMemo(
    () => toUploadHistoryRows(historyQuery.data),
    [historyQuery.data],
  );
  const meta = React.useMemo(
    () => toUploadHistoryMeta(historyQuery.data),
    [historyQuery.data],
  );

  return (
    <PageLayout
      title="Inventory upload history"
      subtitle="Paginated sheet uploads and row outcomes."
      onBack={() => navigate("/dashboard/inventory")}
    >
      <DataTableV2
        columns={historyColumns}
        data={rows}
        rowId={(row) => row.id}
        onRowClick={(row) =>
          navigate(`/dashboard/inventory/upload-history/${row.id}`)
        }
        emptyMessage={
          historyQuery.isLoading
            ? "Loading upload history..."
            : "No inventory uploads yet."
        }
        currentPage={meta.page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
        pageSize={limit}
        pageSizeOptions={[10, 20, 50]}
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

export default InventoryUploadHistoryPage;
