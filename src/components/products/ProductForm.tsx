import { useMemo } from 'react';
import {
  Package, Wrench, X, ImagePlus, Eye, EyeOff, IndianRupee, Check,
} from 'lucide-react';
import { SearchableCategoryPicker } from '../ui/SearchableCategoryPicker';
import { ProviderPicker } from '../ui/ProviderPicker';
import type { ProductFormValues } from './product-form-values';


interface Props {
  value: ProductFormValues;
  onChange: (v: ProductFormValues) => void;
  images: File[];
  onImagesChange: (files: File[]) => void;
  maxImages: number;
  lockProvider?: boolean;
}

const SECTION = 'text-[11px] font-bold uppercase tracking-wider';

/**
 * Everything needed to list one product or service, in the order someone
 * actually thinks about it: whose shop, what it is, what it costs, what it
 * looks like — with a live preview of the card the customer will see.
 */
export function ProductForm({ value, onChange, images, onImagesChange, maxImages, lockProvider }: Props) {
  const set = <K extends keyof ProductFormValues>(key: K, v: ProductFormValues[K]) =>
    onChange({ ...value, [key]: v });

  const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 p-5">
      <div className="space-y-6 min-w-0">
        <Section title="Whose shop" required done={!!value.providerId}>
          <ProviderPicker
            value={value.providerId ? { id: value.providerId, name: value.providerName } : null}
            locked={lockProvider}
            onChange={(p) => onChange({ ...value, providerId: p?.id ?? '', providerName: p?.name ?? '' })}
          />
          {!value.providerId && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Every item belongs to a business — that is how customers find it.
            </p>
          )}
        </Section>

        <Section title="What is it" required done={!!value.name.trim()}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { key: 'product', label: 'Product', hint: 'Something they buy', icon: Package },
              { key: 'service', label: 'Service', hint: 'Something they book', icon: Wrench },
            ] as const).map((t) => {
              const Icon = t.icon;
              const on = value.productType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => set('productType', t.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors"
                  style={{
                    borderColor: on ? 'var(--color-primary)' : 'var(--border-default)',
                    background: on ? 'var(--surface-1)' : 'var(--surface-0)',
                    boxShadow: on ? '0 0 0 1px var(--color-primary)' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                    <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <input
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            className="input w-full"
            maxLength={150}
            placeholder={value.productType === 'service' ? 'e.g. Bridal Mehndi Package' : 'e.g. Garam Masala 100g'}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>This is the line customers read first</span>
            <span className="text-[10px]" style={{ color: value.name.length > 140 ? 'var(--color-warning-dark)' : 'var(--text-muted)' }}>
              {value.name.length}/150
            </span>
          </div>

          <textarea
            value={value.description}
            onChange={(e) => set('description', e.target.value)}
            className="input w-full mt-3"
            rows={3}
            placeholder="What it includes, sizes, how long it takes…"
          />
        </Section>

        <Section title="Where it belongs">
          <SearchableCategoryPicker
            categoryId={value.categoryId}
            subcategoryId={value.subcategoryId}
            onCategoryChange={(id) => onChange({ ...value, categoryId: id, subcategoryId: '' })}
            onSubcategoryChange={(id) => set('subcategoryId', id)}
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Optional, but it is how this turns up in browsing and search.
          </p>
        </Section>

        <Section title="Price and visibility">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Price</label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  min={0}
                  value={value.price}
                  onChange={(e) => set('price', e.target.value)}
                  className="input w-full pl-8"
                  placeholder="Leave blank"
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {value.price.trim() === '' ? 'Shows as "Contact for price"' : 'Shown on the card'}
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Position</label>
              <input
                type="number"
                min={0}
                value={value.displayOrder}
                onChange={(e) => set('displayOrder', e.target.value)}
                className="input w-full"
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Lower shows first</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => set('isActive', !value.isActive)}
            className="w-full flex items-center justify-between p-3 rounded-xl mt-3 border"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
          >
            <span className="flex items-center gap-2.5">
              {value.isActive
                ? <Eye className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                : <EyeOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
              <span className="text-left">
                <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {value.isActive ? 'Live for customers' : 'Hidden for now'}
                </span>
                <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {value.isActive ? 'Appears as soon as you save' : 'Saved, but nobody sees it yet'}
                </span>
              </span>
            </span>
            <span
              className="w-9 h-5 rounded-full relative transition-colors shrink-0"
              style={{ background: value.isActive ? 'var(--color-success)' : 'var(--surface-2)' }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: value.isActive ? 18 : 2 }} />
            </span>
          </button>
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="Photos">
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, idx) => (
              <div key={src} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-0 inset-x-0 text-[9px] font-semibold text-white text-center py-0.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onImagesChange(images.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < maxImages && (
              <label
                className="aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer gap-1"
                style={{ border: '1px dashed var(--border-default)', color: 'var(--text-muted)' }}
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] font-medium">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    // A file picker set to image/* still lets other types through.
                    const picked = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('image/'));
                    onImagesChange([...images, ...picked].slice(0, maxImages));
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
            First photo is the one on the card. JPG or PNG, up to 10MB each, {maxImages} max.
          </p>
        </Section>

        <Section title="How it will look">
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
            <div className="aspect-[4/3] flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
              {previews[0]
                ? <img src={previews[0]} alt="" className="w-full h-full object-cover" />
                : <Package className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />}
            </div>
            <div className="p-2.5">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {value.name.trim() || 'Your item name'}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {value.providerName || 'Business name'}
              </p>
              <p className="text-sm font-bold mt-1" style={{ color: value.price.trim() ? 'var(--text-primary)' : 'var(--color-warning-dark)' }}>
                {value.price.trim() ? `₹${Number(value.price).toLocaleString('en-IN')}` : 'Contact for price'}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, required, done, children }: { title: string; required?: boolean; done?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <p className={SECTION} style={{ color: 'var(--text-muted)' }}>{title}</p>
        {required && !done && <span className="text-[10px] font-bold" style={{ color: 'var(--color-danger)' }}>required</span>}
        {required && done && <Check className="w-3 h-3" style={{ color: 'var(--color-success)' }} />}
      </div>
      {children}
    </div>
  );
}

