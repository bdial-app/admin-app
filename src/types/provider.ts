import type { ProviderStatus } from './enums';
import type { User } from './user';

export interface Provider {
  id: string;
  userId: string;
  brandName: string;
  description: string | null;
  address: string | null;
  city: string;
  area: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** 'city' means the pin is only the town centre — a placeholder, not an address. */
  geocodePrecision?: 'rooftop' | 'street' | 'locality' | 'pincode' | 'city' | 'manual' | null;
  contactNumber: string;
  openTime: string | null;
  closeTime: string | null;
  isAvailable: boolean;
  profilePhotoUrl: string | null;
  bannerImageUrl: string | null;
  isWomenLed: boolean;
  communityVerified: boolean;
  status: ProviderStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  lastContactNumberChangeAt?: string | null;
  averageRating?: number;
  totalReviews?: number;
  // Online presence
  websiteUrl?: string | null;
  websiteLogoUrl?: string | null;
  instagramHandle?: string | null;
  facebookHandle?: string | null;
  youtubeHandle?: string | null;
  whatsappNumber?: string | null;
  linkedinHandle?: string | null;
  // Relations (optionally loaded)
  user?: User;
  providerCategories?: ProviderCategory[];
  photos?: import('./product').Photo[];
  products?: import('./product').Product[];
  reviews?: import('./review').Review[];
}

export interface ProviderCategory {
  id: string;
  providerId: string;
  categoryId: string;
  category?: import('./category').Category;
}

export interface ProviderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProviderStatus | '';
  city?: string;
  isFeatured?: boolean | 'true' | 'false';
  isWomenLed?: boolean | 'true' | 'false' | 'pending' | 'approved';
  /** Only providers listed in this category */
  categoryId?: string;
  // Advanced filters (all optional, combined with AND). Lists are
  // comma-separated and match any of their values.
  cities?: string;
  area?: string;
  categoryIds?: string;
  verified?: 'true' | 'false';
  available?: 'true' | 'false';
  logo?: 'real' | 'generated' | 'none' | 'missing';
  banner?: 'has' | 'none';
  products?: 'has' | 'none';
  photos?: 'has' | 'none';
  online?: 'website' | 'instagram' | 'whatsapp' | 'none';
  location?: 'precise' | 'neighbourhood' | 'approximate' | 'missing';
  claimed?: 'true' | 'false';
  activeWithinDays?: string;
  minRating?: string;
  reviews?: 'has' | 'none';
  createdFrom?: string;
  createdTo?: string;
  sort?: 'newest' | 'oldest' | 'name' | 'rating' | 'reviews' | 'updated';
}
