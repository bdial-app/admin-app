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
  provider?: import('./provider').Provider;
  verification?: import('./verification').Verification;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus | '';
  role?: UserRole | '';
  city?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
}
