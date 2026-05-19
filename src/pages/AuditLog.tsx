import { useState } from 'react';
import {
  Search, Filter, X, Calendar, ChevronRight, Copy,
  FileText, Activity, Shield, Users, Clock, Eye, Trash2, Edit3,
  Plus, ArrowUp, ArrowDown, UserCheck, UserX, Zap, Settings,
  Star, Download, Image, Tag, MapPin, AlertTriangle, BarChart3,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { DetailPanel } from '../components/ui/DetailPanel';
import { useAuditLogs, useAuditLogStats } from '../hooks/useAuditLog';
import { ROUTES } from '../utils/constants';
import type { AuditLogEntry, AuditLogFilters } from '../types/audit-log';
import { toast } from 'react-toastify';

const LIMIT = 25;

// ─── Action metadata ─────────────────────

const ACTION_META: Record<string, { label: string; color: string; icon: typeof Edit3 }> = {
  create: { label: 'Create', color: 'var(--color-success)', icon: Plus },
  create_admin: { label: 'Create Admin', color: 'var(--color-success)', icon: UserCheck },
  create_setting: { label: 'Create Setting', color: 'var(--color-success)', icon: Settings },
  admin_create_user: { label: 'Create User', color: 'var(--color-success)', icon: UserCheck },
  admin_create_provider_with_user: { label: 'Create Provider', color: 'var(--color-success)', icon: UserCheck },
  update: { label: 'Update', color: 'var(--color-info)', icon: Edit3 },
  update_admin: { label: 'Update Admin', color: 'var(--color-info)', icon: Edit3 },
  update_setting: { label: 'Update Setting', color: 'var(--color-info)', icon: Settings },
  update_feature_flag: { label: 'Feature Flag', color: 'var(--color-info)', icon: Zap },
  update_serviceable_city: { label: 'Update City', color: 'var(--color-info)', icon: MapPin },
  delete: { label: 'Delete', color: 'var(--color-danger)', icon: Trash2 },
  delete_setting: { label: 'Delete Setting', color: 'var(--color-danger)', icon: Trash2 },
  delete_user: { label: 'Delete User', color: 'var(--color-danger)', icon: Trash2 },
  delete_provider: { label: 'Delete Provider', color: 'var(--color-danger)', icon: Trash2 },
  pause_user: { label: 'Pause User', color: '#d97706', icon: AlertTriangle },
  unpause_user: { label: 'Unpause User', color: 'var(--color-success)', icon: UserCheck },
  promote_to_admin: { label: 'Promote Admin', color: '#d97706', icon: ArrowUp },
  demote_admin: { label: 'Demote Admin', color: 'var(--color-danger)', icon: ArrowDown },
  confirm_suspension: { label: 'Confirm Suspension', color: 'var(--color-danger)', icon: Shield },
  disable_provider: { label: 'Disable Provider', color: 'var(--color-danger)', icon: UserX },
  enable_provider: { label: 'Enable Provider', color: 'var(--color-success)', icon: UserCheck },
  toggle_featured: { label: 'Toggle Featured', color: '#d97706', icon: Star },
  approve_sponsorship: { label: 'Approve Sponsor', color: 'var(--color-success)', icon: Star },
  reject_sponsorship: { label: 'Reject Sponsor', color: 'var(--color-danger)', icon: X },
  approve_offer: { label: 'Approve Offer', color: 'var(--color-success)', icon: Tag },
  reject_offer: { label: 'Reject Offer', color: 'var(--color-danger)', icon: X },
  remove_photo: { label: 'Remove Photo', color: 'var(--color-danger)', icon: Image },
  export_data: { label: 'Export Data', color: '#6366f1', icon: Download },
  bulk_suspend_providers: { label: 'Bulk Suspend', color: 'var(--color-danger)', icon: AlertTriangle },
  bulk_activate_providers: { label: 'Bulk Activate', color: 'var(--color-success)', icon: UserCheck },
  bulk_delete_products: { label: 'Bulk Delete', color: 'var(--color-danger)', icon: Trash2 },
};

const ENTITY_ICONS: Record<string, typeof Users> = {
  user: Users,
  provider: Shield,
  system_setting: Settings,
  sponsored_listing: Star,
  provider_offer: Tag,
  photo: Image,
  review_photo: Image,
  product: BarChart3,
  serviceable_city: MapPin,
};

const getActionMeta = (action: string) =>
  ACTION_META[action] ?? { label: action.replace(/_/g, ' '), color: 'var(--text-muted)', icon: Activity };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filters: AuditLogFilters = {
    page,
    limit: LIMIT,
    search: search || undefined,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const { data, isLoading } = useAuditLogs(filters);
  const { data: stats } = useAuditLogStats();

  const activeFilterCount = [actionFilter, entityFilter, startDate, endDate].filter(Boolean).length;

  const clearFilters = () => {
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Derive unique actions/entities from stats for dropdowns
  const actionOptions = stats?.actionBreakdown?.map(a => a.action) ?? [];
  const entityOptions = stats?.entityBreakdown?.map(e => e.entityType) ?? [];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={data?.meta ? `${data.meta.total.toLocaleString()} entries tracked` : 'Track all admin actions and changes'}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Audit Log' },
        ]}
      />

      {/* ═══ Stats ═══ */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Total Entries"
            value={stats.total.toLocaleString()}
            icon={<FileText className="w-5 h-5" />}
            accent="var(--color-primary)"
          />
          <StatCard
            title="Today"
            value={stats.today}
            icon={<Clock className="w-5 h-5" />}
            accent="var(--color-info)"
          />
          <StatCard
            title="This Week"
            value={stats.thisWeek}
            icon={<Activity className="w-5 h-5" />}
            accent="var(--color-success)"
          />
          <StatCard
            title="Active Admins"
            value={stats.uniqueAdmins}
            icon={<Users className="w-5 h-5" />}
            accent="#6366f1"
          />
        </div>
      )}

      {/* ═══ Action Breakdown Pills ═══ */}
      {stats && stats.actionBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {stats.actionBreakdown.slice(0, 10).map(({ action, count }) => {
            const meta = getActionMeta(action);
            const isActive = actionFilter === action;
            return (
              <button
                key={action}
                onClick={() => { setActionFilter(isActive ? '' : action); setPage(1); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all"
                style={{
                  background: isActive ? `${meta.color}15` : 'var(--surface-1)',
                  color: isActive ? meta.color : 'var(--text-muted)',
                  border: `1px solid ${isActive ? meta.color : 'var(--border-default)'}`,
                }}
              >
                <meta.icon className="w-3 h-3" />
                {meta.label}
                <span className="text-[9px] font-bold opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ Search + Filters ═══ */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by description, action, admin, entity ID\u2026"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            style={{
              background: showFilters || activeFilterCount > 0 ? 'var(--color-primary-light)' : 'var(--surface-1)',
              color: showFilters || activeFilterCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--color-primary)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div
            className="flex flex-wrap items-end gap-3 p-4 rounded-xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value="">All Actions</option>
                {actionOptions.map(a => (
                  <option key={a} value={a}>{getActionMeta(a).label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value="">All Entities</option>
                {entityOptions.map(e => (
                  <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
              <span className="text-xs pt-5" style={{ color: 'var(--text-muted)' }}>to</span>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Until</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-medium rounded-md flex items-center gap-1"
                style={{ color: 'var(--color-danger)' }}
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Log Timeline ═══ */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
          </div>
        ) : !data?.items?.length ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No audit entries found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Actions will appear here as admins make changes'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {data.items.map((entry) => (
              <LogRow key={entry.id} entry={entry} onClick={() => setSelectedEntry(entry)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border-default)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {data.meta.page} of {data.meta.totalPages} \u2022 {data.meta.total.toLocaleString()} entries
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-30 transition-colors"
                style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-30 transition-colors"
                style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* DETAIL PANEL                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Audit Entry"
        subtitle={selectedEntry?.id?.slice(0, 8)}
        width="lg"
      >
        {selectedEntry && <EntryDetail entry={selectedEntry} />}
      </DetailPanel>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LOG ROW
// ═══════════════════════════════════════════════════════════

function LogRow({ entry, onClick }: { entry: AuditLogEntry; onClick: () => void }) {
  const meta = getActionMeta(entry.action);
  const EntityIcon = ENTITY_ICONS[entry.entityType] ?? Activity;
  const hasChanges = !!(entry.previousState || entry.newState);

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
      onClick={onClick}
    >
      {/* Action Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${meta.color}12` }}
      >
        <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Action Badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wide"
            style={{ background: `${meta.color}12`, color: meta.color }}
          >
            {meta.label}
          </span>
          {/* Entity Type */}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            <EntityIcon className="w-3 h-3" />
            {entry.entityType.replace(/_/g, ' ')}
          </span>
          {/* Changes indicator */}
          {hasChanges && (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-info)' }} title="Has state changes" />
          )}
        </div>
        {/* Description or entity ID */}
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {entry.description || (entry.entityId ? `Entity: ${entry.entityId.slice(0, 12)}\u2026` : 'No description')}
        </p>
      </div>

      {/* Admin */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {entry.admin?.name || 'System'}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(entry.createdAt)}</p>
      </div>

      {/* Expand cue */}
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ENTRY DETAIL
// ═══════════════════════════════════════════════════════════

function EntryDetail({ entry }: { entry: AuditLogEntry }) {
  const meta = getActionMeta(entry.action);
  const EntityIcon = ENTITY_ICONS[entry.entityType] ?? Activity;

  const allKeys = [
    ...new Set([
      ...Object.keys(entry.previousState || {}),
      ...Object.keys(entry.newState || {}),
    ]),
  ];

  const changedKeys = allKeys.filter(k =>
    JSON.stringify(entry.previousState?.[k]) !== JSON.stringify(entry.newState?.[k])
  );

  return (
    <div className="space-y-5">
      {/* Action Banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}20` }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}15` }}>
          <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <EntityIcon className="w-3 h-3 inline mr-1" />
            {entry.entityType.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailCell label="Admin" value={entry.admin?.name || 'System'} />
        <DetailCell label="Timestamp" value={`${formatDate(entry.createdAt)} ${formatTime(entry.createdAt)}`} />
        <DetailCell label="IP Address" value={entry.ipAddress || 'Unknown'} />
        <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Entity ID</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-mono font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {entry.entityId || '\u2014'}
            </p>
            {entry.entityId && (
              <button
                onClick={() => { navigator.clipboard.writeText(entry.entityId!); toast.success('ID copied!'); }}
                className="p-0.5 rounded hover:bg-[var(--surface-2)]"
              >
                <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {entry.description && (
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Description</p>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{entry.description}</p>
        </div>
      )}

      {/* Log ID */}
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Log ID</p>
        <p className="text-[10px] font-mono flex-1" style={{ color: 'var(--text-muted)' }}>{entry.id}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(entry.id); toast.success('Log ID copied!'); }}
          className="p-1 rounded hover:bg-[var(--surface-2)]"
        >
          <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* ─── State Changes ─── */}
      {(entry.previousState || entry.newState) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              State Changes
              {changedKeys.length > 0 && (
                <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                  {changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} changed
                </span>
              )}
            </p>
          </div>

          {/* Diff Table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {/* Header */}
            <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider px-3 py-2" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <span>Field</span>
              <span>Before</span>
              <span>After</span>
            </div>

            {allKeys.map((key) => {
              const prev = entry.previousState?.[key];
              const curr = entry.newState?.[key];
              const isChanged = JSON.stringify(prev) !== JSON.stringify(curr);

              return (
                <div
                  key={key}
                  className="grid grid-cols-3 px-3 py-2 text-xs"
                  style={{
                    borderTop: '1px solid var(--border-light)',
                    background: isChanged ? 'var(--surface-1)' : 'transparent',
                  }}
                >
                  <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    {isChanged && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-info)' }} />}
                    {key}
                  </span>
                  <span
                    className="font-mono break-all"
                    style={{ color: isChanged && prev !== undefined ? '#dc2626' : 'var(--text-muted)' }}
                  >
                    {prev !== undefined ? (typeof prev === 'object' ? JSON.stringify(prev) : String(prev)) : '\u2014'}
                  </span>
                  <span
                    className="font-mono break-all"
                    style={{ color: isChanged && curr !== undefined ? '#16a34a' : 'var(--text-muted)' }}
                  >
                    {curr !== undefined ? (typeof curr === 'object' ? JSON.stringify(curr) : String(curr)) : '\u2014'}
                  </span>
                </div>
              );
            })}

            {allKeys.length === 0 && (
              <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No state data recorded
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
