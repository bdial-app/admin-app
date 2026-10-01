import type { WaCampaignStatus } from '../../types';

const config: Record<WaCampaignStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  draft:     { label: 'Draft',     color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
  scheduled: { label: 'Scheduled', color: 'var(--color-info)',     bg: 'var(--color-info-light)' },
  sending:   { label: 'Sending',   color: '#FFFFFF',               bg: 'var(--color-primary)', pulse: true },
  paused:    { label: 'Paused',    color: 'var(--color-warning)',  bg: 'var(--color-warning-light)' },
  completed: { label: 'Completed', color: '#FFFFFF',               bg: 'var(--color-success)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)',     bg: 'var(--surface-2)' },
  failed:    { label: 'Failed',    color: '#FFFFFF',               bg: 'var(--color-danger)' },
};

export function CampaignStatusBadge({ status, size = 'sm' }: { status: WaCampaignStatus; size?: 'sm' | 'md' }) {
  const s = config[status] ?? config.draft;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${sizeClasses}`}
      style={{ background: s.bg, color: s.color }}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.pulse ? 'pulse-dot' : ''}`} style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export default CampaignStatusBadge;
