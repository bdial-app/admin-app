import { useState } from 'react';
import type { PushAudience } from '../../types';
import { ProviderPicker, type PickedProvider } from '../ui/ProviderPicker';
import { businessScreen, pickedBusinessId } from '../whatsapp/wa-utils';
import { PRODUCT_LINK, productIdFrom, screensFor } from './push-utils';

interface Props {
  value: string;
  onChange: (route: string) => void;
  audience: PushAudience['kind'];
}

const INPUT = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

type Mode = 'screen' | 'business' | 'product' | 'custom';

/** Where tapping the push takes people: an app screen, one business, one product, or any path. */
export function PushLinkPicker({ value, onChange, audience }: Props) {
  const screens = screensFor(audience);
  const initialMode = (): Mode => {
    if (pickedBusinessId(value)) return 'business';
    if (PRODUCT_LINK.test(value)) return 'product';
    if (!value || value === '/' || screens.some((s) => s.target === value)) return 'screen';
    return 'custom';
  };
  const [mode, setMode] = useState<Mode>(initialMode);
  const [business, setBusiness] = useState<PickedProvider | null>(() => {
    const id = pickedBusinessId(value);
    return id ? { id, name: 'Picked business' } : null;
  });
  const [productText, setProductText] = useState(() => PRODUCT_LINK.exec(value)?.[1] ?? '');
  const productId = productIdFrom(productText);

  const selectValue = mode === 'screen' ? value || '/' : `__${mode}`;
  const groups = ['Business owners', 'Customers', 'Anyone'] as const;

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__business') {
            setMode('business');
            onChange(business ? businessScreen(business.id) : '');
          } else if (v === '__product') {
            setMode('product');
            onChange(productId ? `/p/${productId}` : '');
          } else if (v === '__custom') {
            setMode('custom');
          } else {
            setMode('screen');
            onChange(v);
          }
        }}
        className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
        style={INPUT}
      >
        <option value="/">Home</option>
        {groups.map((g) => {
          const items = screens.filter((s) => s.group === g);
          if (!items.length) return null;
          return (
            <optgroup key={g} label={g === 'Business owners' ? 'Their business (owners)' : g === 'Customers' ? 'Customer screens' : 'Anyone'}>
              {items.map((s) => <option key={s.target} value={s.target}>{s.label}</option>)}
            </optgroup>
          );
        })}
        <optgroup label="Something specific">
          <option value="__business">A business page (you pick it)</option>
          <option value="__product">A product (paste its link)</option>
          <option value="__custom">Another screen (type its path)</option>
        </optgroup>
      </select>

      {mode === 'business' && (
        <ProviderPicker
          value={business}
          onChange={(p) => {
            setBusiness(p);
            onChange(p ? businessScreen(p.id) : '');
          }}
        />
      )}
      {mode === 'product' && (
        <div>
          <input
            value={productText}
            onChange={(e) => {
              setProductText(e.target.value);
              const id = productIdFrom(e.target.value);
              onChange(id ? `/p/${id}` : '');
            }}
            placeholder="https://www.tijarahapp.in/p/… or the product id"
            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
            style={INPUT}
          />
          {productText && !productId && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>That doesn't look like a product link.</p>
          )}
        </div>
      )}
      {mode === 'custom' && (
        <div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            placeholder="/women-led?mode=customer"
            className="w-full px-3 py-2 text-sm rounded-lg font-mono focus-ring"
            style={INPUT}
          />
          {value && !value.startsWith('/') && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>A path starts with /</p>
          )}
        </div>
      )}
      {audience === 'everyone' && mode === 'screen' && screens.find((s) => s.target === value)?.group === 'Business owners' && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Customers who get this will land on Home.</p>
      )}
    </div>
  );
}
