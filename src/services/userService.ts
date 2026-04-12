import api from './api';
import { URLS } from '../utils/urls';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;   // searches name OR mobileNumber
  status?: string;   // 'active' | 'suspended' | 'deleted'
}

export const userService = {
  getUsers: async (filters: UserFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page)   params.set('page',   String(filters.page));
    if (filters.limit)  params.set('limit',  String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    const response = await api.get(`${URLS.USERS.GET_ALL}?${params.toString()}`);
    return response.data;
  },
};
