import type { Attention, FreshKey, WaitingKey } from '../../services/attention.service';
import { ROUTES } from '../../utils/constants';
import type { AdminRole } from '../../types/roles';

/**
 * waiting — needs someone to act (amber, shared by all admins)
 * fresh   — new since you last opened the page (soft, per admin)
 * alert   — new and probably bad, e.g. server errors (soft red)
 * whatsapp — unread chats (WhatsApp green)
 */
export type AttentionTone = 'waiting' | 'fresh' | 'alert' | 'whatsapp';

export const TONES: Record<AttentionTone, { background: string; color: string }> = {
  waiting: { background: 'var(--color-warning)', color: '#fff' },
  // Mixed with the text colour so they read on light and dark backgrounds.
  fresh: { background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)', color: 'color-mix(in srgb, var(--color-primary) 65%, var(--text-primary))' },
  alert: { background: 'color-mix(in srgb, var(--color-danger) 18%, transparent)', color: 'color-mix(in srgb, var(--color-danger) 75%, var(--text-primary))' },
  whatsapp: { background: '#25D366', color: '#fff' },
};

export const toneColor = (tone: AttentionTone) =>
  tone === 'fresh' ? 'var(--color-primary)' : tone === 'alert' ? 'var(--color-danger)' : TONES[tone].background;

export type AttentionSource =
  | { kind: 'waiting'; key: WaitingKey }
  | { kind: 'fresh'; key: FreshKey }
  | { kind: 'whatsapp' };

export interface AttentionItem {
  path: string;
  label: string;
  source: AttentionSource;
  tone: AttentionTone;
  /** "3 deals waiting for approval" */
  describe: (n: number) => string;
  minRole?: AdminRole;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Which sidebar page shows which count. */
export const ATTENTION_ITEMS: AttentionItem[] = [
  { path: ROUTES.REGISTRATIONS, label: 'Verifications', source: { kind: 'waiting', key: 'verifications' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'Aadhaar check')} waiting` },
  { path: ROUTES.REPORTS, label: 'Reports', source: { kind: 'waiting', key: 'reports' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'report')} waiting` },
  { path: ROUTES.OFFERS, label: 'Offers', source: { kind: 'waiting', key: 'offers' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'deal')} waiting for approval` },
  { path: ROUTES.SPONSORSHIPS, label: 'Sponsorships', source: { kind: 'waiting', key: 'sponsorships' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'sponsorship')} waiting for approval` },
  { path: ROUTES.BUG_REPORTS, label: 'Bug reports', source: { kind: 'waiting', key: 'bugReports' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'open bug report')}` },
  { path: ROUTES.WOMEN_LED, label: 'Women-led', source: { kind: 'waiting', key: 'womenLed' }, tone: 'waiting',
    describe: (n) => `${plural(n, 'women-led request')} waiting` },
  { path: ROUTES.WHATSAPP, label: 'WhatsApp', source: { kind: 'whatsapp' }, tone: 'whatsapp',
    describe: (n) => `${plural(n, 'chat')} with unread messages` },

  { path: ROUTES.USERS, label: 'Users', source: { kind: 'fresh', key: 'users' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new sign-up')}` },
  { path: ROUTES.PROVIDERS, label: 'Providers', source: { kind: 'fresh', key: 'providers' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new business', 'new businesses')} signed up` },
  { path: ROUTES.PRODUCTS, label: 'Products', source: { kind: 'fresh', key: 'products' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new product')} from businesses` },
  { path: ROUTES.REVIEWS, label: 'Reviews', source: { kind: 'fresh', key: 'reviews' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new review')}` },
  { path: ROUTES.PHOTO_MODERATION, label: 'Photos', source: { kind: 'fresh', key: 'photos' }, tone: 'fresh', minRole: 'moderator',
    describe: (n) => `${plural(n, 'new photo')} from businesses` },
  { path: ROUTES.CHAT_MODERATION, label: 'Chat', source: { kind: 'fresh', key: 'chat' }, tone: 'fresh', minRole: 'moderator',
    describe: (n) => `${plural(n, 'new chat')} started` },
  { path: ROUTES.PAYMENTS, label: 'Payments', source: { kind: 'fresh', key: 'payments' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new payment')}` },
  { path: ROUTES.SUBSCRIPTIONS, label: 'Subscriptions', source: { kind: 'fresh', key: 'subscriptions' }, tone: 'fresh',
    describe: (n) => `${plural(n, 'new subscription')}` },
  { path: ROUTES.SERVICEABLE_CITIES, label: 'Serviceable cities', source: { kind: 'fresh', key: 'cities' }, tone: 'fresh', minRole: 'admin',
    describe: (n) => `${plural(n, 'new city request')}` },
  { path: ROUTES.LOGS, label: 'Logs', source: { kind: 'fresh', key: 'logs' }, tone: 'alert', minRole: 'admin',
    describe: (n) => `${plural(n, 'new server error')}` },
];

export const attentionForPath = (path: string) => ATTENTION_ITEMS.find((i) => i.path === path);

export function attentionCount(item: AttentionItem, data: Attention | undefined, waUnread: number | undefined): number {
  const s = item.source;
  if (s.kind === 'whatsapp') return waUnread ?? 0;
  if (!data) return 0;
  return s.kind === 'waiting' ? data.waiting[s.key] ?? 0 : data.fresh[s.key] ?? 0;
}
