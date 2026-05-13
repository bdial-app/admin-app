import { useState, useMemo } from 'react';
import {
  CreditCard, ExternalLink, Search, Filter, Calendar, X, TrendingUp,
  IndianRupee, ArrowUpRight, ArrowDownRight, Receipt, Wallet, Clock,
  CheckCircle2, XCircle, RefreshCw, Zap, ShieldCheck, Eye, Copy,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { usePayments, useRevenueStats } from '../hooks/usePayments';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Payment } from '../services/payments.service';

const LIMIT = 25;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'lead_unlock', label: 'Lead Unlock' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'badge', label: 'Badge' },
  { value: 'deal_unlock', label: 'Deal Unlock' },
  { value: 'deal_creation', label: 'Deal Creation' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const GATEWAY_OPTIONS = [
  { value: '', label: 'All Gateways' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'apple', label: 'Apple IAP' },
];

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  succeeded: CheckCircle2,
  pending: Clock,
  processing: RefreshCw,
  failed: XCircle,
  refunded: ArrowDownRight,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  sponsorship: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)', emoji: '🚀' },
  lead_unlock: { bg: 'var(--color-info-light)', text: 'var(--color-info)', emoji: '🔓' },
  subscription: { bg: 'var(--color-success-light)', text: 'var(--color-success)', emoji: '⭐' },
  badge: { bg: '#fef3c7', text: '#d97706', emoji: '🏅' },
  deal_unlock: { bg: '#ede9fe', text: '#7c3aed', emoji: '🎫' },
  deal_creation: { bg: '#fce7f3', text: '#db2777', emoji: '🏷️' },
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

export default function Payments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);

  const { data, isLoading } = usePayments({
    page,
    limit: LIMIT,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    gateway: gatewayFilter || undefined,
  });

  const { data: stats } = useRevenueStats();

  const activeFilterCount = [typeFilter, statusFilter, gatewayFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setGatewayFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const columns: Column<Payment>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (p) => (
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(p.createdAt)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(p.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {p.provider?.brandName || '—'}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
            {p.providerId?.slice(0, 8)}…
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => {
        const info = TYPE_COLORS[p.type] || TYPE_COLORS.sponsorship;
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize"
            style={{ background: info.bg, color: info.text }}
          >
            <span>{info.emoji}</span>
            {p.type?.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (p) => (
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(p.amount)}
          </p>
          {p.discountAmount > 0 && (
            <p className="text-[10px] font-medium" style={{ color: 'var(--color-success)' }}>
              -{formatCurrency(p.discountAmount)} discount
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (p) => (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded capitalize"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          {p.paymentGateway === 'apple' ? '🍎' : '💳'} {p.paymentGateway || 'razorpay'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const Icon = STATUS_ICONS[p.status] || Clock;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" style={{
              color: p.status === 'succeeded' ? 'var(--color-success)' :
                p.status === 'failed' ? 'var(--color-danger)' :
                p.status === 'refunded' ? 'var(--color-warning)' : 'var(--text-muted)',
            }} />
            <StatusBadge status={p.status} />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.receiptUrl && (
            <a
              href={p.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--color-primary)' }}
              title="View receipt"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-muted)' }}
            onClick={(e) => { e.stopPropagation(); setSelected(p); }}
            title="View details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description={data?.meta ? `${data.meta.total.toLocaleString()} transactions` : 'Payment transactions & revenue'}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Payments' },
        ]}
      />

      {/* Revenue Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<IndianRupee className="w-5 h-5" />}
            accent="var(--color-success)"
          />
          <StatCard
            title="Transactions"
            value={stats.totalTransactions.toLocaleString()}
            icon={<Receipt className="w-5 h-5" />}
            accent="var(--color-primary)"
          />
          <StatCard
            title="MRR"
            value={formatCurrency(stats.mrr)}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="var(--color-info)"
          />
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            icon={<Zap className="w-5 h-5" />}
            accent="#d97706"
          />
        </div>
      )}

      {/* Revenue Breakdown */}
      {stats?.breakdown && stats.breakdown.length > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          {stats.breakdown.map((b) => {
            const info = TYPE_COLORS[b.type] || TYPE_COLORS.sponsorship;
            return (
              <div
                key={b.type}
                className="p-3 rounded-xl text-center"
                style={{ background: info.bg, border: `1px solid ${info.text}20` }}
              >
                <p className="text-lg">{info.emoji}</p>
                <p className="text-sm font-bold mt-1" style={{ color: info.text }}>
                  {formatCurrency(Number(b.totalRevenue))}
                </p>
                <p className="text-[10px] font-medium capitalize" style={{ color: info.text }}>
                  {b.type?.replace(/_/g, ' ')}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {Number(b.count).toLocaleString()} txns
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by provider name, payment ID, or order ID…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Quick Status Pills */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {STATUS_OPTIONS.slice(0, 4).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  background: statusFilter === opt.value ? 'var(--surface-0)' : 'transparent',
                  color: statusFilter === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: statusFilter === opt.value ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
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
            className="flex flex-wrap items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
          >
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={gatewayFilter}
              onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {GATEWAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors"
                style={{ color: 'var(--color-danger)' }}
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable<Payment>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(p) => p.id}
        onRowClick={setSelected}
        emptyIcon={<CreditCard className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle="No payments found"
        emptyDescription={search || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'No payment transactions yet'}
      />

      {/* Payment Detail Panel */}
      <DetailPanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Payment Details"
        subtitle={selected ? `${formatCurrency(selected.amount)} • ${selected.type?.replace(/_/g, ' ')}` : undefined}
        width="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{
                background: selected.status === 'succeeded' ? 'var(--color-success-light)' :
                  selected.status === 'failed' ? 'var(--color-danger-light)' :
                  selected.status === 'refunded' ? 'var(--color-warning-light)' : 'var(--surface-2)',
                border: `1px solid ${
                  selected.status === 'succeeded' ? 'var(--color-success)' :
                  selected.status === 'failed' ? 'var(--color-danger)' :
                  selected.status === 'refunded' ? 'var(--color-warning)' : 'var(--border-default)'
                }20`,
              }}
            >
              {(() => {
                const Icon = STATUS_ICONS[selected.status] || Clock;
                return <Icon className="w-6 h-6" style={{
                  color: selected.status === 'succeeded' ? 'var(--color-success)' :
                    selected.status === 'failed' ? 'var(--color-danger)' :
                    selected.status === 'refunded' ? 'var(--color-warning)' : 'var(--text-muted)',
                }} />;
              })()}
              <div>
                <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                  Payment {selected.status}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDateTime(selected.createdAt)}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(selected.amount)}
                </p>
                {selected.discountAmount > 0 && (
                  <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                    Discount: -{formatCurrency(selected.discountAmount)}
                  </p>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Provider</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selected.provider?.brandName || '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Type</p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded capitalize"
                  style={{ background: (TYPE_COLORS[selected.type] || TYPE_COLORS.sponsorship).bg, color: (TYPE_COLORS[selected.type] || TYPE_COLORS.sponsorship).text }}
                >
                  {(TYPE_COLORS[selected.type] || TYPE_COLORS.sponsorship).emoji} {selected.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Gateway</p>
                <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                  {selected.paymentGateway === 'apple' ? '🍎 Apple IAP' : '💳 Razorpay'}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Currency</p>
                <p className="text-sm font-medium uppercase" style={{ color: 'var(--text-primary)' }}>
                  {selected.currency || 'INR'}
                </p>
              </div>
            </div>

            {/* Gateway IDs */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Transaction IDs</p>
              {[
                { label: 'Payment ID', value: selected.gatewayPaymentId },
                { label: 'Order ID', value: selected.gatewayOrderId },
                { label: 'Internal ID', value: selected.id },
                { label: 'Provider ID', value: selected.providerId },
                ...(selected.voucherId ? [{ label: 'Voucher ID', value: selected.voucherId }] : []),
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-2.5 rounded-lg"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                      {row.value || '—'}
                    </p>
                  </div>
                  {row.value && (
                    <button
                      onClick={() => copyToClipboard(row.value!)}
                      className="p-1.5 rounded-md flex-shrink-0 transition-colors hover:bg-[var(--surface-2)]"
                      style={{ color: 'var(--text-muted)' }}
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Metadata */}
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Metadata</p>
                <pre
                  className="text-xs p-3 rounded-lg overflow-x-auto font-mono"
                  style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                >
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Receipt Link */}
            {selected.receiptUrl && (
              <a
                href={selected.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg transition-colors"
                style={{ background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)20', color: 'var(--color-primary)' }}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">View Payment Receipt</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto" />
              </a>
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
