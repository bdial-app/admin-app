import type { FilterDef, Segment, SortOption } from '../ui/filters';
import type { ReviewFilterOptions } from '../../types';

/** Every key the Reviews page mirrors into the URL (date ranges expand to From/To). */
export const REVIEW_FILTER_KEYS = [
  'status', 'minRating', 'maxRating', 'postedFrom', 'postedTo',
  'hasPhotos', 'hasReply', 'hasText', 'reported', 'source', 'city',
] as const;

const STARS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? '' : 's'}` }));

export const REVIEW_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'active', label: 'Showing' }, { value: 'removed', label: 'Removed' }, { value: 'flagged', label: 'Flagged' },
  ] },
  { key: 'posted', label: 'Posted', kind: 'daterange', inline: true, placeholder: 'Posted any time' },
  // Panel — Rating
  { key: 'minRating', label: 'At least', kind: 'select', group: 'Rating', options: STARS },
  { key: 'maxRating', label: 'At most', kind: 'select', group: 'Rating', options: STARS },
  // Panel — Content
  { key: 'hasText', label: 'Has written text', kind: 'toggle', group: 'Content', hint: 'Not just stars' },
  { key: 'hasPhotos', label: 'Has photos', kind: 'toggle', group: 'Content' },
  { key: 'hasReply', label: 'Business replied', kind: 'toggle', group: 'Content' },
  { key: 'reported', label: 'Has an open report', kind: 'toggle', group: 'Content' },
  // Panel — Where from
  { key: 'source', label: 'Written', kind: 'select', group: 'Where from', options: [
    { value: 'app', label: 'In the app' }, { value: 'link', label: 'From the owner’s review link' }, { value: 'admin', label: 'Recorded by an admin' },
  ] },
  { key: 'city', label: 'Business city', kind: 'select', group: 'Where from', options: [] },
];

/** `recent` is the server default, so it is the placeholder rather than an option. */
export const REVIEW_SORTS: SortOption[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'lowest', label: 'Lowest rating first' },
  { value: 'highest', label: 'Highest rating first' },
];

/** The city select is the only def whose options come from the server. */
export function withReviewOptions(defs: FilterDef[], options?: ReviewFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'city' ? { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) } : d));
}

export function reviewSegments(options?: ReviewFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Low ratings', patch: { status: 'active', maxRating: '2' }, count: c?.low },
    { label: 'No reply yet', patch: { status: 'active', hasReply: 'false' }, count: c?.unreplied },
    { label: 'Reported', patch: { reported: 'true' }, count: c?.reported },
    { label: 'With photos', patch: { hasPhotos: 'true' }, count: c?.withPhotos },
    { label: 'From review link', patch: { source: 'link' }, count: c?.fromLink },
    { label: 'Removed', patch: { status: 'removed' }, count: c?.removed },
  ];
}
