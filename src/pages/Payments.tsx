import { useState } from 'react';
import {
  CreditCard, ExternalLink, TrendingUp,
  IndianRupee, ArrowUpRight, ArrowDownRight, Receipt, Clock,
  CheckCircle2, XCircle, RefreshCw, Zap, Eye, Copy,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { FilterBar, useUrlFilters } from '../components/ui/filters';
import { PAYMENT_FILTER_DEFS, PAYMENT_FILTER_KEYS, PAYMENT_SORTS, paymentSegments, withOptions } from '../components/payments/payment-filters';
import { usePayments, usePaymentFilterOptions, useRevenueStats } from '../hooks/usePayments';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Payment, PaymentFilters } from '../services/payments.service';

const LIMIT = 25;

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
  const { values: filters, page, search, sort, update, replace, setSearch, setSort, setPage, hasNarrowing } = useUrlFilters(PAYMENT_FILTER_KEYS);
  const [selected, setSelected] = useState<Payment | null>(null);

  const { data, isLoading } = usePayments({
    ...(filters as PaymentFilters),
    sort: (sort || undefined) as PaymentFilters['sort'],
    page,
    limit: LIMIT,
    search: search || undefined,
  });
  const { data: filterOptions } = usePaymentFilterOptions();
  const { data: stats } = useRevenueStats();

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
        description={
          data?.meta
            ? hasNarrowing && filterOptions
              ? `${data.meta.total.toLocaleString()} of ${filterOptions.counts.total.toLocaleString()} transactions match your filters`
              : `${data.meta.total.toLocaleString()} transactions`
            : 'Payment transactions & revenue'
        }
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

      <FilterBar
        defs={withOptions(PAYMENT_FILTER_DEFS, filterOptions)}
        values={filters}
        onChange={update}
        onReplace={replace}
        search={{ value: search, onChange: setSearch, placeholder: 'Search by provider, payment ID or order ID…' }}
        sort={{ options: PAYMENT_SORTS, value: sort, onChange: setSort, defaultLabel: 'Sort: newest first' }}
        segments={paymentSegments(filterOptions)}
        resultCount={hasNarrowing ? data?.meta?.total : undefined}
        totalCount={filterOptions?.counts.total}
      />

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
        emptyTitle={hasNarrowing ? 'No payments match these filters' : 'No payments yet'}
        emptyDescription={hasNarrowing ? 'Remove a filter or pick a different segment above.' : 'No payment transactions yet'}
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
