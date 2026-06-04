import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { engagementApi } from "@/features/engagement";
import type { ReplyDto } from "@/features/engagement/engagement.types";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { validateOrToast } from "@/shared/utils/validation";

type ReplyRow = Readonly<ReplyDto & { id?: string }>;

const toRows = (value: unknown): ReadonlyArray<ReplyRow> => {
  if (Array.isArray(value)) return value as ReadonlyArray<ReplyDto & { id?: string }>;
  if (!value || typeof value !== "object") return [];
  const nested = Object.values(value as Record<string, unknown>).find(Array.isArray);
  return Array.isArray(nested) ? (nested as ReadonlyArray<ReplyDto & { id?: string }>) : [];
};

const replySchema = z.object({
  message: z.string().min(1),
  inquiryId: z.string().optional(),
  contactId: z.string().optional(),
  siteInquiryId: z.string().optional(),
  repliedById: z.string().optional(),
  sortOrder: z.number().optional(),
});

const RepliesForm: React.FC<{
  initial?: Partial<ReplyDto>;
  onSubmit: (payload: ReplyDto) => Promise<void>;
  submitLabel: string;
  onInvalid: (message: string) => void;
}> = ({ initial, onSubmit, submitLabel, onInvalid }) => {
  const [json, setJson] = React.useState(JSON.stringify(initial ?? { message: "", inquiryId: "", contactId: "", siteInquiryId: "", repliedById: "", sortOrder: 0 }, null, 2));
  return (
    <div className="grid gap-3">
      <textarea className="min-h-[260px] w-full rounded border p-3 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
      <button
        className="rounded bg-zinc-900 px-3 py-2 text-sm text-white"
        onClick={async () => {
          let payload: unknown;
          try {
            payload = JSON.parse(json);
          } catch {
            onInvalid("Payload must be valid JSON");
            return;
          }
          const parsed = validateOrToast(replySchema, payload, { error: onInvalid }) as ReplyDto | null;
          if (!parsed) return;
          await onSubmit(parsed);
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
};

export const RepliesPage: React.FC = () => {
  const nav = useNavigate();
  const q = engagementApi.replies.hooks.useList();
  const del = engagementApi.replies.hooks.useSoftDelete();
  const rows = toRows(q.data?.data);
  const cols: ReadonlyArray<Readonly<{ key: keyof ReplyRow; label: string }>> = [
    { key: "message", label: "Message" },
    { key: "inquiryId", label: "Inquiry ID" },
    { key: "contactId", label: "Contact ID" },
    { key: "siteInquiryId", label: "Site Inquiry ID" },
    { key: "repliedById", label: "Replied By ID" },
    { key: "sortOrder", label: "Sort Order" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Replies</h1>
        <button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white" onClick={() => nav("/dashboard/support/replies/create")}>New Reply</button>
      </div>
      <table className="w-full rounded border bg-white">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left text-xs">{c.label}</th>
            ))}
            <th className="px-3 py-2 text-left text-xs">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)} className="border-t">
              {cols.map((c) => {
                const value = row[c.key];
                return (
                  <td key={c.key} className="px-3 py-2 text-sm">
                    {value == null || value === "" ? "-" : String(value)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-sm">
                <button className="mr-2 rounded border px-2 py-1 text-xs" onClick={() => nav(`/dashboard/support/replies/${row.id}/edit`)}>Edit</button>
                <button className="rounded border px-2 py-1 text-xs" onClick={() => void del.mutateAsync(String(row.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RepliesCreatePage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const create = engagementApi.replies.hooks.useCreate();
  return <RepliesForm onSubmit={async (payload) => { await create.mutateAsync(payload); nav("/dashboard/support/replies"); }} submitLabel="Create Reply" onInvalid={toast.error} />;
};

export const RepliesEditPage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const get = engagementApi.replies.hooks.useGet(id);
  const update = engagementApi.replies.hooks.useUpdate();
  return <RepliesForm initial={(get.data ?? {}) as Partial<ReplyDto>} onSubmit={async (payload) => { if (!id) return; await update.mutateAsync({ id, dto: payload }); nav("/dashboard/support/replies"); }} submitLabel="Update Reply" onInvalid={toast.error} />;
};
