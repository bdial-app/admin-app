import type { WaRates, WaTemplateCategory } from '../../types';
import { formatInr, rateFor } from './wa-utils';

interface Props {
  /** Number of messages the estimate is for. */
  count: number;
  rates?: WaRates | null;
  /** Which category is actually being sent; the other is shown as the alternative. */
  category?: WaTemplateCategory;
  className?: string;
}

/** Small text: "≈ ₹X (utility) · ₹Y if marketing". */
export function CostHint({ count, rates, category = 'utility', className = '' }: Props) {
  const utility = count * rateFor('utility', rates);
  const marketing = count * rateFor('marketing', rates);
  const primaryIsMarketing = category === 'marketing';
  const primary = primaryIsMarketing ? marketing : utility;
  const alt = primaryIsMarketing ? utility : marketing;
  return (
    <span className={`text-xs tabular-nums ${className}`} style={{ color: 'var(--text-muted)' }}>
      {'≈ '}
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatInr(primary)}</span>
      {` (${primaryIsMarketing ? 'marketing' : 'utility'})`}
      {' · '}
      {formatInr(alt)} if {primaryIsMarketing ? 'utility' : 'marketing'}
      <span className="ml-1 opacity-70">+ 18% GST</span>
    </span>
  );
}

export default CostHint;
