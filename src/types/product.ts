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
  /** When it was added (from the products.created_at migration). */
  createdAt?: string;
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

export type ProductSort = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'display_order' | 'newest' | 'oldest';

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
  /** Added from / to: 'YYYY-MM-DD' (whole day) or 'YYYY-MM-DDTHH:mm', India time. */
  createdFrom?: string;
  createdTo?: string;
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

/** GET /admin/products/analytics */
export interface ProductAnalytics {
  days: number;
  catalogue: { total: number; active: number; services: number; withPhotos: number; withPrice: number; added: number; addedPrev: number };
  engagement: {
    views: number; viewsPrev: number; viewers: number; productsViewed: number; avgSeconds: number;
    saves: number; savesPrev: number;
    /** Visits that viewed a product, and how many of them then called or chatted with that business. */
    visits: number; contacted: number;
  };
  series: { day: string; views: number; added: number }[];
  sources: { source: string; count: number }[];
  topProducts: {
    id: string; name: string; productType: string; price: number | null; isActive: boolean; photo: string | null;
    providerId: string; brandName: string; views: number; viewers: number; visits: number; contacted: number;
    avgSeconds: number | null; saves: number;
  }[];
  /** Active products (listed 3+ days) nobody viewed in the period. */
  unseenActive: number;
  categories: { name: string; total: number; withPhotos: number; withPrice: number }[];
}
