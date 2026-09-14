import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '../services/categories.service';
import type { Category, CategoryFormData } from '../types';

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  topLevel: () => [...categoryKeys.all, 'top-level'] as const,
  tree: () => [...categoryKeys.all, 'tree'] as const,
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

export function useCategoryTree() {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => categoriesService.tree(),
  });
}

/** Depth-first flatten of a category tree into one list. */
function flattenCategoryTree(nodes: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (list: Category[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Every active category — parents and children alike — as a flat array.
 *
 * Use this for pickers and text matching. `useCategories()` hits `GET /categories`,
 * which is paginated AND narrowed to top-level categories that already have a
 * provider attached, so it returns a small subset wrapped in `{ data, meta }`.
 * The tree endpoint returns them all.
 */
export function useFlatCategories() {
  const query = useCategoryTree();
  const flat = useMemo(() => flattenCategoryTree(query.data ?? []), [query.data]);
  return { ...query, data: flat };
}

export function useSubCategories(parentId: string | null) {
  return useQuery({
    queryKey: categoryKeys.subcategories(parentId || ''),
    queryFn: () => categoriesService.subcategories(parentId!),
    enabled: !!parentId,
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
