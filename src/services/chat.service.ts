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
  sort?: ChatSort | '';
}

export interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  totalMessages: number;
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
