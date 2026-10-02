import type { FilterDef, Segment, SortOption } from '../ui/filters';
import { istDay } from '../ui/filters';
import type { VerificationFilterOptions } from '../../types';

/** Every key the Verifications page mirrors into the URL (date ranges expand to From/To). */
export const VERIFICATION_FILTER_KEYS = [
  'status', 'aadhaar', 'submittedFrom', 'submittedTo',
  'ijamat', 'reviewer', 'reviewedFrom', 'reviewedTo', 'waitingDays',
  'city', 'hasProvider',
] as const;

export const VERIFICATION_FILTER_DEFS: FilterDef[] = [
  // Toolbar
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'All statuses', options: [
    { value: 'pending', label: 'Pending' }, { value: 'in_review', label: 'In review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ] },
  { key: 'aadhaar', label: 'Aadhaar', kind: 'select', inline: true, placeholder: 'Any Aadhaar status', options: [
    { value: 'pending', label: 'Aadhaar pending' }, { value: 'approved', label: 'Aadhaar approved' }, { value: 'rejected', label: 'Aadhaar rejected' },
  ] },
  { key: 'submitted', label: 'Submitted', kind: 'daterange', inline: true, placeholder: 'Submitted any time' },
  // Panel — Documents
  { key: 'ijamat', label: 'iJamat', kind: 'select', group: 'Documents', options: [
    { value: 'not_submitted', label: 'Not submitted' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  ] },
  // Panel — Review
  { key: 'reviewer', label: 'Reviewed by', kind: 'select', group: 'Review', options: [] },
  { key: 'reviewed', label: 'Reviewed', kind: 'daterange', group: 'Review' },
  { key: 'waitingDays', label: 'Waiting', kind: 'select', group: 'Review', hint: 'Submitted this long ago and still undecided', options: [
    { value: '1', label: 'More than a day' }, { value: '3', label: '3+ days' }, { value: '7', label: '7+ days' }, { value: '14', label: '14+ days' }, { value: '30', label: '30+ days' },
  ] },
  // Panel — Applicant
  { key: 'city', label: 'City', kind: 'select', group: 'Applicant', options: [] },
  { key: 'hasProvider', label: 'Business', kind: 'select', group: 'Applicant', options: [
    { value: 'true', label: 'Owns a business' }, { value: 'false', label: 'No business yet' },
  ] },
];

/** `oldest` is the server default, so it is the placeholder rather than an option. */
export const VERIFICATION_SORTS: SortOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'waiting_longest', label: 'Waiting longest' },
];

/** Cities and reviewers come from the server with live counts. */
export function withVerificationOptions(defs: FilterDef[], options?: VerificationFilterOptions): FilterDef[] {
  if (!options) return defs;
  return defs.map((d) => {
    if (d.key === 'city') return { ...d, options: options.cities.map((c) => ({ value: c.name, label: c.name, count: c.count })) };
    if (d.key === 'reviewer') return { ...d, options: options.reviewers.map((r) => ({ value: r.id, label: r.name, count: r.count })) };
    return d;
  });
}

export function verificationSegments(options?: VerificationFilterOptions): Segment[] {
  const c = options?.counts;
  return [
    { label: 'Needs review', patch: { aadhaar: 'pending' }, count: c?.needsReview },
    { label: 'Waiting 3+ days', patch: { waitingDays: '3' }, count: c?.waiting3d },
    { label: 'Approved this week', patch: { status: 'approved', reviewedFrom: istDay(6) }, count: c?.approvedThisWeek },
    { label: 'Rejected', patch: { status: 'rejected' }, count: c?.rejected },
    { label: 'iJamat not submitted', patch: { ijamat: 'not_submitted' }, count: c?.ijamatMissing },
  ];
}
