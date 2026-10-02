import type { FilterDef, Segment, SortOption } from '../ui/filters';
import type { ChatFilterOptions } from '../../types';

/** Every key the Chat Moderation page mirrors into the URL (date ranges expand to From/To). */
export const CHAT_FILTER_KEYS = [
  'status', 'type', 'lastMessageFrom', 'lastMessageTo',
  'reported', 'hasRedacted', 'blocked',
  'unanswered', 'inactiveDays', 'minMessages', 'createdFrom', 'createdTo',
  'contextType', 'city',
] as const;

export const CHAT_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }, { value: 'closed', label: 'Closed' },
  ] },
  { key: 'type', label: 'Type', kind: 'select', inline: true, placeholder: 'All types', options: [
    { value: 'direct', label: 'Direct' }, { value: 'enquiry', label: 'Enquiry' },
  ] },
  { key: 'lastMessage', label: 'Last message', kind: 'daterange', inline: true, placeholder: 'Last message any time' },
  // Panel — Safety
  { key: 'reported', label: 'Reported', kind: 'toggle', group: 'Safety', hint: 'A message in the thread has been reported' },
  { key: 'hasRedacted', label: 'Has redactions', kind: 'toggle', group: 'Safety' },
  { key: 'blocked', label: 'Participant blocked', kind: 'toggle', group: 'Safety' },
  // Panel — Activity
  { key: 'unanswered', label: 'Unanswered by business', kind: 'toggle', group: 'Activity' },
  { key: 'inactiveDays', label: 'Inactive for', kind: 'select', group: 'Activity', options: [
    { value: '7', label: '7+ days' }, { value: '30', label: '30+ days' }, { value: '90', label: '90+ days' },
  ] },
  { key: 'minMessages', label: 'At least', kind: 'select', group: 'Activity', options: [
    { value: '2', label: '2 messages' }, { value: '5', label: '5 messages' }, { value: '10', label: '10 messages' }, { value: '25', label: '25 messages' },
  ] },
  { key: 'created', label: 'Started', kind: 'daterange', group: 'Activity' },
  // Panel — Context
  { key: 'contextType', label: 'About', kind: 'select', group: 'Context', options: [
    { value: 'product', label: 'A product' }, { value: 'provider', label: 'A business' },
  ] },
  { key: 'city', label: 'Business city', kind: 'select', group: 'Context', options: [] },
];

/** `recent` is the server default, so it is the placeholder rather than an option. */
export const CHAT_SORTS: SortOption[] = [
  { value: 'oldest', label: 'Oldest activity first' },
  { value: 'most_messages', label: 'Most messages' },
];

/** The city select is the only def whose options come from the server. */
export function withChatOptions(defs: FilterDef[], options?: ChatFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => (d.key === 'city' ? { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) } : d));
}

export function chatSegments(options?: ChatFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'All', patch: {}, count: c?.total },
    { label: 'Enquiries', patch: { type: 'enquiry' }, count: c?.enquiries },
    { label: 'Unanswered by business', patch: { unanswered: 'true' }, count: c?.unanswered },
    { label: 'Reported', patch: { reported: 'true' }, count: c?.reported },
    { label: 'Has redactions', patch: { hasRedacted: 'true' }, count: c?.redacted },
    { label: 'Stale 30d+', patch: { inactiveDays: '30' }, count: c?.stale30d },
  ];
}
