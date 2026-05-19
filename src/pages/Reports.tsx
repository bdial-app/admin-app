import { useState, useMemo } from 'react';
import {
  Eye, AlertTriangle, ShieldCheck, Ban, XCircle, User, Clock,
  FileWarning, Shield, TrendingUp, Filter, BarChart3, Search,
  ChevronRight, ExternalLink, MessageSquare,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import KPICard from '../components/ui/KPICard';
import { useReports, useReport, useReviewReport, useReportStats } from '../hooks/useReports';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Report, ReportDetail, ReportStatus, ReportEntityType } from '../types';

const LIMIT = 15;

const STATUS_TABS: { label: string; value: ReportStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Action Taken', value: 'action_taken' },
  { label: 'Dismissed', value: 'dismissed' },
];

const ENTITY_TYPES: { label: string; value: string; icon: typeof User }[] = [
  { label: 'All Types', value: '', icon: Filter },
  { label: 'Provider', value: 'provider', icon: User },
  { label: 'Product', value: 'product', icon: BarChart3 },
  { label: 'Message', value: 'message', icon: MessageSquare },
  { label: 'Deal', value: 'deal', icon: TrendingUp },
  { label: 'Review', value: 'review', icon: MessageSquare },
  { label: 'Customer', value: 'customer', icon: User },
];

const ACTION_OPTIONS: { label: string; description: string; value: 'dismiss' | 'warn' | 'suspend' | 'ban'; icon: typeof XCircle; variant: 'default' | 'danger' | 'warning' }[] = [
  { label: 'Dismiss', description: 'No action needed', value: 'dismiss', icon: XCircle, variant: 'default' },
  { label: 'Warn', description: 'Issue a warning', value: 'warn', icon: AlertTriangle, variant: 'warning' },
  { label: 'Suspend', description: 'Temporarily suspend', value: 'suspend', icon: ShieldCheck, variant: 'danger' },
  { label: 'Ban', description: 'Permanently ban', value: 'ban', icon: Ban, variant: 'danger' },
];

const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
  provider: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
  product: { bg: 'var(--color-info-light)', text: 'var(--color-info-dark)' },
  message: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-dark)' },
  deal: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
  review: { bg: 'rgba(139, 92, 246, 0.1)', text: '#7c3aed' },
  customer: { bg: 'var(--surface-2)', text: 'var(--text-muted)' },
};

const HIGH_SEVERITY_REASONS = ['fraud_scam', 'fraud', 'fake_business', 'fake_product', 'counterfeit', 'fake_account', 'abusive_behavior'];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

const formatReason = (reason: string) => reason?.replace(/_/g, ' ') || '—';

export default function Reports() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [entityType, setEntityType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ action: 'dismiss' | 'warn' | 'suspend' | 'ban'; report: Report } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading } = useReports({
    page,
    limit: LIMIT,
    status: status || undefined,
    entityType: (entityType as ReportEntityType) || undefined,
  });

  const { data: stats } = useReportStats();
  const { data: reportDetail } = useReport(selected?.id ?? '');
  const reviewMutation = useReviewReport();

  const severityScore = useMemo(() => {
    if (!selected) return 0;
    let score = 0;
    if (HIGH_SEVERITY_REASONS.includes(selected.reason)) score += 2;
    if ((selected.targetSummary?.totalReports ?? 0) >= 5) score += 3;
    else if ((selected.targetSummary?.totalReports ?? 0) >= 3) score += 1;
    return score;
  }, [selected]);

  const handleReview = async () => {
    if (!confirmAction) return;
    try {
      await reviewMutation.mutateAsync({
        id: confirmAction.report.id,
        action: confirmAction.action,
        adminNotes: adminNotes || undefined,
      });
      toast.success(
        confirmAction.action === 'dismiss'
          ? 'Report dismissed'
          : `${confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1)} action taken successfully`,
      );
      setConfirmAction(null);
      setAdminNotes('');
      setSelected(null);
    } catch {
      toast.error('Failed to process report action');
    }
  };

  const columns: Column<Report>[] = [
    {
      key: 'entityType',
      header: 'Target',
      render: (row) => {
        const colors = ENTITY_COLORS[row.entityType] || ENTITY_COLORS.message;
        const isHigh = HIGH_SEVERITY_REASONS.includes(row.reason);
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              {row.targetSummary?.imageUrl ? (
                <img
                  src={row.targetSummary.imageUrl}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: colors.bg }}
                >
                  <User className="w-4.5 h-4.5" style={{ color: colors.text }} />
                </div>
              )}
              {isHigh && (
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#ef4444' }}
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {row.targetSummary?.name || row.entityId?.slice(0, 8) + '…'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-md capitalize"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {row.entityType}
                </span>
                {(row.targetSummary?.totalReports ?? 0) >= 3 && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}
                  >
                    <FileWarning className="w-2.5 h-2.5" />
                    {row.targetSummary?.totalReports}×
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => {
        const isHigh = HIGH_SEVERITY_REASONS.includes(row.reason);
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-sm capitalize leading-tight ${isHigh ? 'font-semibold' : 'font-medium'}`}
              style={{ color: isHigh ? '#dc2626' : 'var(--text-primary)' }}
            >
              {formatReason(row.reason)}
            </span>
            {row.description && (
              <span
                className="text-xs line-clamp-1 max-w-[200px]"
                style={{ color: 'var(--text-muted)' }}
              >
                &ldquo;{row.description}&rdquo;
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'reporter',
      header: 'Reported By',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            {(row.reporter?.name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="text-sm truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>
            {row.reporter?.name || row.reporter?.mobileNumber || 'Anonymous'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Filed',
      render: (row) => (
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {formatTimeAgo(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          className="p-2 rounded-lg transition-all duration-150 hover:scale-105"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); setSelected(row); }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-light)';
            (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }}
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reports & Moderation"
        description="Review and take action on user-submitted reports"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Reports' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Pending Reports"
          value={stats?.pendingCount ?? 0}
          icon={FileWarning}
          accentColor="#ef4444"
          delay={0}
        />
        <KPICard
          label="This Week"
          value={stats?.reportsThisWeek ?? 0}
          icon={TrendingUp}
          accentColor="#f59e0b"
          delay={100}
        />
        <KPICard
          label="Top Reported"
          value={stats?.topReported?.[0]?.count ?? 0}
          icon={AlertTriangle}
          accentColor="#8b5cf6"
          delay={200}
        />
        <KPICard
          label="Resolution Rate"
          value={
            stats && stats.pendingCount !== undefined && stats.reportsThisWeek
              ? `${Math.max(0, Math.round(((stats.reportsThisWeek - stats.pendingCount) / Math.max(stats.reportsThisWeek, 1)) * 100))}%`
              : '—'
          }
          icon={ShieldCheck}
          accentColor="#10b981"
          delay={300}
        />
      </div>

      {/* Filters Bar */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
      >
        {/* Status Tabs */}
        <div className="flex gap-1 p-1 rounded-lg flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150"
              style={{
                background: status === tab.value ? 'var(--surface-0)' : 'transparent',
                color: status === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: status === tab.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.label}
              {tab.value === 'pending' && stats?.pendingCount ? (
                <span
                  className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full"
                  style={{ background: '#ef4444', color: 'white' }}
                >
                  {stats.pendingCount > 99 ? '99+' : stats.pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          {/* Entity Type Filter */}
          <div className="relative">
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                color: entityType ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {ENTITY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg transition-colors"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<Report>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
      />

      {/* Report Detail Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Report Detail"
        subtitle={selected ? `${formatReason(selected.reason)} · ${selected.entityType}` : ''}
        actions={
          selected?.status === 'pending' || selected?.status === 'under_review' ? (
            <div className="flex flex-wrap gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfirmAction({ action: opt.value, report: selected! })}
                  className="group flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background:
                      opt.variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' :
                      opt.variant === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                      'var(--surface-2)',
                    color:
                      opt.variant === 'danger' ? '#dc2626' :
                      opt.variant === 'warning' ? '#d97706' :
                      'var(--text-secondary)',
                    border: `1px solid ${
                      opt.variant === 'danger' ? 'rgba(239, 68, 68, 0.2)' :
                      opt.variant === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
                      'var(--border-default)'
                    }`,
                  }}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Severity Banner */}
            {severityScore >= 3 && (
              <div
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239, 68, 68, 0.12)' }}
                >
                  <AlertTriangle className="w-4.5 h-4.5" style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>High Severity</p>
                  <p className="text-xs mt-0.5" style={{ color: '#991b1b' }}>
                    Multiple fraud reports from credible users. Immediate action recommended.
                  </p>
                </div>
              </div>
            )}

            {/* Target Entity Card */}
            {(selected.targetSummary || (reportDetail as ReportDetail)?.targetEntity) && (
              <div
                className="p-4 rounded-xl transition-colors"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Reported Target
                  </p>
                  <button
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
                    style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)' }}
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-3.5">
                  {selected.targetSummary?.imageUrl ? (
                    <img
                      src={selected.targetSummary.imageUrl}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: ENTITY_COLORS[selected.entityType]?.bg || 'var(--surface-2)' }}
                    >
                      <User className="w-6 h-6" style={{ color: ENTITY_COLORS[selected.entityType]?.text || 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {selected.targetSummary?.name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md capitalize"
                        style={{
                          background: ENTITY_COLORS[selected.entityType]?.bg,
                          color: ENTITY_COLORS[selected.entityType]?.text,
                        }}
                      >
                        {selected.entityType}
                      </span>
                      {selected.targetSummary?.status && (
                        <StatusBadge status={selected.targetSummary.status} />
                      )}
                    </div>
                  </div>
                  {(selected.targetSummary?.totalReports ?? 0) > 0 && (
                    <div
                      className="text-center px-3 py-2 rounded-xl shrink-0"
                      style={{
                        background: (selected.targetSummary?.totalReports ?? 0) >= 3 ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-2)',
                      }}
                    >
                      <p
                        className="text-2xl font-black leading-none"
                        style={{ color: (selected.targetSummary?.totalReports ?? 0) >= 3 ? '#dc2626' : 'var(--text-primary)' }}
                      >
                        {selected.targetSummary?.totalReports}
                      </p>
                      <p className="text-[9px] font-semibold uppercase mt-1" style={{ color: 'var(--text-muted)' }}>
                        reports
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Report Info Grid */}
            <div
              className="grid grid-cols-2 gap-px rounded-xl overflow-hidden"
              style={{ background: 'var(--border-default)' }}
            >
              {[
                { label: 'Reason', value: formatReason(selected.reason), highlight: HIGH_SEVERITY_REASONS.includes(selected.reason) },
                { label: 'Status', value: selected.status, isStatus: true },
                { label: 'Action Taken', value: selected.adminAction ? formatReason(selected.adminAction) : null },
                { label: 'Filed', value: formatDate(selected.createdAt) },
                { label: 'Reporter', value: selected.reporter?.name || selected.reporter?.mobileNumber },
                { label: 'Reviewed At', value: selected.reviewedAt ? formatDate(selected.reviewedAt) : null },
              ].map((field) => (
                <div key={field.label} className="p-3.5" style={{ background: 'var(--surface-0)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    {field.label}
                  </p>
                  {'isStatus' in field && field.isStatus ? (
                    <StatusBadge status={field.value || 'pending'} />
                  ) : (
                    <p
                      className="text-sm font-semibold capitalize"
                      style={{ color: ('highlight' in field && field.highlight) ? '#dc2626' : 'var(--text-primary)' }}
                    >
                      {field.value || '—'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Description */}
            {selected.description && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Reporter&apos;s Description
                </p>
                <div
                  className="relative p-4 rounded-xl"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                >
                  <div
                    className="absolute top-3 left-3 w-1 h-[calc(100%-24px)] rounded-full"
                    style={{ background: 'var(--color-primary-light)' }}
                  />
                  <p className="text-sm leading-relaxed pl-4" style={{ color: 'var(--text-secondary)' }}>
                    {selected.description}
                  </p>
                </div>
              </div>
            )}

            {/* Reporter Credibility */}
            {(reportDetail as ReportDetail)?.reporterCredibility && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Reporter Credibility
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total Filed', value: (reportDetail as ReportDetail).reporterCredibility!.totalFiled, color: 'var(--text-primary)' },
                    { label: 'Actioned', value: (reportDetail as ReportDetail).reporterCredibility!.actionCount, color: '#10b981' },
                    { label: 'Dismissed', value: (reportDetail as ReportDetail).reporterCredibility!.dismissedCount, color: '#f59e0b' },
                    {
                      label: 'Credibility',
                      value: `${((parseFloat((reportDetail as ReportDetail).reporterCredibility!.credibilityRatio || '0')) * 100).toFixed(0)}%`,
                      color: parseFloat((reportDetail as ReportDetail).reporterCredibility!.credibilityRatio || '0') >= 0.7 ? '#10b981' : '#ef4444',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center p-3 rounded-xl"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                    >
                      <p className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-[9px] font-semibold uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report History on this Target */}
            {(reportDetail as ReportDetail)?.otherReportsOnTarget && (reportDetail as ReportDetail).otherReportsOnTarget!.length > 1 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    History ({(reportDetail as ReportDetail).otherReportsOnTarget!.length} reports on this target)
                  </p>
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {(reportDetail as ReportDetail).otherReportsOnTarget!.map((r: Report) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-xl text-sm transition-colors"
                      style={{
                        background: r.id === selected.id ? 'var(--color-primary-light)' : 'var(--surface-1)',
                        border: `1px solid ${r.id === selected.id ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {r.id === selected.id && (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                        )}
                        <StatusBadge status={r.status} />
                        <span className="capitalize truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatReason(r.reason)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.adminAction && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize"
                            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                          >
                            {r.adminAction}
                          </span>
                        )}
                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          {formatTimeAgo(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes (existing) */}
            {selected.adminNotes && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Admin Notes
                </p>
                <div
                  className="p-3.5 rounded-xl"
                  style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {selected.adminNotes}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Review Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setAdminNotes(''); }}
        onConfirm={handleReview}
        title={`${confirmAction?.action ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : ''} Report`}
        description={`Are you sure you want to ${confirmAction?.action} this report against "${confirmAction?.report?.targetSummary?.name || 'this target'}"?`}
        confirmLabel={confirmAction?.action ? confirmAction.action.charAt(0).toUpperCase() + confirmAction.action.slice(1) : 'Confirm'}
        variant={confirmAction?.action === 'dismiss' ? 'default' : 'danger'}
        isLoading={reviewMutation.isPending}
      >
        <div className="space-y-4 mt-4">
          {/* Escalation hints */}
          {confirmAction?.action === 'warn' && (confirmAction.report.targetSummary?.totalReports ?? 0) >= 3 && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(245, 158, 11, 0.15)' }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: '#d97706' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                  Escalation Suggested
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#92400e' }}>
                  This target has <strong>{confirmAction.report.targetSummary?.totalReports} reports</strong>.
                  Consider escalating to <strong>Suspend</strong> for repeated violations.
                </p>
              </div>
            </div>
          )}
          {confirmAction?.action === 'suspend' && (confirmAction.report.targetSummary?.totalReports ?? 0) >= 5 && (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
              >
                <Ban className="w-4 h-4" style={{ color: '#dc2626' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#991b1b' }}>
                  Consider Permanent Ban
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#991b1b' }}>
                  With <strong>{confirmAction.report.targetSummary?.totalReports} reports</strong>,
                  a permanent <strong>Ban</strong> may be more appropriate to protect the community.
                </p>
              </div>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Admin Notes <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl transition-colors focus:outline-none"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                resize: 'none',
              }}
              rows={3}
              placeholder="Document your reasoning for this decision…"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
