import type { PublicationStatus } from "@/features/catalog/catalog.types";

export const readPublicationStatus = (value: unknown): PublicationStatus =>
  value === "DRAFT" || value === "ARCHIVED" || value === "PUBLISHED"
    ? value
    : "PUBLISHED";
