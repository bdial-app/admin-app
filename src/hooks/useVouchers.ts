import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vouchersService, type VoucherFilters, type CreateVoucherDto } from '../services/vouchers.service';

export const voucherKeys = {
  all: ['vouchers'] as const,
  lists: () => [...voucherKeys.all, 'list'] as const,
  list: (filters: VoucherFilters) => [...voucherKeys.lists(), filters] as const,
  detail: (id: string) => [...voucherKeys.all, 'detail', id] as const,
  redemptions: (id: string) => [...voucherKeys.all, 'redemptions', id] as const,
  stats: () => [...voucherKeys.all, 'stats'] as const,
};

export function useVouchers(filters: VoucherFilters) {
  return useQuery({ queryKey: voucherKeys.list(filters), queryFn: () => vouchersService.list(filters) });
}

export function useVoucher(id: string) {
  return useQuery({ queryKey: voucherKeys.detail(id), queryFn: () => vouchersService.getById(id), enabled: !!id });
}

export function useVoucherRedemptions(id: string) {
  return useQuery({ queryKey: voucherKeys.redemptions(id), queryFn: () => vouchersService.getRedemptions(id), enabled: !!id });
}

export function useVoucherStats() {
  return useQuery({ queryKey: voucherKeys.stats(), queryFn: () => vouchersService.getStats() });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: CreateVoucherDto) => vouchersService.create(body), onSuccess: () => { qc.invalidateQueries({ queryKey: voucherKeys.all }); } });
}

export function useUpdateVoucher() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<CreateVoucherDto> }) => vouchersService.update(id, body), onSuccess: () => { qc.invalidateQueries({ queryKey: voucherKeys.all }); } });
}
