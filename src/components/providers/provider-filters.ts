import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProviderFilters } from '../../types';
import { istDay } from '../ui/filters/dates';

/**
 * The provider list's filters live in the URL (same names as the API), so a
 * refresh, the back button or a shared link keeps exactly what was on screen.
 */
export const FILTER_KEYS = [
  'search', 'status', 'cities', 'area', 'categoryIds', 'isFeatured', 'isWomenLed', 'verified', 'available',
  'logo', 'banner', 'products', 'photos', 'online', 'location', 'claimed', 'activeWithinDays', 'minRating',
  'reviews', 'createdFrom', 'createdTo', 'sort',
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type FilterState = Partial<Record<FilterKey, string>>;

export type Choice = { value: string; label: string };

/** Single-choice filters, grouped as the panel shows them. */
export const CHOICE_FILTERS: { group: string; key: FilterKey; label: string; options: Choice[] }[] = [
  { group: 'Profile', key: 'logo', label: 'Logo', options: [
    { value: 'real', label: 'Their own logo' }, { value: 'generated', label: 'Generated logo' },
    { value: 'none', label: 'No logo' }, { value: 'missing', label: 'No real logo' },
  ] },
  { group: 'Profile', key: 'banner', label: 'Banner', options: [{ value: 'has', label: 'Has banner' }, { value: 'none', label: 'No banner' }] },
  { group: 'Profile', key: 'products', label: 'Products', options: [{ value: 'has', label: 'Has products' }, { value: 'none', label: 'No products' }] },
  { group: 'Profile', key: 'photos', label: 'Gallery', options: [{ value: 'has', label: 'Has photos' }, { value: 'none', label: 'No photos' }] },
  { group: 'Profile', key: 'online', label: 'Online', options: [
    { value: 'website', label: 'Has website' }, { value: 'instagram', label: 'Has Instagram' },
    { value: 'whatsapp', label: 'Has WhatsApp' }, { value: 'none', label: 'No links at all' },
  ] },
  { group: 'Profile', key: 'location', label: 'Map pin', options: [
    { value: 'precise', label: 'Precise' }, { value: 'neighbourhood', label: 'Neighbourhood' },
    { value: 'approximate', label: 'City centre only' }, { value: 'missing', label: 'No location' },
  ] },
  { group: 'Badges & status', key: 'isFeatured', label: 'Featured', options: [{ value: 'true', label: 'Featured' }, { value: 'false', label: 'Not featured' }] },
  { group: 'Badges & status', key: 'verified', label: 'Verified', options: [{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Not verified' }] },
  { group: 'Badges & status', key: 'isWomenLed', label: 'Women-led', options: [
    { value: 'true', label: 'Declared' }, { value: 'pending', label: 'Pending review' },
    { value: 'approved', label: 'Approved' }, { value: 'false', label: 'Not women-led' },
  ] },
  { group: 'Badges & status', key: 'available', label: 'Open', options: [{ value: 'true', label: 'Open' }, { value: 'false', label: 'Showing "Closed"' }] },
  { group: 'Owner', key: 'claimed', label: 'Claimed', options: [{ value: 'true', label: 'Owner has signed in' }, { value: 'false', label: 'Imported, never claimed' }] },
  { group: 'Owner', key: 'activeWithinDays', label: 'Owner active', options: [
    { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' },
  ] },
  { group: 'Reputation', key: 'minRating', label: 'Rating', options: [{ value: '4', label: '4★ and up' }, { value: '3', label: '3★ and up' }, { value: '2', label: '2★ and up' }] },
  { group: 'Reputation', key: 'reviews', label: 'Reviews', options: [{ value: 'has', label: 'Has reviews' }, { value: 'none', label: 'No reviews yet' }] },
];

export const SORTS: Choice[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'updated', label: 'Recently updated' },
];


/** One-click views for the jobs admins do most. */
export const QUICK_VIEWS: { label: string; hint: string; filters: () => FilterState }[] = [
  { label: 'Unclaimed imports', hint: 'Imported, the owner has never signed in', filters: () => ({ claimed: 'false' }) },
  { label: 'No real logo', hint: 'No logo, or only a generated one', filters: () => ({ logo: 'missing' }) },
  { label: 'Location needs work', hint: 'Pinned at the city centre or not at all', filters: () => ({ location: 'approximate' }) },
  { label: 'No products', hint: 'Nothing listed for customers to see', filters: () => ({ products: 'none' }) },
  { label: 'Women-led to review', hint: 'Women-led claims awaiting approval', filters: () => ({ isWomenLed: 'pending' }) },
  { label: 'Top rated', hint: '4★ and up, best first', filters: () => ({ minRating: '4', sort: 'rating' }) },
  { label: 'Added this week', hint: 'Joined in the last 7 days', filters: () => ({ createdFrom: istDay(6) }) },
  { label: 'Showing "Closed"', hint: 'Marked closed for business', filters: () => ({ available: 'false' }) },
];

/** Filters that narrow the list (sort and search are not counted). */
export const countActive = (f: FilterState) =>
  FILTER_KEYS.filter((k) => k !== 'sort' && k !== 'search' && k !== 'status' && f[k]).length;

export const sameFilters = (a: FilterState, b: FilterState) =>
  FILTER_KEYS.every((k) => k === 'search' || k === 'status' || (a[k] ?? '') === (b[k] ?? ''));

export function useProviderFilterState() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<FilterState>(() => {
    const out: FilterState = {};
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) out[k] = v;
    }
    return out;
  }, [params]);
  const page = Math.max(1, Number(params.get('page')) || 1);

  /** Change some filters; any change sends the list back to page 1. */
  const update = useCallback(
    (patch: FilterState) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  /** Replace every filter except search and status (quick views, "clear all"). */
  const replace = useCallback(
    (next: FilterState) => {
      const patch: FilterState = {};
      for (const k of FILTER_KEYS) if (k !== 'search' && k !== 'status') patch[k] = next[k] ?? '';
      update(patch);
    },
    [update],
  );

  const setPage = useCallback(
    (n: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (n > 1) next.set('page', String(n));
          else next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  /** What the API takes: the URL filters as they are. */
  const apiFilters = filters as ProviderFilters;
  return { filters, apiFilters, page, update, replace, setPage };
}
