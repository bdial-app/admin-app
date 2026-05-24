// ── User ──────────────────────────────────────────────────
export type UserRole = 'customer' | 'admin';
export type AdminTier = 'super_admin' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'deleted' | 'paused';
export type Gender = 'male' | 'female' | 'other';

// ── Provider ─────────────────────────────────────────────
export type ProviderStatus = 'unverified' | 'active' | 'suspended' | 'disabled';

// ── Verification ─────────────────────────────────────────
export type DocStatus = 'pending' | 'approved' | 'rejected';
export type IjamatStatus = 'pending' | 'approved' | 'rejected' | 'not_submitted';
export type VerificationOverallStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

// ── Review ───────────────────────────────────────────────
export type ReviewStatus = 'active' | 'removed';

// ── Report ───────────────────────────────────────────────
export type ReportEntityType = 'provider' | 'product' | 'message' | 'deal' | 'review' | 'customer';
export type ReportReason =
  | 'fake_business' | 'inappropriate_content' | 'fraud_scam' | 'harassment'
  | 'impersonation' | 'wrong_category' | 'fake_product' | 'counterfeit'
  | 'prohibited_item' | 'wrong_price' | 'spam' | 'fraud'
  | 'misleading_offer' | 'expired_deal' | 'fake_discount'
  | 'fake_review' | 'offensive_language' | 'irrelevant_content'
  | 'abusive_behavior' | 'fake_account' | 'spam_messages'
  | 'other';
export type ReportStatus = 'pending' | 'under_review' | 'action_taken' | 'dismissed';
export type ReportAction = 'dismiss' | 'warn' | 'suspend' | 'ban';

// ── Review Report ────────────────────────────────────────
export type ReviewReportStatus = 'pending' | 'reviewed' | 'dismissed';

// ── Warning ──────────────────────────────────────────────
export type WarningType = 'report_warning' | 'policy_violation' | 'content_warning';

// ── Booking ──────────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

// ── Sponsored ────────────────────────────────────────────
export type SponsoredType = 'carousel' | 'inline' | 'top_result';
export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

// ── Offer ────────────────────────────────────────────────
export type DiscountType = 'percentage' | 'flat';

// ── Bulk Actions ─────────────────────────────────────────
export type BulkActionType = 'activate' | 'deactivate' | 'delete' | 'suspend' | 'unsuspend' | 'feature' | 'unfeature';

// ── Export Entities ──────────────────────────────────────
export type ExportEntity = 'users' | 'providers' | 'products' | 'reviews' | 'reports';

// ── Badge ────────────────────────────────────────────────
export type BadgeType = 'gold_seller' | 'top_rated' | 'express_service' | 'trusted' | 'rising_star';
export type BadgeSource = 'paid' | 'earned';

// ── Ad Event ─────────────────────────────────────────────
export type AdEventType = 'impression' | 'click';
export type AdEntityType = 'sponsored_listing' | 'promo_banner' | 'provider_offer';

// ── Chat ─────────────────────────────────────────────────
export type ConversationType = 'direct' | 'enquiry';
export type ConversationStatus = 'active' | 'archived' | 'closed';
export type MessageType = 'text' | 'image' | 'enquiry' | 'system' | 'quote_request';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ParticipantRole = 'customer' | 'provider';

// ── Analytics ────────────────────────────────────────────
export type AnalyticsEventType =
  | 'profile_view' | 'product_view' | 'search_appearance' | 'search_click'
  | 'chat_initiated' | 'call_clicked' | 'direction_clicked' | 'share_clicked'
  | 'saved' | 'unsaved' | 'offer_viewed' | 'photo_viewed' | 'review_read' | 'tab_switched';
export type AnalyticsSource = 'home_feed' | 'explore' | 'search' | 'direct' | 'saved' | 'chat' | 'product_link';
export type LeadTier = 'hot' | 'warm' | 'soft' | 'cold';
