import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersService, type AdminUserFilters } from '../services/admin-users.service';
import { toast } from 'react-toastify';

const adminUserKeys = {
  all: ['admin-users'] as const,
  list: (filters: AdminUserFilters) => [...adminUserKeys.all, 'list', filters] as const,
};

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => adminUsersService.list(filters),
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mobileNumber: string; name: string; email?: string; gender?: string }) =>
      adminUsersService.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success('Admin user created');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create admin'),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; status?: string }) =>
      adminUsersService.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success('Admin user updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });
}

export function useRemoveAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      toast.success('Admin access removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to remove'),
  });
}
