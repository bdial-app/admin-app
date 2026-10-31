// ── Notification Types ───────────────────────────────────

export type NotificationType =
  | 'chat_message'
  | 'review_received'
  | 'provider_status'
  | 'verification_update'
  | 'booking_update'
  | 'promotional'
  | 'system_announcement'
  | 'report_update'
  | 'new_enquiry'
  | 'payment_update'
  | 'voucher_update'
  | 'subscription_update'
  | 'invite_update';

export type BatchTargetType = 'all' | 'segment' | 'individual';
export type BatchStatus = 'draft' | 'sending' | 'sent' | 'failed';

export interface NotificationBatch {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
  targetType: BatchTargetType;
  targetCriteria: Record<string, unknown> | null;
  sentBy: string | null;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  status: BatchStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  sender?: { id: string; name?: string | null } | null;
}

export interface NotificationStats {
  totalSent: number;
  totalRead: number;
  readRate: number;
  sentToday: number;
  batchesSent: number;
}

export interface SendNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  targetType: BatchTargetType;
  targetCriteria?: {
    city?: string;
    role?: string;
    userIds?: string[];
  };
}

export interface BatchFilters {
  page?: number;
  limit?: number;
  status?: BatchStatus | '';
}

// ── Notification Templates ───────────────────────────────

export type TemplateCategory = 'onboarding' | 'transactional' | 'engagement' | 'marketing' | 'campaign';

export interface NotificationTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  category: string;
  isActive: boolean;
  defaultRoute: string | null;
  defaultImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string | null;
  titleTemplate?: string;
  bodyTemplate?: string;
  isActive?: boolean;
  defaultRoute?: string | null;
  defaultImageUrl?: string | null;
  /** Saved messages only. */
  type?: NotificationType;
}

// ── Push campaigns ───────────────────────────────────────

export type PushAudienceKind = 'everyone' | 'businesses' | 'customers' | 'people';
export type PushPlatform = 'android' | 'ios' | 'web';
export type PushKind = 'promotional' | 'system_announcement';

export interface PushAudience {
  kind: PushAudienceKind;
  cities?: string[];
  categoryIds?: string[];
  platforms?: PushPlatform[];
  joinedWithinDays?: number;
  activeWithinDays?: number;
  inactiveDays?: number;
  womenLed?: boolean;
  paidPlan?: 'yes' | 'no';
  noProducts?: boolean;
  userIds?: string[];
  providerIds?: string[];
}

export interface PushRecipient {
  userId: string;
  kind: 'business' | 'customer';
  name: string | null;
  city: string | null;
  providerId: string | null;
  businessName: string | null;
}

export interface PushAudiencePreview {
  total: number;
  businesses: number;
  customers: number;
  pushOff: number;
  noDevice: number;
  platforms: Record<PushPlatform, number>;
  sample: PushRecipient[];
}

export interface PushAudienceOptions {
  cities: { name: string; count: number }[];
  categories: { id: string; name: string }[];
}

export interface PushMessage {
  title: string;
  body: string;
  imageUrl?: string;
  route?: string;
  type?: PushKind;
}

export interface CreateCampaignPayload extends PushMessage {
  audience: PushAudience;
  scheduledAt?: string;
  templateId?: string;
}

export interface PushTestTarget {
  userId?: string;
  providerId?: string;
}

export interface PushTestResult {
  devices: number;
  delivered: number;
  sentTo: string;
}

/** What a campaign batch carries in `data`. */
export interface CampaignData {
  campaign?: boolean;
  type?: PushKind;
  route?: string | null;
  templateId?: string | null;
  stats?: { pushed: number; inbox: number; failed: number };
}

export interface TemplateStat {
  slug: string;
  sent: number;
  opened: number;
  lastSentAt: string | null;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  titleTemplate: string;
  bodyTemplate: string;
  defaultRoute?: string;
  defaultImageUrl?: string;
  type?: PushKind;
}
