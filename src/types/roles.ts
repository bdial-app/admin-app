/**
 * Admin roles in hierarchical order (lowest → highest).
 * Higher roles inherit ALL permissions of lower roles.
 */
export type AdminRole = 'associate' | 'moderator' | 'admin' | 'super_admin';

export const ROLE_HIERARCHY: Record<string, number> = {
  customer: 0,
  associate: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  associate: 'Associate',
  moderator: 'Moderator',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  associate: 'var(--color-info)',
  moderator: '#8b5cf6',
  admin: 'var(--color-warning)',
  super_admin: 'var(--color-danger)',
};

/**
 * Permissions map — defines the minimum role required for each action.
 * The guard checks: userRoleWeight >= permissionRoleWeight
 */
export const PERMISSIONS = {
  // ── Dashboard ──
  'dashboard.view': 'associate',

  // ── Users ──
  'users.view': 'associate',
  'users.suspend': 'moderator',
  'users.update': 'admin',
  'users.delete': 'admin',
  'users.bulk': 'admin',
  'users.create': 'admin',

  // ── Providers ──
  'providers.view': 'associate',
  'providers.approve': 'moderator',
  'providers.update': 'admin',
  'providers.suspend': 'admin',
  'providers.delete': 'admin',
  'providers.bulk': 'admin',
  'providers.create': 'admin',
  'providers.feature': 'admin',

  // ── Products ──
  'products.view': 'associate',
  'products.update': 'admin',
  'products.delete': 'admin',
  'products.bulk': 'admin',

  // ── Categories ──
  'categories.view': 'associate',
  'categories.create': 'admin',
  'categories.update': 'admin',

  // ── Moderation ──
  'moderation.view': 'associate',
  'moderation.review': 'moderator',

  // ── Verifications ──
  'verifications.view': 'associate',
  'verifications.review': 'moderator',

  // ── Reviews ──
  'reviews.view': 'associate',
  'reviews.moderate': 'moderator',

  // ── Reports ──
  'reports.view': 'associate',
  'reports.review': 'moderator',

  // ── Warnings ──
  'warnings.view': 'associate',
  'warnings.create': 'moderator',
  'warnings.update': 'moderator',

  // ── Chat Moderation ──
  'chat.view': 'moderator',
  'chat.redact': 'moderator',
  'chat.close': 'moderator',

  // ── Photo Moderation ──
  'photos.view': 'moderator',
  'photos.remove': 'moderator',

  // ── Bug Reports ──
  'bugReports.view': 'associate',
  'bugReports.update': 'associate',

  // ── Women-Led ──
  'womenLed.view': 'associate',
  'womenLed.review': 'moderator',

  // ── Banners ──
  'banners.view': 'associate',
  'banners.create': 'admin',
  'banners.update': 'admin',
  'banners.delete': 'admin',

  // ── Sponsorships ──
  'sponsorships.view': 'associate',
  'sponsorships.approve': 'moderator',
  'sponsorships.update': 'admin',

  // ── Offers ──
  'offers.view': 'associate',
  'offers.approve': 'moderator',
  'offers.update': 'admin',
  'offers.delete': 'admin',

  // ── Badges ──
  'badges.view': 'associate',
  'badges.create': 'admin',
  'badges.update': 'admin',
  'badges.delete': 'admin',

  // ── Notifications ──
  'notifications.view': 'associate',
  'notifications.send': 'admin',
  'notifications.templates': 'admin',

  // ── Vouchers ──
  'vouchers.view': 'associate',
  'vouchers.create': 'admin',
  'vouchers.update': 'admin',

  // ── Payments ──
  'payments.view': 'associate',
  'payments.analytics': 'admin',

  // ── Subscriptions ──
  'subscriptions.view': 'associate',
  'subscriptions.manage': 'admin',

  // ── Revenue ──
  'revenue.view': 'admin',

  // ── Monetization Settings ──
  'monetization.view': 'super_admin',
  'monetization.update': 'super_admin',

  // ── Boost Settings ──
  'boost.view': 'super_admin',
  'boost.update': 'super_admin',

  // ── Serviceable Cities ──
  'cities.view': 'associate',
  'cities.update': 'admin',

  // ── Analytics ──
  'analytics.view': 'admin',

  // ── Admin Users ──
  'adminUsers.view': 'admin',
  'adminUsers.create': 'super_admin',
  'adminUsers.update': 'super_admin',
  'adminUsers.delete': 'super_admin',

  // ── Feature Flags ──
  'featureFlags.view': 'super_admin',
  'featureFlags.update': 'super_admin',

  // ── Audit Log ──
  'auditLog.view': 'admin',

  // ── Settings ──
  'settings.view': 'super_admin',
  'settings.update': 'super_admin',
  'settings.create': 'super_admin',
  'settings.delete': 'super_admin',

  // ── Export ──
  'export.data': 'admin',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Route-level minimum role requirements.
 * Used by ProtectedRoute to gate page access entirely.
 */
export const ROUTE_ROLES: Record<string, AdminRole> = {
  '/': 'associate',
  '/users': 'associate',
  '/create-user': 'admin',
  '/providers': 'associate',
  '/providers/:id': 'associate',
  '/create-provider': 'admin',
  '/categories': 'associate',
  '/products': 'associate',
  '/moderation-queue': 'associate',
  '/registrations': 'associate',
  '/reviews': 'associate',
  '/reports': 'associate',
  '/warnings': 'associate',
  '/chat-moderation': 'moderator',
  '/photo-moderation': 'moderator',
  '/bug-reports-admin': 'associate',
  '/women-led': 'associate',
  '/banners': 'associate',
  '/sponsorships': 'associate',
  '/offers': 'associate',
  '/badges': 'associate',
  '/notifications': 'associate',
  '/vouchers': 'associate',
  '/payments': 'associate',
  '/subscriptions': 'associate',
  '/revenue': 'admin',
  '/monetization-settings': 'super_admin',
  '/boost-settings': 'super_admin',
  '/serviceable-cities': 'associate',
  '/analytics': 'admin',
  '/admin-users': 'admin',
  '/feature-flags': 'super_admin',
  '/audit-log': 'admin',
  '/settings': 'super_admin',
};
