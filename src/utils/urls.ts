export const URLS = {
  // ── Auth ──────────────────────────────────────────────
  AUTH: {
    SEND_OTP: '/admin-auth/send-otp',
    VERIFY_OTP: '/admin-auth/verify-otp',
  },

  // ── Admin Dashboard ──────────────────────────────────
  DASHBOARD: {
    STATS: '/admin/dashboard',
    TIME_SERIES: '/admin/dashboard/time-series',
  },

  // ── Admin Users ──────────────────────────────────────
  USERS: {
    LIST: '/admin/users',
    DETAIL: (id: string) => `/admin/users/${id}`,
    UPDATE: (id: string) => `/admin/users/${id}`,
    SUSPEND: (id: string) => `/admin/users/${id}/suspend`,
    STATS: '/admin/users/stats',
    ACTIVITY: (id: string) => `/admin/users/${id}/activity`,
  },

  // ── Admin Providers ──────────────────────────────────
  PROVIDERS: {
    LIST: '/admin/providers',
    PENDING: '/admin/providers/pending',
    DETAIL: (id: string) => `/admin/providers/${id}`,
    APPROVE: (id: string) => `/admin/providers/${id}/approve`,
    SUSPEND: (id: string) => `/admin/providers/${id}/suspend`,
    UPDATE: (id: string) => `/admin/providers/${id}`,
    STATS: '/admin/providers/stats',
    WARNINGS: (id: string) => `/admin/providers/${id}/warnings`,
  },

  // ── Admin Categories ─────────────────────────────────
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

  // ── Admin Products ───────────────────────────────────
  PRODUCTS: {
    LIST: '/admin/products',
    DETAIL: (id: string) => `/admin/products/${id}`,
    UPDATE: (id: string) => `/admin/products/${id}`,
    DELETE: (id: string) => `/admin/products/${id}`,
    STATS: '/admin/products/stats',
  },

  // ── Admin Reviews ────────────────────────────────────
  REVIEWS: {
    LIST: '/admin/reviews',
    DETAIL: (id: string) => `/admin/reviews/${id}`,
    UPDATE_STATUS: (id: string) => `/admin/reviews/${id}/status`,
    REPORTS: '/admin/reviews/reports',
    REMOVE: (id: string) => `/admin/reviews/${id}/remove`,
    STATS: '/admin/reviews/stats',
  },

  // ── Admin Verifications ──────────────────────────────
  VERIFICATIONS: {
    LIST: '/admin/verifications',
    DETAIL: (id: string) => `/admin/verifications/${id}`,
    REVIEW: (id: string) => `/admin/verifications/${id}/review`,
    STATUS: (id: string) => `/admin/verifications/${id}/status`,
    STATS: '/admin/verifications/stats',
  },

  // ── Admin Reports ────────────────────────────────────
  REPORTS: {
    LIST: '/admin/reports',
    DETAIL: (id: string) => `/admin/reports/${id}`,
    REVIEW: (id: string) => `/admin/reports/${id}/review`,
    STATS: '/admin/reports/stats',
  },

  // ── Admin Warnings ───────────────────────────────────
  WARNINGS: {
    LIST: '/admin/warnings',
    DETAIL: (id: string) => `/admin/warnings/${id}`,
    CREATE: '/admin/warnings',
    UPDATE: (id: string) => `/admin/warnings/${id}`,
  },

  // ── Admin Banners ────────────────────────────────────
  BANNERS: {
    LIST: '/admin/banners',
    CREATE: '/admin/banners',
    DETAIL: (id: string) => `/admin/banners/${id}`,
    UPDATE: (id: string) => `/admin/banners/${id}`,
    DELETE: (id: string) => `/admin/banners/${id}`,
    REORDER: '/admin/banners/reorder',
  },

  // ── Admin Sponsored ──────────────────────────────────
  SPONSORED: {
    LIST: '/admin/sponsorships',
    DETAIL: (id: string) => `/admin/sponsorships/${id}`,
    UPDATE: (id: string) => `/admin/sponsorships/${id}`,
    STATS: '/admin/sponsorships/stats',
  },

  // ── Admin Offers ─────────────────────────────────────
  OFFERS: {
    LIST: '/admin/offers',
    DETAIL: (id: string) => `/admin/offers/${id}`,
    UPDATE: (id: string) => `/admin/offers/${id}`,
    DELETE: (id: string) => `/admin/offers/${id}`,
    STATS: '/admin/offers/stats',
  },

  // ── Admin Badges ─────────────────────────────────────
  BADGES: {
    LIST: '/admin/badges',
    CREATE: '/admin/badges',
    UPDATE: (id: string) => `/admin/badges/${id}`,
    DELETE: (id: string) => `/admin/badges/${id}`,
  },

  // ── Admin Chat ───────────────────────────────────────
  CHAT: {
    CONVERSATIONS: '/admin/chat/conversations',
    MESSAGES: (id: string) => `/admin/chat/conversations/${id}/messages`,
    REMOVE_MESSAGE: (id: string) => `/admin/chat/messages/${id}/remove`,
    CLOSE: (id: string) => `/admin/chat/conversations/${id}/close`,
    STATS: '/admin/chat/stats',
  },

  // ── Admin Analytics ──────────────────────────────────
  ANALYTICS: {
    OVERVIEW: '/admin/analytics/overview',
    EVENTS: '/admin/analytics/events',
    SEARCH_TRENDS: '/admin/analytics/search-trends',
    GEOGRAPHIC: '/admin/analytics/geographic',
  },

  // ── Admin Users (admins) ─────────────────────────────
  ADMINS: {
    LIST: '/admin/admins',
    CREATE: '/admin/admins',
    DETAIL: (id: string) => `/admin/admins/${id}`,
    UPDATE: (id: string) => `/admin/admins/${id}`,
    DELETE: (id: string) => `/admin/admins/${id}`,
  },

  // ── Audit Logs ───────────────────────────────────────
  AUDIT_LOGS: {
    LIST: '/admin/audit-logs',
    STATS: '/admin/audit-logs/stats',
  },

  // ── System Settings ──────────────────────────────────
  SETTINGS: {
    LIST: '/admin/settings',
    UPDATE: '/admin/settings',
    CREATE: '/admin/settings',
    DELETE: (id: string) => `/admin/settings/${id}`,
  },

  // ── Admin Notifications ──────────────────────────────
  NOTIFICATIONS: {
    SEND: '/admin/notifications/send',
    BATCHES: '/admin/notifications/batches',
    BATCH_DETAIL: (id: string) => `/admin/notifications/batches/${id}`,
    STATS: '/admin/notifications/stats',
  },
};
