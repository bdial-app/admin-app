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
  isFeatured?: boolean;
  isWomenLed?: boolean;
}
