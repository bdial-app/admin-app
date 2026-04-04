import api from './api';
import { URLS } from '../utils/urls';

const formatMobileForApi = (num: string) => {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return num; // Pass anything else raw to let backend handle validation
};

export const authService = {
  sendOtp: async (mobileNumber: string) => {
    const formatted = formatMobileForApi(mobileNumber);
    const response = await api.post(URLS.AUTH.SEND_OTP, {
      mobileNumber: formatted,
    });
    return response.data;
  },
  verifyOtp: async (mobileNumber: string, otp: string) => {
    const formatted = formatMobileForApi(mobileNumber);
    const response = await api.post(URLS.AUTH.VERIFY_OTP, {
      mobileNumber: formatted,
      otp,
    });
    return response.data;
  },
};
