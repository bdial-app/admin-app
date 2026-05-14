export interface Product {
  id: string;
  providerId: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  photoUrl: string | null;
  photoUrls: string[];
  isActive: boolean;
  isHero: boolean;
  displayOrder: number;
  productType: 'product' | 'service';
  provider?: import('./provider').Provider;
}

export interface Photo {
  id: string;
  providerId: string;
  imageUrl: string;
  storageKey: string;
  displayOrder: number;
  uploadedAt: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  providerId?: string;
  isActive?: boolean | '';
  productType?: 'product' | 'service' | '';
  priceMin?: string;
  priceMax?: string;
  hasImages?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  withImages: number;
  withoutImages: number;
  withPrice: number;
  withoutPrice: number;
  avgPrice: number;
  typeBreakdown: { type: string; count: number }[];
  topProviders: { brandName: string; providerId: string; count: number }[];
}
