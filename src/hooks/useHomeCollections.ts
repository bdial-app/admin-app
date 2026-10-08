import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { homeCollectionsService, type HomeCollectionInput } from '../services/homeCollections.service';

const KEY = ['home-collections'] as const;

export function useHomeCollections() {
  return useQuery({ queryKey: KEY, queryFn: homeCollectionsService.list });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateHomeCollection() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (body: HomeCollectionInput) => homeCollectionsService.create(body), onSuccess: invalidate });
}

export function useUpdateHomeCollection() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<HomeCollectionInput> }) => homeCollectionsService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteHomeCollection() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => homeCollectionsService.remove(id), onSuccess: invalidate });
}

export function useReorderHomeCollections() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (ids: string[]) => homeCollectionsService.reorder(ids), onSuccess: invalidate });
}
