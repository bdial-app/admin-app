/** The shape the add/edit product form works in — kept out of the component
 *  file so fast refresh keeps working. */
export interface ProductFormValues {
  providerId: string;
  providerName: string;
  name: string;
  description: string;
  price: string;
  displayOrder: string;
  productType: 'product' | 'service';
  isActive: boolean;
  categoryId: string;
  subcategoryId: string;
}

export const emptyProductForm: ProductFormValues = {
  providerId: '', providerName: '', name: '', description: '', price: '',
  displayOrder: '0', productType: 'product', isActive: true,
  categoryId: '', subcategoryId: '',
};

/** A photo in the edit form: one already saved (`url`), or a new `file` waiting to upload. */
export interface GalleryItem {
  key: string;
  /** The saved photo's URL, or a local preview of a new file. */
  url: string;
  file?: File;
}
