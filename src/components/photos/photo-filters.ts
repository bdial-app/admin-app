import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { istDay } from '../ui/filters';
import type { PhotoFilterOptions } from '../../types';

/** Every key the Photo Moderation page mirrors into the URL (the date range expands to From/To). */
export const PHOTO_FILTER_KEYS = ['type', 'city', 'uploadedFrom', 'uploadedTo', 'providerStatus'] as const;

export const PHOTO_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'type', label: 'Type', kind: 'select', inline: true, placeholder: 'All photos', options: [
    { value: 'provider', label: 'Business galleries' }, { value: 'review', label: 'Review photos' }, { value: 'product', label: 'Product photos' },
  ] },
  { key: 'city', label: 'City', kind: 'select', inline: true, placeholder: 'All cities', className: 'max-w-[13rem]', options: [] },
  { key: 'uploaded', label: 'Uploaded', kind: 'daterange', inline: true, placeholder: 'Upload date',
    disabledWhen: (v) => (v.type && v.type !== 'provider' ? 'Only business gallery photos have an upload date' : false) },
  // Panel — Business
  { key: 'providerStatus', label: 'Business status', kind: 'select', group: 'Business', options: [
    { value: 'unverified', label: 'Unverified' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'disabled', label: 'Disabled' },
  ] },
];

/** `newest` is the server default, so it is the placeholder rather than an option. */
export const PHOTO_SORTS: SortOption[] = [
  { value: 'oldest', label: 'Oldest first' },
];

/** The city select is the only def whose options come from the server. */
export function withPhotoOptions(defs: FilterDef[], options?: PhotoFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'city' ? { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) } : d));
}

export function photoSegments(options?: PhotoFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Business galleries', patch: { type: 'provider' }, count: c?.provider },
    { label: 'Review photos', patch: { type: 'review' }, count: c?.review },
    { label: 'Product photos', patch: { type: 'product' }, count: c?.product },
    { label: 'Uploaded this week', patch: { uploadedFrom: istDay(6) }, count: c?.uploadedThisWeek },
  ];
}
