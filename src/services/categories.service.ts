import api from './api';
import { URLS } from '../utils/urls';
import type { Category, CategoryFormData } from '../types';

export const categoriesService = {
  list: async (): Promise<Category[]> => {
    const { data } = await api.get(URLS.CATEGORIES.LIST);
    return data;
  },

  topLevel: async (): Promise<Category[]> => {
    const { data } = await api.get(URLS.CATEGORIES.TOP_LEVEL);
    return data;
  },

  getById: async (id: string): Promise<Category> => {
    const { data } = await api.get(URLS.CATEGORIES.DETAIL(id));
    return data;
  },

  create: async (body: CategoryFormData): Promise<Category> => {
    const { data } = await api.post(URLS.CATEGORIES.CREATE, body);
    return data;
  },

  update: async (id: string, body: Partial<CategoryFormData>): Promise<Category> => {
    const { data } = await api.patch(URLS.CATEGORIES.UPDATE(id), body);
    return data;
  },

  subcategories: async (parentId: string): Promise<Category[]> => {
    const { data } = await api.get(URLS.CATEGORIES.SUBCATEGORIES(parentId));
    return data;
  },
};
