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
