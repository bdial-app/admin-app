import { APP_SCREENS, type AppScreen } from '../whatsapp/wa-utils';
import type { PushAudience, PushRecipient } from '../../types';

/** Roughly what Android and iOS show before cutting a push off. */
export const TITLE_LIMIT = 50;
export const BODY_LIMIT = 150;

/** What a campaign can fill in per person. */
export const CAMPAIGN_VARIABLES: { key: string; label: string; hint: string; businessesOnly?: boolean }[] = [
  { key: 'name', label: 'First name', hint: 'Aisha' },
  { key: 'city', label: 'City', hint: 'Mumbai' },
  { key: 'businessName', label: 'Business name', hint: 'Burhani Sweets', businessesOnly: true },
];

/** Believable values for previewing the app's own templates. */
const SAMPLES: Record<string, string> = {
  userName: 'Aisha',
  name: 'Aisha',
  customerName: 'Aisha Lokhandwala',
  brandName: 'Burhani Sweets',
  providerName: 'Burhani Sweets',
  businessName: 'Burhani Sweets',
  city: 'Mumbai',
  count: '12',
  n: '3',
  views: '248',
  searches: '96',
  enquiries: '7',
  impressions: '1,240',
  clicks: '86',
  seen: '64 people have seen it.',
  amount: '₹499',
  price: '149',
  discount: '20% off',
  offer: '20% off all mithai',
  voucherCode: 'EID25',
  planName: 'Growth',
  featureName: 'Lead unlocks',
  productName: 'Kaju Katli 500g',
  title: 'Add your opening hours',
  body: 'Customers check before they visit.',
  description: 'Growth plan, 1 month',
  daysLeft: '3',
  left: '2',
  quota: '5',
  waiting: '9',
  years: '1 year',
  pct: '35',
  term: 'gift hampers',
  reply: 'Shukran for your kind words!',
  reason: 'Photos did not match the business',
  result: 'resolved',
  milestone: '100 views',
  excerpt: 'Is this available in a 1 kg box?',
  ago: '2 hours',
  resetDate: '1 Dec',
  endDate: '5 Nov',
  expiryDate: '30 Nov',
};

export const sampleFor = (variable: string) => SAMPLES[variable] ?? variable;

export const sampleValues = (variables: string[]) =>
  Object.fromEntries(variables.map((v) => [v, sampleFor(v)]));

/** Every {{variable}} used in some text, in order. */
export const variablesIn = (...texts: (string | null | undefined)[]) => {
  const out: string[] = [];
  for (const t of texts) for (const m of (t ?? '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
};

/** Mirrors the server: unknown or empty values vanish without leaving stray spaces. */
export function fillIn(text: string, values: Record<string, string>): string {
  return text
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => values[k] ?? '')
    .replace(/[ \t]+([,.!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** How one recipient would see a campaign. */
export const valuesForRecipient = (r: PushRecipient | null | undefined): Record<string, string> => ({
  name: (r?.name ?? '').trim().split(/\s+/)[0] ?? '',
  city: r?.city?.trim() ?? '',
  businessName: r?.businessName?.trim() ?? '',
});

/** Put text where the cursor is in an input, and put the cursor after it. */
export function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  insert: string,
  set: (v: string) => void,
) {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  set(next);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(start + insert.length, start + insert.length);
  });
}

// ── Where a push opens ────────────────────────────────────

export const PRODUCT_LINK = /^\/p\/([0-9a-f-]{36})$/i;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** A product id out of a pasted id or product link. */
export const productIdFrom = (text: string) => UUID.exec(text)?.[0] ?? null;

/** Screens a push can open, for this audience. Owner screens only make sense for owners. */
export function screensFor(kind: PushAudience['kind']): AppScreen[] {
  return APP_SCREENS.filter((s) => {
    if (s.target.includes('{business_id}')) return false; // picked separately
    if (kind === 'businesses') return s.group !== 'Customers';
    if (kind === 'customers') return s.group !== 'Business owners';
    return true;
  });
}

export function linkLabel(route: string | null | undefined): string {
  if (!route || route === '/') return 'Home';
  // The app's own templates leave out mode=; the push says which side to open.
  const bare = (r: string) => r.replace(/[?&]mode=\w+/, '').replace(/^\/&/, '/?');
  const screen = APP_SCREENS.find((s) => s.target === route) ?? APP_SCREENS.find((s) => bare(s.target) === bare(route));
  if (screen) return `${screen.group === 'Anyone' ? '' : `${screen.group}: `}${screen.label}`;
  if (/^\/provider-details\?id=[0-9a-f-]{36}&mode=customer$/i.test(route)) return 'A business page';
  if (PRODUCT_LINK.test(route)) return 'A product';
  return route;
}

// ── Audience wording ──────────────────────────────────────

export const KIND_LABEL: Record<PushAudience['kind'], string> = {
  everyone: 'Everyone with the app',
  businesses: 'Business owners',
  customers: 'Customers',
  people: 'Specific people',
};

/** "Business owners · Mumbai, Pune · active in the last 7 days". */
export function describeAudience(a: PushAudience | undefined, categoryName?: (id: string) => string | undefined): string {
  if (!a) return '—';
  if (a.kind === 'people') {
    const n = (a.userIds?.length ?? 0) + (a.providerIds?.length ?? 0);
    return `${n} ${n === 1 ? 'person' : 'people'} picked`;
  }
  const parts: string[] = [KIND_LABEL[a.kind]];
  if (a.cities?.length) parts.push(a.cities.join(', '));
  if (a.categoryIds?.length) {
    const names = a.categoryIds.map((id) => categoryName?.(id)).filter(Boolean);
    parts.push(names.length ? names.join(', ') : `${a.categoryIds.length} categories`);
  }
  if (a.platforms?.length) parts.push(a.platforms.map((p) => (p === 'ios' ? 'iPhone' : p === 'web' ? 'Web' : 'Android')).join(' + '));
  if (a.joinedWithinDays) parts.push(`joined in the last ${a.joinedWithinDays} days`);
  if (a.activeWithinDays) parts.push(`active in the last ${a.activeWithinDays} days`);
  if (a.inactiveDays) parts.push(`not seen for ${a.inactiveDays}+ days`);
  if (a.womenLed) parts.push('women-led');
  if (a.paidPlan === 'yes') parts.push('on a paid plan');
  if (a.paidPlan === 'no') parts.push('no paid plan');
  if (a.noProducts) parts.push('no products yet');
  return parts.join(' · ');
}

/** Drops empty filters so previews cache well and the server sees only what's set. */
export function cleanAudience(a: PushAudience): PushAudience {
  const out: PushAudience = { kind: a.kind };
  if (a.kind === 'people') {
    if (a.userIds?.length) out.userIds = a.userIds;
    if (a.providerIds?.length) out.providerIds = a.providerIds;
    return out;
  }
  if (a.cities?.length) out.cities = a.cities;
  if (a.categoryIds?.length) out.categoryIds = a.categoryIds;
  if (a.platforms?.length) out.platforms = a.platforms;
  if (a.joinedWithinDays) out.joinedWithinDays = a.joinedWithinDays;
  if (a.activeWithinDays) out.activeWithinDays = a.activeWithinDays;
  if (a.inactiveDays) out.inactiveDays = a.inactiveDays;
  if (a.kind === 'businesses') {
    if (a.womenLed) out.womenLed = true;
    if (a.paidPlan) out.paidPlan = a.paidPlan;
    if (a.noProducts) out.noProducts = true;
  }
  return out;
}

export const fmtWhen = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '—';

export const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

export const CARD_STYLE = { background: 'var(--surface-0)', border: '1px solid var(--border-default)' } as const;
export const LABEL_CLASS = 'block text-xs font-medium uppercase mb-1.5';
