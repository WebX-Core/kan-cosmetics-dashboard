import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type ListQueryState = Readonly<{
  page: number;
  limit: number;
  search: string;
}>;

function toInt(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export function useListQueryState(defaults?: Partial<ListQueryState>): Readonly<{
  state: ListQueryState;
  setState: React.Dispatch<React.SetStateAction<ListQueryState>>;
  debouncedSearch: string;
}> {
  const [sp, setSp] = useSearchParams();

  const initial: ListQueryState = useMemo(() => {
    const page = toInt(sp.get("page"), defaults?.page ?? 1);
    const limit = toInt(sp.get("limit"), defaults?.limit ?? 10);
    const search = sp.get("search") ?? (defaults?.search ?? "");
    return { page, limit, search };
  }, [sp, defaults?.page, defaults?.limit, defaults?.search]);

  const [state, setState] = useState<ListQueryState>(initial);

  useEffect(() => {
    setState(initial);
  }, [initial]);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set("page", String(state.page));
    next.set("limit", String(state.limit));

    const s = state.search.trim();
    if (s) next.set("search", s);
    else next.delete("search");

    if (next.toString() !== sp.toString()) setSp(next, { replace: true });
  }, [state.page, state.limit, state.search, sp, setSp]);

  const debouncedSearch = useDebounced(state.search, 2000);

  return { state, setState, debouncedSearch };
}
