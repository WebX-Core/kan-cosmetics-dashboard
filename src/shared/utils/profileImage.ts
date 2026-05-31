const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toAbsoluteAssetUrl = (value: string): string => {
  const trimmed = value.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    return `${protocol}${trimmed}`;
  }

  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const fallbackOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const apiOrigin = configuredBaseUrl
    ? new URL(configuredBaseUrl, fallbackOrigin).origin
    : fallbackOrigin;

  return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, apiOrigin).toString();
};

const pickImageUrlFromObject = (value: Record<string, unknown>): string => {
  const candidates = [
    value.profileUrl,
    value.profilePicture,
    value.profile,
    value.avatar,
    value.image,
    value.url,
    value.path,
    value.src,
    value.secure_url,
    value.location,
  ];

  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return toAbsoluteAssetUrl(candidate);
    }
  }

  if (value.profilePicture && typeof value.profilePicture === "object") {
    return pickImageUrlFromObject(value.profilePicture as Record<string, unknown>);
  }
  if (value.profile && typeof value.profile === "object") {
    return pickImageUrlFromObject(value.profile as Record<string, unknown>);
  }

  return "";
};

export const resolveProfileImageUrl = (value: unknown): string => {
  if (isNonEmptyString(value)) return toAbsoluteAssetUrl(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return pickImageUrlFromObject(value as Record<string, unknown>);
};
