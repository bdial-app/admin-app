import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCreateService } from '../services/admin-create.service';
import type { AdminCreateUserPayload, AdminCreateProviderWithUserPayload } from '../services/admin-create.service';
import { userKeys } from './useUsers';
import { providerKeys } from './useProviders';
import { bulkImportService, type BulkProviderRowPayload } from '../services/bulk-import.service';

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => adminCreateService.createUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useAdminCreateProviderWithUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCreateProviderWithUserPayload) =>
      adminCreateService.createProviderWithUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

export function useCheckUser(mobileNumber: string) {
  return useQuery({
    queryKey: ['admin', 'check-user', mobileNumber],
    queryFn: () => adminCreateService.checkUser(mobileNumber),
    enabled: /^\d{10}$/.test(mobileNumber),
    retry: false,
  });
}

export function useAdminSendOtp() {
  return useMutation({
    mutationFn: ({ mobileNumber, purpose }: { mobileNumber: string; purpose?: string }) =>
      adminCreateService.sendOtp(mobileNumber, purpose),
  });
}

export function useAdminVerifyOtp() {
  return useMutation({
    mutationFn: ({ mobileNumber, otp, purpose }: { mobileNumber: string; otp: string; purpose?: string }) =>
      adminCreateService.verifyOtp(mobileNumber, otp, purpose),
  });
}

export function useBulkValidateProviders() {
  return useMutation({
    mutationFn: (rows: BulkProviderRowPayload[]) => bulkImportService.validate(rows),
  });
}

export function useBulkImportProviders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, sourceLabel }: { rows: BulkProviderRowPayload[]; sourceLabel?: string }) =>
      bulkImportService.importRows(rows, sourceLabel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all });
      qc.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}
