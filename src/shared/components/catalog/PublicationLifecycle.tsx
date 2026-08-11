import React from "react";
import type { PublicationStatus } from "@/features/catalog/catalog.types";

export type PublicationView = "published" | "draft" | "archived";

export const readPublicationStatus = (value: unknown): PublicationStatus =>
  value === "DRAFT" || value === "ARCHIVED" || value === "PUBLISHED" ? value : "PUBLISHED";

export const PublicationStatusBadge: React.FC<{ status: PublicationStatus }> = ({ status }) => {
  const styles = status === "PUBLISHED"
    ? "bg-emerald-50 text-emerald-700"
    : status === "DRAFT"
      ? "bg-amber-50 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{status}</span>;
};

export const PublicationTabs: React.FC<{
  value: PublicationView;
  onChange: (value: PublicationView) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-2" aria-label="Publication status">
    {(["published", "draft", "archived"] as const).map((entry) => (
      <button
        key={entry}
        type="button"
        onClick={() => onChange(entry)}
        className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition-colors ${
          value === entry
            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
            : "border-[#d2d2d7] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]"
        }`}
      >
        {entry}
      </button>
    ))}
  </div>
);

