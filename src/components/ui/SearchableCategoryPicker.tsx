import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { useTopLevelCategories, useSubCategories } from '../../hooks/useCategories';
import type { Category } from '../../types';

interface SearchableCategoryDropdownProps {
  categories: Category[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder: string;
  label: string;
}

function SearchableCategoryDropdown({ categories, selectedId, onChange, placeholder, label }: SearchableCategoryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const selectedCat = categories.find((c) => c.id === selectedId);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors"
        style={{
          background: 'var(--surface-1)',
          border: `1px solid ${open ? 'var(--color-primary)' : 'var(--border-default)'}`,
          color: selectedCat ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate">{selectedCat?.name || placeholder}</span>
        <div className="flex items-center gap-1">
          {selectedCat && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md focus:outline-none"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No results found</p>
            )}
            {filtered.map((cat) => {
              const isSelected = cat.id === selectedId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { onChange(cat.id); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors"
                  style={{
                    background: isSelected ? 'var(--color-primary-bg, rgba(59,130,246,0.08))' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--surface-1)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="flex-1 truncate">{cat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchableCategoryPickerProps {
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (id: string) => void;
  onSubcategoryChange: (id: string) => void;
}

export function SearchableCategoryPicker({ categoryId, subcategoryId, onCategoryChange, onSubcategoryChange }: SearchableCategoryPickerProps) {
  const { data: categories } = useTopLevelCategories();
  const { data: subcategories } = useSubCategories(categoryId || null);

  const parentCategories = useMemo(() => (categories || []) as Category[], [categories]);
  const childCategories = useMemo(() => (subcategories || []) as Category[], [subcategories]);

  return (
    <div className="space-y-3">
      <SearchableCategoryDropdown
        categories={parentCategories}
        selectedId={categoryId}
        onChange={(id) => {
          onCategoryChange(id);
          if (id !== categoryId) onSubcategoryChange('');
        }}
        placeholder="Select a category"
        label="Category (improves discoverability)"
      />

      {categoryId && childCategories.length > 0 && (
        <SearchableCategoryDropdown
          categories={childCategories}
          selectedId={subcategoryId}
          onChange={onSubcategoryChange}
          placeholder="Select a sub-category"
          label="Sub-category"
        />
      )}
    </div>
  );
}
