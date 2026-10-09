import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { DetailPanel } from '../ui/DetailPanel';
import { istDay } from '../ui/filters/dates';
import { providersService } from '../../services/providers.service';
import type { Category } from '../../types';
import { CHOICE_FILTERS, SORTS, countActive, type FilterKey, type FilterState } from './provider-filters';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (patch: FilterState) => void;
  onClearAll: () => void;
  categories: Category[];
  /** How many businesses match right now. */
  matching?: number;
}

const split = (v?: string) => (v ? v.split(',').filter(Boolean) : []);
/** Whole India-time days; the server reads a bare date as the whole day. */
const ADDED_PRESETS: { label: string; range: () => { from: string; to?: string } }[] = [
  { label: 'Today', range: () => ({ from: istDay() }) },
  { label: 'Yesterday', range: () => ({ from: istDay(1), to: istDay(1) }) },
  { label: 'Last 7 days', range: () => ({ from: istDay(6) }) },
  { label: 'Last 30 days', range: () => ({ from: istDay(29) }) },
  { label: 'Last 90 days', range: () => ({ from: istDay(89) }) },
];
/** A day as a datetime-local value at `time`; minutes pass through. */
const asMinute = (v: string | undefined, time: string) => (!v ? '' : v.length === 10 ? `${v}T${time}` : v.slice(0, 16));

const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider mb-2';
const inputStyle = { borderColor: 'var(--border-default)', background: 'var(--surface-0)', color: 'var(--text-primary)' };

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? 'var(--color-primary)' : 'var(--border-default)',
        background: active ? 'var(--color-primary)' : 'var(--surface-0)',
        color: active ? '#fff' : 'var(--text-primary)',
      }}
    >
      {children}
    </button>
  );
}

/** A searchable list of checkboxes (cities, categories). */
function MultiPick({
  items,
  selected,
  onToggle,
  placeholder,
}: {
  items: { value: string; label: string; meta?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.meta?.toLowerCase().includes(q)) : items;
    // Selected first, so they never scroll out of reach.
    return [...list].sort((a, b) => Number(selected.includes(b.value)) - Number(selected.includes(a.value)));
  }, [items, query, selected]);
  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--border-default)' }}>
      <div className="flex items-center gap-2 border-b px-2.5 py-1.5" style={{ borderColor: 'var(--border-default)' }}>
        <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {shown.length === 0 && (
          <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Nothing matches
          </p>
        )}
        {shown.map((item) => {
          const on = selected.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onToggle(item.value)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
            >
              <span
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border"
                style={{ borderColor: on ? 'var(--color-primary)' : 'var(--border-default)', background: on ? 'var(--color-primary)' : 'transparent' }}
              >
                {on && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.meta && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.meta}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Every provider filter in one place. Changes apply as you make them, so the
 * count at the bottom is always what the list shows.
 */
export function ProviderFiltersPanel({ open, onClose, filters, onChange, onClearAll, categories, matching }: Props) {
  const { data: facets } = useQuery({
    queryKey: ['providers', 'facets'],
    queryFn: () => providersService.facets(),
    staleTime: 5 * 60_000,
    enabled: open,
  });

  // Area is typed: apply it after a pause rather than on every keystroke.
  const [area, setArea] = useState(filters.area ?? '');
  // Follow the URL when it changes elsewhere (chip removed, "clear all").
  const [syncedArea, setSyncedArea] = useState(filters.area ?? '');
  if ((filters.area ?? '') !== syncedArea) {
    setSyncedArea(filters.area ?? '');
    setArea(filters.area ?? '');
  }
  useEffect(() => {
    if ((filters.area ?? '') === area.trim()) return;
    const t = setTimeout(() => onChange({ area: area.trim() }), 400);
    return () => clearTimeout(t);
  }, [area, filters.area, onChange]);

  const toggleIn = (key: FilterKey, value: string) => {
    const now = split(filters[key]);
    const next = now.includes(value) ? now.filter((v) => v !== value) : [...now, value];
    onChange({ [key]: next.join(',') });
  };

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const categoryItems = useMemo(
    () =>
      categories
        .map((c) => ({ value: c.id, label: c.name, meta: c.parentId ? byId.get(c.parentId)?.name : undefined }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [categories, byId],
  );
  const cityItems = (facets?.cities ?? []).map((c) => ({ value: c.city, label: c.city, meta: String(c.count) }));
  const groups = [...new Set(CHOICE_FILTERS.map((f) => f.group))];
  const active = countActive(filters);

  return (
    <DetailPanel
      open={open}
      onClose={onClose}
      title="Filters"
      subtitle={active ? `${active} filter${active === 1 ? '' : 's'} on` : 'Narrow down the businesses'}
      width="520px"
      actions={
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClearAll}
            disabled={!active}
            className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {matching === undefined ? 'Done' : `Show ${matching.toLocaleString()} business${matching === 1 ? '' : 'es'}`}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <p className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Sort by</p>
          <div className="flex flex-wrap gap-1.5">
            {SORTS.map((s) => (
              <Pill key={s.value} active={(filters.sort ?? 'newest') === s.value} onClick={() => onChange({ sort: s.value === 'newest' ? '' : s.value })}>
                {s.label}
              </Pill>
            ))}
          </div>
        </section>

        <section>
          <p className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Where</p>
          <MultiPick items={cityItems} selected={split(filters.cities)} onToggle={(v) => toggleIn('cities', v)} placeholder="Search cities…" />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area or locality contains… (e.g. Camp, Wanowrie)"
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </section>

        <section>
          <p className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Categories (any of)</p>
          <MultiPick items={categoryItems} selected={split(filters.categoryIds)} onToggle={(v) => toggleIn('categoryIds', v)} placeholder="Search categories…" />
        </section>

        {groups.map((group) => (
          <section key={group}>
            <p className={sectionTitle} style={{ color: 'var(--text-muted)' }}>{group}</p>
            <div className="space-y-2.5">
              {CHOICE_FILTERS.filter((f) => f.group === group).map((f) => (
                <div key={f.key} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-24 flex-shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {f.label}
                  </span>
                  {f.options.map((o) => (
                    <Pill key={o.value} active={filters[f.key] === o.value} onClick={() => onChange({ [f.key]: filters[f.key] === o.value ? '' : o.value })}>
                      {o.label}
                    </Pill>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <p className={sectionTitle} style={{ color: 'var(--text-muted)' }}>Added</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ADDED_PRESETS.map((p) => {
              const r = p.range();
              const on = (filters.createdFrom ?? '') === r.from && (filters.createdTo ?? '') === (r.to ?? '');
              return (
                <Pill key={p.label} active={on} onClick={() => onChange(on ? { createdFrom: '', createdTo: '' } : { createdFrom: r.from, createdTo: r.to ?? '' })}>
                  {p.label}
                </Pill>
              );
            })}
          </div>
          {/* Date and time, India time; a preset's whole day shows as midnight to 23:59. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input type="datetime-local" value={asMinute(filters.createdFrom, '00:00')} onChange={(e) => onChange({ createdFrom: e.target.value })} className="min-w-0 rounded-lg border px-2 py-2 text-xs" style={inputStyle} aria-label="Added from" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
            <input type="datetime-local" value={asMinute(filters.createdTo, '23:59')} onChange={(e) => onChange({ createdTo: e.target.value })} className="min-w-0 rounded-lg border px-2 py-2 text-xs" style={inputStyle} aria-label="Added to" />
          </div>
        </section>
      </div>
    </DetailPanel>
  );
}
