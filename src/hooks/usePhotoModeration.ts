import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { photoModerationService, type PhotoFilters } from '../services/photo-moderation.service';
import { toast } from 'react-toastify';
import type { PhotoType } from '../types';

export const photoKeys = {
  all: ['photos'] as const,
  list: (filters: PhotoFilters) => [...photoKeys.all, 'list', filters] as const,
};

export function usePhotosForModeration(filters: PhotoFilters = {}) {
  return useQuery({
    queryKey: photoKeys.list(filters),
    queryFn: () => photoModerationService.list(filters),
  });
}

export function useRemovePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: PhotoType }) =>
      photoModerationService.remove(id, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: photoKeys.all });
      toast.success('Photo removed');
    },
    onError: () => toast.error('Failed to remove photo'),
  });
}
