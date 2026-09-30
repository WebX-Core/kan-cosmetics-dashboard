import { Check, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicationStatusBadge } from "@/shared/components/catalog/PublicationLifecycle";
import type { MoveTarget } from "@/features/catalog/catalog.move";

interface MoveTargetOptionProps {
  target: MoveTarget;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function MoveTargetOption({ target, selected, onSelect }: MoveTargetOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(target.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
        selected
          ? "border-(--primary) bg-(--primary)/5"
          : "border-transparent hover:bg-[#f5f5f7]",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e5e5e7] bg-white">
        {target.image ? (
          <img src={target.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <FolderTree size={15} className="text-[#86868b]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-[#1d1d1f]">{target.title}</span>
        {target.context ? (
          <span className="mt-0.5 block truncate text-[12px] text-[#6e6e73]">{target.context}</span>
        ) : null}
      </span>
      {target.status !== "PUBLISHED" ? <PublicationStatusBadge status={target.status} /> : null}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
          selected ? "border-(--primary) bg-(--primary) text-white" : "border-[#d2d2d7] bg-white",
        )}
      >
        {selected ? <Check size={12} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
