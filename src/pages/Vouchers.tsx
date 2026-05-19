import { useState } from 'react';
import {
  Plus, Eye, Copy, ToggleLeft, ToggleRight, Tag, Percent, Hash, Calendar,
  Shield, Sparkles, Search, Filter, X, CheckCircle2, XCircle,
  IndianRupee, TrendingUp, Gift, Ticket,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { FormField } from '../components/ui/FormField';
import { StatCard } from '../components/ui/StatCard';
import { useVouchers, useVoucherStats, useCreateVoucher, useUpdateVoucher, useVoucherRedemptions } from '../hooks/useVouchers';
import type { Voucher, VoucherRedemption } from '../services/vouchers.service';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';

const LIMIT = 25;

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount (\u20B9)', icon: IndianRupee },
];

const APPLICABLE_TO = [
  { value: 'sponsorship', label: 'Sponsorship', emoji: '\uD83D\uDE80' },
  { value: 'lead_unlock', label: 'Lead Unlock', emoji: '\uD83D\uDD13' },
  { value: 'subscription', label: 'Subscription', emoji: '\u2B50' },
  { value: 'badge', label: 'Badge', emoji: '\uD83C\uDFC5' },
  { value: 'deal_unlock', label: 'Deal Unlock', emoji: '\uD83C\uDFAB' },
  { value: 'deal_creation', label: 'Deal Creation', emoji: '\uD83C\uDFF7\uFE0F' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const formatCurrency = (v: number | null | undefined) => {
  if (v == null) return '\u20B90';
  return `\u20B9${Number(v).toLocaleString('en-IN')}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const isExpired = (v: Voucher) => v.validUntil && new Date(v.validUntil) < new Date();
const isFullyUsed = (v: Voucher) => v.maxUses !== null && v.usedCount >= v.maxUses;

export default function Vouchers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [viewRedemptions, setViewRedemptions] = useState<string | null>(null);

  const { data, isLoading } = useVouchers({
    page,
    limit: LIMIT,
    isActive: statusFilter || undefined,
    search: search || undefined,
    discountType: discountTypeFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: stats } = useVoucherStats();
  const { data: redemptions } = useVoucherRedemptions(viewRedemptions ?? '');
  const createMutation = useCreateVoucher();
  const updateMutation = useUpdateVoucher();

  const activeFilterCount = [discountTypeFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setDiscountTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // ─── Form State ────────────────────────
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'percentage' as 'percentage' | 'fixed_amount',
    discountValue: 0, maxUses: '', maxUsesPerProvider: '', minPurchaseAmount: '',
    maxDiscountAmount: '', applicableTo: [] as string[], validFrom: '', validUntil: '',
  });

  const resetForm = () => setForm({
    code: '', description: '', discountType: 'percentage', discountValue: 0,
    maxUses: '', maxUsesPerProvider: '', minPurchaseAmount: '', maxDiscountAmount: '',
    applicableTo: [], validFrom: '', validUntil: '',
  });

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) { toast.error('Code and discount value required'); return; }
    if (!form.validFrom || !form.validUntil) { toast.error('Validity period is required'); return; }
    try {
      await createMutation.mutateAsync({
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        maxUsesPerProvider: form.maxUsesPerProvider ? Number(form.maxUsesPerProvider) : undefined,
        minPurchaseAmount: form.minPurchaseAmount ? Number(form.minPurchaseAmount) : undefined,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        applicableTo: form.applicableTo.length > 0 ? form.applicableTo : undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      });
      toast.success('Voucher created');
      setShowCreate(false);
      resetForm();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create voucher');
    }
  };

  const handleToggle = async (voucher: Voucher) => {
    try {
      await updateMutation.mutateAsync({ id: voucher.id, body: { isActive: !voucher.isActive } });
      toast.success(voucher.isActive ? 'Voucher deactivated' : 'Voucher activated');
    } catch { toast.error('Failed to update voucher'); }
  };

  const generateCode = () => {
    const prefixes = ['SAVE', 'DEAL', 'NEW', 'VIP', 'BOOST', 'PRO', 'BIZ'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    setForm({ ...form, code: `${prefix}${num}` });
  };

  // ─── Table Columns ─────────────────────
  const columns: Column<Voucher>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: v.isActive ? 'var(--color-primary-light)' : 'var(--surface-2)' }}
          >
            <Ticket className="w-4 h-4" style={{ color: v.isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{v.code}</p>
            {v.description && (
              <p className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>{v.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (v) => (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md"
          style={{
            background: v.discountType === 'percentage' ? 'var(--color-success-light)' : 'var(--color-info-light)',
            color: v.discountType === 'percentage' ? 'var(--color-success)' : 'var(--color-info)',
          }}
        >
          {v.discountType === 'percentage' ? `${v.discountValue}%` : formatCurrency(v.discountValue)}
          {v.maxDiscountAmount && v.discountType === 'percentage' && (
            <span className="text-[9px] opacity-70">(max {formatCurrency(v.maxDiscountAmount)})</span>
          )}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (v) => {
        const pct = v.maxUses ? Math.min((v.usedCount / v.maxUses) * 100, 100) : 0;
        return (
          <div className="min-w-[80px]">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {v.usedCount}{v.maxUses ? ` / ${v.maxUses}` : ''}
            </p>
            {v.maxUses && (
              <div className="w-full h-1.5 rounded-full mt-1" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 90 ? 'var(--color-danger)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-success)',
                  }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'applicableTo',
      header: 'Applies To',
      render: (v) => {
        if (!v.applicableTo?.length) return <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>All services</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {v.applicableTo.slice(0, 3).map(t => {
              const info = APPLICABLE_TO.find(a => a.value === t);
              return (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                  {info?.emoji} {info?.label || t}
                </span>
              );
            })}
            {v.applicableTo.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                +{v.applicableTo.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (v) => {
        const expired = isExpired(v);
        return (
          <div>
            <p className="text-xs" style={{ color: expired ? 'var(--color-danger)' : 'var(--text-primary)' }}>
              {v.validUntil ? formatDate(v.validUntil) : 'No expiry'}
            </p>
            {expired && <p className="text-[9px] font-bold" style={{ color: 'var(--color-danger)' }}>EXPIRED</p>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => {
        const expired = isExpired(v);
        const full = isFullyUsed(v);
        const statusColor = !v.isActive ? 'var(--text-muted)' :
          expired || full ? 'var(--color-danger)' : 'var(--color-success)';
        const statusBg = !v.isActive ? 'var(--surface-2)' :
          expired || full ? 'var(--color-danger-light)' : 'var(--color-success-light)';
        const statusLabel = !v.isActive ? 'Inactive' : expired ? 'Expired' : full ? 'Exhausted' : 'Active';
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded"
            style={{ background: statusBg, color: statusColor }}
          >
            {v.isActive && !expired && !full ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {statusLabel}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (v) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(v.code); toast.success('Code copied!'); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-muted)' }}
            title="Copy code"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setViewRedemptions(v.id); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-muted)' }}
            title="View redemptions"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(v); }}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            title={v.isActive ? 'Deactivate' : 'Activate'}
          >
            {v.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vouchers"
        description={data?.meta ? `${data.meta.total.toLocaleString()} voucher codes` : 'Manage discount codes & coupons'}
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Vouchers' },
        ]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" /> Create Voucher
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Total Vouchers"
            value={stats.totalVouchers}
            icon={<Ticket className="w-5 h-5" />}
            accent="var(--color-primary)"
          />
          <StatCard
            title="Active"
            value={stats.activeVouchers}
            icon={<CheckCircle2 className="w-5 h-5" />}
            accent="var(--color-success)"
          />
          <StatCard
            title="Total Redemptions"
            value={stats.totalRedemptions.toLocaleString()}
            icon={<TrendingUp className="w-5 h-5" />}
            accent="var(--color-info)"
          />
          <StatCard
            title="Discount Given"
            value={formatCurrency(stats.totalDiscountGiven)}
            icon={<Gift className="w-5 h-5" />}
            accent="#d97706"
          />
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
              placeholder="Search by voucher code or description\u2026"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--surface-2)]">
                <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
            {STATUS_FILTERS.map((opt) => (
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
              value={discountTypeFilter}
              onChange={(e) => { setDiscountTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm rounded-lg focus-ring"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
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
                className="px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1"
                style={{ color: 'var(--color-danger)' }}
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable<Voucher>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(v) => v.id}
        onRowClick={setSelectedVoucher}
        emptyIcon={<Ticket className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
        emptyTitle="No vouchers found"
        emptyDescription={search || statusFilter || activeFilterCount > 0 ? 'Try adjusting your search or filters' : 'Create your first voucher to get started'}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* VOUCHER DETAIL PANEL                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title="Voucher Details"
        subtitle={selectedVoucher?.code}
        width="lg"
      >
        {selectedVoucher && (
          <div className="space-y-6">
            {/* Code + Status Banner */}
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                background: selectedVoucher.isActive ? 'var(--color-success-light)' : 'var(--surface-2)',
                border: `1px solid ${selectedVoucher.isActive ? 'var(--color-success)' : 'var(--border-default)'}20`,
              }}
            >
              <div>
                <p className="text-2xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>{selectedVoucher.code}</p>
                {selectedVoucher.description && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{selectedVoucher.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: selectedVoucher.discountType === 'percentage' ? 'var(--color-success)' : 'var(--color-info)' }}>
                  {selectedVoucher.discountType === 'percentage' ? `${selectedVoucher.discountValue}% OFF` : `${formatCurrency(selectedVoucher.discountValue)} OFF`}
                </p>
                <p className="text-[10px] font-medium" style={{ color: selectedVoucher.isActive ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {selectedVoucher.isActive ? 'ACTIVE' : 'INACTIVE'}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Discount Type" value={selectedVoucher.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'} />
              <DetailCell label="Min Purchase" value={selectedVoucher.minPurchaseAmount ? formatCurrency(selectedVoucher.minPurchaseAmount) : 'None'} />
              <DetailCell label="Max Discount Cap" value={selectedVoucher.maxDiscountAmount ? formatCurrency(selectedVoucher.maxDiscountAmount) : 'No cap'} />
              <DetailCell label="Used / Max" value={`${selectedVoucher.usedCount}${selectedVoucher.maxUses ? ` / ${selectedVoucher.maxUses}` : ' (unlimited)'}`} />
              <DetailCell label="Per Provider Limit" value={selectedVoucher.maxUsesPerProvider ? String(selectedVoucher.maxUsesPerProvider) : 'Unlimited'} />
              <DetailCell label="Created" value={formatDate(selectedVoucher.createdAt)} />
            </div>

            {/* Validity */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Validity Period</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>From</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedVoucher.validFrom ? formatDate(selectedVoucher.validFrom) : '\u2014'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold" style={{
                  background: isExpired(selectedVoucher) ? 'var(--color-danger-light)' : 'var(--color-success-light)',
                  color: isExpired(selectedVoucher) ? 'var(--color-danger)' : 'var(--color-success)',
                }}>
                  {isExpired(selectedVoucher) ? 'EXPIRED' : 'VALID'}
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Until</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedVoucher.validUntil ? formatDate(selectedVoucher.validUntil) : '\u2014'}
                  </p>
                </div>
              </div>
            </div>

            {/* Applicable To */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Applicable To</p>
              <div className="flex flex-wrap gap-2">
                {selectedVoucher.applicableTo?.length ? selectedVoucher.applicableTo.map(t => {
                  const info = APPLICABLE_TO.find(a => a.value === t);
                  return (
                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                      {info?.emoji} {info?.label || t}
                    </span>
                  );
                }) : (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>All services (no restriction)</span>
                )}
              </div>
            </div>

            {/* Toggle Action */}
            <button
              onClick={() => { handleToggle(selectedVoucher); setSelectedVoucher(null); }}
              className="w-full p-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{
                background: selectedVoucher.isActive ? 'var(--color-danger-light)' : 'var(--color-success-light)',
                color: selectedVoucher.isActive ? 'var(--color-danger)' : 'var(--color-success)',
                border: `1px solid ${selectedVoucher.isActive ? 'var(--color-danger)' : 'var(--color-success)'}20`,
              }}
            >
              {selectedVoucher.isActive ? <><XCircle className="w-4 h-4" /> Deactivate Voucher</> : <><CheckCircle2 className="w-4 h-4" /> Activate Voucher</>}
            </button>
          </div>
        )}
      </DetailPanel>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CREATE VOUCHER PANEL                               */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title="Create Voucher"
        subtitle="Configure a new discount code"
        width="lg"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreate(false); resetForm(); }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {createMutation.isPending ? 'Creating\u2026' : 'Create Voucher'}
            </button>
          </div>
        }
      >
        <div className="p-5 space-y-6">
          {/* Code & Description */}
          <div className="space-y-4">
            <SectionHeader icon={<Tag size={14} className="text-indigo-500" />} label="Code & Description" />
            <FormField label="Voucher Code" required>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME20"
                  className="input flex-1 font-mono uppercase tracking-wider"
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                  title="Auto-generate code"
                >
                  <Sparkles size={14} />
                </button>
              </div>
            </FormField>
            <FormField label="Description">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Welcome discount for new providers"
                className="input w-full"
              />
            </FormField>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Discount */}
          <div className="space-y-4">
            <SectionHeader icon={<Percent size={14} className="text-emerald-500" />} label="Discount" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type" required>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1.5px solid var(--border-default)' }}>
                  {DISCOUNT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, discountType: t.value as 'percentage' | 'fixed_amount' })}
                      className="flex-1 py-2.5 px-3 text-xs font-medium transition-all flex items-center justify-center gap-1"
                      style={{
                        background: form.discountType === t.value ? 'var(--color-primary)' : 'transparent',
                        color: form.discountType === t.value ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      <t.icon className="w-3 h-3" /> {t.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Value" required>
                <div className="relative">
                  <input
                    type="number"
                    value={form.discountValue || ''}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="input w-full pr-8"
                    placeholder="0"
                    min={0}
                    max={form.discountType === 'percentage' ? 100 : undefined}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    {form.discountType === 'percentage' ? '%' : '\u20B9'}
                  </span>
                </div>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Purchase Amount">
                <div className="relative">
                  <input type="number" value={form.minPurchaseAmount} onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })} className="input w-full pl-6" placeholder="No minimum" min={0} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>\u20B9</span>
                </div>
              </FormField>
              <FormField label="Max Discount Cap">
                <div className="relative">
                  <input type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className="input w-full pl-6" placeholder="No cap" min={0} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>\u20B9</span>
                </div>
              </FormField>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Usage Limits */}
          <div className="space-y-4">
            <SectionHeader icon={<Hash size={14} className="text-amber-500" />} label="Usage Limits" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Total Uses">
                <input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className="input w-full" min={1} />
              </FormField>
              <FormField label="Per Provider">
                <input type="number" value={form.maxUsesPerProvider} onChange={(e) => setForm({ ...form, maxUsesPerProvider: e.target.value })} placeholder="Unlimited" className="input w-full" min={1} />
              </FormField>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Applicable To */}
          <div className="space-y-3">
            <SectionHeader icon={<Shield size={14} className="text-violet-500" />} label="Applicable To" />
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Select which services this voucher applies to. Leave empty for all.</p>
            <div className="flex flex-wrap gap-2">
              {APPLICABLE_TO.map((t) => {
                const isSelected = form.applicableTo.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      applicableTo: isSelected
                        ? form.applicableTo.filter((x) => x !== t.value)
                        : [...form.applicableTo, t.value],
                    })}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{
                      background: isSelected ? 'var(--color-primary-light)' : 'var(--surface-2)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-default)'}`,
                    }}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-default)' }} />

          {/* Validity Period */}
          <div className="space-y-4">
            <SectionHeader icon={<Calendar size={14} className="text-teal-500" />} label="Validity Period" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" required>
                <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className="input w-full" />
              </FormField>
              <FormField label="End Date" required>
                <input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="input w-full" />
              </FormField>
            </div>
          </div>

          {/* Live Preview */}
          {form.code && form.discountValue > 0 && (
            <>
              <hr style={{ borderColor: 'var(--border-default)' }} />
              <div
                className="rounded-xl p-4 border-2 border-dashed"
                style={{ borderColor: 'var(--color-primary)30', background: 'var(--color-primary-light)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Live Preview</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-black text-lg" style={{ color: 'var(--text-primary)' }}>{form.code}</span>
                    {form.description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{form.description}</p>}
                    {form.applicableTo.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {form.applicableTo.map(t => {
                          const info = APPLICABLE_TO.find(a => a.value === t);
                          return <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-0)', color: 'var(--text-secondary)' }}>{info?.emoji} {info?.label}</span>;
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                    {form.discountType === 'percentage' ? `${form.discountValue}%` : formatCurrency(form.discountValue)}
                  </span>
                </div>
                {form.maxUses && (
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Limited to {form.maxUses} total uses{form.maxUsesPerProvider ? `, ${form.maxUsesPerProvider} per provider` : ''}</p>
                )}
              </div>
            </>
          )}
        </div>
      </DetailPanel>

      {/* ═══════════════════════════════════════════════════ */}
      {/* REDEMPTIONS PANEL                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <DetailPanel
        open={!!viewRedemptions}
        onClose={() => setViewRedemptions(null)}
        title="Redemption History"
        subtitle="Who used this voucher"
      >
        <div className="p-4 space-y-2">
          {redemptions?.length ? redemptions.map((r: VoucherRedemption) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-success-light)' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {r.provider?.brandName ?? r.providerId?.slice(0, 8)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.redeemedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>
                -{formatCurrency(r.discountAmount)}
              </span>
            </div>
          )) : (
            <div className="text-center py-8">
              <Gift className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No redemptions yet</p>
            </div>
          )}
        </div>
      </DetailPanel>
    </div>
  );
}

// ─── Helper Components ───────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
      {icon} {label}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
