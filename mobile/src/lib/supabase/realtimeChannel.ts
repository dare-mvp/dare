export function uniqueRealtimeChannelName(baseName: string): string {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
