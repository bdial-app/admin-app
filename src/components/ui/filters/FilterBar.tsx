import { useMemo, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Select } from './Select';
import { DATE_PRESETS, dateRangeLabel, istDay, matchPreset, presetRange } from './dates';
import type { FilterDef, FilterValues, Segment, SortOption } from './types';

export interface FilterBarProps {
  defs: FilterDef[];
  values: FilterValues;
  onChange: (patch: FilterValues) => void;
  onReplace: (next: FilterValues) => void;
  /** Search box; omit for pages without text search. */
  search?: { value: string; onChange: (q: string) => void; placeholder?: string };
  sort?: { options: SortOption[]; value: string; onChange: (v: string) => void; defaultLabel?: string };
  segments?: Segment[];
  /** Rows matching the current filters, and the unfiltered total, for "N of M". */
  resultCount?: number;
  totalCount?: number;
  /** Extra toolbar content (e.g. an export button), right-aligned. */
  actions?: ReactNode;
  /** When the whole page is a different "mode" (e.g. tabs), reset the panel. */
  panelKey?: string;
}

const INPUT_STYLE = {
  background: 'var(--surface-0)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
} as const;

/** Keys a def owns in `values`. */
function keysOf(def: FilterDef): string[] {
  if (def.kind === 'daterange') return [`${def.key}From`, `${def.key}To`];
  if (def.kind === 'numberrange') return [`${def.key}Min`, `${def.key}Max`];
  return [def.key];
}

function isSet(def: FilterDef, values: FilterValues): boolean {
  return keysOf(def).some((k) => !!values[k]);
}

function chipLabel(def: FilterDef, values: FilterValues): string {
  switch (def.kind) {
    case 'select': {
      const v = values[def.key];
      return `${def.label}: ${def.options?.find((o) => o.value === v)?.label ?? v}`;
    }
    case 'toggle':
      return def.label;
    case 'daterange':
      return `${def.label}: ${dateRangeLabel(def.presets ?? DATE_PRESETS, values, def.key)}`;
    case 'numberrange': {
      const u = def.unit ?? '';
      const min = values[`${def.key}Min`], max = values[`${def.key}Max`];
      if (min && max) return `${def.label}: ${u}${min} – ${u}${max}`;
      return min ? `${def.label}: ≥ ${u}${min}` : `${def.label}: ≤ ${u}${max}`;
    }
  }
}

const sameNarrowing = (a: FilterValues, b: FilterValues) => {
  const na = Object.entries(a).filter(([, v]) => v), nb = Object.entries(b).filter(([, v]) => v);
  return na.length === nb.length && na.every(([k, v]) => b[k] === v);
};

/**
 * One filter surface for every list page: quick segments, a toolbar with the
 * filters that matter most, a "More filters" panel for the rest, and chips
 * for whatever is active. Driven entirely by `defs`, so adding a filter is one
 * entry in the page's schema.
 */
export function FilterBar({ defs, values, onChange, onReplace, search, sort, segments, resultCount, totalCount, actions, panelKey }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(search?.value ?? '');
  // Re-sync local state during render when its source changes (URL search, page mode),
  // instead of in an effect, so there is no extra render with stale text.
  const [syncedSearch, setSyncedSearch] = useState(search?.value);
  if (search?.value !== syncedSearch) {
    setSyncedSearch(search?.value);
    setDraft(search?.value ?? '');
  }
  const [syncedPanelKey, setSyncedPanelKey] = useState(panelKey);
  if (panelKey !== syncedPanelKey) {
    setSyncedPanelKey(panelKey);
    setOpen(false);
  }

  const inline = defs.filter((d) => d.inline);
  const panel = defs.filter((d) => !d.inline);
  const groups = useMemo(() => {
    const order: string[] = [];
    for (const d of panel) { const g = d.group ?? 'Filters'; if (!order.includes(g)) order.push(g); }
    return order.map((g) => ({ name: g, defs: panel.filter((d) => (d.group ?? 'Filters') === g) }));
  }, [panel]);
  const panelActive = panel.filter((d) => isSet(d, values)).length;
  const active = defs.filter((d) => isSet(d, values));

  return (
    <div className="mb-4 flex flex-col gap-3">
      {segments && segments.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {segments.map((s) => {
            const on = sameNarrowing(values, s.patch);
            return (
              <button
                key={s.label}
                onClick={() => onReplace(s.patch)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: on ? 'var(--color-primary)' : 'var(--surface-0)',
                  color: on ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
                }}
              >
                {s.label}
                {s.count != null && <span className="tabular-nums" style={{ opacity: on ? 0.85 : 0.6 }}>{s.count.toLocaleString()}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search.onChange(draft.trim()); }}
              onBlur={() => { if (draft.trim() !== search.value) search.onChange(draft.trim()); }}
              placeholder={search.placeholder ?? 'Search…'}
              className="w-full rounded-lg py-2 pl-9 pr-8 text-sm focus-ring"
              style={INPUT_STYLE}
            />
            {draft && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5" onClick={() => { setDraft(''); search.onChange(''); }} style={{ color: 'var(--text-muted)' }} aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {inline.map((d) => <Control key={d.key} def={d} values={values} onChange={onChange} compact />)}
        {panel.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background: open ? 'var(--surface-2)' : 'var(--surface-0)',
              border: `1px solid ${panelActive ? 'var(--color-primary)' : 'var(--border-default)'}`,
              color: panelActive ? 'var(--color-primary)' : 'var(--text-primary)',
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
            More filters
            {panelActive > 0 && (
              <span className="h-5 min-w-[1.25rem] rounded-full px-1.5 text-[11px] font-bold leading-5 text-white" style={{ background: 'var(--color-primary)' }}>{panelActive}</span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {sort && (
            <Select value={sort.value} onChange={sort.onChange} options={sort.options} placeholder={sort.defaultLabel ?? 'Sort: default'} />
          )}
        </div>
      </div>

      {/* Panel */}
      {open && panel.length > 0 && (
        <div className="grid gap-x-6 gap-y-4 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          {groups.map((g) => (
            <div key={g.name} className="flex min-w-0 flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{g.name}</p>
              {g.defs.map((d) => <Control key={d.key} def={d} values={values} onChange={onChange} />)}
            </div>
          ))}
        </div>
      )}

      {/* Active chips */}
      {(active.length > 0 || (search && search.value)) && (
        <div className="flex flex-wrap items-center gap-2">
          {typeof resultCount === 'number' && (
            <span className="mr-1 text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {resultCount.toLocaleString()}{typeof totalCount === 'number' ? ` of ${totalCount.toLocaleString()}` : ''} match{resultCount === 1 && totalCount == null ? '' : ''}
            </span>
          )}
          {search?.value && <Chip label={`Search: “${search.value}”`} onRemove={() => search.onChange('')} />}
          {active.map((d) => (
            <Chip key={d.key} label={chipLabel(d, values)} onRemove={() => onChange(Object.fromEntries(keysOf(d).map((k) => [k, undefined])))} />
          ))}
          <button onClick={() => { onReplace({}); search?.onChange(''); }} className="rounded px-2 py-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:opacity-70">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ── One control per def ──────────────────────────────────

function Control({ def, values, onChange, compact }: { def: FilterDef; values: FilterValues; onChange: (p: FilterValues) => void; compact?: boolean }) {
  const disabledReason = def.disabledWhen?.(values) || false;
  const set = isSet(def, values);

  const control = (() => {
    switch (def.kind) {
      case 'select':
        return (
          <Select
            value={values[def.key] ?? ''}
            onChange={(v) => onChange({ [def.key]: v || undefined })}
            options={def.options ?? []}
            placeholder={compact ? def.placeholder ?? `All ${def.label.toLowerCase()}` : 'Any'}
            active={set}
            disabled={!!disabledReason}
            className={compact ? def.className ?? '' : 'w-full'}
            title={disabledReason || undefined}
          />
        );
      case 'toggle':
        return (
          <button
            onClick={() => onChange({ [def.key]: set ? undefined : 'true' })}
            disabled={!!disabledReason}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${compact ? '' : 'w-full text-left'}`}
            style={{
              background: set ? 'var(--color-primary)' : 'var(--surface-0)',
              color: set ? '#FFFFFF' : 'var(--text-primary)',
              border: `1px solid ${set ? 'var(--color-primary)' : 'var(--border-default)'}`,
            }}
            title={disabledReason || undefined}
          >
            {def.label}
          </button>
        );
      case 'daterange':
        return <DateRange def={def} values={values} onChange={onChange} compact={compact} />;
      case 'numberrange':
        return <NumberRange def={def} values={values} onChange={onChange} />;
    }
  })();

  if (compact) return control;
  return (
    <label className="flex min-w-0 flex-col gap-1">
      {def.kind !== 'toggle' && <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{def.label}</span>}
      {control}
      {(def.hint || disabledReason) && (
        <span className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>{disabledReason || def.hint}</span>
      )}
    </label>
  );
}

function DateRange({ def, values, onChange, compact }: { def: FilterDef; values: FilterValues; onChange: (p: FilterValues) => void; compact?: boolean }) {
  const presets = def.presets ?? DATE_PRESETS;
  const fromKey = `${def.key}From`, toKey = `${def.key}To`;
  const from = values[fromKey], to = values[toKey];
  const matched = matchPreset(presets, from, to);
  const [custom, setCustom] = useState(matched === 'custom');
  const showCustom = custom || matched === 'custom';

  const pick = (v: string) => {
    if (v === 'custom') { setCustom(true); return; }
    setCustom(false);
    const p = presets.find((x) => x.value === v);
    const r = p ? presetRange(p) : { from: undefined, to: undefined };
    onChange({ [fromKey]: r.from, [toKey]: r.to });
  };

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-1.5'}>
      <Select
        value={showCustom ? 'custom' : matched}
        onChange={pick}
        options={[...presets.map((p) => ({ value: p.value, label: p.label })), { value: 'custom', label: 'Custom range…' }]}
        placeholder={compact ? def.placeholder ?? def.label : 'Any time'}
        active={!!(from || to)}
        className={compact ? def.className ?? '' : 'w-full'}
      />
      {showCustom && (
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={from ?? ''} max={to || undefined} onChange={(e) => onChange({ [fromKey]: e.target.value || undefined })} className="w-full rounded-lg px-2 py-1.5 text-xs focus-ring" style={INPUT_STYLE} aria-label={`${def.label} from`} />
          <input type="date" value={to ?? ''} min={from || undefined} max={def.presets ? undefined : istDay()} onChange={(e) => onChange({ [toKey]: e.target.value || undefined })} className="w-full rounded-lg px-2 py-1.5 text-xs focus-ring" style={INPUT_STYLE} aria-label={`${def.label} to`} />
        </div>
      )}
    </div>
  );
}

function NumberRange({ def, values, onChange }: { def: FilterDef; values: FilterValues; onChange: (p: FilterValues) => void }) {
  const minKey = `${def.key}Min`, maxKey = `${def.key}Max`;
  const [min, setMin] = useState(values[minKey] ?? '');
  const [max, setMax] = useState(values[maxKey] ?? '');
  // Follow the URL when it changes underneath (chip removed, segment clicked).
  const synced = `${values[minKey] ?? ''}|${values[maxKey] ?? ''}`;
  const [lastSynced, setLastSynced] = useState(synced);
  if (synced !== lastSynced) {
    setLastSynced(synced);
    setMin(values[minKey] ?? '');
    setMax(values[maxKey] ?? '');
  }
  const commit = () => {
    if ((min || undefined) !== values[minKey] || (max || undefined) !== values[maxKey]) onChange({ [minKey]: min || undefined, [maxKey]: max || undefined });
  };
  const field = (v: string, set: (s: string) => void, ph: string, label: string) => (
    <div className="relative min-w-0 flex-1">
      {def.unit && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>{def.unit}</span>}
      <input
        type="number" inputMode="numeric" min={0} value={v} placeholder={ph} aria-label={`${def.label} ${label}`}
        onChange={(e) => set(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()}
        className={`w-full rounded-lg py-1.5 pr-2 text-xs focus-ring ${def.unit ? 'pl-6' : 'pl-2.5'}`} style={INPUT_STYLE}
      />
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      {field(min, setMin, 'Min', 'minimum')}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
      {field(max, setMax, 'Max', 'maximum')}
    </div>
  );
}

export default FilterBar;
