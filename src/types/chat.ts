import type {
  ConversationType,
  ConversationStatus,
  MessageType,
  MessageStatus,
  ParticipantRole,
} from './enums';

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
