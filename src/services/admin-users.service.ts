import api from './api';
import { URLS } from '../utils/urls';
import type { User } from '../types/user';
import type { PaginatedResponse } from '../types/common';

export interface AdminUserFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export const adminUsersService = {
  list: (filters: AdminUserFilters = {}) =>
    api.get<PaginatedResponse<User>>(URLS.ADMINS.LIST, {
      params: { page: filters.page, rows: filters.limit, search: filters.search || undefined },
    }).then(r => r.data),

  create: (body: { mobileNumber: string; name: string; email?: string; gender?: string }) =>
    api.post<User>(URLS.ADMINS.CREATE, body).then(r => r.data),

  update: (id: string, body: { name?: string; status?: string }) =>
    api.patch<User>(URLS.ADMINS.UPDATE(id), body).then(r => r.data),

  remove: (id: string) =>
    api.delete(URLS.ADMINS.DELETE(id)).then(r => r.data),
};
