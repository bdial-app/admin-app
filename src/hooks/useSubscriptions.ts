import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsService, type SubscriptionFilters, type SubscriptionPlan } from '../services/subscriptions.service';

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (filters: SubscriptionFilters) => [...subscriptionKeys.lists(), filters] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
};

export function useSubscriptions(filters: SubscriptionFilters) {
  return useQuery({ queryKey: subscriptionKeys.list(filters), queryFn: () => subscriptionsService.list(filters) });
}

export function useSubscriptionPlans() {
  return useQuery({ queryKey: subscriptionKeys.plans(), queryFn: () => subscriptionsService.getPlans() });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<SubscriptionPlan>) => subscriptionsService.createPlan(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: subscriptionKeys.plans() }); },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<SubscriptionPlan> }) => subscriptionsService.updatePlan(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: subscriptionKeys.plans() }); },
  });
}
