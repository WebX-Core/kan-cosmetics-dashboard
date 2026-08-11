import React from "react";
import { Archive, FilePenLine, Globe2 } from "lucide-react";
import type { PublicationStatus } from "@/features/catalog/catalog.types";

const options: ReadonlyArray<Readonly<{
  value: PublicationStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}>> = [
  { value: "DRAFT", label: "Draft", description: "Keep it private while you work.", icon: FilePenLine },
  { value: "PUBLISHED", label: "Published", description: "Make it available on the storefront.", icon: Globe2 },
  { value: "ARCHIVED", label: "Archived", description: "Store it without showing it publicly.", icon: Archive },
];

export const PublicationStatusSelector: React.FC<Readonly<{
  value: PublicationStatus;
  onChange: (value: PublicationStatus) => void;
  disabled?: boolean;
}>> = ({ value, onChange, disabled = false }) => (
  <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Publication status">
    {options.map((option) => {
      const Icon = option.icon;
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition ${
            selected
              ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/10"
              : "border-[#d2d2d7] bg-white hover:border-[#a1a1a6] hover:bg-[#fafafa]"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? "bg-[var(--primary)] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
            <Icon size={17} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#1d1d1f]">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-[#6e6e73]">{option.description}</span>
          </span>
        </button>
      );
    })}
  </div>
);

