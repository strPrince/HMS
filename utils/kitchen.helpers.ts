/**
 * Shared helper functions used across Kitchen screens.
 *
 * Extracted from:
 *   - app/(tabs)/kitchen.tsx
 *   - app/kitchen/order/[orderId].tsx
 *   - app/kitchen/ready/[orderId].tsx
 */

// ─── Time helpers ────────────────────────────────────────────────

/** Returns elapsed time as "HH:MM" since `createdAt` relative to `nowMs`. */
export const formatElapsed = (createdAt: string, nowMs: number): string => {
  const diffMs = Math.max(0, nowMs - new Date(createdAt).getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/** Returns 24-hour "HH:MM" string for the given ISO timestamp. */
export const formatOrderTime = (createdAt: string): string => {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// ─── Order classification ────────────────────────────────────────

/** Infer whether an order is dine-in or parcel from its tableId / notes. */
export const getOrderType = (
  tableId: string,
  notes?: string,
): 'dine-in' | 'parcel' => {
  const text = notes?.toLowerCase() || '';
  if (
    tableId.startsWith('p') ||
    text.includes('parcel') ||
    text.includes('takeaway')
  ) {
    return 'parcel';
  }
  return 'dine-in';
};

// ─── Text formatting ─────────────────────────────────────────────

/** Convert an enum-like value ("extra_spicy") to readable text ("Extra spicy"). */
export const toReadable = (value: unknown): string => {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (ch) => ch.toUpperCase());
};

/** Build a compact instruction string for a kitchen line item, or null if empty. */
export const getItemInstructionText = (line: any): string | null => {
  if (!line) return null;

  const notes = String(
    line.specialInstructions || line?.customizations?.notes || '',
  ).trim();
  const spice = String(
    line.spiceLevel || line?.customizations?.spiceLevel || '',
  ).trim();
  const diet = String(
    line.dietPreference || line?.customizations?.dietPreference || '',
  ).trim();

  const parts: string[] = [];
  if (spice) parts.push(`Spice: ${toReadable(spice)}`);
  if (diet) parts.push(`Diet: ${toReadable(diet)}`);
  if (notes) parts.push(`Note: ${notes}`);

  return parts.length ? parts.join(' • ') : null;
};
