import { useState } from 'react';
import { toast } from 'react-toastify';
import { DetailPanel } from '../ui/DetailPanel';
import { ProductForm } from './ProductForm';
import { emptyProductForm, type ProductFormValues } from './product-form-values';
import { productsService } from '../../services/products.service';
import { useCreateProduct } from '../../hooks/useProducts';

const MAX_IMAGES = 5;

/**
 * Add a product or service, with photos. Pass `business` to list it on that
 * business without asking (e.g. from the business's own page); otherwise the
 * form asks which business.
 *
 * Mount only while open (or with a changing `key`) so each opens empty.
 */
export function ProductCreatePanel({
  business,
  onClose,
  onCreated,
}: {
  business?: { id: string; name: string };
  onClose: () => void;
  onCreated?: () => void;
}) {
  const createMutation = useCreateProduct();
  const [form, setForm] = useState<ProductFormValues>(() =>
    business ? { ...emptyProductForm, providerId: business.id, providerName: business.name } : emptyProductForm,
  );
  const [images, setImages] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!form.providerId) { toast.error('Select a provider'); return; }
    if (!form.name.trim()) { toast.error('Enter a product name'); return; }
    setCreating(true);
    try {
      const created = await createMutation.mutateAsync({
        providerId: form.providerId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price ? Number(form.price) : null,
        displayOrder: Number(form.displayOrder) || 0,
        productType: form.productType,
        isActive: form.isActive,
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
      });
      // Upload any selected images to the newly created product (one or many).
      if (images.length && created?.id) {
        try {
          await productsService.uploadImages(created.id, images);
        } catch {
          toast.warn('Product created, but image upload failed. You can add photos from the edit panel.');
        }
      }
      toast.success(`${form.productType === 'service' ? 'Service' : 'Product'} created for ${form.providerName}`);
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DetailPanel
      open
      onClose={onClose}
      title="Add a product or service"
      subtitle={business ? `It will be listed on ${business.name}` : 'It will be listed on the business you choose'}
      width="900px"
      actions={
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
            Cancel
          </button>
          <button
            onClick={() => void create()}
            disabled={creating || !form.providerId || !form.name.trim()}
            title={!form.providerId ? 'Choose the business first' : !form.name.trim() ? 'Give it a name' : undefined}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {creating ? (images.length ? 'Saving & uploading…' : 'Saving…') : 'Add to catalogue'}
          </button>
        </div>
      }
    >
      <ProductForm
        value={form}
        onChange={setForm}
        images={images}
        onImagesChange={setImages}
        maxImages={MAX_IMAGES}
        lockProvider={!!business}
      />
    </DetailPanel>
  );
}
