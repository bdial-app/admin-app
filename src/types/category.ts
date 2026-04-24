export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  iconStorageKey: string | null;
  imageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Relations
  children?: Category[];
  parent?: Category;
  providerCategories?: import('./provider').ProviderCategory[];
}

export interface CategoryFormData {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}
