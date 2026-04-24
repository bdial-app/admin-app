import { useState } from 'react';
import { FileText, Loader2, Filter, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { useAuditLogs, useAuditLogStats } from '../hooks/useAuditLog';
import { ROUTES } from '../utils/constants';
import type { AuditLogEntry, AuditLogFilters } from '../types/audit-log';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  create: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)' },
  create_admin: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)' },
  create_setting: { bg: 'var(--color-success-light)', text: 'var(--color-success-dark)' },
  update: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)' },
  update_admin: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)' },
  update_setting: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)' },
  delete: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)' },
  delete_setting: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)' },
  promote_to_admin: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)' },
  demote_admin: { bg: 'var(--color-danger-light)', text: 'var(--color-danger-dark)' },
};

function DiffViewer({ previous, current }: { previous: Record<string, any> | null; current: Record<string, any> | null }) {
  if (!previous && !current) return null;
  const allKeys = [...new Set([...Object.keys(previous || {}), ...Object.keys(current || {})])];

  return (
    <div className="rounded-lg overflow-hidden text-xs font-mono" style={{ border: '1px solid var(--border-default)' }}>
      {allKeys.map((key) => {
        const prev = previous?.[key];
        const curr = current?.[key];
        const changed = JSON.stringify(prev) !== JSON.stringify(curr);
        return (
          <div key={key} className="flex" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="w-28 flex-shrink-0 px-2 py-1 font-medium" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>{key}</div>
            {prev !== undefined && (
              <div className="flex-1 px-2 py-1" style={{ background: changed ? '#fef2f2' : 'transparent', color: changed ? '#991b1b' : 'var(--text-muted)' }}>
                {typeof prev === 'object' ? JSON.stringify(prev) : String(prev)}
              </div>
            )}
            {curr !== undefined && (
              <div className="flex-1 px-2 py-1" style={{ background: changed ? '#f0fdf4' : 'transparent', color: changed ? '#166534' : 'var(--text-muted)' }}>
                {typeof curr === 'object' ? JSON.stringify(curr) : String(curr)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ACTION_COLORS[entry.action] || { bg: 'var(--surface-1)', text: 'var(--text-secondary)' };

  return (
    <>
      <tr
        className="transition-colors cursor-pointer"
        style={{ borderBottom: '1px solid var(--border-light)' }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <td className="px-4 py-3">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date(entry.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {entry.admin?.name || 'System'}
        </td>
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: colors.bg, color: colors.text }}>
            {entry.action}
          </span>
        </td>
        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {entry.entityType}
        </td>
        <td className="px-4 py-3 text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
          {entry.entityId?.slice(0, 8) || '—'}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3" style={{ background: 'var(--surface-1)' }}>
            <div className="space-y-2">
              {entry.description && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{entry.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {entry.previousState && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-danger)' }}>Previous</p>
                    <DiffViewer previous={entry.previousState} current={null} />
                  </div>
                )}
                {entry.newState && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-success)' }}>New</p>
                    <DiffViewer previous={null} current={entry.newState} />
                  </div>
                )}
              </div>
              {entry.previousState && entry.newState && (
                <div>
                  <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Changes</p>
                  <DiffViewer previous={entry.previousState} current={entry.newState} />
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 25 });
  const [showFilters, setShowFilters] = useState(false);
  const { data, isLoading } = useAuditLogs(filters);
  const { data: stats } = useAuditLogStats();

  const setFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters(f => ({ ...f, [key]: value || undefined, page: 1 }));
  };

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Track all admin actions and changes"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Audit Log' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard title="Total Entries" value={stats?.total?.toLocaleString() ?? '—'} icon={<FileText className="w-5 h-5" />} accent="var(--color-primary)" />
        <StatCard title="This Week" value={stats?.thisWeek?.toLocaleString() ?? '—'} icon={<Activity className="w-5 h-5" />} accent="var(--color-info)" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
          style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
        >
          <Filter className="w-3.5 h-3.5" /> Filters
          <ChevronDown className="w-3 h-3" style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-4 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Action</label>
            <input
              value={filters.action || ''}
              onChange={(e) => setFilter('action', e.target.value)}
              placeholder="e.g. create_admin"
              className="w-full px-2 py-1.5 text-xs rounded-md outline-none"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Entity Type</label>
            <input
              value={filters.entityType || ''}
              onChange={(e) => setFilter('entityType', e.target.value)}
              placeholder="e.g. user"
              className="w-full px-2 py-1.5 text-xs rounded-md outline-none"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilter('startDate', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md outline-none"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilter('endDate', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md outline-none"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Log Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th className="w-8 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Timestamp</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Admin</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Action</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>Entity</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((entry) => <LogRow key={entry.id} entry={entry} />)}
              {(!data?.items || data.items.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No audit log entries found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} entries)
            </span>
            <div className="flex gap-1">
              <button disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))} className="px-3 py-1 text-xs rounded-md disabled:opacity-40" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>Prev</button>
              <button disabled={(filters.page ?? 1) >= data.meta.totalPages} onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))} className="px-3 py-1 text-xs rounded-md disabled:opacity-40" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
