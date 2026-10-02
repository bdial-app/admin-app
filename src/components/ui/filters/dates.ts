import type { DatePreset, FilterValues } from './types';

/** Today's calendar date in IST, which is how admins read every date here. */
export const istDay = (offsetDays = 0): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() - offsetDays * 86_400_000));

const istParts = () => {
  const [y, m] = istDay().split('-').map(Number);
  return { y, m };
};
const pad = (n: number) => String(n).padStart(2, '0');
const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const DATE_PRESETS: DatePreset[] = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'yesterday', label: 'Yesterday', range: () => ({ from: istDay(1), to: istDay(1) }) },
  { value: '7d', label: 'Last 7 days', days: 6 },
  { value: '30d', label: 'Last 30 days', days: 29 },
  { value: '90d', label: 'Last 90 days', days: 89 },
  { value: 'this_month', label: 'This month', range: () => { const { y, m } = istParts(); return { from: `${y}-${pad(m)}-01` }; } },
  { value: 'last_month', label: 'Last month', range: () => {
    const { y, m } = istParts();
    const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
    return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(lastDayOf(py, pm))}` };
  } },
];

/** Presets that look forward, for "ends within" style filters. */
export const FUTURE_PRESETS: DatePreset[] = [
  { value: 'next_7d', label: 'Next 7 days', range: () => ({ from: istDay(), to: istDay(-6) }) },
  { value: 'next_30d', label: 'Next 30 days', range: () => ({ from: istDay(), to: istDay(-29) }) },
];

export const presetRange = (p: DatePreset): { from: string; to?: string } =>
  p.range ? p.range() : { from: istDay(p.days ?? 0) };

/** Which preset the current from/to pair matches, 'custom' if none, '' if unset. */
export function matchPreset(presets: DatePreset[], from?: string, to?: string): string {
  if (!from && !to) return '';
  for (const p of presets) {
    const r = presetRange(p);
    if (r.from === from && (r.to ?? undefined) === (to ?? undefined)) return p.value;
  }
  return 'custom';
}

export const shortDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Chip text for a date range filter. */
export function dateRangeLabel(presets: DatePreset[], values: FilterValues, key: string): string | null {
  const from = values[`${key}From`], to = values[`${key}To`];
  if (!from && !to) return null;
  const preset = matchPreset(presets, from, to);
  if (preset && preset !== 'custom') return presets.find((p) => p.value === preset)!.label.toLowerCase();
  return `${from ? shortDate(from) : '…'} – ${to ? shortDate(to) : 'today'}`;
}
