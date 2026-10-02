import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { istDay } from '../ui/filters';
import type { UserFilterOptions } from '../../types';

/** Every key the Users page mirrors into the URL (date ranges expand to From/To). */
export const USER_FILTER_KEYS = [
  'status', 'hasProvider', 'city', 'gender', 'role', 'mode', 'activity',
  'joinedFrom', 'joinedTo', 'push', 'hasEmail', 'hasLocation', 'providerStatus', 'engagement',
] as const;

export const USER_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'suspended', label: 'Suspended' }, { value: 'deleted', label: 'Deleted' },
  ] },
  { key: 'hasProvider', label: 'Account', kind: 'select', inline: true, placeholder: 'All account types', options: [
    { value: 'true', label: 'Business owners' }, { value: 'false', label: 'Customers only' },
  ] },
  { key: 'city', label: 'City', kind: 'select', inline: true, placeholder: 'All cities', className: 'max-w-[13rem]', options: [] },
  // Panel
  { key: 'gender', label: 'Gender', kind: 'select', group: 'Profile', options: [
    { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' },
  ] },
  { key: 'role', label: 'Role', kind: 'select', group: 'Profile', options: [
    { value: 'customer', label: 'Customer' }, { value: 'staff', label: 'Any staff role' }, { value: 'associate', label: 'Associate' },
    { value: 'moderator', label: 'Moderator' }, { value: 'admin', label: 'Admin' }, { value: 'super_admin', label: 'Super admin' },
  ] },
  { key: 'mode', label: 'App mode', kind: 'select', group: 'Profile', hint: 'The mode they last switched to in the app', options: [
    { value: 'customer', label: 'Customer mode' }, { value: 'provider', label: 'Business mode' },
  ] },
  { key: 'activity', label: 'Last active', kind: 'select', group: 'Activity', hint: 'From chat heartbeats; older accounts may show "never"', options: [
    { value: 'seen_24h', label: 'Last 24 hours' }, { value: 'seen_7d', label: 'Last 7 days' }, { value: 'seen_30d', label: 'Last 30 days' },
    { value: 'inactive_30d', label: 'Inactive 30+ days' }, { value: 'never', label: 'Never seen' },
  ] },
  { key: 'joined', label: 'Joined', kind: 'daterange', group: 'Activity' },
  { key: 'push', label: 'Push notifications', kind: 'select', group: 'Reach', options: [
    { value: 'enabled', label: 'Enabled (any device)' }, { value: 'android', label: 'Android' }, { value: 'ios', label: 'iPhone' }, { value: 'none', label: 'Not reachable by push' },
  ] },
  { key: 'hasEmail', label: 'Email', kind: 'select', group: 'Reach', options: [
    { value: 'true', label: 'Has email' }, { value: 'false', label: 'No email' },
  ] },
  { key: 'hasLocation', label: 'Map location', kind: 'select', group: 'Reach', options: [
    { value: 'true', label: 'Has a pin' }, { value: 'false', label: 'No pin' },
  ] },
  { key: 'providerStatus', label: 'Business status', kind: 'select', group: 'Business', hint: 'Only users who own a listing',
    disabledWhen: (v) => (v.hasProvider === 'false' ? 'Not available for customers' : false), options: [
    { value: 'unverified', label: 'Unverified' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'disabled', label: 'Disabled' },
  ] },
  { key: 'engagement', label: 'Has done', kind: 'select', group: 'Engagement', options: [
    { value: 'reviewed', label: 'Written a review' }, { value: 'saved', label: 'Saved a business' }, { value: 'chatted', label: 'Messaged a business' },
    { value: 'invited', label: 'Invited a friend' }, { value: 'none', label: 'None of these yet' },
  ] },
];

export const USER_SORTS: SortOption[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'last_seen', label: 'Recently active' },
  { value: 'name', label: 'Name A–Z' },
];

/** The city select is the only def whose options come from the server. */
export function withCityOptions(defs: FilterDef[], options?: UserFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'city' ? { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) } : d));
}

export function userSegments(options?: UserFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All users', patch: {}, count: c?.total },
    { label: 'Business owners', patch: { hasProvider: 'true' }, count: c?.businessOwners },
    { label: 'Customers', patch: { hasProvider: 'false' }, count: c ? c.total - c.businessOwners : undefined },
    { label: 'New this week', patch: { joinedFrom: istDay(6) }, count: c?.newThisWeek },
    { label: 'Active this week', patch: { activity: 'seen_7d' }, count: c?.activeThisWeek },
    { label: 'Never seen', patch: { activity: 'never' }, count: c?.neverSeen },
    { label: 'Push reachable', patch: { push: 'enabled' }, count: c?.pushEnabled },
    { label: 'Staff', patch: { role: 'staff' }, count: c?.staff },
  ];
}
