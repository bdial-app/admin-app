import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceableCitiesService } from '../services/serviceable-cities.service';

export const cityKeys = {
  all: ['serviceable-cities'] as const,
  list: () => [...cityKeys.all, 'list'] as const,
  requestStats: () => [...cityKeys.all, 'request-stats'] as const,
  requestInsights: () => [...cityKeys.all, 'request-insights'] as const,
};

export function useServiceableCities() {
  return useQuery({
    queryKey: cityKeys.list(),
    queryFn: () => serviceableCitiesService.list(),
  });
}

export function useCityRequestStats() {
  return useQuery({
    queryKey: cityKeys.requestStats(),
    queryFn: () => serviceableCitiesService.getRequestStats(),
  });
}

export function useCityRequestInsights() {
  return useQuery({
    queryKey: cityKeys.requestInsights(),
    queryFn: () => serviceableCitiesService.getRequestInsights(),
  });
}

export function useUpdateCityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'coming_soon' | 'disabled' }) =>
      serviceableCitiesService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cityKeys.all });
    },
  });
}
