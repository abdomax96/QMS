import { nanoid } from 'nanoid';

/**
 * Client-side fallback run number generator.
 * DB RPC `generate_lab_v2_run_number` should be preferred when available.
 */
export function generateLabV2RunNumberFallback(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  // Not strictly sequential. Used only when RPC is unavailable.
  return `L2-RUN-${year}-${nanoid(6).toUpperCase()}`;
}

