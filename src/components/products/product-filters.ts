import type { FilterDef, Segment, SortOption } from '../ui/filters';
import type { ProductFilterOptions } from '../../types';

/** Every key the Products page mirrors into the URL (price expands to Min/Max). */
export const PRODUCT_FILTER_KEYS = [
  'isActive', 'productType', 'categoryId',
  'hasImages', 'hasPrice', 'isHero', 'priceMin', 'priceMax',
  'city', 'providerStatus', 'createdFrom', 'createdTo',
] as const;

export const PRODUCT_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'isActive', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'true', label: 'Active' }, { value: 'false', label: 'Disabled' },
  ] },
  { key: 'productType', label: 'Type', kind: 'select', inline: true, placeholder: 'All types', options: [
    { value: 'product', label: 'Products' }, { value: 'service', label: 'Services' },
  ] },
  { key: 'categoryId', label: 'Category', kind: 'select', inline: true, placeholder: 'All categories', className: 'max-w-[14rem]', options: [] },
  { key: 'created', label: 'Added', kind: 'daterange', inline: true, withTime: true, placeholder: 'Added any time' },
  // Panel — Listing
  { key: 'hasImages', label: 'Photos', kind: 'select', group: 'Listing', options: [
    { value: 'true', label: 'Has photos' }, { value: 'false', label: 'No photos' },
  ] },
  { key: 'hasPrice', label: 'Price', kind: 'select', group: 'Listing', options: [
    { value: 'true', label: 'Has a price' }, { value: 'false', label: 'No price set' },
  ] },
  { key: 'isHero', label: 'Hero item', kind: 'select', group: 'Listing', hint: 'Featured in "Best Products This Week" on the home feed', options: [
    { value: 'true', label: 'Hero items only' }, { value: 'false', label: 'Not hero' },
  ] },
  { key: 'price', label: 'Price range', kind: 'numberrange', group: 'Listing', unit: '₹',
    disabledWhen: (v) => (v.hasPrice === 'false' ? 'Not available without a price' : false) },
  // Panel — Business
  { key: 'city', label: 'City', kind: 'select', group: 'Business', options: [] },
  { key: 'providerStatus', label: 'Business status', kind: 'select', group: 'Business', options: [
    { value: 'unverified', label: 'Unverified' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'disabled', label: 'Disabled' },
  ] },
];

/** `display_order` is the server default, so it is the placeholder rather than an option. */
export const PRODUCT_SORTS: SortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

/** Cities and categories come from the server with live counts. */
export function withProductOptions(defs: FilterDef[], options?: ProductFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => {
    if (d.key === 'city') return { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'categoryId') return { ...d, options: options.categories.map((c) => ({ value: c.id, label: c.name, count: c.count })) };
    return d;
  });
}

export function productSegments(options?: ProductFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Active', patch: { isActive: 'true' }, count: c?.active },
    { label: 'Without photos', patch: { hasImages: 'false' }, count: c?.noImages },
    { label: 'Without price', patch: { hasPrice: 'false' }, count: c?.noPrice },
    { label: 'Services', patch: { productType: 'service' }, count: c?.services },
    { label: 'Hero items', patch: { isHero: 'true' }, count: c?.hero },
  ];
}
