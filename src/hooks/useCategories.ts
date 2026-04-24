import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '../services/categories.service';
import type { CategoryFormData } from '../types';

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  topLevel: () => [...categoryKeys.all, 'top-level'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  subcategories: (parentId: string) => [...categoryKeys.all, 'subs', parentId] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: () => categoriesService.list(),
  });
}

export function useTopLevelCategories() {
  return useQuery({
    queryKey: categoryKeys.topLevel(),
    queryFn: () => categoriesService.topLevel(),
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoriesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryFormData) => categoriesService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CategoryFormData> }) =>
      categoriesService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
