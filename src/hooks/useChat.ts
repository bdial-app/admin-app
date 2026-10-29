import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, type ChatFilters } from '../services/chat.service';

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversationList: (filters: ChatFilters) => [...chatKeys.conversations(), filters] as const,
  filterOptions: () => [...chatKeys.all, 'filter-options'] as const,
  conversation: (id: string) => [...chatKeys.all, 'conversation', id] as const,
  messages: (conversationId: string) => [...chatKeys.all, 'messages', conversationId] as const,
  stats: () => [...chatKeys.all, 'stats'] as const,
};

export function useChatConversations(filters: ChatFilters = {}) {
  return useQuery({
    queryKey: chatKeys.conversationList(filters),
    queryFn: () => chatService.getConversations(filters),
    placeholderData: (prev) => prev,
  });
}

export function useChatFilterOptions() {
  return useQuery({
    queryKey: chatKeys.filterOptions(),
    queryFn: () => chatService.filterOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useChatMessages(conversationId: string, page = 1) {
  return useQuery({
    queryKey: [...chatKeys.messages(conversationId), page],
    queryFn: () => chatService.getMessages(conversationId, page),
    enabled: !!conversationId,
  });
}

export function useChatConversation(id: string | null, enabled = true) {
  return useQuery({
    queryKey: chatKeys.conversation(id ?? ''),
    queryFn: () => chatService.getConversation(id!),
    enabled: !!id && enabled,
  });
}

/** Newest page first; each next page is older. */
export function useChatThread(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: [...chatKeys.messages(conversationId ?? ''), 'thread'],
    queryFn: ({ pageParam }) => chatService.getMessages(conversationId!, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
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
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

export function useChatStats() {
  return useQuery({
    queryKey: chatKeys.stats(),
    queryFn: () => chatService.getStats(),
  });
}
