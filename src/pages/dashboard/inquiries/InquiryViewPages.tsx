import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, MessageSquare, Send, User } from "lucide-react";
import { PageLayout } from "@/shared/components/dashboard/PageLayout";
import { engagementApi } from "@/features/engagement";
import { parseApiError } from "@/shared/utils/apiError";
import { useToast } from "@/shared/components/feedback/ToastProvider";

type InquiryKind = "product" | "site";

type InquiryRecord = Readonly<{
  id: string;
  customerName: string;
  email: string;
  subject: string;
  message: string;
  isHandled: boolean;
  createdAt: string;
}>;

type ReplyRecord = Readonly<{
  id: string;
  message: string;
  inquiryId?: string;
  siteInquiryId?: string;
  contactId?: string;
  repliedById?: string;
  createdAt: string;
}>;

const text = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const toRowsArray = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    );
  }
  if (typeof payload !== "object" || payload === null) return [];
  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.items, root.results, root.inquiries, root.siteInquiries];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      );
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.data)) {
        return nested.data.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        );
      }
    }
  }
  return [];
};

const normalizeInquiry = (row: Record<string, unknown>, kind: InquiryKind): InquiryRecord => ({
  id: text(row.id ?? row._id, ""),
  customerName: text(
    row.customerName ?? row.fullName ?? row.fullname ?? row.name,
    "Unknown",
  ),
  email: text(row.email, "—"),
  subject:
    kind === "product"
      ? text(row.subject ?? row.targetName ?? row.targetType ?? row.inquiryType, "Inquiry")
      : text(row.subject ?? row.inquiryType, "Site Inquiry"),
  message: kind === "product" ? text(row.message, "—") : text(row.message ?? row.details, "—"),
  isHandled: row.isHandled === true,
  createdAt: text(row.createdAt, ""),
});

const normalizeReply = (row: Record<string, unknown>): ReplyRecord => ({
  id: text(row.id ?? row._id, crypto.randomUUID()),
  message: text(row.message, ""),
  inquiryId: text(row.inquiryId, "") || undefined,
  siteInquiryId: text(row.siteInquiryId, "") || undefined,
  contactId: text(row.contactId, "") || undefined,
  repliedById: text(row.repliedById, "") || undefined,
  createdAt: text(row.createdAt, ""),
});

const dateLabel = (value: string): string =>
  value ? new Date(value).toLocaleString() : "Unknown time";

const InquiryView: React.FC<Readonly<{ kind: InquiryKind }>> = ({ kind }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id = "" } = useParams<{ id: string }>();
  const [replyMessage, setReplyMessage] = React.useState("");

  const getQuery =
    kind === "product"
      ? engagementApi.inquiries.crud.hooks.useGet(id, Boolean(id))
      : engagementApi.siteInquiries.hooks.useGet(id, Boolean(id));
  const listQuery =
    kind === "product"
      ? engagementApi.inquiries.crud.hooks.useList({ page: 1, limit: 500 })
      : engagementApi.siteInquiries.hooks.useList({ page: 1, limit: 500 });
  const repliesQuery = engagementApi.replies.hooks.useList({ page: 1, limit: 500 });
  const createReply = engagementApi.replies.hooks.useCreate();

  const currentInquiry = React.useMemo(() => {
    if (!getQuery.data || typeof getQuery.data !== "object") return null;
    return normalizeInquiry(getQuery.data as Record<string, unknown>, kind);
  }, [getQuery.data, kind]);

  const allInquiries = React.useMemo(
    () => toRowsArray(listQuery.data).map((row) => normalizeInquiry(row, kind)),
    [listQuery.data, kind],
  );

  const history = React.useMemo(() => {
    const email = currentInquiry?.email?.toLowerCase() ?? "";
    if (!email) return [] as ReadonlyArray<InquiryRecord>;
    return allInquiries
      .filter((item) => item.email.toLowerCase() === email)
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
  }, [allInquiries, currentInquiry?.email]);

  const allReplies = React.useMemo(
    () => toRowsArray(repliesQuery.data).map(normalizeReply),
    [repliesQuery.data],
  );

  const repliesByInquiryId = React.useMemo(() => {
    const map = new Map<string, ReplyRecord[]>();
    for (const reply of allReplies) {
      const targetId = kind === "product" ? reply.inquiryId : reply.siteInquiryId;
      if (!targetId) continue;
      const prev = map.get(targetId) ?? [];
      map.set(targetId, [...prev, reply]);
    }
    return map;
  }, [allReplies, kind]);

  const currentReplies = repliesByInquiryId.get(id) ?? [];
  const [openHistoryId, setOpenHistoryId] = React.useState<string>(id);

  React.useEffect(() => {
    setOpenHistoryId(id);
  }, [id]);

  const toggleHistoryItem = (inquiryId: string) => {
    setOpenHistoryId((prev) => (prev === inquiryId ? "" : inquiryId));
  };

  const submitReply = async () => {
    const message = replyMessage.trim();
    if (!message) {
      toast.error("Reply message is required.");
      return;
    }
    try {
      await createReply.mutateAsync(
        kind === "product" ? { message, inquiryId: id } : { message, siteInquiryId: id },
      );
      setReplyMessage("");
      await repliesQuery.refetch();
      await getQuery.refetch();
      await listQuery.refetch();
      toast.success("Reply sent.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (!id) {
    return <div className="p-6 text-sm text-[#6e6e73]">Invalid inquiry id.</div>;
  }
  if (getQuery.isLoading) {
    return <div className="p-6 text-sm text-[#6e6e73]">Loading inquiry...</div>;
  }
  if (!currentInquiry) {
    return <div className="p-6 text-sm text-[#6e6e73]">Inquiry not found.</div>;
  }

  const backPath =
    kind === "product"
      ? "/dashboard/support/product-inquiries"
      : "/dashboard/support/site-inquiries";

  return (
    <PageLayout
      title={kind === "product" ? "Product Inquiry" : "Site Inquiry"}
      subtitle="View inquiry, customer history, and reply timeline."
      onBack={() => navigate(backPath)}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Inquiry Details</h3>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">
                Customer
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {currentInquiry.customerName}
              </p>
              <p className="text-[#6e6e73]">{currentInquiry.email}</p>
            </div>
            <div className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">
                Subject
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {currentInquiry.subject}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[#424245]">
                {currentInquiry.message}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
              <span className="text-[#6e6e73]">Status</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  currentInquiry.isHandled
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {currentInquiry.isHandled ? "Resolved" : "New"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Reply</h3>
          <div className="mt-3">
            <textarea
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Write a reply for this inquiry..."
              rows={4}
              className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white p-3 text-[13px] text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void submitReply()}
                disabled={createReply.isPending}
                className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[#0071e3] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50"
              >
                <Send size={13} />
                {createReply.isPending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-[13px] font-semibold text-[#1d1d1f]">Previous Replies</h4>
            <div className="mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {currentReplies.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#d2d2d7] p-3 text-[12px] text-[#86868b]">
                  No replies yet.
                </p>
              ) : (
                currentReplies
                  .sort(
                    (a, b) =>
                      new Date(a.createdAt || 0).getTime() -
                      new Date(b.createdAt || 0).getTime(),
                  )
                  .map((reply) => (
                    <div key={reply.id} className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
                      <p className="whitespace-pre-wrap text-[13px] text-[#1d1d1f]">
                        {reply.message}
                      </p>
                      <p className="mt-2 text-[11px] text-[#86868b]">
                        {dateLabel(reply.createdAt)}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-[#e5e5e7] bg-white p-4">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
          Conversation History ({history.length})
        </h3>
        <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {history.map((item) => {
            const inquiryReplies = repliesByInquiryId.get(item.id) ?? [];
            const isCurrent = item.id === id;
            const isOpen = openHistoryId === item.id;
            return (
              <article
                key={item.id}
                className={`rounded-xl border p-3 ${
                  isCurrent
                    ? "border-[#0071e3]/40 bg-[#f0f7ff]"
                    : "border-[#f0f0f2] bg-[#fafafa]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleHistoryItem(item.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#6e6e73]">
                    <User size={11} />
                    {item.customerName}
                  </span>
                  <span className="text-[11px] text-[#86868b]">
                    {dateLabel(item.createdAt)}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.isHandled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.isHandled ? "Resolved" : "New"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-[#86868b] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <p className="mt-2 text-[13px] font-medium text-[#1d1d1f]">{item.subject}</p>
                {isOpen ? (
                  <div className="mt-1 space-y-2">
                    <p className="whitespace-pre-wrap text-[12px] text-[#424245]">{item.message}</p>
                    {inquiryReplies.map((reply) => (
                      <div key={reply.id} className="rounded-lg border border-[#d2d2d7] bg-white p-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-[#6e6e73]">
                          <MessageSquare size={11} /> Reply
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#1d1d1f]">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
};

export const ProductInquiryViewPage: React.FC = () => <InquiryView kind="product" />;

export const SiteInquiryViewPage: React.FC = () => <InquiryView kind="site" />;

type ContactRecord = Readonly<{
  id: string;
  name: string;
  email: string;
  number: string;
  message: string;
  createdAt: string;
}>;

const normalizeContact = (row: Record<string, unknown>): ContactRecord => ({
  id: text(row.id ?? row._id, ""),
  name: text(row.name ?? row.fullname ?? row.fullName, "Unknown"),
  email: text(row.email, "—"),
  number: text(row.number ?? row.phoneNo ?? row.phone, "—"),
  message: text(row.message ?? row.details, "—"),
  createdAt: text(row.createdAt, ""),
});

export const ContactConversationViewPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id = "" } = useParams<{ id: string }>();
  const [replyMessage, setReplyMessage] = React.useState("");
  const [openHistoryId, setOpenHistoryId] = React.useState<string>(id);

  const getQuery = engagementApi.contacts.hooks.useGet(id, Boolean(id));
  const listQuery = engagementApi.contacts.hooks.useList({ page: 1, limit: 500 });
  const repliesQuery = engagementApi.replies.hooks.useList({ page: 1, limit: 500 });
  const createReply = engagementApi.replies.hooks.useCreate();

  React.useEffect(() => {
    setOpenHistoryId(id);
  }, [id]);

  const currentContact = React.useMemo(() => {
    if (!getQuery.data || typeof getQuery.data !== "object") return null;
    return normalizeContact(getQuery.data as Record<string, unknown>);
  }, [getQuery.data]);

  const history = React.useMemo(() => {
    const email = currentContact?.email?.toLowerCase() ?? "";
    if (!email) return [] as ReadonlyArray<ContactRecord>;
    return toRowsArray(listQuery.data)
      .map(normalizeContact)
      .filter((item) => item.email.toLowerCase() === email)
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
  }, [listQuery.data, currentContact?.email]);

  const repliesByContactId = React.useMemo(() => {
    const map = new Map<string, ReplyRecord[]>();
    for (const row of toRowsArray(repliesQuery.data)) {
      const reply = normalizeReply(row);
      if (!reply.id || !reply.contactId) continue;
      const existing = map.get(reply.contactId) ?? [];
      map.set(reply.contactId, [...existing, reply]);
    }
    return map;
  }, [repliesQuery.data]);

  const submitReply = async () => {
    const message = replyMessage.trim();
    if (!message) {
      toast.error("Reply message is required.");
      return;
    }
    try {
      await createReply.mutateAsync({ message, contactId: id });
      setReplyMessage("");
      await repliesQuery.refetch();
      toast.success("Reply sent.");
    } catch (error) {
      toast.error(parseApiError(error).message);
    }
  };

  if (!id) return <div className="p-6 text-sm text-[#6e6e73]">Invalid contact id.</div>;
  if (getQuery.isLoading) return <div className="p-6 text-sm text-[#6e6e73]">Loading contact...</div>;
  if (!currentContact) return <div className="p-6 text-sm text-[#6e6e73]">Contact not found.</div>;

  return (
    <PageLayout
      title="Contact Conversation"
      subtitle="Latest message, previous messages, and reply thread."
      onBack={() => navigate("/dashboard/contact")}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-xl border border-[#e5e5e7] bg-white p-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Latest Message</h3>
          <div className="mt-3 space-y-3 text-[13px]">
            <div className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">
                Sender
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#1d1d1f]">
                {currentContact.name}
              </p>
              <p className="text-[#6e6e73]">{currentContact.email}</p>
              <p className="text-[#6e6e73]">{currentContact.number}</p>
            </div>
            <div className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6e6e73]">
                Message
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-[#424245]">
                {currentContact.message}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e5e7] bg-white p-4">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Reply</h3>
          <div className="mt-3">
            <textarea
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Write a reply for this contact..."
              rows={4}
              className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white p-3 text-[13px] text-[#1d1d1f] outline-none transition focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void submitReply()}
                disabled={createReply.isPending}
                className="inline-flex h-[34px] items-center gap-2 rounded-full bg-[#0071e3] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0066cc] disabled:opacity-50"
              >
                <Send size={13} />
                {createReply.isPending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-[#e5e5e7] bg-white p-4">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
          Conversation History ({history.length})
        </h3>
        <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {history.map((item) => {
            const isOpen = openHistoryId === item.id;
            const itemReplies = repliesByContactId.get(item.id) ?? [];
            return (
              <article key={item.id} className="rounded-xl border border-[#f0f0f2] bg-[#fafafa] p-3">
                <button
                  type="button"
                  onClick={() => setOpenHistoryId((prev) => (prev === item.id ? "" : item.id))}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#6e6e73]">
                    <User size={11} />
                    {item.name}
                  </span>
                  <span className="text-[11px] text-[#86868b]">{dateLabel(item.createdAt)}</span>
                  <ChevronDown
                    size={14}
                    className={`ml-auto text-[#86868b] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen ? (
                  <div className="mt-2 space-y-2">
                    <p className="whitespace-pre-wrap text-[12px] text-[#424245]">{item.message}</p>
                    {itemReplies.map((reply) => (
                      <div key={reply.id} className="rounded-lg border border-[#d2d2d7] bg-white p-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-[#6e6e73]">
                          <MessageSquare size={11} /> Reply
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#1d1d1f]">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
};
