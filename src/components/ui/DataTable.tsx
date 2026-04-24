import { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X, Loader2 } from 'lucide-react';
import type { PaginationMeta } from '../../types';

// ── Column Definition ────────────────────────────────────
export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

// ── Props ────────────────────────────────────────────────
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Bulk actions
  bulkActions?: ReactNode;
  // Empty state
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  // Filters slot
  filters?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  meta,
  isLoading,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search…',
  searchValue = '',
  onRowClick,
  rowKey,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  bulkActions,
  emptyIcon,
  emptyTitle = 'No results found',
  emptyDescription = 'Try adjusting your search or filters.',
  filters,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(rowKey(row)));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => rowKey(row))));
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSearchSubmit = () => {
    onSearch?.(localSearch);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: Search + Filters + Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {onSearch && (
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg focus-ring"
              style={{
                background: 'var(--surface-0)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            {localSearch && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
                onClick={() => { setLocalSearch(''); onSearch?.(''); }}
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {filters}
        {someSelected && bulkActions && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} selected
            </span>
            {bulkActions}
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--surface-0)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${col.headerClassName || ''}`}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {col.sortable ? (
                      <button
                        className="flex items-center gap-1 hover:opacity-80"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.header}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-20">
                    <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16">
                    <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      {emptyIcon}
                      <p className="text-sm font-medium">{emptyTitle}</p>
                      <p className="text-xs">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => {
                  const id = rowKey(row);
                  return (
                    <tr
                      key={id}
                      className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                      style={{ borderBottom: '1px solid var(--border-light)' }}
                      onClick={() => onRowClick?.(row)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      {selectable && (
                        <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(id)}
                            onChange={() => toggleRow(id)}
                            className="rounded"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${col.className || ''}`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 text-sm"
            style={{
              borderTop: '1px solid var(--border-default)',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              Showing {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                disabled={meta.page <= 1}
                onClick={() => onPageChange?.(1)}
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                disabled={meta.page <= 1}
                onClick={() => onPageChange?.(meta.page - 1)}
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)' }}>
                {meta.page} / {meta.totalPages}
              </span>
              <button
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange?.(meta.page + 1)}
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                disabled={meta.page >= meta.totalPages}
                onClick={() => onPageChange?.(meta.totalPages)}
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
