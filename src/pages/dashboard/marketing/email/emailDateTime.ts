export const withoutUtcSuffix = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/Z$/i, "") : undefined;
};
