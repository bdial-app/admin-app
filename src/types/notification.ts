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
  | 'new_enquiry';

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
