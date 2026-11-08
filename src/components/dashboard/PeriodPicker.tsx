import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DATE_PRESETS, istDay, matchPreset, presetRange } from '../ui/filters';
import type { DatePreset, FilterValues } from '../ui/filters';
import { dayLabel, daysBetween, monthGrid, monthStart, rangeLabel, shiftMonth, utc } from './period-dates';

/** One click away, in the bar. Everything else lives in the custom panel. */
const QUICK: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'this_month', label: 'This month' },
  { value: '', label: 'All time' },
];

const THIS_YEAR: DatePreset = { value: 'this_year', label: 'This year', range: () => ({ from: `${istDay().slice(0, 4)}-01-01` }) };
const PANEL_PRESETS: DatePreset[] = [...DATE_PRESETS, THIS_YEAR];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface PeriodPickerProps {
  values: FilterValues;
  /** Merges into the URL; absent keys mean "all time" / "not comparing". */
  onChange: (patch: FilterValues) => void;
}

/**
 * The dashboard's period: quick presets in a segmented bar, a custom range
 * on a two-month calendar, and "compare with the previous period".
 * Dates are IST calendar days; an open end means "up to today".
 */
export function PeriodPicker({ values, onChange }: PeriodPickerProps) {
  const from = values.rangeFrom;
  const to = values.rangeTo;
  const matched = matchPreset(PANEL_PRESETS, from, to);
  const quickOn = QUICK.some((q) => q.value === matched);
  const comparing = values.compare === 'true';

  const pick = (p: string) => {
    if (!p) return onChange({ rangeFrom: undefined, rangeTo: undefined, compare: undefined });
    const preset = PANEL_PRESETS.find((x) => x.value === p)!;
    const r = presetRange(preset);
    onChange({ rangeFrom: r.from, rangeTo: r.to });
  };

  const customText = !quickOn && from
    ? PANEL_PRESETS.find((p) => p.value === matched)?.label ?? rangeLabel(from, to ?? istDay())
    : 'Custom';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Period" className="-mx-1 flex max-w-full overflow-x-auto px-1">
        <div className="flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
          {QUICK.map((q) => {
            const on = matched === q.value;
            return (
              <button
                key={q.label}
                role="radio"
                aria-checked={on}
                onClick={() => pick(q.value)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-ring"
                style={{
                  background: on ? 'var(--surface-0)' : 'transparent',
                  color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: on ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      <CustomRange
        label={customText}
        active={!quickOn && !!from}
        from={from}
        to={to}
        matched={matched}
        onPick={pick}
        onApply={(f, t) => onChange({ rangeFrom: f, rangeTo: t === istDay() ? undefined : t })}
      />

      <CompareSwitch
        on={comparing && !!from}
        disabled={!from}
        onToggle={() => onChange({ compare: comparing ? undefined : 'true' })}
      />
    </div>
  );
}

function CompareSwitch({ on, disabled, onToggle }: { on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      title={disabled ? 'Pick a period first — there is nothing before “all time” to compare with' : 'Show each figure against the period of the same length just before'}
      className="ml-auto inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-ring disabled:cursor-not-allowed"
      style={{
        background: 'var(--surface-0)',
        border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
        color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
      }}
    >
      <span
        className="relative h-4 w-7 shrink-0 rounded-full transition-colors"
        style={{ background: on ? 'var(--color-primary)' : 'var(--surface-3)', opacity: disabled ? 0.5 : 1 }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all"
          style={{ left: on ? 14 : 2 }}
        />
      </span>
      Compare with previous period
    </button>
  );
}

const PANEL_WIDTH = 720;

function CustomRange({ label, active, from, to, matched, onPick, onApply }: {
  label: string;
  active: boolean;
  from?: string;
  to?: string;
  matched: string;
  onPick: (preset: string) => void;
  onApply: (from: string, to: string) => void;
}) {
  const today = istDay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: string; to?: string }>({});
  const [hover, setHover] = useState<string | null>(null);
  // The right-hand month on wide screens, the only month on narrow ones.
  const [view, setView] = useState(monthStart(today));
  const [pos, setPos] = useState<CSSProperties>({});
  const [twoMonths, setTwoMonths] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const width = Math.min(PANEL_WIDTH, vw - 32);
    setTwoMonths(width >= 640);
    setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, vw - width - 16)), width });
  }, []);

  const openPanel = () => {
    const end = to ?? today;
    setDraft(from ? { from, to: end } : {});
    setHover(null);
    setView(monthStart(from ? end : today));
    place();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', place);
    // The page scrolls an inner element; follow the trigger as it moves.
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => { if (open) panel.current?.focus(); }, [open]);

  const clickDay = (d: string) => {
    if (!draft.from || draft.to || d < draft.from) setDraft({ from: d });
    else setDraft({ from: draft.from, to: d });
  };

  // While choosing the end, the hovered day previews the range.
  const end = draft.to ?? (draft.from && hover && hover >= draft.from ? hover : undefined);
  const months = twoMonths ? [shiftMonth(view, -1), view] : [view];
  const canNext = view < monthStart(today);
  const chosenTo = draft.to ?? draft.from;
  // The footer follows the hover preview, so the length is known before the click.
  const shownTo = end ?? chosenTo;

  return (
    <>
      <button
        ref={trigger}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors focus-ring"
        style={{
          background: active ? 'color-mix(in srgb, var(--color-primary) 12%, var(--surface-0))' : 'var(--surface-0)',
          border: `1px solid ${active || open ? 'var(--color-primary)' : 'var(--border-default)'}`,
          color: active ? 'var(--color-primary)' : 'var(--text-primary)',
        }}
      >
        <CalendarDays className="h-4 w-4" />
        <span className="tabular-nums">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a period"
          tabIndex={-1}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl outline-none sm:flex-row"
          style={{ ...pos, background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
        >
          {/* Presets */}
          <div
            className="flex gap-1 overflow-x-auto p-2 sm:w-40 sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-r"
            style={{ borderColor: 'var(--border-default)', background: 'var(--surface-1)' }}
          >
            {[...PANEL_PRESETS.map((p) => ({ value: p.value, label: p.label })), { value: '', label: 'All time' }].map((p) => {
              const on = matched === p.value;
              return (
                <button
                  key={p.label}
                  onClick={() => { onPick(p.value); setOpen(false); }}
                  className="shrink-0 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors focus-ring"
                  style={{
                    background: on ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'transparent',
                    color: on ? 'var(--color-primary)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'var(--surface-2)'; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="min-w-0 flex-1 p-4">
            <div className="relative grid gap-6" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
              <button onClick={() => setView(shiftMonth(view, -1))} className="absolute left-0 top-0 rounded-lg p-1.5 transition-colors focus-ring hover:opacity-80" style={{ color: 'var(--text-secondary)', background: 'var(--surface-1)' }} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => canNext && setView(shiftMonth(view, 1))} disabled={!canNext} className="absolute right-0 top-0 rounded-lg p-1.5 transition-colors focus-ring disabled:opacity-30" style={{ color: 'var(--text-secondary)', background: 'var(--surface-1)' }} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
              {months.map((m) => (
                <Month key={m} first={m} today={today} from={draft.from} end={end} onDay={clickDay} onHover={setHover} />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3" style={{ borderColor: 'var(--border-default)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {draft.from ? (
                  <>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{rangeLabel(draft.from, shownTo!)}</span>
                    {' · '}{daysBetween(draft.from, shownTo!)} {daysBetween(draft.from, shownTo!) === 1 ? 'day' : 'days'}
                    {!draft.to && !end && ' · pick an end date, or apply for one day'}
                  </>
                ) : (
                  'Pick a start date'
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold focus-ring" style={{ color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  disabled={!draft.from}
                  onClick={() => { onApply(draft.from!, chosenTo!); setOpen(false); }}
                  className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-opacity focus-ring disabled:opacity-40"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Month({ first, today, from, end, onDay, onHover }: {
  first: string;
  today: string;
  from?: string;
  end?: string;
  onDay: (d: string) => void;
  onHover: (d: string | null) => void;
}) {
  const title = utc(first).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="min-w-0">
      <p className="mb-3 text-center text-sm font-semibold leading-7" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{w}</span>
        ))}
        {monthGrid(first).map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const future = d > today;
          const isStart = d === from;
          const isEnd = !!end && d === end;
          const inside = !!from && !!end && d > from && d < end;
          const edge = isStart || isEnd;
          // The band runs behind the days; each end only fills its inner half.
          const band = (inside || (edge && !!end && from !== end))
            ? isStart ? 'linear-gradient(to right, transparent 50%, var(--band) 50%)'
              : isEnd ? 'linear-gradient(to left, transparent 50%, var(--band) 50%)'
                : 'var(--band)'
            : 'transparent';
          return (
            <div key={d} className="py-0.5" style={{ background: band, ['--band' as string]: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}>
              <button
                disabled={future}
                onClick={() => onDay(d)}
                onMouseEnter={() => onHover(d)}
                onMouseLeave={() => onHover(null)}
                aria-label={dayLabel(d, true)}
                aria-pressed={edge}
                className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  background: edge ? 'var(--color-primary)' : 'transparent',
                  color: edge ? '#FFFFFF' : inside ? 'var(--color-primary)' : 'var(--text-primary)',
                  fontWeight: edge || d === today ? 700 : 500,
                  boxShadow: d === today && !edge ? 'inset 0 0 0 1px var(--border-strong)' : 'none',
                }}
              >
                {Number(d.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PeriodPicker;
