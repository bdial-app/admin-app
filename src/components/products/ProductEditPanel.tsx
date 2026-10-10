import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { DetailPanel } from '../ui/DetailPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProductForm } from './ProductForm';
import type { GalleryItem, ProductFormValues } from './product-form-values';
import { productsService } from '../../services/products.service';
import { useUpdateProduct } from '../../hooks/useProducts';
import type { Product } from '../../types';

const MAX_IMAGES = 5;

const formOf = (p: Product): ProductFormValues => ({
  providerId: p.providerId,
  providerName: p.provider?.brandName ?? '',
  name: p.name || '',
  description: p.description || '',
  price: p.price?.toString() || '',
  displayOrder: p.displayOrder?.toString() || '0',
  productType: (p.productType as 'product' | 'service') || 'product',
  isActive: p.isActive,
  categoryId: p.categoryId ?? '',
  subcategoryId: p.subcategoryId ?? '',
});

/**
 * Edit one product or service: details, category, visibility, hero, and
 * photos (add, remove, choose the main one). Photo changes apply on save,
 * after a confirmation when photos would be deleted. Used on the Products
 * page and on a business's page in admin.
 *
 * Mount with `key={product.id}` so each product opens with fresh state.
 */
export function ProductEditPanel({
  product,
  businessName,
  onClose,
  onSaved,
}: {
  product: Product | null;
  /** The business's name when the product doesn't carry it (e.g. on its page). */
  businessName?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const updateMutation = useUpdateProduct();
  const [isHero, setIsHero] = useState(!!product?.isHero);
  const [form, setForm] = useState<ProductFormValues>(() =>
    product ? { ...formOf(product), providerName: product.provider?.brandName ?? businessName ?? '' } : formOf({} as Product),
  );
  const [gallery, setGallery] = useState<GalleryItem[]>(() => (product?.photoUrls ?? []).map((url) => ({ key: url, url })));
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  if (!product) return null;

  /** Photos that saving will delete (saved ones no longer in the gallery). */
  const photosToRemove = (product.photoUrls ?? []).filter((u) => !gallery.some((g) => !g.file && g.url === u));

  const close = () => {
    // Free the previews of photos picked but never saved.
    gallery.forEach((g) => g.file && URL.revokeObjectURL(g.url));
    onClose();
  };

  const toggleHero = async () => {
    try {
      await updateMutation.mutateAsync({ id: product.id, body: { isHero: !isHero } });
      setIsHero(!isHero);
      toast.success(isHero ? 'Removed hero status' : 'Marked as hero product');
    } catch {
      toast.error('Failed to update hero status');
    }
  };

  /** Deleting photos can't be undone: ask first. */
  const requestSave = () => {
    if (!form.name.trim()) { toast.error('Give it a name'); return; }
    if (photosToRemove.length) setConfirmRemoval(true);
    else void save();
  };

  /**
   * Save in order: drop removed photos, upload new ones, then the details and
   * the final photo order (the first is the card photo) in one update.
   */
  const save = async () => {
    setConfirmRemoval(false);
    if (!form.name.trim()) { toast.error('Give it a name'); return; }
    const id = product.id;
    try {
      if (photosToRemove.length) setSaving('Removing photos…');
      let current = product.photoUrls ?? [];
      for (const url of photosToRemove) current = (await productsService.deleteImage(id, url)).photoUrls ?? [];

      const files = gallery.filter((g) => g.file).map((g) => g.file as File);
      let uploaded: string[] = [];
      if (files.length) {
        setSaving(`Uploading ${files.length} photo${files.length === 1 ? '' : 's'}…`);
        const before = new Set(current);
        uploaded = ((await productsService.uploadImages(id, files)).photoUrls ?? []).filter((u) => !before.has(u));
      }
      let next = 0;
      const photoUrls = gallery.map((g) => (g.file ? uploaded[next++] : g.url)).filter((u): u is string => !!u);

      setSaving('Saving…');
      await updateMutation.mutateAsync({
        id,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: form.price ? Number(form.price) : null,
          displayOrder: Number(form.displayOrder) || 0,
          productType: form.productType,
          isActive: form.isActive,
          categoryId: form.categoryId || null,
          subcategoryId: form.subcategoryId || null,
          photoUrls,
        },
      });
      toast.success(`${form.productType === 'service' ? 'Service' : 'Product'} saved`);
      onSaved?.();
      close();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save — try again');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <DetailPanel
        open
        onClose={close}
        title={`Edit ${form.productType === 'service' ? 'service' : 'product'}`}
        subtitle={form.providerName ? `${product.name} · ${form.providerName}` : product.name}
        width="900px"
        actions={
          <div className="flex gap-2">
            <button onClick={close} disabled={!!saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}>
              Cancel
            </button>
            <button onClick={requestSave} disabled={!!saving || !form.name.trim()} className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {saving ?? 'Save changes'}
            </button>
          </div>
        }
      >
        <ProductForm
          value={form}
          onChange={setForm}
          images={[]}
          onImagesChange={() => undefined}
          maxImages={MAX_IMAGES}
          lockProvider
          gallery={gallery}
          onGalleryChange={setGallery}
          extra={
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isHero ? '#7c3aed10' : 'var(--surface-1)', border: `1px solid ${isHero ? '#7c3aed40' : 'var(--border-default)'}` }}>
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4" style={{ color: '#7c3aed', fill: isHero ? '#7c3aed' : 'none' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Hero product</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Featured in "Best Products This Week" on the home feed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggleHero()}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{ background: isHero ? '#7c3aed' : 'var(--surface-2)', color: isHero ? 'white' : 'var(--text-secondary)' }}
              >
                {isHero ? 'Remove' : 'Make hero'}
              </button>
            </div>
          }
        />
      </DetailPanel>

      <ConfirmDialog
        open={confirmRemoval}
        onClose={() => setConfirmRemoval(false)}
        onConfirm={() => void save()}
        title={`Delete ${photosToRemove.length} photo${photosToRemove.length === 1 ? '' : 's'}?`}
        description={`${photosToRemove.length === 1 ? 'This photo' : 'These photos'} will be removed from "${form.name.trim()}" and deleted permanently when you save. Your other changes are saved too.`}
        confirmLabel="Delete & save"
        variant="danger"
        isLoading={!!saving}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          {photosToRemove.map((url) => (
            <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" style={{ border: '1px solid var(--border-default)' }} />
          ))}
        </div>
      </ConfirmDialog>
    </>
  );
}
