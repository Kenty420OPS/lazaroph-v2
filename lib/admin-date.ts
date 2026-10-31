// Shared date helpers for admin API routes — Manila time (UTC+8).

const TZ = "Asia/Manila";

/** createdAt can be an ISO string (checkout route) or a Firestore Timestamp. */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof (value as any).toDate === "function") return (value as any).toDate();
  return null;
}

/** Returns YYYY-MM-DD in Asia/Manila. */
export function manilaDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Checks if a date string is valid YYYY-MM-DD. */
function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !isNaN(d.getTime());
}

/**
 * Parses and validates `from` and `to` date query params.
 * Returns { from, to } on success, { error } on bad input, or null when
 * neither param is present (meaning "all dates").
 */
export function parseDateRange(
  searchParams: URLSearchParams,
): { from: string; to: string } | { error: string } | null {
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from && !to) return null;

  if (!from || !to) {
    return { error: "Both 'from' and 'to' query params are required." };
  }

  if (!isValidDateString(from) || !isValidDateString(to)) {
    return { error: "Date params must be in YYYY-MM-DD format." };
  }

  if (from > to) {
    return { error: "'from' must not be after 'to'." };
  }

  const fromMs = new Date(from + "T00:00:00").getTime();
  const toMs = new Date(to + "T00:00:00").getTime();
  const diffDays = (toMs - fromMs) / (1000 * 60 * 60 * 24);
  if (diffDays > 366) {
    return { error: "Date range must not exceed 366 days." };
  }

  return { from, to };
}

/** Checks if a Manila day string falls within [from, to] inclusive. */
export function isInRange(day: string, from: string, to: string): boolean {
  return day >= from && day <= to;
}

