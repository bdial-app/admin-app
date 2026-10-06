import type {
  WaMessageStatus,
  VariableSource,
  WaTemplate,
  WaTemplateComponent,
  WaHeaderComponent,
  WaBodyComponent,
  WaFooterComponent,
  WaButtonsComponent,
  WaTemplateCategory,
  WaRates,
  WaVariableMapping,
  WaAudienceSample,
  WaSkipReason,
  AudienceFilters,
} from '../../types';
import { ROUTES } from '../../utils/constants';

// ── Routes inside the WhatsApp section ────────────────────
export const WA_ROUTES = {
  root: ROUTES.WHATSAPP,
  campaigns: `${ROUTES.WHATSAPP}/campaigns`,
  campaignNew: `${ROUTES.WHATSAPP}/campaigns/new`,
  campaign: (id: string) => `${ROUTES.WHATSAPP}/campaigns/${id}`,
  campaignEdit: (id: string) => `${ROUTES.WHATSAPP}/campaigns/${id}/edit`,
  templates: `${ROUTES.WHATSAPP}/templates`,
  templateNew: `${ROUTES.WHATSAPP}/templates/new`,
  template: (id: string) => `${ROUTES.WHATSAPP}/templates/${id}`,
  audience: `${ROUTES.WHATSAPP}/audience`,
  inbox: `${ROUTES.WHATSAPP}/inbox`,
  thread: (contactId: string) => `${ROUTES.WHATSAPP}/inbox/${contactId}`,
  settings: `${ROUTES.WHATSAPP}/settings`,
};

// ── Money ─────────────────────────────────────────────────
export const GST_RATE = 0.18;

export const formatInr = (n: number | string | null | undefined, digits = 2) => {
  const v = Number(n ?? 0);
  return `₹${(Number.isFinite(v) ? v : 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const DEFAULT_RATES: WaRates = { marketing: 0.8631, utility: 0.115, authentication: 0.115, service: 0 };

export const rateFor = (category: WaTemplateCategory | 'service', rates?: WaRates | null) =>
  (rates ?? DEFAULT_RATES)[category] ?? 0;

// ── Dates ─────────────────────────────────────────────────
export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

export const fmtRelative = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
};

export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

/** `datetime-local` value in the browser's local time. */
export const toLocalInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// ── Variables ─────────────────────────────────────────────
export interface VariableSourceOption {
  value: VariableSource;
  label: string;
  sample: string;
  hint: string;
}

export const VARIABLE_SOURCES: VariableSourceOption[] = [
  { value: 'brand_name', label: 'Business name', sample: 'Pronttera', hint: 'providers.brand_name' },
  { value: 'owner_name', label: 'Owner name', sample: 'Taaha', hint: 'users.name' },
  { value: 'city', label: 'City', sample: 'Hyderabad', hint: 'providers.city' },
  { value: 'category', label: 'Category', sample: 'Bakery', hint: 'first category name' },
  { value: 'profile_url', label: 'Profile link', sample: 'https://tijarah.app/provider-details?id=…', hint: 'public listing URL' },
  { value: 'products_count', label: 'Products count', sample: '12', hint: 'number of products' },
  { value: 'visits_7d', label: 'Profile visits (7d)', sample: '48', hint: 'profile views, last 7 days' },
  { value: 'enquiries_7d', label: 'Enquiries (7d)', sample: '5', hint: 'enquiries received, last 7 days' },
  { value: 'app_download_url', label: 'App download link', sample: 'https://play.google.com/store/apps/…', hint: 'Play Store URL' },
  { value: 'custom', label: 'Custom text', sample: '20% off', hint: 'a fixed value you type' },
];

export const variableSourceLabel = (source: VariableSource) =>
  VARIABLE_SOURCES.find((s) => s.value === source)?.label ?? source;

export const variableSourceSample = (source: VariableSource) =>
  VARIABLE_SOURCES.find((s) => s.value === source)?.sample ?? '';

/** Sorted, unique variable indexes found in text (`{{1}}`, `{{2}}`…). */
export const extractVariableIndexes = (text: string): number[] => {
  const found = new Set<number>();
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
};

/** Renumber `{{n}}` placeholders in order of first appearance to `{{1}}..{{n}}`. Returns the old→new map. */
export const renumberVariables = (text: string): { text: string; map: Record<number, number> } => {
  const order: number[] = [];
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    const n = Number(m[1]);
    if (!order.includes(n)) order.push(n);
  }
  const map: Record<number, number> = {};
  order.forEach((n, i) => { map[n] = i + 1; });
  const out = text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_s, n) => `{{${map[Number(n)]}}}`);
  return { text: out, map };
};

export const renderWaText = (text: string, values: Record<string, string>) =>
  text.replace(/\{\{\s*(\d+)\s*\}\}/g, (_s, n) => {
    const v = values[String(n)];
    return v === undefined || v === '' ? `{{${n}}}` : v;
  });

// ── Template component accessors ──────────────────────────
export const getHeader = (c: WaTemplateComponent[] | undefined) =>
  c?.find((x): x is WaHeaderComponent => x.type === 'HEADER');
export const getBody = (c: WaTemplateComponent[] | undefined) =>
  c?.find((x): x is WaBodyComponent => x.type === 'BODY');
export const getFooter = (c: WaTemplateComponent[] | undefined) =>
  c?.find((x): x is WaFooterComponent => x.type === 'FOOTER');
export const getButtons = (c: WaTemplateComponent[] | undefined) =>
  c?.find((x): x is WaButtonsComponent => x.type === 'BUTTONS')?.buttons ?? [];

/** Sample values per variable index straight from the template definition. */
export const templateSampleValues = (template: WaTemplate | undefined | null): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const v of template?.variables ?? []) out[String(v.index)] = v.sample || variableSourceSample(v.source);
  return out;
};

/** Resolve a campaign mapping to display values, preferring a real sample provider. */
export const resolveMappingValues = (
  template: WaTemplate | undefined | null,
  mapping: WaVariableMapping,
  sample?: WaAudienceSample | null,
): Record<string, string> => {
  const out: Record<string, string> = {};
  const indexes = extractVariableIndexes(getBody(template?.components)?.text ?? '');
  for (const i of indexes) {
    const key = String(i);
    const entry = mapping[key];
    const fallback = template?.variables.find((v) => v.index === i);
    if (!entry) {
      out[key] = fallback?.sample ?? '';
      continue;
    }
    out[key] = resolveSourceValue(entry.source, entry.value, sample, fallback?.sample);
  }
  return out;
};

export const resolveSourceValue = (
  source: VariableSource,
  value: string | undefined,
  sample?: WaAudienceSample | null,
  fallback?: string,
) => {
  switch (source) {
    case 'custom': return value ?? '';
    case 'brand_name': return sample?.brandName ?? fallback ?? variableSourceSample(source);
    case 'city': return sample?.city ?? fallback ?? variableSourceSample(source);
    default: return fallback || variableSourceSample(source);
  }
};

// ── Naming ────────────────────────────────────────────────
export const slugifyTemplateName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 512);

export const TEMPLATE_NAME_RE = /^[a-z0-9_]{1,512}$/;

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English (en)' },
  { value: 'en_US', label: 'English, US (en_US)' },
  { value: 'hi', label: 'Hindi (hi)' },
  { value: 'mr', label: 'Marathi (mr)' },
  { value: 'gu', label: 'Gujarati (gu)' },
  { value: 'ur', label: 'Urdu (ur)' },
];

// ── Labels ────────────────────────────────────────────────
export const CATEGORY_LABEL: Record<WaTemplateCategory, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
};

export const CATEGORY_GUIDE: Record<WaTemplateCategory, string> = {
  utility: 'Updates about the owner’s own listing',
  marketing: 'Promotions, announcements & re-engagement',
  authentication: 'One-time passcodes only',
};

export const SKIP_REASON_LABEL: Record<WaSkipReason | 'noPhone' | 'invalidPhone' | 'optedOut' | 'unreachable' | 'marketingCap' | 'duplicate' | 'dailyCap', string> = {
  opted_out: 'Opted out',
  optedOut: 'Opted out',
  no_phone: 'No phone number',
  noPhone: 'No phone number',
  invalid_phone: 'Invalid phone',
  invalidPhone: 'Invalid phone',
  duplicate: 'Duplicate number',
  unreachable: 'Not on WhatsApp',
  marketing_cap: 'Marketing cap (24h)',
  marketingCap: 'Marketing cap (24h)',
  daily_cap: 'Waiting for daily cap',
  dailyCap: 'Waiting for daily cap',
  cancelled: 'Cancelled',
};

export const QUALITY_COLOR = (q: string | null | undefined) => {
  switch ((q ?? '').toUpperCase()) {
    case 'GREEN': return 'var(--color-success)';
    case 'YELLOW': return 'var(--color-warning)';
    case 'RED': return 'var(--color-danger)';
    default: return 'var(--text-muted)';
  }
};

export const TIER_LABEL = (tier: string | null | undefined) => {
  switch ((tier ?? '').toUpperCase()) {
    case 'TIER_250': return '250 / day (unverified)';
    case 'TIER_1K': return '1,000 / day';
    case 'TIER_10K': return '10,000 / day';
    case 'TIER_100K': return '100,000 / day';
    case 'TIER_UNLIMITED': return 'Unlimited';
    default: return tier || 'Unknown';
  }
};

// ── Errors ────────────────────────────────────────────────
export const apiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const m = data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string' && m.trim()) return m;
  return fallback;
};

// ── Audience helpers ──────────────────────────────────────
export const DEFAULT_AUDIENCE: AudienceFilters = {
  mode: 'filters',
  statuses: ['active', 'unverified'],
  consent: 'not_opted_out',
  reachableOnly: true,
};

export const summarizeFilters = (f: AudienceFilters): string[] => {
  const out: string[] = [];
  const picks: string[] = [];
  if (f.providerIds?.length) picks.push(`${f.providerIds.length} picked businesses`);
  if (f.customerIds?.length) picks.push(`${f.customerIds.length} picked customers`);
  if (f.phones?.length) picks.push(`${f.phones.length} pasted numbers`);
  const tail: string[] = [];
  const excluded = (f.excludeProviderIds?.length ?? 0) + (f.excludeCustomerIds?.length ?? 0) + (f.excludePhones?.length ?? 0);
  if (excluded) tail.push(`${excluded} excluded`);
  if (f.maxRecipients) tail.push(`At most ${f.maxRecipients} (${f.order === 'random' ? 'random' : f.order === 'newest' ? 'newest first' : 'oldest first'})`);
  if (f.mode === 'manual') {
    return picks.length ? [...picks, ...tail] : ['Manual (empty)'];
  }
  out.push(f.audienceType === 'customers' ? 'App customers' : f.audienceType === 'both' ? 'Businesses + customers' : 'Businesses');
  if (f.areas?.length) out.push(`Area: ${f.areas.join(', ')}`);
  if (f.ownerSignedIn) out.push(f.ownerSignedIn === 'yes' ? 'Owner uses the app' : 'Owner never opened the app');
  if (f.activeWithinDays) out.push(`Active within ${f.activeWithinDays}d`);
  if (f.minProducts != null) out.push(`≥ ${f.minProducts} products`);
  if (f.maxProducts != null) out.push(`≤ ${f.maxProducts} products`);
  if (f.googleLinked) out.push(f.googleLinked === 'yes' ? 'Google linked' : 'Not on Google');
  if (f.minRating) out.push(`★ ${f.minRating}+`);
  if (f.paidPlan) out.push(f.paidPlan === 'yes' ? 'Paid plan' : 'Free plan');
  if (f.everContacted) out.push(f.everContacted === 'yes' ? 'Messaged before' : 'Never messaged');
  if (f.repliedEver) out.push(f.repliedEver === 'yes' ? 'Has replied' : 'Never replied');
  if (f.receivedCampaignIds?.length) out.push(`Got ${f.receivedCampaignIds.length} campaign(s)`);
  if (f.notReceivedCampaignIds?.length) out.push(`Missed ${f.notReceivedCampaignIds.length} campaign(s)`);
  if (f.contactTags?.length) out.push(`Tags: ${f.contactTags.join(', ')}`);
  if (f.customerSignedInOnly === false) out.push('Incl. accounts we created');
  if (f.cities?.length) out.push(`City: ${f.cities.join(', ')}`);
  if (f.categoryIds?.length) out.push(`${f.categoryIds.length} categor${f.categoryIds.length === 1 ? 'y' : 'ies'}`);
  if (f.statuses?.length) out.push(`Status: ${f.statuses.join(', ')}`);
  if (f.trustLevels?.length) out.push(`Trust: ${f.trustLevels.join(', ')}`);
  if (f.verification) out.push(`Verification: ${f.verification}`);
  if (f.womenLed) out.push('Women-led');
  if (f.isFeatured) out.push('Featured');
  if (f.missingLogo) out.push('Missing logo');
  if (f.missingProducts) out.push('No products');
  if (f.locationPrecision === 'approximate') out.push('Location not set');
  if (f.locationPrecision === 'exact') out.push('Exact location');
  if (f.createdWithinDays) out.push(`Joined within ${f.createdWithinDays}d`);
  if (f.createdBeforeDays) out.push(`Joined before ${f.createdBeforeDays}d`);
  if (f.inactiveDays) out.push(`Inactive ${f.inactiveDays}d+`);
  if (f.notContactedDays) out.push(`Not contacted ${f.notContactedDays}d+`);
  if (f.consent && f.consent !== 'not_opted_out') out.push(`Consent: ${f.consent.replace('_', ' ')}`);
  if (f.reachableOnly === false) out.push('Including unreachable');
  return [...out, ...picks.map((p) => `+ ${p}`), ...tail];
};

export const initials = (name: string | null | undefined, fallback = '#') => {
  const n = (name ?? '').trim();
  if (!n) return fallback;
  const parts = n.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
};

export const parsePhones = (raw: string): string[] => {
  const seen = new Set<string>();
  for (const token of raw.split(/[\s,;\n]+/)) {
    const digits = token.replace(/[^\d]/g, '');
    if (!digits) continue;
    const e164 = digits.length === 10 ? `+91${digits}` : `+${digits}`;
    seen.add(e164);
  }
  return [...seen];
};

/** Minutes for `count` messages at `rpm`, rounded up. */
export const estimateMinutes = (count: number, rpm: number) => (rpm > 0 ? Math.ceil(count / rpm) : 0);

export const humanMinutes = (m: number) => {
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

export const MESSAGE_STATUS_LABEL: Record<WaMessageStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  skipped: 'Skipped',
  received: 'Received',
};

// ── Shared form styling ───────────────────────────────────
export const INPUT_CLASS = 'w-full px-3 py-2 text-sm rounded-lg focus-ring';
export const INPUT_STYLE = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
} as const;
export const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 transition-colors';
export const BTN_SECONDARY = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50';
export const SECONDARY_STYLE = { background: 'var(--surface-2)', color: 'var(--text-primary)' } as const;
export const PRIMARY_STYLE = { background: 'var(--color-primary)' } as const;
