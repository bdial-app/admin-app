// ── WhatsApp Marketing ───────────────────────────────────
// Shapes mirror bdial-service/src/whatsapp/README.md §4 exactly.

export type WaTemplateCategory = 'marketing' | 'utility' | 'authentication';
export type WaTemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';
export type WaCampaignStatus =
  | 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type WaMessageStatus =
  | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped' | 'received';
export type WaMessageKind =
  | 'template' | 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker'
  | 'location' | 'reaction' | 'unknown';
export type WaDirection = 'outbound' | 'inbound';
export type WaConsent = 'unknown' | 'opted_in' | 'opted_out';
export type WaSkipReason =
  | 'opted_out' | 'no_phone' | 'invalid_phone' | 'duplicate' | 'unreachable'
  | 'marketing_cap' | 'daily_cap' | 'cancelled';

export type VariableSource =
  | 'brand_name' | 'owner_name' | 'city' | 'category' | 'profile_url'
  | 'products_count' | 'visits_7d' | 'enquiries_7d' | 'app_download_url' | 'custom';

// ── Template components (Meta format) ────────────────────
export interface WaHeaderComponent {
  type: 'HEADER';
  format: 'TEXT' | 'IMAGE';
  text?: string;
  example?: unknown;
}
export interface WaBodyComponent {
  type: 'BODY';
  text: string;
  example?: unknown;
}
export interface WaFooterComponent {
  type: 'FOOTER';
  text: string;
}
export type WaButton =
  | { type: 'URL'; text: string; url: string; example?: string[] }
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string };
export interface WaButtonsComponent {
  type: 'BUTTONS';
  buttons: WaButton[];
}
export type WaTemplateComponent =
  | WaHeaderComponent | WaBodyComponent | WaFooterComponent | WaButtonsComponent;

export interface WaTemplateVariable {
  index: number;
  location: 'body' | 'header' | 'button';
  label: string;
  source: VariableSource;
  sample: string;
}

export interface WaTemplate {
  id: string;
  name: string;
  language: string;
  category: WaTemplateCategory;
  status: WaTemplateStatus;
  metaTemplateId: string | null;
  components: WaTemplateComponent[];
  variables: WaTemplateVariable[];
  description: string | null;
  rejectedReason: string | null;
  qualityScore: string | null;
  isSeed: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface WaTemplatePayload {
  name: string;
  language: string;
  category: WaTemplateCategory;
  components: WaTemplateComponent[];
  variables: WaTemplateVariable[];
  description?: string;
  submit?: boolean;
}

export interface WaTemplateFilters {
  status?: WaTemplateStatus | '';
  category?: WaTemplateCategory | '';
  search?: string;
}

export interface WaRenderedTemplate {
  header?: string;
  body: string;
  footer?: string;
  buttons?: WaButton[];
}

// ── Settings ─────────────────────────────────────────────
export interface WaRates {
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
}

export interface WaPhoneMeta {
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  messagingLimitTier: string | null;
  nameStatus: string | null;
  fetchedAt: string | null;
}

export interface WaSettings {
  configured: boolean;
  isTestNumber: boolean;
  apiVersion: string;
  phone: WaPhoneMeta | null;
  dailyCap: number;
  sentLast24h: number;
  uniqueRecipientsLast24h: number;
  ratePerMinute: number;
  sendWindowStart: number;
  sendWindowEnd: number;
  optOutKeywords: string[];
  optInKeywords: string[];
  requireOptInForMarketing: boolean;
  rates: WaRates;
  webhook: {
    url: string;
    lastEventAt: string | null;
    verifyTokenSet: boolean;
    appSecretSet: boolean;
  };
}

export type WaSettingsUpdate = Partial<
  Pick<
    WaSettings,
    | 'dailyCap' | 'ratePerMinute' | 'sendWindowStart' | 'sendWindowEnd'
    | 'optOutKeywords' | 'optInKeywords' | 'requireOptInForMarketing' | 'rates'
  >
>;

export interface WaSettingsTestSendPayload {
  phone: string;
  templateId?: string;
  text?: string;
}

// ── Overview ─────────────────────────────────────────────
export type WaAttentionType =
  | 'template_rejected' | 'campaign_failed' | 'campaign_paused' | 'high_failure_rate'
  | 'unanswered_replies' | 'quality_drop' | 'not_configured' | 'webhook_silent';

export interface WaAttentionItem {
  type: WaAttentionType;
  title: string;
  detail: string;
  href: string;
}

export interface WaSeriesPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
  costInr: number;
}

export interface WaOverview {
  kpis: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied: number;
    deliveryRate: number;
    readRate: number;
    costInr: number;
    activeCampaigns: number;
    unreadConversations: number;
    contacts: number;
    optedOut: number;
  };
  series: WaSeriesPoint[];
  attention: WaAttentionItem[];
  recentCampaigns: WaCampaignSummary[];
}

// ── Audience ─────────────────────────────────────────────
export interface AudienceFilters {
  cities?: string[];
  categoryIds?: string[];
  statuses?: ('unverified' | 'active' | 'suspended' | 'disabled')[];
  trustLevels?: ('unverified' | 'basic' | 'verified' | 'trusted')[];
  verification?: 'none' | 'pending' | 'in_review' | 'approved' | 'rejected';
  womenLed?: boolean;
  isFeatured?: boolean;
  createdWithinDays?: number;
  createdBeforeDays?: number;
  inactiveDays?: number;
  missingLogo?: boolean;
  missingProducts?: boolean;
  /** 'approximate' = pinned at a city centre or not at all. */
  locationPrecision?: 'approximate' | 'exact';
  notContactedDays?: number;
  consent?: 'any' | 'opted_in' | 'not_opted_out';
  reachableOnly?: boolean;
  providerIds?: string[];
  phones?: string[];
  mode?: 'filters' | 'manual';
}

export interface WaSkipBreakdown {
  noPhone: number;
  invalidPhone: number;
  optedOut: number;
  unreachable: number;
  marketingCap: number;
  duplicate: number;
}

export interface WaAudienceSample {
  providerId: string;
  brandName: string;
  city: string | null;
  phone: string | null;
  consent: WaConsent;
}

export interface WaAudiencePreview {
  total: number;
  sendable: number;
  skipped: WaSkipBreakdown;
  estimatedCost: { utility: number; marketing: number };
  sample: WaAudienceSample[];
}

export interface WaAudiencePreviewPayload {
  filters: AudienceFilters;
  templateCategory?: 'marketing' | 'utility';
}

export interface WaContactProvider {
  id: string;
  brandName: string;
  city: string | null;
  status?: string;
  trustLevel?: string;
}

export interface WaContact {
  id: string;
  phone: string;
  displayName: string | null;
  consent: WaConsent;
  reachable: boolean;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  unreadCount: number;
  tags: string[];
  /** Not in the README's Contact JSON; PATCH accepts it so we read it back when present. */
  notes?: string | null;
  provider: WaContactProvider | null;
  messagesSent: number;
  lastCampaignName: string | null;
}

export interface WaContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  consent?: WaConsent | '';
  city?: string;
  hasProvider?: boolean;
  tag?: string;
}

export interface WaContactUpdate {
  consent?: WaConsent;
  tags?: string[];
  notes?: string;
}

export interface WaSegment {
  id: string;
  name: string;
  description: string | null;
  filters: AudienceFilters;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaSegmentPayload {
  name: string;
  description?: string;
  filters: AudienceFilters;
}

export interface WaAudienceOptions {
  cities: string[];
  categories: { id: string; name: string }[];
}

// ── Campaigns ────────────────────────────────────────────
export interface WaVariableMappingEntry {
  source: VariableSource;
  value?: string;
}
/** Keyed by variable index ("1", "2", …). */
export type WaVariableMapping = Record<string, WaVariableMappingEntry>;
/** Keyed by URL-button index ("0", "1", …). */
export type WaButtonUrlParams = Record<string, WaVariableMappingEntry>;

export interface WaCampaignSummary {
  id: string;
  name: string;
  status: WaCampaignStatus;
  template: { id: string; name: string; category: WaTemplateCategory; language: string };
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  skippedCount: number;
  repliedCount: number;
  estimatedCostInr: number;
  actualCostInr: number;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface WaFailureBreakdownItem {
  code: number;
  message: string;
  count: number;
}

export interface WaCampaign extends WaCampaignSummary {
  audience: AudienceFilters;
  variableMapping: WaVariableMapping;
  headerMediaUrl: string | null;
  buttonUrlParams: WaButtonUrlParams | null;
  ratePerMinute: number | null;
  failureReason: string | null;
  skipBreakdown: WaSkipBreakdown;
  failureBreakdown: WaFailureBreakdownItem[];
}

export interface WaCampaignPayload {
  name: string;
  templateId: string;
  audience: AudienceFilters;
  variableMapping: WaVariableMapping;
  headerMediaUrl?: string;
  buttonUrlParams?: WaButtonUrlParams;
  ratePerMinute?: number;
}

export interface WaCampaignFilters {
  page?: number;
  limit?: number;
  status?: WaCampaignStatus | '';
  search?: string;
}

export interface WaMessageRow {
  id: string;
  contactId: string;
  phone: string;
  provider: { id: string; brandName: string; city: string | null } | null;
  status: WaMessageStatus;
  errorCode: number | null;
  errorMessage: string | null;
  skipReason: WaSkipReason | null;
  attempts: number;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  costInr: number;
  renderedBody: string | null;
}

export interface WaCampaignMessageFilters {
  page?: number;
  limit?: number;
  status?: WaMessageStatus | '';
  search?: string;
}

// ── Inbox ────────────────────────────────────────────────
export type WaConversationFilter = 'all' | 'unread' | 'open_window';

export interface WaConversation {
  contactId: string;
  phone: string;
  displayName: string | null;
  provider: { id: string; brandName: string; city: string | null } | null;
  consent: WaConsent;
  unreadCount: number;
  lastMessage: {
    direction: WaDirection;
    kind: WaMessageKind;
    body: string | null;
    at: string;
    status: WaMessageStatus;
  } | null;
  windowExpiresAt: string | null;
}

export interface WaConversationFilters {
  page?: number;
  limit?: number;
  filter?: WaConversationFilter;
  search?: string;
}

export interface WaMessage {
  id: string;
  direction: WaDirection;
  kind: WaMessageKind;
  status: WaMessageStatus;
  body: string | null;
  templateName: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  campaign: { id: string; name: string } | null;
}

export interface WaThread {
  items: WaMessage[];
  contact: WaContact;
  windowExpiresAt: string | null;
}

export type WaReplyPayload =
  | { text: string }
  | { templateId: string; variables: Record<string, string> };

// ── Provider page hook ───────────────────────────────────
export interface WaPhoneCandidate {
  source: 'whatsapp_number' | 'contact_number' | 'mobile_number';
  raw: string;
  normalized: string | null;
}

export interface WaProviderInfo {
  contact: WaContact | null;
  phoneCandidates: WaPhoneCandidate[];
  windowExpiresAt: string | null;
  messages: WaMessage[];
}
