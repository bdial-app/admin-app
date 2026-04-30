import api from './api';
import { URLS } from '../utils/urls';
import type { Conversation, Message, PaginatedResponse } from '../types';

export interface ChatFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface ChatStats {
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  totalMessages: number;
}

export const chatService = {
  getConversations: async (filters: ChatFilters = {}): Promise<PaginatedResponse<Conversation>> => {
    const { data } = await api.get(URLS.CHAT.CONVERSATIONS, { params: filters });
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
