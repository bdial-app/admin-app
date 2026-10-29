import {
  Eye, Package, MousePointerClick, MessageSquare, Phone, Navigation, Share2, Bookmark, BookmarkMinus,
  Gift, Image, Star, LayoutGrid, Search, type LucideIcon,
} from 'lucide-react';
import type { FilterDef, Segment, SortOption } from '../ui/filters';
import type { LeadPeriod, LeadTier, LeadUnlockMethod } from '../../types';

export const PERIODS: { value: LeadPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

export const TIER_META: Record<LeadTier, { label: string; color: string; bg: string }> = {
  hot: { label: 'Hot', color: '#DC2626', bg: 'rgba(239,68,68,0.12)' },
  warm: { label: 'Warm', color: '#D97706', bg: 'rgba(245,158,11,0.14)' },
  soft: { label: 'Soft', color: '#0891B2', bg: 'rgba(6,182,212,0.12)' },
  cold: { label: 'Cold', color: '#64748B', bg: 'rgba(148,163,184,0.18)' },
};

export const METHOD_META: Record<LeadUnlockMethod, { label: string; short: string; color: string }> = {
  paid: { label: 'Paid', short: 'Paid', color: '#16A34A' },
  quota: { label: 'Free monthly quota', short: 'Free quota', color: '#6366F1' },
  plan: { label: 'Subscription credit', short: 'Plan credit', color: '#8B5CF6' },
  free: { label: 'Free (leads not monetised)', short: 'Free', color: '#0EA5E9' },
  anonymous: { label: 'Anonymous visitor', short: 'Anonymous', color: '#94A3B8' },
  unknown: { label: 'Not recorded (before tracking)', short: 'Unlocked', color: '#94A3B8' },
};

/** What a customer did on a business, for timelines and the interactions feed. */
export const EVENT_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  profile_view: { label: 'Viewed the profile', icon: Eye, color: '#6366F1' },
  product_view: { label: 'Viewed a product', icon: Package, color: '#8B5CF6' },
  search_click: { label: 'Opened from search', icon: MousePointerClick, color: '#0EA5E9' },
  search_appearance: { label: 'Appeared in a search', icon: Search, color: '#94A3B8' },
  chat_initiated: { label: 'Started a chat', icon: MessageSquare, color: '#16A34A' },
  call_clicked: { label: 'Tapped call', icon: Phone, color: '#DC2626' },
  direction_clicked: { label: 'Got directions', icon: Navigation, color: '#D97706' },
  share_clicked: { label: 'Shared the business', icon: Share2, color: '#0891B2' },
  saved: { label: 'Saved the business', icon: Bookmark, color: '#EC4899' },
  unsaved: { label: 'Unsaved the business', icon: BookmarkMinus, color: '#94A3B8' },
  offer_viewed: { label: 'Viewed an offer', icon: Gift, color: '#F59E0B' },
  photo_viewed: { label: 'Viewed photos', icon: Image, color: '#14B8A6' },
  review_read: { label: 'Read reviews', icon: Star, color: '#EAB308' },
  tab_switched: { label: 'Browsed the tabs', icon: LayoutGrid, color: '#94A3B8' },
};

export const eventMeta = (type: string) =>
  EVENT_META[type] ?? { label: type.replace(/_/g, ' '), icon: Eye, color: '#94A3B8' };

/** The strongest signals first, so a row's icons read by intent. */
export const ACTION_ORDER = [
  'call_clicked', 'chat_initiated', 'direction_clicked', 'saved', 'share_clicked', 'product_view',
  'offer_viewed', 'review_read', 'photo_viewed', 'profile_view', 'search_click',
];

export const SOURCE_LABELS: Record<string, string> = {
  home_feed: 'Home feed',
  explore: 'Explore',
  search: 'Search',
  direct: 'Direct link',
  saved: 'Saved list',
  chat: 'Chat',
  product_link: 'Product link',
  unknown: 'Unknown',
};

// ── Leads tab filters ─────────────────────────────────────

export const LEAD_FILTER_DEFS: FilterDef[] = [
  { key: 'tier', label: 'Tier', kind: 'select', inline: true, placeholder: 'All tiers', options: [
    { value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'soft', label: 'Soft' }, { value: 'cold', label: 'Cold' },
  ] },
  { key: 'status', label: 'Status', kind: 'select', inline: true, placeholder: 'Locked & unlocked', options: [
    { value: 'locked', label: 'Locked' }, { value: 'unlocked', label: 'Unlocked' },
  ] },
  { key: 'checked', label: 'Checked by business', kind: 'select', inline: true, placeholder: 'Checked or not', options: [
    { value: 'true', label: 'Checked' }, { value: 'false', label: 'Never checked' },
  ] },
  { key: 'method', label: 'Unlocked with', kind: 'select', group: 'Unlock', options: [
    { value: 'paid', label: 'Paid' }, { value: 'quota', label: 'Free monthly quota' }, { value: 'plan', label: 'Subscription credit' },
    { value: 'free', label: 'Free (leads not monetised)' }, { value: 'unknown', label: 'Not recorded' },
  ] },
  { key: 'source', label: 'Came from', kind: 'select', group: 'Lead', options: Object.entries(SOURCE_LABELS)
    .filter(([v]) => v !== 'unknown').map(([value, label]) => ({ value, label })) },
];

export const LEAD_SORTS: SortOption[] = [
  { value: 'score', label: 'Highest score' },
  { value: 'unlocked', label: 'Recently unlocked' },
  { value: 'checked', label: 'Recently checked' },
];

export const LEAD_SEGMENTS: Segment[] = [
  { label: 'All', patch: {} },
  { label: 'Hot & locked', patch: { tier: 'hot', status: 'locked' } },
  { label: 'Checked, not unlocked', patch: { checked: 'true', status: 'locked' } },
  { label: 'Never checked', patch: { checked: 'false' } },
  { label: 'Paid', patch: { method: 'paid' } },
];

// ── Interactions tab filters ──────────────────────────────

export const INTERACTION_FILTER_DEFS: FilterDef[] = [
  { key: 'eventType', label: 'Action', kind: 'select', inline: true, placeholder: 'All actions', options: Object.entries(EVENT_META)
    .map(([value, m]) => ({ value, label: m.label })) },
  { key: 'registered', label: 'Visitor', kind: 'select', inline: true, placeholder: 'Everyone', options: [
    { value: 'true', label: 'Signed-in customers' }, { value: 'false', label: 'Anonymous visitors' },
  ] },
];

export const fmtDuration = (s: number) => {
  if (!s) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60 ? `${s % 60}s` : ''}`.trim() : `${Math.floor(m / 60)}h ${m % 60}m`;
};

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
