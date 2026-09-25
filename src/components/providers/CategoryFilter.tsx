import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Category } from '../../types';

interface Props {
  categories: Category[];
  /** Selected category id, or '' for all. */
  value: string;
  onChange: (id: string) => void;
}

/** Category picker with a search box — the list is far too long to scroll. */
export function CategoryFilter({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const parentName = (c: Category) => (c.parentId ? (byId.get(c.parentId)?.name ?? '') : '');
  const selected = categories.find((c) => c.id === value) ?? null;

  // Match the category's own name or its parent's, so typing "food" also finds
  // the sub-categories sitting under "Food & Drink".
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((c) => `${c.name} ${parentName(c)}`.toLowerCase().includes(needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categories, byId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    inputRef.current?.focus();
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg border max-w-[260px]"
        style={{
          borderColor: value ? 'var(--color-primary)' : 'var(--border-default)',
          background: 'var(--surface-0)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate">{selected ? selected.name : 'All categories'}</span>
        {value ? (
          <X
            className="h-3.5 w-3.5 flex-shrink-0"
            role="button"
            aria-label="Clear category filter"
            onClick={(e) => { e.stopPropagation(); pick(''); }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-1 w-[280px] rounded-xl border shadow-lg"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-2 border-b px-2.5 py-2" style={{ borderColor: 'var(--border-default)' }}>
            <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-left hover:opacity-80"
                style={{ color: 'var(--text-primary)' }}
              >
                All categories
                {!value && <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />}
              </button>
            </li>
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => pick(c.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-sm text-left hover:opacity-80"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="truncate">
                    {c.name}
                    {parentName(c) && (
                      <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>in {parentName(c)}</span>
                    )}
                  </span>
                  {c.id === value && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                No category matches “{query.trim()}”
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
