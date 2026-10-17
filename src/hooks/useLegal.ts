import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { legalService } from '../services/legal.service';
import type { LegalDraftInput, LegalPublishInput } from '../types/legal';

const legalKeys = {
  list: ['legal', 'list'] as const,
  doc: (slug: string) => ['legal', 'doc', slug] as const,
  user: (userId: string) => ['legal', 'user', userId] as const,
};

const errorMessage = (err: AxiosError<{ message?: string | string[] }>, fallback: string) => {
  const msg = err.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
};

export function useLegalDocuments() {
  return useQuery({ queryKey: legalKeys.list, queryFn: () => legalService.list() });
}

export function useLegalDocument(slug: string | null) {
  return useQuery({
    queryKey: legalKeys.doc(slug ?? ''),
    queryFn: () => legalService.get(slug as string),
    enabled: !!slug,
  });
}

export function useSaveLegalDraft(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LegalDraftInput) => legalService.saveDraft(slug, body),
    onSuccess: (data) => {
      qc.setQueryData(legalKeys.doc(slug), data);
      qc.invalidateQueries({ queryKey: legalKeys.list });
      toast.success('Draft saved');
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => toast.error(errorMessage(err, 'Failed to save the draft')),
  });
}

export function useDiscardLegalDraft(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => legalService.discardDraft(slug),
    onSuccess: (data) => {
      qc.setQueryData(legalKeys.doc(slug), data);
      qc.invalidateQueries({ queryKey: legalKeys.list });
      toast.success('Draft discarded');
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => toast.error(errorMessage(err, 'Failed to discard the draft')),
  });
}

export function usePublishLegal(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LegalPublishInput) => legalService.publish(slug, body),
    onSuccess: (data) => {
      qc.setQueryData(legalKeys.doc(slug), data);
      qc.invalidateQueries({ queryKey: legalKeys.list });
      toast.success(`Published version ${data.versions[0]?.version ?? ''}`);
    },
    onError: (err: AxiosError<{ message?: string | string[] }>) => toast.error(errorMessage(err, 'Failed to publish')),
  });
}

/** Which terms a user has accepted, and what they still owe. */
export function useUserLegalAcceptances(userId: string | null | undefined) {
  return useQuery({
    queryKey: legalKeys.user(userId ?? ''),
    queryFn: () => legalService.userAcceptances(userId as string),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
