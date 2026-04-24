import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersService, type BannerFilters } from '../services/banners.service';
import type { PromoBanner } from '../types';

export const bannerKeys = {
  all: ['banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  list: (filters: BannerFilters) => [...bannerKeys.lists(), filters] as const,
  detail: (id: string) => [...bannerKeys.all, 'detail', id] as const,
};

export function useBanners(filters: BannerFilters) {
  return useQuery({
    queryKey: bannerKeys.list(filters),
    queryFn: () => bannersService.list(filters),
  });
}

export function useBanner(id: string) {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: () => bannersService.getById(id),
    enabled: !!id,
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PromoBanner>) => bannersService.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: bannerKeys.all }); },
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PromoBanner> }) => bannersService.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: bannerKeys.all }); },
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bannersService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: bannerKeys.all }); },
  });
}

export function useReorderBanners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; displayOrder: number }[]) => bannersService.reorder(items),
    onSuccess: () => { qc.invalidateQueries({ queryKey: bannerKeys.all }); },
  });
}
