export const URLS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SEND_OTP: '/admin-auth/send-otp',
    VERIFY_OTP: '/admin-auth/verify-otp'
  },
  USERS: {
    GET_ALL: '/users',
    GET_PROVIDERS: '/users/providers',
    APPROVE_PROVIDER: '/users/approve',
    REJECT_PROVIDER: '/users/reject'
  },
  REVIEWS: {
    GET_ALL: '/reviews',
    REMOVE: '/reviews'
  },
  DASHBOARD: {
    KPIS: '/dashboard/kpis'
  }
};
