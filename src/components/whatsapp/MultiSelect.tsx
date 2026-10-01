import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface MultiOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

/** Chip multi-select with a searchable dropdown. No external deps. */
export function MultiSelect({ options, value, onChange, placeholder = 'Any', searchPlaceholder = 'Search…', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[38px] flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 text-sm rounded-lg text-left focus-ring disabled:opacity-50"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
      >
        {value.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              {labelOf(v)}
              <span
                role="button"
                aria-label={`Remove ${labelOf(v)}`}
                onClick={(e) => { e.stopPropagation(); toggle(v); }}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </span>
            </span>
          ))
        )}
        <ChevronDown className="w-4 h-4 ml-auto shrink-0" style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-full rounded-lg overflow-hidden animate-fade-in"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="relative p-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md focus-ring"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No matches</p>
            ) : (
              filtered.map((o) => {
                const on = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors"
                    style={{ color: 'var(--text-primary)', background: on ? 'var(--surface-1)' : 'transparent' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = on ? 'var(--surface-1)' : 'transparent'; }}
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{ border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-strong)'}`, background: on ? 'var(--color-primary)' : 'transparent' }}
                    >
                      {on && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })
            )}
          </div>
          {value.length > 0 && (
            <div className="px-3 py-1.5 flex justify-end" style={{ borderTop: '1px solid var(--border-light)' }}>
              <button type="button" onClick={() => onChange([])} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
