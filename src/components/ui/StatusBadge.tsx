type StatusType = 'pending' | 'approved' | 'rejected' | 'active' | 'suspended' | 'deleted' | 'not_submitted' | 'flagged' | 'open' | 'in_progress' | 'resolved' | 'closed';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const config: Record<StatusType, { label: string; dot: string; bg: string; text: string }> = {
  pending:       { label: 'Pending',       dot: 'bg-amber-400',  bg: 'bg-amber-50',   text: 'text-amber-700'  },
  approved:      { label: 'Approved',      dot: 'bg-emerald-400',bg: 'bg-emerald-50',  text: 'text-emerald-700'},
  rejected:      { label: 'Rejected',      dot: 'bg-red-400',    bg: 'bg-red-50',      text: 'text-red-700'    },
  active:        { label: 'Active',        dot: 'bg-emerald-400',bg: 'bg-emerald-50',  text: 'text-emerald-700'},
  suspended:     { label: 'Suspended',     dot: 'bg-red-400',    bg: 'bg-red-50',      text: 'text-red-700'    },
  deleted:       { label: 'Deleted',       dot: 'bg-gray-400',   bg: 'bg-gray-100',    text: 'text-gray-500'   },
  not_submitted: { label: 'Not Submitted', dot: 'bg-gray-400',   bg: 'bg-gray-100',    text: 'text-gray-500'   },
  flagged:       { label: 'Flagged',       dot: 'bg-orange-400', bg: 'bg-orange-50',   text: 'text-orange-700' },
  open:          { label: 'Open',          dot: 'bg-red-400',    bg: 'bg-red-50',      text: 'text-red-700'    },
  in_progress:   { label: 'In Progress',   dot: 'bg-amber-400',  bg: 'bg-amber-50',    text: 'text-amber-700'  },
  resolved:      { label: 'Resolved',      dot: 'bg-emerald-400',bg: 'bg-emerald-50',  text: 'text-emerald-700'},
  closed:        { label: 'Closed',        dot: 'bg-gray-400',   bg: 'bg-gray-100',    text: 'text-gray-500'   },
};

const StatusBadge = ({ status, size = 'sm', showDot = true }: StatusBadgeProps) => {
  const s = config[status as StatusType] ?? config.pending;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${s.bg} ${s.text}`}
      style={{ transition: 'all 0.15s ease' }}
    >
      {showDot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
      )}
      {s.label}
    </span>
  );
};

export default StatusBadge;
