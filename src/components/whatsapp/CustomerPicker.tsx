import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search, User } from 'lucide-react';
import { useWaCustomerSearch } from '../../hooks/useWhatsApp';
import type { WaCustomerHit } from '../../types';
import { INPUT_STYLE } from './wa-utils';

/**
 * Type-ahead over app customers (not staff, not business owners) by name or
 * phone. Each pick is handed back and the box clears for the next one.
 */
export function CustomerPicker({ onPick, placeholder = 'Search a customer by name or phone…' }: {
  onPick: (c: WaCustomerHit) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setActive(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useWaCustomerSearch(debounced);
  const results = debounced.length >= 2 ? (data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (c: WaCustomerHit) => {
    onPick(c);
    setSearch('');
    setDebounced('');
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = results[active]; if (c) pick(c); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg focus-ring"
        style={INPUT_STYLE}
      />
      {isFetching && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />}
      {open && debounced.length >= 2 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg overflow-hidden shadow-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{isFetching ? 'Searching…' : 'No customers match.'}</p>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
                style={{ background: i === active ? 'var(--surface-2)' : 'transparent' }}
              >
                <User className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>{c.phone ?? ''}{c.city ? ` · ${c.city}` : ''}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
