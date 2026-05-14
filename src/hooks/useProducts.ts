import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/products.service';
import type { ProductFilters, Product, BulkActionPayload } from '../types';
import { toast } from 'react-toastify';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  stats: () => [...productKeys.all, 'stats'] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsService.list(filters),
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: productKeys.stats(),
    queryFn: () => productsService.stats(),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Product> }) =>
      productsService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useBulkProductAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) => productsService.bulkAction(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`Bulk action applied to ${data.affected} products`);
    },
    onError: () => toast.error('Bulk action failed'),
  });
}
