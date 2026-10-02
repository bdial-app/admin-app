import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import type { FilterOption } from './types';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** The empty option's text, e.g. "All cities". Omit for a required choice. */
  placeholder?: string;
  /** Highlight the border, for a filter that is currently narrowing. */
  active?: boolean;
  size?: 'sm' | 'md';
  /** Wrapper class, for width. */
  className?: string;
}

/**
 * The one select to use. Native (keyboard, mobile, screen readers all work)
 * but with our own chevron and enough right padding that no option text can
 * ever run under the arrow, which native rendering gets wrong in some
 * browsers.
 */
export function Select({ value, onChange, options, placeholder, active, size = 'md', className = '', disabled, style, ...rest }: SelectProps) {
  const pad = size === 'sm' ? 'pl-2.5 pr-8 py-1.5 text-xs' : 'pl-3 pr-9 py-2 text-sm';
  const empty = value === '';
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none truncate rounded-lg focus-ring disabled:opacity-50 ${pad}`}
        style={{
          background: 'var(--surface-0)',
          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-default)'}`,
          color: empty && placeholder ? 'var(--text-secondary)' : 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...style,
        }}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.count != null ? `${o.label} (${o.count})` : o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${size === 'sm' ? 'right-2 h-3.5 w-3.5' : 'right-3 h-4 w-4'}`}
        style={{ color: active ? 'var(--color-primary)' : 'var(--text-muted)' }}
      />
    </div>
  );
}

export default Select;
