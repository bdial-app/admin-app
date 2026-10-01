import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import { Search, Store, X, Loader2 } from 'lucide-react';
import { useProviders } from '../../hooks/useProviders';

export interface PickedProvider {
  id: string;
  name: string;
  city?: string | null;
}

interface ProviderPickerProps {
  value: PickedProvider | null;
  onChange: (next: PickedProvider | null) => void;
  placeholder?: string;
  /** Show the picked business but disallow changing it. */
  locked?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * Type-ahead over real businesses, so a form never asks anyone to paste a UUID.
 * Results are keyboard-navigable; the value handed back is always a real row.
 */
export function ProviderPicker({
  value,
  onChange,
  placeholder = 'Search a business by name…',
  locked = false,
  invalid = false,
  autoFocus = false,
}: ProviderPickerProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // One request per pause in typing rather than one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setActive(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useProviders({
    page: 1,
    limit: 8,
    search: debounced || undefined,
  });

  const results = debounced ? (data?.items ?? []) : [];

  // Clicking away closes the list without clearing what was typed.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = useCallback(
    (p: { id: string; brandName: string; city?: string | null }) => {
      onChange({ id: p.id, name: p.brandName, city: p.city ?? null });
      setSearch('');
      setDebounced('');
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = results[active];
      if (chosen) pick(chosen);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (value) {
    return (
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--color-primary)' }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Store className="w-4 h-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {value.name}
          </span>
          {value.city && (
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>· {value.city}</span>
          )}
        </span>
        {!locked && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Choose a different business"
            className="flex items-center gap-1 text-xs font-semibold shrink-0 px-2 py-1 rounded-md"
            style={{ color: 'var(--color-primary)' }}
          >
            <X className="w-3 h-3" /> Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={boxRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          autoFocus={autoFocus}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && !!debounced}
          aria-autocomplete="list"
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg focus-ring"
          style={{
            background: 'var(--surface-1)',
            border: `1px solid ${invalid ? 'var(--color-danger)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)',
          }}
        />
        {isFetching && debounced && (
          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      {open && debounced && (
        <div
          role="listbox"
          className="mt-1.5 max-h-44 overflow-y-auto rounded-lg"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        >
          {results.length === 0 ? (
            <p className="text-xs px-3 py-3" style={{ color: 'var(--text-muted)' }}>
              {isFetching ? 'Searching…' : `No business matching “${debounced}”`}
            </p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p)}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors"
                style={{
                  background: i === active ? 'var(--surface-1)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <Store className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <span className="truncate font-medium">{p.brandName}</span>
                {p.city && (
                  <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>{p.city}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
