import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attentionService, type Attention, type FreshKey } from '../services/attention.service';

export const attentionKeys = { all: ['attention'] as const };
const SEEN_KEY = ['attention', 'seen'];

/** Sidebar and inbox counts, kept fresh while the admin is open. */
export function useAttention() {
  return useQuery({
    queryKey: attentionKeys.all,
    queryFn: () => attentionService.get(),
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    retry: false,
  });
}

/** Clear "new" counts for sections; the badges drop at once. */
export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: SEEN_KEY,
    mutationFn: (sections: FreshKey[]) => attentionService.markSeen(sections),
    onMutate: (sections) => {
      const now = new Date().toISOString();
      qc.setQueryData<Attention>(attentionKeys.all, (prev) => {
        if (!prev) return prev;
        const fresh = { ...prev.fresh };
        const since = { ...prev.since };
        for (const s of sections) { fresh[s] = 0; since[s] = now; }
        return { ...prev, fresh, since };
      });
    },
  });
}

/**
 * After an admin approves, resolves or deletes something, re-count with the
 * server cache skipped, so "waiting" badges drop right away.
 */
export function useRecountAfterChanges() {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return qc.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.mutation.state.status !== 'success') return;
      // Our own "seen" calls don't change any counts.
      if (event.mutation.options.mutationKey?.[1] === SEEN_KEY[1]) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        try {
          qc.setQueryData(attentionKeys.all, await attentionService.get(true));
        } catch { /* the next poll will catch up */ }
      }, 800);
    });
  }, [qc]);
}
