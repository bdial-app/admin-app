import type {
  ConversationType,
  ConversationStatus,
  MessageType,
  MessageStatus,
  ParticipantRole,
} from './enums';

export type ChatNudgeChannel = 'push' | 'whatsapp';

/** Who owes a reply in a chat and how an admin can remind them. */
export interface ChatNudgeState {
  waitingOn: 'customer' | 'provider' | null;
  recipient: { userId: string; name: string; role: 'customer' | 'provider' } | null;
  /** The person they haven't replied to. */
  waitingFor: string;
  waitingSince: string;
  unreadCount: number;
  /** Why no reminder can go at all. */
  problem: string | null;
  channels: {
    push: {
      available: boolean;
      reason: string | null;
      title?: string | null;
      body?: string | null;
      devices?: number;
      /** It would only reach their in-app inbox. */
      inboxOnly?: boolean;
    };
    whatsapp: {
      available: boolean;
      reason: string | null;
      phone?: string | null;
      text?: string | null;
      /** Set outside sending hours: when it would actually go. */
      sendsAt?: string | null;
    };
  };
  history: {
    id: string;
    channel: ChatNudgeChannel;
    outcome: string;
    /** Where it got to since: a WhatsApp's delivery status, or its queued job's. */
    status: string | null;
    reason: string | null;
    at: string;
    adminName: string | null;
  }[];
}

export interface ChatNudgeResult {
  channel: ChatNudgeChannel;
  outcome: string;
  message: string;
  sendsAt?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  contextType: string | null;
  contextId: string | null;
  contextTitle: string | null;
  contextImageUrl: string | null;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  createdAt: string;
  updatedAt: string;
  participants?: ConversationParticipant[];
  messages?: Message[];
  // List-only extras from GET /admin/chat/conversations
  /** Total messages in the thread. */
  messageCount?: number;
  /** The provider participant's city. */
  providerCity?: string | null;
  /** A message in this thread has an open report. */
  reported?: boolean;
  /** At least one message was redacted by an admin. */
  hasRedacted?: boolean;
  /** A participant has blocked the other. */
  blocked?: boolean;
  /** The customer sent the last message. */
  unanswered?: boolean;
  customerMessages?: number;
  providerMessages?: number;
  attachmentCount?: number;
  /** Minutes from the customer's first message to the business's first reply. */
  firstReplyMinutes?: number | null;
  provider?: ChatBusiness | null;
  customer?: { id: string; name: string; mobileNumber: string | null; email: string | null; city: string | null } | null;
  /** The customer's lead with this business, when it has been scored. */
  lead?: { id: string; tier: import('./enums').LeadTier; score: number; isUnlocked: boolean } | null;
}

export interface ChatBusiness {
  id: string;
  brandName: string;
  slug: string | null;
  city: string | null;
  photoUrl: string | null;
  contactNumber: string | null;
  status: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  lastReadAt: string | null;
  unreadCount: number;
  isActive: boolean;
  blockedAt?: string | null;
  joinedAt: string;
  user?: import('./user').User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  messageType: MessageType;
  metadata: Record<string, unknown> | null;
  status: MessageStatus;
  createdAt: string;
  deletedAt: string | null;
  sender?: import('./user').User;
}

export interface ChatFilterOptions {
  cities: { name: string; count: number }[];
  counts: {
    total: number;
    active: number;
    enquiries: number;
    unanswered: number;
    reported: number;
    redacted: number;
    stale30d: number;
  };
}
