import type { UserRole, UserStatus, Gender } from './enums';

export interface User {
  id: string;
  mobileNumber: string | null;
  email: string | null;
  name: string;
  gender: Gender;
  role: UserRole;
  city: string | null;
  area: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  status: UserStatus;
  pausedAt: string | null;
  archiveReason: string | null;
  googleName: string | null;
  ssoProvider: string | null;
  preferredMode: string;
  preferredLanguage: string;
  lastSeenAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (optionally loaded)
  /** The list endpoint returns only id, brandName and status; the detail endpoint loads the full row. */
  provider?: (Pick<import('./provider').Provider, 'id' | 'brandName' | 'status'> & Partial<import('./provider').Provider>) | null;
  /** Platforms with an active push token. Only on list rows. */
  pushPlatforms?: ('android' | 'ios' | 'web')[];
  verification?: import('./verification').Verification;
}

export type UserRoleFilter = UserRole | 'staff';
export type UserActivityFilter = 'seen_24h' | 'seen_7d' | 'seen_30d' | 'inactive_30d' | 'never';
export type UserPushFilter = 'enabled' | 'android' | 'ios' | 'none';
export type UserEngagementFilter = 'reviewed' | 'saved' | 'chatted' | 'invited' | 'none';
export type UserSort = 'newest' | 'oldest' | 'last_seen' | 'name';
type BoolParam = 'true' | 'false';

/** Mirrors GET /admin/users query params. Booleans are strings so "unset" stays distinct from "false". */
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus | '';
  role?: UserRoleFilter | '';
  city?: string;
  hasProvider?: BoolParam;
  providerStatus?: 'unverified' | 'active' | 'suspended' | 'disabled';
  gender?: Gender;
  mode?: 'customer' | 'provider';
  activity?: UserActivityFilter;
  /** YYYY-MM-DD, IST calendar day, inclusive. */
  joinedFrom?: string;
  joinedTo?: string;
  push?: UserPushFilter;
  hasEmail?: BoolParam;
  hasLocation?: BoolParam;
  engagement?: UserEngagementFilter;
  sort?: UserSort;
}

export interface UserFilterOptions {
  cities: { name: string; count: number }[];
  counts: {
    total: number;
    businessOwners: number;
    newThisWeek: number;
    activeThisWeek: number;
    neverSeen: number;
    pushEnabled: number;
    staff: number;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
}
