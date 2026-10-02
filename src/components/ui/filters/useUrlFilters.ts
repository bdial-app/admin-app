import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterValues } from './types';

/**
 * Filter state that lives in the URL, so a refresh, the back button or a
 * pasted link lands on the same view. Any filter change goes back to page 1;
 * only paging keeps everything else.
 */
export function useUrlFilters(keys: readonly string[], opts: { searchKey?: string; pageKey?: string; sortKey?: string } = {}) {
  const { searchKey = 'q', pageKey = 'page', sortKey = 'sort' } = opts;
  const [params, setParams] = useSearchParams();

  const values = useMemo(() => {
    const out: FilterValues = {};
    for (const key of keys) {
      const v = params.get(key);
      if (v) out[key] = v;
    }
    return out;
  }, [params, keys]);
  const page = Math.max(1, Number(params.get(pageKey)) || 1);
  const search = params.get(searchKey) ?? '';
  const sort = params.get(sortKey) ?? '';

  const write = useCallback(
    (next: FilterValues, extra: FilterValues = {}) => {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries({ ...next, ...extra })) if (v) sp.set(k, v);
      setParams(sp, { replace: true });
    },
    [setParams],
  );

  const update = useCallback(
    (patch: FilterValues) => write({ ...values, ...patch }, { [searchKey]: search, [sortKey]: sort }),
    [write, values, search, sort, searchKey, sortKey],
  );
  const replace = useCallback(
    (next: FilterValues) => write(next, { [searchKey]: search, [sortKey]: sort }),
    [write, search, sort, searchKey, sortKey],
  );
  const setSearch = useCallback(
    (q: string) => write(values, { [searchKey]: q, [sortKey]: sort }),
    [write, values, searchKey, sortKey, sort],
  );
  const setSort = useCallback(
    (s: string) => write(values, { [searchKey]: search, [sortKey]: s }),
    [write, values, searchKey, search, sortKey],
  );
  const setPage = useCallback(
    (p: number) => {
      const sp = new URLSearchParams(params);
      if (p > 1) sp.set(pageKey, String(p));
      else sp.delete(pageKey);
      setParams(sp, { replace: true });
    },
    [params, setParams, pageKey],
  );
  const clear = useCallback(() => write({}, { [sortKey]: sort }), [write, sortKey, sort]);

  const hasNarrowing = Object.keys(values).length > 0 || search.length > 0;

  return { values, page, search, sort, update, replace, setSearch, setSort, setPage, clear, hasNarrowing };
}
