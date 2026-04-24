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
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  lastReadAt: string | null;
  unreadCount: number;
  isActive: boolean;
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
