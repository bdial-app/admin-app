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
  displayOrder: number;
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
}
