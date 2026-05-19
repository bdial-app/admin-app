import { useQuery } from '@tanstack/react-query';
import { moderationService } from '../services/moderation.service';

export const moderationKeys = {
  all: ['moderation'] as const,
  queue: () => [...moderationKeys.all, 'queue'] as const,
};

export function useModerationQueue() {
  return useQuery({
    queryKey: moderationKeys.queue(),
    queryFn: () => moderationService.getQueue(),
    refetchInterval: 60_000,
  });
}
