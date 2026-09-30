import React from "react";
import { ArrowRight, FolderInput, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { MoveTargetOption } from "@/shared/components/catalog/MoveTargetOption";
import {
  CATALOG_MOVE_CONFIG,
  useMoveCatalogItem,
  useMoveTargets,
  type CatalogMoveKind,
} from "@/features/catalog/catalog.move";

export type MoveCatalogItem = Readonly<{
  id: string;
  name: string;
  parentId: string;
}>;

interface MoveCatalogItemDialogProps {
  kind: CatalogMoveKind;
  item: MoveCatalogItem | null;
  onClose: () => void;
}

interface RouteChipProps {
  label: string;
  value: string;
  muted?: boolean;
}

function RouteChip({ label, value, muted }: RouteChipProps) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#86868b]">{label}</div>
      <div className={cn("mt-0.5 truncate text-[13px] font-semibold", muted ? "text-[#86868b]" : "text-[#1d1d1f]")}>
        {value}
      </div>
    </div>
  );
}

export function MoveCatalogItemDialog({ kind, item, onClose }: MoveCatalogItemDialogProps) {
  const { parentLabel, childLabel } = CATALOG_MOVE_CONFIG[kind];
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const targetsQuery = useMoveTargets(kind, Boolean(item));
  const moveMutation = useMoveCatalogItem(kind);

  React.useEffect(() => {
    setSearch("");
    setSelectedId("");
  }, [item?.id]);

  const allTargets = React.useMemo(() => targetsQuery.data ?? [], [targetsQuery.data]);
  const currentParent = allTargets.find((target) => target.id === item?.parentId);
  const selectedTarget = allTargets.find((target) => target.id === selectedId);

  const targets = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return allTargets.filter(
      (target) =>
        target.id !== item?.parentId &&
        (!term || `${target.title} ${target.context}`.toLowerCase().includes(term)),
    );
  }, [allTargets, search, item?.parentId]);

  const handleMove = () => {
    if (!item || !selectedId) return;
    moveMutation.mutate({ id: item.id, parentId: selectedId }, { onSuccess: onClose });
  };

  const emptyMessage = search.trim() ? `No ${parentLabel} matches “${search.trim()}”.` : `No other ${parentLabel} available.`;

  return (
    <AlertDialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="w-[min(94vw,540px)] grid-cols-[minmax(0,1fr)] gap-5 bg-white">
        <AlertDialogHeader className="flex-row items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--primary)/10 text-(--primary)">
            <FolderInput size={18} />
          </span>
          <div className="min-w-0 space-y-1">
            <AlertDialogTitle className="capitalize">Move {childLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Pick a new {parentLabel} for <span className="font-semibold text-[#1d1d1f]">{item?.name}</span>. Only its
              parent changes.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-[#e5e5e7] bg-[#f5f5f7] px-4 py-3">
          <RouteChip label="From" value={currentParent?.title ?? `Current ${parentLabel}`} />
          <ArrowRight size={16} className="shrink-0 text-[#86868b]" />
          <RouteChip label="To" value={selectedTarget?.title ?? `Select a ${parentLabel}`} muted={!selectedTarget} />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${parentLabel}...`}
              aria-label={`Search ${parentLabel}`}
              autoFocus
              className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white pl-9 pr-3 text-[14px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/10"
            />
          </div>
          <div className="px-1 text-[12px] text-[#6e6e73]">
            {targetsQuery.isLoading ? "Loading..." : `${targets.length} available`}
          </div>
          <div role="listbox" aria-label={`Destination ${parentLabel}`} className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {targetsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={18} className="animate-spin text-[#86868b]" />
              </div>
            ) : targets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d2d2d7] px-4 py-8 text-center text-[13px] text-[#6e6e73]">
                {emptyMessage}
              </div>
            ) : (
              targets.map((target) => (
                <MoveTargetOption key={target.id} target={target} selected={target.id === selectedId} onSelect={setSelectedId} />
              ))
            )}
          </div>
        </div>

        <AlertDialogFooter className="border-t border-[#f0f0f2] pt-4">
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <Button type="button" className="gap-2 rounded-full" disabled={!selectedId || moveMutation.isPending} onClick={handleMove}>
            {moveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FolderInput size={14} />}
            {moveMutation.isPending ? "Moving..." : `Move ${childLabel}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
