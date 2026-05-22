export function firstForwardedIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}
