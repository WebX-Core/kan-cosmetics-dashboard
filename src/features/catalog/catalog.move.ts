import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/shared/api/api";
import { useToast } from "@/shared/components/feedback/ToastProvider";
import { parseApiError } from "@/shared/utils/apiError";
import type { PublicationStatus } from "./catalog.types";

export type CatalogMoveKind = "subcategory" | "product" | "variant";

type MoveConfig = Readonly<{
  childKey: string;
  childLabel: string;
  childPath: string;
  parentKey: string;
  parentLabel: string;
  parentPath: string;
  bodyField: string;
}>;

export const CATALOG_MOVE_CONFIG: Readonly<Record<CatalogMoveKind, MoveConfig>> = {
  subcategory: {
    childKey: "subcategories",
    childLabel: "subcategory",
    childPath: "/subcategory",
    parentKey: "categories",
    parentLabel: "category",
    parentPath: "/category",
    bodyField: "categoryId",
  },
  product: {
    childKey: "products",
    childLabel: "product",
    childPath: "/product",
    parentKey: "subcategories",
    parentLabel: "subcategory",
    parentPath: "/subcategory",
    bodyField: "subcategoryId",
  },
  variant: {
    childKey: "productVariants",
    childLabel: "variant",
    childPath: "/product-variant",
    parentKey: "products",
    parentLabel: "product",
    parentPath: "/product",
    bodyField: "productId",
  },
};

export type MoveTarget = Readonly<{
  id: string;
  title: string;
  context: string;
  image: string;
  status: PublicationStatus;
}>;

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readTitle = (value: unknown): string =>
  isRecord(value) && typeof (value.title ?? value.name) === "string" ? String(value.title ?? value.name) : "";

const readStatus = (value: unknown): PublicationStatus =>
  value === "DRAFT" || value === "ARCHIVED" ? value : "PUBLISHED";

// Dashboard lists come back as { categories | subcategories | products: [...], total, ... }.
const toRows = (payload: unknown): ReadonlyArray<RawRecord> => {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  const rows = Object.values(payload).find(Array.isArray);
  return rows ? rows.filter(isRecord) : toRows(payload.data);
};

// Breadcrumb of the target's own parents so same-named targets are distinguishable.
const readContext = (row: RawRecord): string => {
  const subcategory = row.subcategory;
  const category = row.category ?? (isRecord(subcategory) ? subcategory.category : undefined);
  return [readTitle(category), readTitle(subcategory)].filter(Boolean).join(" / ");
};

const toMoveTarget = (row: RawRecord): MoveTarget => ({
  id: String(row.id ?? ""),
  title: readTitle(row) || "Untitled",
  context: readContext(row),
  image: typeof row.coverImage === "string" ? row.coverImage : "",
  status: readStatus(row.status),
});

export const useMoveTargets = (kind: CatalogMoveKind, enabled: boolean) => {
  const { parentKey, parentPath } = CATALOG_MOVE_CONFIG[kind];
  return useQuery({
    queryKey: [parentKey, "move-targets"],
    // ponytail: single 1000-row fetch, switch to server search if a catalog level outgrows it
    queryFn: async () => {
      const res = await api.get(`${parentPath}/dashboard/get-all`, {
        params: { status: "ALL", page: 1, limit: 1000 },
      });
      return toRows(unwrap<unknown>(res)).map(toMoveTarget).filter((target) => target.id);
    },
    enabled,
    staleTime: 30_000,
  });
};

export const useMoveCatalogItem = (kind: CatalogMoveKind) => {
  const qc = useQueryClient();
  const toast = useToast();
  const config = CATALOG_MOVE_CONFIG[kind];

  return useMutation({
    mutationFn: async (vars: Readonly<{ id: string; parentId: string }>) =>
      unwrap<unknown>(
        await api.put(`${config.childPath}/move/${vars.id}`, { [config.bodyField]: vars.parentId }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [config.childKey] });
      void qc.invalidateQueries({ queryKey: [config.parentKey] });
      toast.success(`The ${config.childLabel} has been moved successfully.`);
    },
    onError: (error) => toast.error(parseApiError(error).message),
  });
};
