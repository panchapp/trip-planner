/**
 * Trip date fields are ISO strings from the API. We compare and edit by **calendar day** using UTC
 * date parts (`toDateInputValue` / `fromDateInputValue`) so `sameCalendarDate` stays consistent.
 */
/** Local calendar date → `YYYY-MM-DD` (same convention as native date inputs). */
export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converts API ISO date strings to `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Converts `<input type="date">` value to ISO string for the API. */
export function fromDateInputValue(dateInput: string): string | null {
  const t = dateInput.trim();
  if (!t) return null;
  return new Date(`${t}T00:00:00.000Z`).toISOString();
}

export function sameCalendarDate(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return toDateInputValue(a) === toDateInputValue(b);
}
