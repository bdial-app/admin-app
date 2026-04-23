import { Search, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
  }[];
  onClear?: () => void;
  showClear?: boolean;
}

const SearchFilter = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onClear,
  showClear = false,
}: SearchFilterProps) => {
  return (
    <div
      className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl"
      style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring transition-colors"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg focus-ring transition-colors cursor-pointer"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        >
          {filter.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {/* Clear button */}
      {showClear && onClear && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors focus-ring"
          style={{
            color: 'var(--text-muted)',
            border: '1px solid var(--border-default)',
            background: 'var(--surface-0)',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'var(--surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'var(--surface-0)';
          }}
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};

export default SearchFilter;
