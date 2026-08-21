import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, MessageSquare, Eye, Trash2, RotateCcw } from "lucide-react";
import { z } from "zod";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { StatCardV2 } from "@/shared/components/dashboard/StatCardV2";
import { DataTableV2 } from "@/shared/components/dashboard/DataTableV2";
import { StatusBadge } from "@/shared/components/dashboard/StatusBadge";
import { ReplyDialog } from "@/shared/components/support/ReplyDialog";
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
  useContactList,
  useSoftDeleteContact,
  useRecoverContact,
  useDestroyContact,
  useContactDeleted,
} from "@/features/contact";
import { engagementApi } from "@/features/engagement";
import { formatDateTime } from "@/shared/utils/date";
import { useListQueryState } from "@/shared/hooks/useListQueryState";
import { useConfirmAction } from "@/shared/hooks/useConfirmAction";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";

const viewedContactIdsSchema = z.array(z.string());

type ContactRow = Readonly<{ id: string; name: string; email: string; number: string; message: string; isView?: boolean; isViewed?: boolean; createdAt?: string }>;
const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const toRowsArray = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  if (typeof payload !== "object" || payload === null) return [];
  const row = payload as Record<string, unknown>;
  const directCandidates = [row.data, row.items, row.contacts, row.results];
  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    if (typeof candidate === "object" && candidate !== null) {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.data)) {
        return nested.data.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
      }
      if (Array.isArray(nested.items)) {
        return nested.items.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
      }
    }
  }
  return [];
};
const mapContacts = (payload: unknown): ReadonlyArray<ContactRow> =>
  toRowsArray(payload).map((row) => ({
    id: text(row.id ?? row._id, crypto.randomUUID()),
    name: text(row.name ?? row.fullname ?? row.fullName, "Unknown"),
    email: text(row.email, "—"),
    number: text(row.number ?? row.phoneNo ?? row.phone, "—"),
    message: text(row.message ?? row.details, "—"),
    isView: row.isView === true,
    isViewed: row.isViewed === true,
    createdAt: text(row.createdAt),
  }));

const LIVE_PATH = "/dashboard/contact";
const DELETED_PATH = "/dashboard/contact/deleted";

export const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isDeletedView = location.pathname === DELETED_PATH;

  const [viewedIds, setViewedIds] = React.useState<ReadonlySet<string>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<ReadonlyArray<string>>([]);
  const [replyTarget, setReplyTarget] = React.useState<{ id: string; name: string } | null>(null);
  const { state, setState, debouncedSearch } = useListQueryState({ page: 1, limit: 20, search: "" });
  const confirm = useConfirmAction();

  const { data: contactsData, isLoading: liveLoading, refetch } = useContactList(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    !isDeletedView,
  );
  const deletedQuery = useContactDeleted(
    { page: state.page, limit: state.limit, search: debouncedSearch || undefined },
    isDeletedView,
  );
  const softDelete = useSoftDeleteContact();
  const recover = useRecoverContact();
  const destroy = useDestroyContact();
  const createReply = engagementApi.replies.hooks.useCreate();

  const sourceData = isDeletedView ? deletedQuery.data : contactsData;
  const contacts = React.useMemo(() => mapContacts(sourceData), [sourceData]);
  const totalPages = (isDeletedView ? (deletedQuery.data as { totalPages?: number } | undefined)?.totalPages : contactsData?.totalPages) ?? 1;
  const totalMessages = (isDeletedView ? (deletedQuery.data as { total?: number } | undefined)?.total : contactsData?.total) ?? contacts.length;

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("viewedContactIds");
      const candidate = raw ? JSON.parse(raw) : [];
      const parsed = viewedContactIdsSchema.safeParse(candidate).success ? candidate : [];
      setViewedIds(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setViewedIds(new Set());
    }
  }, []);

  const stats = React.useMemo(() => {
    const unread = contacts.filter((c) => !c.isView && !c.isViewed && !viewedIds.has(c.id)).length;
    return { total: totalMessages, unread, viewed: contacts.length - unread };
  }, [contacts, viewedIds, totalMessages]);

  const visibleIds = React.useMemo(() => contacts.map((c) => c.id), [contacts]);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((prev) => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id));
  const toggleAll = (checked: boolean) =>
    setSelectedIds((prev) => checked ? Array.from(new Set([...prev, ...visibleIds])) : prev.filter((id) => !visibleIds.includes(id)));

  const handleConfirm = async () => {
    const { action, ids } = confirm;
    if (!ids.length) return;
    try {
      if (action === "delete") await softDelete.mutateAsync(ids.join(","));
      if (action === "recover") await recover.mutateAsync({ ids });
      if (action === "destroy") await destroy.mutateAsync(ids.join(","));
      await refetch();
      await deletedQuery.refetch();
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      toast.success(action === "recover" ? "Recovered." : action === "destroy" ? "Permanently deleted." : "Deleted.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    } finally {
      confirm.dismiss();
    }
  };

  const handleReply = async (message: string) => {
    if (!replyTarget) return;
    try {
      await createReply.mutateAsync({ message, contactId: replyTarget.id });
      toast.success("Reply sent.");
    } catch (error) {
      toast.error(parseApiError(error).message);
      throw error;
    }
  };

  const isLoading = isDeletedView ? deletedQuery.isLoading : liveLoading;

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all contacts" />,
      render: (c: ContactRow) => (
        <input type="checkbox" checked={selectedIds.includes(c.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleOne(c.id, e.target.checked)} aria-label={`Select ${c.id}`} />
      ),
      width: "44px",
    },
    {
      key: "sender", label: "Sender",
      render: (c: ContactRow) => (
        <div>
          <div className="font-medium text-gray-900">{c.name}</div>
          <div className="text-xs text-gray-400">{c.email} · {c.number}</div>
        </div>
      ),
    },
    { key: "message", label: "Message", render: (c: ContactRow) => <span className="line-clamp-1 text-sm text-gray-600">{c.message}</span> },
    {
      key: "status", label: "Status",
      render: (c: ContactRow) => {
        const viewed = Boolean(c.isView || c.isViewed || viewedIds.has(c.id));
        return <StatusBadge status={viewed ? "Viewed" : "Unread"} />;
      },
    },
    { key: "createdAt", label: "Date", render: (c: ContactRow) => <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span> },
    {
      key: "actions", label: "",
      render: (c: ContactRow) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {isDeletedView ? (
            <>
              <button type="button" onClick={() => confirm.prompt("recover", [c.id])} className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                <RotateCcw size={11} /> Recover
              </button>
              <button type="button" onClick={() => confirm.prompt("destroy", [c.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                <Trash2 size={11} /> Delete Permanently
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setReplyTarget({ id: c.id, name: c.name })} className="flex items-center gap-1 rounded-full border border-[#d2d2d7] bg-white px-2.5 py-1 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]">
                Reply
              </button>
              <button type="button" onClick={() => confirm.prompt("delete", [c.id])} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                <Trash2 size={11} /> Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      variant={isDeletedView ? "deleted" : undefined}
      title={isDeletedView ? "Deleted Messages" : "Contact Messages"}
      subtitle={isDeletedView ? "Deleted contact form submissions." : "Customer inquiries and contact form submissions."}
      onBack={isDeletedView ? () => navigate(LIVE_PATH) : undefined}
      searchValue={state.search}
      onSearchChange={(v) => setState((p) => ({ ...p, page: 1, search: v }))}
      searchPlaceholder="Search messages..."
    >
      {!isDeletedView && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCardV2 label="Total Messages" value={stats.total} icon={MessageSquare} colorVariant="blue" />
          <StatCardV2 label="Unread" value={stats.unread} icon={Mail} colorVariant="red" />
          <StatCardV2 label="Viewed" value={stats.viewed} icon={Eye} colorVariant="emerald" />
        </div>
      )}

      <DataTableV2
        columns={columns}
        data={[...contacts]}
        onRowClick={(row) => navigate(`/dashboard/contact/${String(row.id)}`)}
        actions={
          selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              {isDeletedView ? (
                <>
                  <button type="button" onClick={() => confirm.prompt("recover", selectedIds)} className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    <RotateCcw size={12} /> Recover ({selectedIds.length})
                  </button>
                  <button type="button" onClick={() => confirm.prompt("destroy", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
                    <Trash2 size={12} /> Delete Permanently ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => confirm.prompt("delete", selectedIds)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
                  <Trash2 size={12} /> Delete ({selectedIds.length})
                </button>
              )}
            </div>
          ) : undefined
        }
        searchValue={state.search}
        emptyMessage={isLoading ? "Loading messages..." : "No contact messages found."}
        showPagination
        currentPage={state.page}
        totalPages={totalPages}
        onPageChange={(p) => setState((prev) => ({ ...prev, page: p }))}
      />

      <ReplyDialog
        isOpen={replyTarget !== null}
        targetName={replyTarget?.name ?? ""}
        onClose={() => setReplyTarget(null)}
        onSubmit={handleReply}
      />

      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && confirm.dismiss()}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.action === "recover" ? "Recover message?" : confirm.action === "destroy" ? "Delete permanently?" : "Delete message?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.action === "recover" ? "This will restore the selected message." : "This permanently deletes the message and cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" onClick={confirm.dismiss}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm.action === "recover" ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700" : "rounded-full bg-red-600 text-white hover:bg-red-700"}
              onClick={() => void handleConfirm()}
            >
              {confirm.action === "recover" ? "Recover" : confirm.action === "destroy" ? "Delete Permanently" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};
