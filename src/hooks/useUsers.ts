import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import type { UserFilters, User, BulkActionPayload } from '../types';
import { toast } from 'react-toastify';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  filterOptions: () => [...userKeys.all, 'filter-options'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => usersService.list(filters),
    placeholderData: (prev) => prev,
  });
}

export function useUserFilterOptions() {
  return useQuery({
    queryKey: userKeys.filterOptions(),
    queryFn: () => usersService.filterOptions(),
    staleTime: 5 * 60_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<User> }) =>
      usersService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserMobile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mobileNumber, otp }: { id: string; mobileNumber: string; otp: string }) =>
      usersService.updateMobileNumber(id, mobileNumber, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.suspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.unsuspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User unsuspended');
    },
    onError: () => toast.error('Failed to unsuspend user'),
  });
}

export function useSoftDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.softDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });
}

export function useBulkUserAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkActionPayload) => usersService.bulkAction(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      toast.success(`Bulk action applied to ${data.affected} users`);
    },
    onError: () => toast.error('Bulk action failed'),
  });
}
