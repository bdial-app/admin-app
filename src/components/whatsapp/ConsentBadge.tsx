import type { WaConsent } from '../../types';

const config: Record<WaConsent, { label: string; color: string; bg: string }> = {
  opted_in:  { label: 'Opted in',  color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' },
  opted_out: { label: 'Opted out', color: 'var(--color-danger-dark)',  bg: 'var(--color-danger-light)' },
  unknown:   { label: 'Unknown',   color: 'var(--text-secondary)',     bg: 'var(--surface-2)' },
};

export function ConsentBadge({ consent, size = 'sm' }: { consent: WaConsent; size?: 'sm' | 'md' }) {
  const s = config[consent] ?? config.unknown;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${sizeClasses}`}
      style={{ background: s.bg, color: s.color }}
    >
      <span className="inline-block w-1 h-1 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export default ConsentBadge;
