import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type ChatFilters } from '../services/chat.service';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationList: (filters: ChatFilters) => [...chatKeys.conversations(), filters] as const,
  messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
  stats: () => [...chatKeys.all, 'stats'] as const,
};

export function useChatConversations(filters: ChatFilters = {}) {
  return useQuery({
    queryKey: chatKeys.conversationList(filters),
    queryFn: () => chatService.getConversations(filters),
  });
}

export function useChatMessages(conversationId: string, page = 1) {
  return useQuery({
    queryKey: [...chatKeys.messages(conversationId), page],
    queryFn: () => chatService.getMessages(conversationId, page),
    enabled: !!conversationId,
  });
}

export function useRedactMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatService.redactMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

export function useCloseConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatService.closeConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useChatStats() {
  return useQuery({
    queryKey: chatKeys.stats(),
    queryFn: () => chatService.getStats(),
  });
}
