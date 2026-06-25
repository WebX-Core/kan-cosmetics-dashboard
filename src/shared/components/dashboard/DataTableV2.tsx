import React from "react";
import {
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";

type Column<T> = {
  key: string;
  label: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  width?: string;
};

type Tab = {
  key: string;
  label: string;
  count?: number;
};

type Props<T> = {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tabs?: ReadonlyArray<Tab>;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  actions?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
  /** Row selection — provide rowId to extract a unique key from each row */
  rowId?: (row: T) => string;
  selectedIds?: ReadonlySet<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Bulk action bar rendered when at least one row is selected */
  bulkActions?: (selectedIds: Set<string>, clearSelection: () => void) => React.ReactNode;
};

export function DataTableV2<T extends Record<string, unknown>>({
  title,
  subtitle,
  icon,
  tabs,
  activeTab,
  onTabChange,
  columns,
  data,
  searchPlaceholder = "Search…",
  searchValue = "",
  onSearchChange,
  onEdit,
  onDelete,
  rowActions,
  onRowClick,
  actions,
  emptyMessage = "No records found.",
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPagination = true,
  rowId,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
}: Props<T>) {
  const isSelectable = Boolean(rowId);
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(new Set());
  const selected = controlledSelectedIds
    ? (controlledSelectedIds instanceof Set ? controlledSelectedIds : new Set(controlledSelectedIds))
    : internalSelected;

  const setSelected = React.useCallback((next: Set<string>) => {
    setInternalSelected(next);
    onSelectionChange?.(next);
  }, [onSelectionChange]);

  const clearSelection = React.useCallback(() => setSelected(new Set()), [setSelected]);

  const allPageIds = React.useMemo(
    () => (rowId ? data.map(rowId) : []),
    [data, rowId],
  );
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const somePageSelected = !allPageSelected && allPageIds.some((id) => selected.has(id));

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    if (allPageSelected) allPageIds.forEach((id) => next.delete(id));
    else allPageIds.forEach((id) => next.add(id));
    setSelected(next);
  };
  const highlightQuery = searchValue.trim();

  const highlightText = React.useCallback(
    (text: string): React.ReactNode => {
      if (!highlightQuery) return text;
      const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "ig");
      const parts = text.split(regex);
      if (parts.length === 1) {
        const letters = new Set(highlightQuery.toLowerCase().split(""));
        return Array.from(text).map((char, idx) =>
          letters.has(char.toLowerCase()) ? (
            <mark
              key={`${char}-${idx}`}
              className="rounded bg-[#ffe08a] px-px text-[#1d1d1f]"
            >
              {char}
            </mark>
          ) : (
            <React.Fragment key={`${char}-${idx}`}>{char}</React.Fragment>
          ),
        );
      }
      return parts.map((part, idx) =>
        part.toLowerCase() === highlightQuery.toLowerCase() ? (
          <mark
            key={`${part}-${idx}`}
            className="rounded bg-[#ffe08a] px-px text-[#1d1d1f]"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
        ),
      );
    },
    [highlightQuery],
  );

  function withHighlight(value: React.ReactNode): React.ReactNode {
    if (!highlightQuery) return value;
    if (typeof value === "string") return highlightText(value);
    if (typeof value === "number") return highlightText(String(value));
    if (Array.isArray(value)) return value.map((item) => withHighlight(item));

    if (React.isValidElement<{ children?: React.ReactNode }>(value)) {
      const childNodes = React.Children.toArray(value.props.children);
      if (childNodes.length === 0) return value;
      const highlightedChildren = childNodes.map((child) => withHighlight(child));
      return React.cloneElement(value, { ...value.props }, highlightedChildren);
    }

    return value;
  }

  /* Pagination page numbers — show at most 5, centred on current */
  const pageNumbers = React.useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const hasTabs = tabs && tabs.length > 0;
  const hasSearch = Boolean(onSearchChange);
  const hasToolbar = hasTabs || hasSearch || actions;
  const tabItems = tabs ?? [];
  const isLoadingState = data.length === 0 && /loading/i.test(String(emptyMessage));
  const effectiveData = data;
  const skeletonRows = 6;
  const [showDebounceSpinner, setShowDebounceSpinner] = React.useState(false);
  const [revealRows, setRevealRows] = React.useState(false);

  React.useEffect(() => {
    if (!onSearchChange) return;
    if (!searchValue.trim()) {
      setShowDebounceSpinner(false);
      return;
    }
    setShowDebounceSpinner(true);
    const timeoutId = window.setTimeout(
      () => setShowDebounceSpinner(false),
      2000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [searchValue, onSearchChange]);

  React.useEffect(() => {
    if (isLoadingState) {
      setRevealRows(false);
      return;
    }
    if (effectiveData.length === 0) return;
    const timeoutId = window.setTimeout(() => setRevealRows(true), 30);
    return () => window.clearTimeout(timeoutId);
  }, [isLoadingState, effectiveData.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e5e7] bg-white">
      {/* Optional header */}
      {(title || actions) && !hasToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-[13px] border-b border-[#e5e5e7] px-[21px] py-[13px]">
          <div className="flex items-center gap-[8px]">
            {icon}
            <div>
              {title && (
                <p className="text-[14px] font-semibold text-[#1d1d1f]">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="mt-[2px] text-[12px] text-[#6e6e73]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-[8px]">{actions}</div>
        </div>
      )}

      {/* Tabs + Search toolbar */}
      {hasToolbar && (
        <div className={`flex flex-col gap-[10px] border-b border-[#e5e5e7] px-[21px] py-[10px] ${hasTabs ? "lg:flex-row lg:items-center lg:justify-between" : "lg:flex-row lg:items-center lg:justify-end"}`}>
          {hasTabs ? (
            <label className="inline-flex min-h-[34px] items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white px-[13px] text-[13px] font-medium text-[#1d1d1f]">
              <span className="text-[#6e6e73]">Filter</span>
              <select
                value={activeTab ?? tabItems[0]?.key ?? "all"}
                onChange={(event) => onTabChange?.(event.target.value)}
                className="bg-transparent outline-none"
              >
                {tabItems.map((tab) => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label}
                    {tab.count !== undefined ? ` (${tab.count})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex shrink-0 flex-wrap items-center gap-[8px]">
            {hasSearch && (
              <div className="relative">
                <Search
                  size={12}
                  strokeWidth={2}
                  className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[#86868b]"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange!(e.target.value)}
                  className="h-[34px] w-[180px] rounded-full border border-[#d2d2d7] bg-[#f5f5f7] pl-[30px] pr-[30px] text-[12px] text-[#1d1d1f] placeholder-[#86868b] outline-none transition-all focus:w-[220px] focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/10"
                />
                {showDebounceSpinner ? (
                  <Loader2
                    size={12}
                    strokeWidth={2}
                    className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]"
                  />
                ) : null}
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {isSelectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center justify-between border-b border-[#e5e5e7] bg-[#f0f7ff] px-[21px] py-[10px]">
          <span className="text-[13px] font-medium text-[var(--primary)]">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-[8px]">
            {bulkActions(new Set(selected), clearSelection)}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f0f2]">
              {isSelectable && (
                <th className="w-[44px] px-[21px] py-[10px]">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
                    style={{
                      borderColor: allPageSelected || somePageSelected ? "var(--primary)" : "#d2d2d7",
                      background: allPageSelected ? "var(--primary)" : "white",
                    }}
                  >
                    {allPageSelected && <Check size={9} strokeWidth={3} className="text-white" />}
                    {somePageSelected && <div className="h-1.5 w-1.5 rounded-sm bg-[var(--primary)]" />}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-[21px] py-[10px] text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete || rowActions) && (
                <th className="px-[21px] py-[10px] text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoadingState ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className="border-b border-[#f5f5f7] last:border-0"
                >
                  {isSelectable && <td className="px-[21px] py-[13px]"><div className="h-4 w-4 animate-pulse rounded bg-[#f3f3f5]" /></td>}
                  {columns.map((col) => (
                    <td
                      key={`${col.key}-${rowIndex}`}
                      className="px-[21px] py-[13px]"
                    >
                      <div className="h-[14px] w-full animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                  ))}
                  {(onEdit || onDelete || rowActions) && (
                    <td className="px-[21px] py-[13px]">
                      <div className="ml-auto h-[14px] w-[42px] animate-pulse rounded bg-[#f3f3f5]" />
                    </td>
                  )}
                </tr>
              ))
            ) : effectiveData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete || rowActions ? 1 : 0) + (isSelectable ? 1 : 0)}
                  className="px-[21px] py-[55px] text-center text-[14px] text-[#86868b]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              effectiveData.map((row, idx) => {
                const rid = rowId ? rowId(row) : "";
                const isRowSelected = isSelectable && selected.has(rid);
                return (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-[#f5f5f7] transition-colors last:border-0 ${
                    isRowSelected ? "bg-[#f0f7ff]" : "hover:bg-[#fafafa]"
                  } ${onRowClick ? "cursor-pointer" : ""} ${revealRows ? "table-row-reveal" : "opacity-0"}`}
                  style={revealRows ? { animationDelay: `${idx * 45}ms` } : undefined}
                >
                  {isSelectable && (
                    <td className="px-[21px] py-[13px]">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleRow(rid); }}
                        className="flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
                        style={{
                          borderColor: isRowSelected ? "var(--primary)" : "#d2d2d7",
                          background: isRowSelected ? "var(--primary)" : "white",
                        }}
                      >
                        {isRowSelected && <Check size={9} strokeWidth={3} className="text-white" />}
                      </button>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-[21px] py-[13px] text-[14px] leading-[22px] text-[#1d1d1f]"
                    >
                      {withHighlight(
                        col.render
                          ? col.render(row)
                          : (row[col.key] as React.ReactNode),
                      )}
                    </td>
                  ))}
                  {(onEdit || onDelete || rowActions) && (
                    <td className="px-[21px] py-[13px] text-right">
                      {rowActions ? (
                        <div className="flex items-center justify-end">{rowActions(row)}</div>
                      ) : (
                        <div className="flex items-center justify-end gap-[5px]">
                          {onEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(row);
                              }}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                            >
                              <Edit size={13} strokeWidth={2} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(row);
                              }}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#86868b] transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination — golden ratio heights and spacing */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#f0f0f2] px-[21px] py-[13px]">
          <p className="text-[12px] text-[#86868b]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-[5px]">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={13} strokeWidth={2} />
            </button>

            {pageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange?.(1)}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[11px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                >
                  1
                </button>
                {pageNumbers[0] > 2 && (
                  <span className="px-[2px] text-[12px] text-[#86868b]">…</span>
                )}
              </>
            )}

            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange?.(page)}
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[11px] font-medium transition-colors ${
                  currentPage === page
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[#d2d2d7] text-[#6e6e73] hover:bg-[#f5f5f7]"
                }`}
              >
                {page}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="px-[2px] text-[12px] text-[#86868b]">…</span>
                )}
                <button
                  onClick={() => onPageChange?.(totalPages)}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[11px] font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7]"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-full border border-[#d2d2d7] text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
