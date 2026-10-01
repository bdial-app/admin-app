import type { WaTemplateStatus } from '../../types';

const config: Record<WaTemplateStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
  pending:  { label: 'In review', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  approved: { label: 'Approved', color: '#FFFFFF',               bg: 'var(--color-success)' },
  rejected: { label: 'Rejected', color: '#FFFFFF',               bg: 'var(--color-danger)' },
  paused:   { label: 'Paused',   color: 'var(--text-muted)',     bg: 'var(--surface-2)' },
  disabled: { label: 'Disabled', color: 'var(--text-muted)',     bg: 'var(--surface-2)' },
};

interface Props {
  status: WaTemplateStatus;
  /** Shown as a tooltip when rejected. */
  reason?: string | null;
  size?: 'sm' | 'md';
}

export function TemplateStatusBadge({ status, reason, size = 'sm' }: Props) {
  const s = config[status] ?? config.draft;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const tip = status === 'rejected' && reason ? reason : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${sizeClasses} ${tip ? 'tooltip cursor-help' : ''}`}
      data-tooltip={tip}
      title={tip}
      style={{ background: s.bg, color: s.color }}
    >
      <span className="inline-block w-1 h-1 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export default TemplateStatusBadge;
