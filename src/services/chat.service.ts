import api from './api';
import { URLS } from '../utils/urls';
import type { ChatFilterOptions, Conversation, Message, PaginatedResponse } from '../types';

export type ChatSort = 'recent' | 'oldest' | 'most_messages';

/** Query params for GET /admin/chat/conversations. Toggles travel as 'true'. */
export interface ChatFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  contextType?: string;
  createdFrom?: string;
  createdTo?: string;
  lastMessageFrom?: string;
  lastMessageTo?: string;
  hasRedacted?: string;
  unanswered?: string;
  reported?: string;
  blocked?: string;
  minMessages?: string;
  inactiveDays?: string;
  city?: string;
  providerId?: string;
  customerId?: string;
  sort?: ChatSort | '';
}

export interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  newConversations24h: number;
  newConversations7d: number;
  unansweredConversations: number;
  reportedConversations: number;
  totalMessages: number;
  messages24h: number;
  activeChatters7d: number;
  /** % of conversations started in the last 30 days where the business replied. */
  replyRate30d: number | null;
  medianFirstReplyMinutes: number | null;
  /** Most active businesses in chat over the last 30 days. */
  topBusinesses: { id: string; brandName: string; city: string | null; slug: string | null; conversations: number; unanswered: number }[];
}

/** Drop empty values so the backend's whitelist only ever sees real filters. */
const compact = (filters: ChatFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const chatService = {
  getConversations: async (filters: ChatFilters = {}): Promise<PaginatedResponse<Conversation>> => {
    const { data } = await api.get(URLS.CHAT.CONVERSATIONS, { params: compact(filters) });
    return data;
  },

  filterOptions: async (): Promise<ChatFilterOptions> => {
    const { data } = await api.get(URLS.CHAT.FILTER_OPTIONS);
    return data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const { data } = await api.get(URLS.CHAT.DETAIL(id));
    return data;
  },

  getMessages: async (conversationId: string, page = 1, limit = 50): Promise<PaginatedResponse<Message>> => {
    const { data } = await api.get(URLS.CHAT.MESSAGES(conversationId), { params: { page, limit } });
    return data;
  },

  redactMessage: async (messageId: string): Promise<{ success: boolean }> => {
    const { data } = await api.patch(URLS.CHAT.REMOVE_MESSAGE(messageId));
    return data;
  },

  closeConversation: async (conversationId: string): Promise<{ success: boolean }> => {
    const { data } = await api.patch(URLS.CHAT.CLOSE(conversationId));
    return data;
  },

  getStats: async (): Promise<ChatStats> => {
    const { data } = await api.get(URLS.CHAT.STATS);
    return data;
  },
};
