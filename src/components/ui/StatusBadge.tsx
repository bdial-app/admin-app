type StatusType = 'pending' | 'approved' | 'rejected' | 'active' | 'suspended' | 'deleted' | 'not_submitted' | 'flagged' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'paused' | 'in_review' | 'unverified' | 'disabled';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const config: Record<StatusType, { label: string; color: string; bg: string }> = {
  pending:       { label: 'Pending',       color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  approved:      { label: 'Approved',      color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  rejected:      { label: 'Rejected',      color: '#FFFFFF',              bg: 'var(--color-danger)'        },
  active:        { label: 'Verified',      color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  suspended:     { label: 'Suspended',     color: '#FFFFFF',              bg: 'var(--color-danger)'        },
  paused:        { label: 'Paused',        color: 'var(--color-info)',    bg: 'var(--color-info-light)'    },
  in_review:     { label: 'In Review',     color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  unverified:    { label: 'Unverified',    color: 'var(--text-muted)',    bg: 'var(--surface-2)'           },
  disabled:      { label: 'Disabled',      color: 'var(--text-muted)',    bg: 'var(--surface-2)'           },
  deleted:       { label: 'Deleted',       color: 'var(--text-muted)',    bg: 'var(--surface-2)'           },
  not_submitted: { label: 'Not Submitted', color: 'var(--text-muted)',    bg: 'var(--surface-2)'           },
  flagged:       { label: 'Flagged',       color: '#F97316',              bg: 'rgba(249, 115, 22, 0.1)'    },
  open:          { label: 'Open',          color: 'var(--color-danger)',  bg: 'var(--color-danger-light)'  },
  in_progress:   { label: 'In Progress',   color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  resolved:      { label: 'Resolved',      color: 'var(--color-success)', bg: 'var(--color-success-light)' },
  closed:        { label: 'Closed',        color: 'var(--text-muted)',    bg: 'var(--surface-2)'           },
};

const StatusBadge = ({ status, size = 'sm', showDot = true }: StatusBadgeProps) => {
  const s = config[status as StatusType] ?? config.pending;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${sizeClasses}`}
      style={{
        transition: 'all 0.15s ease',
        background: s.bg,
        color: s.color,
      }}
    >
      {showDot && (
        <span className="inline-block w-1 h-1 rounded-full" style={{ background: s.color }} />
      )}
      {s.label}
    </span>
  );
};

export default StatusBadge;
