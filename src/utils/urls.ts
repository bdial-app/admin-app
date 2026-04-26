export const URLS = {
  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  AUTH: {
    SEND_OTP: '/admin-auth/send-otp',
    VERIFY_OTP: '/admin-auth/verify-otp',
  },

  // â”€â”€ Admin Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  DASHBOARD: {
    STATS: '/admin/dashboard',
    TIME_SERIES: '/admin/dashboard/time-series',
  },

  // â”€â”€ Admin Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  USERS: {
    LIST: '/admin/users',
    DETAIL: (id: string) => `/admin/users/${id}`,
    UPDATE: (id: string) => `/admin/users/${id}`,
    SUSPEND: (id: string) => `/admin/users/${id}/suspend`,
    STATS: '/admin/users/stats',
    ACTIVITY: (id: string) => `/admin/users/${id}/activity`,
  },

  // â”€â”€ Admin Providers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  PROVIDERS: {
    LIST: '/admin/providers',
    PENDING: '/admin/providers/pending',
    DETAIL: (id: string) => `/admin/providers/${id}`,
    APPROVE: (id: string) => `/admin/providers/${id}/approve`,
    SUSPEND: (id: string) => `/admin/providers/${id}/suspend`,
    UNSUSPEND: (id: string) => `/admin/providers/${id}/unsuspend`,
    UPDATE: (id: string) => `/admin/providers/${id}`,
    STATS: '/admin/providers/stats',
    WARNINGS: (id: string) => `/admin/providers/${id}/warnings`,
  },

  // â”€â”€ Admin Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CATEGORIES: {
    LIST: '/categories',
    CREATE: '/categories',
    DETAIL: (id: string) => `/categories/${id}`,
    UPDATE: (id: string) => `/categories/${id}`,
    TOP_LEVEL: '/categories/top-level',
    SUBCATEGORIES: (parentId: string) => `/categories/${parentId}/subcategories`,
    UPLOAD_ICON: (id: string) => `/categories/${id}/icon`,
    UPLOAD_IMAGE: (id: string) => `/categories/${id}/image`,
  },

  // â”€â”€ Admin Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  PRODUCTS: {
    LIST: '/admin/products',
    DETAIL: (id: string) => `/admin/products/${id}`,
    UPDATE: (id: string) => `/admin/products/${id}`,
    DELETE: (id: string) => `/admin/products/${id}`,
    STATS: '/admin/products/stats',
  },

  // â”€â”€ Admin Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  REVIEWS: {
    LIST: '/admin/reviews',
    DETAIL: (id: string) => `/admin/reviews/${id}`,
    UPDATE_STATUS: (id: string) => `/admin/reviews/${id}/status`,
    REPORTS: '/admin/reviews/reports',
    REMOVE: (id: string) => `/admin/reviews/${id}/remove`,
    STATS: '/admin/reviews/stats',
  },

  // â”€â”€ Admin Verifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  VERIFICATIONS: {
    LIST: '/admin/verifications',
    DETAIL: (id: string) => `/admin/verifications/${id}`,
    REVIEW: (id: string) => `/admin/verifications/${id}/review`,
    STATUS: (id: string) => `/admin/verifications/${id}/status`,
    STATS: '/admin/verifications/stats',
  },

  // â”€â”€ Admin Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  REPORTS: {
    LIST: '/admin/reports',
    DETAIL: (id: string) => `/admin/reports/${id}`,
    REVIEW: (id: string) => `/admin/reports/${id}/review`,
    STATS: '/admin/reports/stats',
  },

  // â”€â”€ Admin Warnings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  WARNINGS: {
    LIST: '/admin/warnings',
    DETAIL: (id: string) => `/admin/warnings/${id}`,
    CREATE: '/admin/warnings',
    UPDATE: (id: string) => `/admin/warnings/${id}`,
  },

  // â”€â”€ Admin Banners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BANNERS: {
    LIST: '/admin/banners',
    CREATE: '/admin/banners',
    DETAIL: (id: string) => `/admin/banners/${id}`,
    UPDATE: (id: string) => `/admin/banners/${id}`,
    DELETE: (id: string) => `/admin/banners/${id}`,
    REORDER: '/admin/banners/reorder',
  },

  // â”€â”€ Admin Sponsored â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  SPONSORED: {
    LIST: '/admin/sponsorships',
    DETAIL: (id: string) => `/admin/sponsorships/${id}`,
    UPDATE: (id: string) => `/admin/sponsorships/${id}`,
    STATS: '/admin/sponsorships/stats',
  },

  // â”€â”€ Admin Offers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  OFFERS: {
    LIST: '/admin/offers',
    DETAIL: (id: string) => `/admin/offers/${id}`,
    UPDATE: (id: string) => `/admin/offers/${id}`,
    DELETE: (id: string) => `/admin/offers/${id}`,
    STATS: '/admin/offers/stats',
  },

  // â”€â”€ Admin Badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  BADGES: {
    LIST: '/admin/badges',
    CREATE: '/admin/badges',
    UPDATE: (id: string) => `/admin/badges/${id}`,
    DELETE: (id: string) => `/admin/badges/${id}`,
  },

  // â”€â”€ Admin Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  CHAT: {
    CONVERSATIONS: '/admin/chat/conversations',
    MESSAGES: (id: string) => `/admin/chat/conversations/${id}/messages`,
    REMOVE_MESSAGE: (id: string) => `/admin/chat/messages/${id}/remove`,
    CLOSE: (id: string) => `/admin/chat/conversations/${id}/close`,
    STATS: '/admin/chat/stats',
  },

  // â”€â”€ Admin Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ANALYTICS: {
    OVERVIEW: '/admin/analytics/overview',
    EVENTS: '/admin/analytics/events',
    SEARCH_TRENDS: '/admin/analytics/search-trends',
    GEOGRAPHIC: '/admin/analytics/geographic',
  },

  // â”€â”€ Admin Users (admins) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ADMINS: {
    LIST: '/admin/admins',
    CREATE: '/admin/admins',
    DETAIL: (id: string) => `/admin/admins/${id}`,
    UPDATE: (id: string) => `/admin/admins/${id}`,
    DELETE: (id: string) => `/admin/admins/${id}`,
  },

  // â”€â”€ Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  AUDIT_LOGS: {
    LIST: '/admin/audit-logs',
    STATS: '/admin/audit-logs/stats',
  },

  // â”€â”€ System Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  SETTINGS: {
    LIST: '/admin/settings',
    UPDATE: '/admin/settings',
    CREATE: '/admin/settings',
    DELETE: (id: string) => `/admin/settings/${id}`,
  },

  // â”€â”€ Admin Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  NOTIFICATIONS: {
    SEND: '/admin/notifications/send',
    BATCHES: '/admin/notifications/batches',
    BATCH_DETAIL: (id: string) => `/admin/notifications/batches/${id}`,
    STATS: '/admin/notifications/stats',
  },
  // -- Admin Bug Reports --------------------------------
  BUG_REPORTS: {
    LIST: '/admin/bug-reports',
    DETAIL: (id: string) => `/admin/bug-reports/${id}`,
    UPDATE: (id: string) => `/admin/bug-reports/${id}`,
  },
};