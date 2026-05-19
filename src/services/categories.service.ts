import api from './api';
import { URLS } from '../utils/urls';
import type { Category, CategoryFormData } from '../types';
import { compressImageFile, COMPRESS_PRESETS } from '../utils/compress-image';

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

  tree: async (): Promise<Category[]> => {
    const { data } = await api.get(URLS.CATEGORIES.TREE);
    return data;
  },

  uploadIcon: async (id: string, file: File): Promise<Category> => {
    const compressed = await compressImageFile(file, COMPRESS_PRESETS.icon);
    const form = new FormData();
    form.append('icon', compressed);
    const { data } = await api.post(URLS.CATEGORIES.UPLOAD_ICON(id), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteIcon: async (id: string): Promise<Category> => {
    const { data } = await api.delete(URLS.CATEGORIES.UPLOAD_ICON(id));
    return data;
  },

  uploadImage: async (id: string, file: File): Promise<Category> => {
    const compressed = await compressImageFile(file, COMPRESS_PRESETS.banner);
    const form = new FormData();
    form.append('image', compressed);
    const { data } = await api.post(URLS.CATEGORIES.UPLOAD_IMAGE(id), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteImage: async (id: string): Promise<Category> => {
    const { data } = await api.delete(URLS.CATEGORIES.UPLOAD_IMAGE(id));
    return data;
  },
};
