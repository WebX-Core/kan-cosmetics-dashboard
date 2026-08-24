import React from "react";
import type { PublicationStatus } from "@/features/catalog/catalog.types";

export type PublicationView = "published" | "draft" | "archived";

export const PublicationStatusBadge: React.FC<{
  status: PublicationStatus;
}> = ({ status }) => {
  const styles =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "DRAFT"
        ? "bg-amber-50 text-amber-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {status}
    </span>
  );
};

export const PublicationTabs: React.FC<{
  value: PublicationView;
  onChange: (value: PublicationView) => void;
}> = ({ value, onChange }) => (
  <div className="flex" aria-label="Publication status filter">
    <label className="inline-flex min-h-8.5 items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-3.25 text-[13px] font-medium text-[#1d1d1f] transition focus-within:border-(--primary) focus-within:ring-2 focus-within:ring-(--primary)/10">
      <span className="text-[#6e6e73]">Status</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as PublicationView)}
        className="cursor-pointer bg-transparent capitalize outline-none"
        aria-label="Publication status"
      >
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
    </label>
  </div>
);
