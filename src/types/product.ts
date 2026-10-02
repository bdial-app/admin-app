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
  categoryId?: string | null;
  subcategoryId?: string | null;
  keywords?: string[] | null;
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

export type ProductSort = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'display_order';

/**
 * Query params for GET /admin/products. Booleans travel as 'true' | 'false'
 * strings so the same values can live in the URL; absent means "don't filter".
 */
export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  providerId?: string;
  isActive?: boolean | 'true' | 'false' | '';
  productType?: 'product' | 'service' | '';
  priceMin?: string;
  priceMax?: string;
  hasImages?: string;
  hasPrice?: string;
  isHero?: string;
  categoryId?: string;
  city?: string;
  providerStatus?: 'unverified' | 'active' | 'suspended' | 'disabled' | '';
  sort?: ProductSort | '';
}

export interface ProductFilterOptions {
  cities: { name: string; count: number }[];
  categories: { id: string; name: string; count: number }[];
  counts: {
    total: number;
    active: number;
    disabled: number;
    services: number;
    noImages: number;
    noPrice: number;
    hero: number;
  };
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
