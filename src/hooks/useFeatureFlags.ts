import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureFlagsService } from '../services/feature-flags.service';
import { toast } from 'react-toastify';

export const featureFlagKeys = {
  all: ['feature-flags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
};

export function useFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.list(),
    queryFn: () => featureFlagsService.list(),
  });
}

export function useUpdateFeatureFlags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flags: { key: string; value: string }[]) =>
      featureFlagsService.update(flags),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast.success('Feature flags updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update feature flags'),
  });
}
