import api from './api';
import { URLS } from '../utils/urls';
import type { User } from '../types';
import type { Provider } from '../types';
import type { Product } from '../types';
import { compressImageFiles, COMPRESS_PRESETS } from '../utils/compress-image';

export interface AdminCreateUserPayload {
  mobileNumber: string;
  name: string;
  gender: string;
  email?: string;
  city?: string;
  area?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  skipOtp?: boolean;
}

export interface AdminCreateProviderWithUserPayload {
  userMobileNumber: string;
  userName: string;
  userGender: string;
  userEmail?: string;
  brandName: string;
  description?: string;
  address?: string;
  city: string;
  area?: string;
  pincode?: string;
  latitude?: string;
  longitude?: string;
  contactNumber: string;
  openTime?: string;
  closeTime?: string;
  isWomenLed?: boolean;
  categoryIds?: string[];
  providerStatus?: string;
  products?: Array<{
    name: string;
    description?: string;
    price?: number;
    currency?: string;
  }>;
  syncLocation?: boolean;
  skipUserOtp?: boolean;
  skipBusinessOtp?: boolean;
}

export interface AdminCreateProviderResult {
  user: User;
  provider: Provider;
  products: Product[];
  categories: string[];
}

export interface CheckUserResult {
  exists: boolean;
  hasProvider: boolean;
  user: Pick<User, 'id' | 'name' | 'mobileNumber' | 'email' | 'gender' | 'city' | 'status'> | null;
  provider: { id: string; brandName: string; status: string } | null;
}

export interface OtpSendResult {
  message: string;
  data: { mobileNumber: string; expiresIn: string; otp?: string };
}

export interface OtpVerifyResult {
  message: string;
  verified: boolean;
  mobileNumber: string;
  purpose: string;
}

export const adminCreateService = {
  createUser: async (payload: AdminCreateUserPayload): Promise<User> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.CREATE_USER, payload);
    return data;
  },

  createProviderWithUser: async (payload: AdminCreateProviderWithUserPayload): Promise<AdminCreateProviderResult> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.CREATE_PROVIDER_WITH_USER, payload);
    return data;
  },

  checkUser: async (mobileNumber: string): Promise<CheckUserResult> => {
    const { data } = await api.get(URLS.ADMIN_CREATE.CHECK_USER(mobileNumber));
    return data;
  },

  sendOtp: async (mobileNumber: string, purpose: string = 'user_verification'): Promise<OtpSendResult> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.SEND_OTP, { mobileNumber, purpose });
    return data;
  },

  verifyOtp: async (mobileNumber: string, otp: string, purpose: string = 'user_verification'): Promise<OtpVerifyResult> => {
    const { data } = await api.post(URLS.ADMIN_CREATE.VERIFY_OTP, { mobileNumber, otp, purpose });
    return data;
  },

  uploadProductImages: async (productId: string, files: File[]): Promise<import('../types').Product> => {
    const compressed = await compressImageFiles(files, COMPRESS_PRESETS.product);
    const fd = new FormData();
    for (const file of compressed) fd.append('images', file);
    const { data } = await api.post(URLS.PRODUCTS.UPLOAD_IMAGES(productId), fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
