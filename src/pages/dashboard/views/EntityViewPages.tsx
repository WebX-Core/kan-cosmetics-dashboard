import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { z } from "zod";
import { useFaqGet, useFaqList } from "@/features/faq";
import { useTeamGet, useTeamList } from "@/features/team";
import { useNewsroomGet, useNewsroomList } from "@/features/newsroom";
import { useContactGet } from "@/features/contact";
import { useAdminUsersGet } from "@/features/adminUsers";
import { RecordView } from "@/shared/components/RecordView";
import { slugify } from "@/shared/utils/slug";

const viewedContactIdsSchema = z.array(z.string());

function renderView(title: string, backHref: string, editBase: string, q: { isLoading: boolean; isError: boolean; data?: unknown }, id?: string) {
  if (!id) return <div>Invalid id.</div>;
  if (q.isLoading) return <div>Loading...</div>;
  if (q.isError || !q.data) return <div>Failed to load.</div>;
  return <RecordView title={title} backHref={backHref} editHref={`${editBase}/${id}/edit`} data={q.data as Record<string, unknown>} />;
}

function isIdLike(value?: string): boolean {
  if (!value) return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{24}$/i.test(value)
  );
}

export const FaqViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const find = useFaqList({ page: 1, limit: 50, search: slug }, Boolean(slug));
  const id = React.useMemo(() => {
    if (!slug) return undefined;
    const rows = find.data?.data ?? [];
    const exact = rows.find((r) => slugify(r.title ?? "") === slug);
    return exact?.id ?? rows[0]?.id;
  }, [find.data?.data, slug]);
  const q = useFaqGet(id);
  if (!slug) return <div>Invalid slug.</div>;
  if (find.isLoading) return <div>Loading...</div>;
  if (!id) return <div>Not found.</div>;
  if (q.isLoading) return <div>Loading...</div>;
  if (q.isError || !q.data) return <div>Failed to load.</div>;

  const answer =
    typeof q.data.description === "string"
      ? q.data.description
      : q.data.description
        ? JSON.stringify(q.data.description)
        : "";

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: "14px 16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>FAQ Details</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Read full question and answer</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            to={`/dashboard/faqs/${slug}/edit`}
            title="Edit FAQ"
            aria-label="Edit FAQ"
            style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--primary)", color: "#fff", background: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <Pencil size={15} />
          </Link>
          <Link
            to="/dashboard/faqs"
            title="Back"
            aria-label="Back"
            style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--line)", color: "var(--text)", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Question</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{q.data.title}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Answer</div>
            <div dangerouslySetInnerHTML={{ __html: answer }} />
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--muted)" }}>
            <span>Status: {q.data.isActive ? "Active" : "Inactive"}</span>
            <span>Sort: {q.data.sortOrder ?? "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export const TeamViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const teamFind = useTeamList({ page: 1, limit: 200, search: slug }, Boolean(slug));
  const id = React.useMemo(() => {
    if (!slug) return undefined;
    const rows = teamFind.data?.data ?? [];
    return rows.find((r) => slugify(r.fullname ?? "") === slug)?.id ?? rows[0]?.id;
  }, [slug, teamFind.data?.data]);
  const q = useTeamGet(id);
  if (!slug) return <div>Invalid slug.</div>;
  if (teamFind.isLoading) return <div>Loading...</div>;
  if (!id) return <div>Not found.</div>;
  return renderView("Team Details", "/dashboard/team", "/dashboard/team", q, slug);
};
export const NewsroomViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const find = useNewsroomList({ page: 1, limit: 1, search: slug }, Boolean(slug));
  const id = React.useMemo(() => {
    if (isIdLike(slug)) return slug;
    const rows = find.data?.data ?? [];
    return rows.find((r) => r.slug === slug)?.id ?? rows[0]?.id;
  }, [find.data?.data, slug]);
  const q = useNewsroomGet(id);
  if (!slug) return <div>Invalid slug.</div>;
  if (find.isLoading) return <div>Loading...</div>;
  if (!id) return <div>Not found.</div>;
  return renderView("Newsroom Details", "/dashboard/newsroom", "/dashboard/newsroom", q, slug);
};
export const ContactViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const q = useContactGet(id);
  const qc = useQueryClient();

  React.useEffect(() => {
    if (!id || !q.data) return;

    try {
      const raw = sessionStorage.getItem("viewedContactIds");
      const candidate = raw ? JSON.parse(raw) : [];
      const parsed = viewedContactIdsSchema.safeParse(candidate).success ? candidate : [];
      const next = Array.from(new Set([...(Array.isArray(parsed) ? parsed : []), id]));
      sessionStorage.setItem("viewedContactIds", JSON.stringify(next));
      window.dispatchEvent(new Event("viewed-contacts-changed"));
    } catch {
      // no-op
    }

    qc.setQueriesData({ queryKey: ["contact", "list"] }, (prev: unknown) => {
      if (!prev || typeof prev !== "object") return prev;
      const root = prev as { data?: unknown };
      if (!Array.isArray(root.data)) return prev;
      return {
        ...root,
        data: root.data.map((row) =>
          row && typeof row === "object" && "id" in row && (row as { id?: string }).id === id
            ? { ...(row as Record<string, unknown>), isView: true, isViewed: true }
            : row
        ),
      };
    });

    void qc.invalidateQueries({ queryKey: ["contact", "list"] });
  }, [id, q.data, qc]);

  if (!id) return <div>Invalid id.</div>;
  if (q.isLoading) return <div>Loading...</div>;
  if (q.isError || !q.data) return <div>Failed to load.</div>;
  return <RecordView title="Contact Details" backHref="/dashboard/contact" data={q.data as Record<string, unknown>} />;
};
export const UsersViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const q = useAdminUsersGet(id);
  return renderView("User Details", "/dashboard/users", "/dashboard/users", q, id);
};
