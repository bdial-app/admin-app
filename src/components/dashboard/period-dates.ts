/** Date helpers for the dashboard period picker. */

// Calendar maths on 'YYYY-MM-DD' strings, in UTC so no local clock can shift a day.
export const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const ymdOf = (d: Date) => d.toISOString().slice(0, 10);
export const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`;
export const shiftMonth = (first: string, n: number) => {
  const d = utc(first);
  d.setUTCMonth(d.getUTCMonth() + n);
  return ymdOf(d);
};
export const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / 86_400_000) + 1;

/** "1 Nov", or "1 Nov 2025" when `year`. */
export const dayLabel = (ymd: string, year = false) =>
  utc(ymd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });

/** "1 – 8 Nov 2026", "28 Oct – 3 Nov 2026", "20 Dec 2025 – 3 Jan 2026". */
export function rangeLabel(from: string, to: string): string {
  if (from === to) return dayLabel(from, true);
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${dayLabel(from, true)} – ${dayLabel(to, true)}`;
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))} – ${dayLabel(to, true)}`;
  return `${dayLabel(from)} – ${dayLabel(to, true)}`;
}

/** Monday-first grid for a month: leading blanks, then each day. */
export function monthGrid(first: string): (string | null)[] {
  const d = utc(first);
  const lead = (d.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${first.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)];
}
