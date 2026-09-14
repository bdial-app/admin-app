import { useState, useMemo, useEffect } from 'react';
import {
  Megaphone, Eye, DollarSign, MousePointerClick, BarChart3, Check, X, Search, TrendingUp, Clock,
  MapPin, Target, Activity, AlertTriangle, Plus, Gift, Pause, Play, Trash2, Power, PowerOff,
  ShieldCheck, Wallet, Star, Building2, Loader2, Info,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { StatCard } from '../components/ui/StatCard';
import { FormField } from '../components/ui/FormField';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  useSponsoredListings, useSponsoredStats, useUpdateSponsored, usePendingSponsorships, useApproveSponsorship,
  useRejectSponsorship, useSponsorshipAnalytics, useCreateSponsored, useStopSponsored, useResumeSponsored,
  useTopUpSponsored, useDeleteSponsored, useBulkSponsored, useStopAllSponsored, useSponsorshipEligibleProviders,
} from '../hooks/useSponsored';
import { useFeatureFlags, useUpdateFeatureFlags } from '../hooks/useFeatureFlags';
import { useFlatCategories } from '../hooks/useCategories';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type {
  SponsoredListing, SponsoredType, ApprovalStatus, SponsoredBillingMode, AdminCreateSponsorshipPayload,
  AdminUpdateSponsorshipPayload, SponsorshipEligibleProvider, BulkSponsorshipAction, Category,
} from '../types';

const LIMIT = 10;

const TYPE_TABS = [
  { label: 'All', value: '' },
  { label: 'Carousel', value: 'carousel' },
  { label: 'Inline', value: 'inline' },
  { label: 'Top Result', value: 'top_result' },
];

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Running', value: 'true' },
  { label: 'Stopped', value: 'false' },
];

const APPROVAL_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const SOURCE_TABS = [
  { label: 'All sources', value: '' },
  { label: 'Admin granted', value: 'admin_granted' },
  { label: 'Provider paid', value: 'provider_paid' },
];

const PLACEMENT_OPTIONS: { value: SponsoredType; label: string; hint: string }[] = [
  { value: 'carousel', label: 'Carousel', hint: 'Home & explore "Sponsored" carousel' },
  { value: 'inline', label: 'Inline', hint: 'Mixed into category / search feeds' },
  { value: 'top_result', label: 'Top Result', hint: 'Pinned above search results' },
];

const DURATION_PRESETS = [7, 14, 30, 60, 90];

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2';
const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' } as const;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().split('T')[0] : '');
const addDays = (from: Date, days: number) => new Date(from.getTime() + days * 86400000);

function getOperationalStatus(listing: SponsoredListing): { label: string; color: string; bg: string } {
  if (listing.approvalStatus === 'rejected') return { label: 'Rejected', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' };
  if (listing.approvalStatus === 'pending_approval') return { label: 'Pending', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' };
  const now = new Date();
  if (new Date(listing.endsAt) <= now) return { label: 'Expired', color: 'var(--text-muted)', bg: 'var(--surface-2)' };
  if (!listing.isActive) return { label: 'Stopped', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' };
  if (listing.billingMode === 'paid' && Number(listing.spentAmount) >= Number(listing.budgetAmount)) return { label: 'Budget Exhausted', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)' };
  if (new Date(listing.startsAt) > now) return { label: 'Scheduled', color: 'var(--color-info)', bg: 'var(--surface-2)' };
  return { label: 'Live', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)' };
}

type DetailTab = 'overview' | 'performance' | 'settings';

interface CreateForm {
  provider: SponsorshipEligibleProvider | null;
  type: SponsoredType;
  billingMode: SponsoredBillingMode;
  budgetAmount: string;
  costPerClick: string;
  costPerImpression: string;
  startsAt: string;
  endsAt: string;
  targetCities: string;
  targetRadius: string;
  targetCategoryIds: string[];
  priority: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  internalNote: string;
  notifyProvider: boolean;
  recordPayment: boolean;
  paymentAmount: string;
  paymentReference: string;
}

const emptyCreateForm = (): CreateForm => ({
  provider: null,
  type: 'carousel',
  billingMode: 'free',
  budgetAmount: '1000',
  costPerClick: '',
  costPerImpression: '',
  startsAt: toDateInput(new Date().toISOString()),
  endsAt: toDateInput(addDays(new Date(), 30).toISOString()),
  targetCities: '',
  targetRadius: '',
  targetCategoryIds: [],
  priority: '0',
  isActive: true,
  approvalStatus: 'approved',
  internalNote: '',
  notifyProvider: true,
  recordPayment: false,
  paymentAmount: '',
  paymentReference: '',
});

export default function Sponsorships() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Track the open row by id and resolve it from the live list, so the panel
  // reflects mutations without an effect. The snapshot covers rows that drop
  // off the current page.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SponsoredListing | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [editForm, setEditForm] = useState<AdminUpdateSponsorshipPayload>({});
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' | 'stop' | 'delete' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<BulkSponsorshipAction | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm());
  const [providerSearch, setProviderSearch] = useState('');
  const [debouncedProviderSearch, setDebouncedProviderSearch] = useState('');
  const [topUp, setTopUp] = useState<{ amount: string; extendDays: string; recordPayment: boolean; reference: string } | null>(null);
  const [killSwitch, setKillSwitch] = useState<{ disableFlag: boolean; reason: string } | null>(null);
  const [confirmFlagOff, setConfirmFlagOff] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedProviderSearch(providerSearch.trim()), 250);
    return () => clearTimeout(t);
  }, [providerSearch]);

  const { data, isLoading } = useSponsoredListings({
    page, limit: LIMIT,
    type: type || undefined,
    isActive: isActive || undefined,
    approvalStatus: approvalFilter || undefined,
    source: sourceFilter || undefined,
    search: debouncedSearch || undefined,
  });
  const { data: stats } = useSponsoredStats();
  const { data: pendingList } = usePendingSponsorships();
  const { data: flags } = useFeatureFlags();
  const { data: categoryOptions } = useFlatCategories();
  const { data: eligibleProviders, isLoading: loadingProviders } = useSponsorshipEligibleProviders(debouncedProviderSearch, showCreate);
  const updateFlags = useUpdateFeatureFlags();
  const updateMutation = useUpdateSponsored();
  const createMutation = useCreateSponsored();
  const stopMutation = useStopSponsored();
  const resumeMutation = useResumeSponsored();
  const topUpMutation = useTopUpSponsored();
  const deleteMutation = useDeleteSponsored();
  const bulkMutation = useBulkSponsored();
  const stopAllMutation = useStopAllSponsored();
  const approveMutation = useApproveSponsorship();
  const rejectMutation = useRejectSponsorship();

  const sponsorshipsEnabled = flags?.find((f) => f.key === 'sponsorships_enabled')?.value === 'true';

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const selected = useMemo<SponsoredListing | null>(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? selectedSnapshot : null),
    [items, selectedId, selectedSnapshot],
  );
  const setSelected = (listing: SponsoredListing | null) => {
    setSelectedId(listing?.id ?? null);
    setSelectedSnapshot(listing);
  };
  const { data: analyticsData } = useSponsorshipAnalytics(selected?.id ?? '', analyticsPeriod);

  const avgCtr = stats && stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : '0';

  const openDetail = (listing: SponsoredListing) => {
    setSelected(listing);
    setDetailTab('overview');
    setAnalyticsPeriod('7d');
    setTopUp(null);
  };

  const openEdit = (listing: SponsoredListing) => {
    setEditForm({
      type: listing.type,
      billingMode: listing.billingMode,
      isActive: listing.isActive,
      budgetAmount: Number(listing.budgetAmount),
      costPerClick: Number(listing.costPerClick),
      costPerImpression: Number(listing.costPerImpression),
      startsAt: listing.startsAt,
      endsAt: listing.endsAt,
      targetCities: listing.targetCities ?? [],
      targetRadius: listing.targetRadius ?? undefined,
      targetCategoryIds: listing.targetCategoryIds ?? [],
      priority: listing.priority ?? 0,
      approvalStatus: listing.approvalStatus,
      internalNote: listing.internalNote ?? '',
    });
    setDetailTab('settings');
    setSelected(listing);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const body: AdminUpdateSponsorshipPayload = { ...editForm };
    if (body.targetCities && body.targetCities.length === 0) body.targetCities = [];
    if (body.targetRadius === undefined || Number.isNaN(body.targetRadius)) delete body.targetRadius;
    try {
      await updateMutation.mutateAsync({ id: selected.id, body });
      toast.success('Sponsorship updated');
      setSelected(null);
    } catch { /* toast from hook */ }
  };

  const setSponsorshipsFlag = (on: boolean) =>
    updateFlags.mutate([{ key: 'sponsorships_enabled', value: on ? 'true' : 'false' }]);

  // Turning boosts ON is harmless. Turning them OFF goes dark on paying
  // customers mid-window, so that direction asks first.
  const toggleSponsorshipsFlag = () => {
    if (sponsorshipsEnabled) setConfirmFlagOff(true);
    else setSponsorshipsFlag(true);
  };

  const submitCreate = async () => {
    const f = createForm;
    if (!f.provider) { toast.error('Pick a provider first'); return; }
    if (!f.startsAt || !f.endsAt) { toast.error('Start and end dates are required'); return; }
    if (new Date(f.endsAt) <= new Date(f.startsAt)) { toast.error('End date must be after start date'); return; }
    if (f.billingMode === 'paid' && !(Number(f.budgetAmount) > 0)) { toast.error('Paid placements need a budget above 0'); return; }

    const payload: AdminCreateSponsorshipPayload = {
      providerId: f.provider.id,
      type: f.type,
      billingMode: f.billingMode,
      startsAt: new Date(f.startsAt).toISOString(),
      endsAt: new Date(`${f.endsAt}T23:59:59`).toISOString(),
      priority: Number(f.priority) || 0,
      isActive: f.isActive,
      approvalStatus: f.approvalStatus,
      notifyProvider: f.notifyProvider,
    };
    if (f.billingMode === 'paid') {
      payload.budgetAmount = Number(f.budgetAmount);
      if (f.costPerClick !== '') payload.costPerClick = Number(f.costPerClick);
      if (f.costPerImpression !== '') payload.costPerImpression = Number(f.costPerImpression);
      if (f.recordPayment) {
        payload.recordPayment = true;
        payload.paymentAmount = f.paymentAmount !== '' ? Number(f.paymentAmount) : Number(f.budgetAmount);
        if (f.paymentReference.trim()) payload.paymentReference = f.paymentReference.trim();
      }
    }
    const cities = f.targetCities.split(',').map((c) => c.trim()).filter(Boolean);
    if (cities.length) payload.targetCities = cities;
    if (f.targetRadius !== '' && Number(f.targetRadius) > 0) payload.targetRadius = Number(f.targetRadius);
    if (f.targetCategoryIds.length) payload.targetCategoryIds = f.targetCategoryIds;
    if (f.internalNote.trim()) payload.internalNote = f.internalNote.trim();

    try {
      await createMutation.mutateAsync(payload);
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
      setProviderSearch('');
    } catch { /* toast from hook */ }
  };

  const submitTopUp = async () => {
    if (!selected || !topUp) return;
    const amount = Number(topUp.amount);
    if (!(amount > 0)) { toast.error('Enter an amount above 0'); return; }
    try {
      await topUpMutation.mutateAsync({
        id: selected.id,
        body: {
          amount,
          extendDays: topUp.extendDays !== '' ? Number(topUp.extendDays) : undefined,
          recordPayment: topUp.recordPayment,
          paymentReference: topUp.reference.trim() || undefined,
        },
      });
      setTopUp(null);
    } catch { /* toast from hook */ }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { id, action } = confirmAction;
    try {
      if (action === 'approve') await approveMutation.mutateAsync({ id });
      else if (action === 'reject') await rejectMutation.mutateAsync({ id, notes: actionNotes });
      else if (action === 'stop') await stopMutation.mutateAsync({ id, reason: actionNotes || undefined });
      else if (action === 'delete') { await deleteMutation.mutateAsync(id); if (selected?.id === id) setSelected(null); }
    } catch { /* toast from hook */ }
    setConfirmAction(null);
    setActionNotes('');
  };

  const runBulk = async () => {
    if (!bulkConfirm) return;
    try {
      await bulkMutation.mutateAsync({ ids: Array.from(selectedIds), action: bulkConfirm, reason: actionNotes || undefined });
      setSelectedIds(new Set());
    } catch { /* toast from hook */ }
    setBulkConfirm(null);
    setActionNotes('');
  };

  const getCtr = (clicks: number, impressions: number) =>
    impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0%';

  const categoryName = (id: string) => categoryOptions.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  const columns: Column<SponsoredListing>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: row.billingMode === 'free' ? 'var(--color-success-light)' : 'var(--color-primary-light)', color: row.billingMode === 'free' ? 'var(--color-success-dark)' : 'var(--color-primary)' }}>
            {row.billingMode === 'free' ? <Gift className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {row.provider?.brandName || row.providerId.slice(0, 8)}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{row.type.replace('_', ' ')}</span>
              {row.source === 'admin_granted' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>Admin</span>
              )}
              {row.billingMode === 'free' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}>Free</span>
              )}
              {row.priority > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-0.5" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}><Star className="w-2.5 h-2.5" />{row.priority}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget / Spent',
      render: (row) => {
        if (row.billingMode === 'free') {
          return <span className="text-xs font-medium" style={{ color: 'var(--color-success-dark)' }}>Complimentary · no spend</span>;
        }
        const pct = Number(row.budgetAmount) > 0 ? (Number(row.spentAmount) / Number(row.budgetAmount)) * 100 : 0;
        return (
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(row.spentAmount)} / {formatCurrency(row.budgetAmount)}
            </p>
            <div className="w-full h-1.5 mt-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'performance',
      header: 'Impressions / Clicks',
      render: (row) => (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {row.impressions.toLocaleString()} / {row.clicks.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>CTR: {getCtr(row.clicks, row.impressions)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const status = getOperationalStatus(row);
        return (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Period',
      render: (row) => {
        const daysLeft = Math.max(0, Math.ceil((new Date(row.endsAt).getTime() - Date.now()) / 86400000));
        return (
          <div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
            </span>
            {row.isActive && daysLeft > 0 && new Date(row.endsAt) > new Date() && (
              <p className="text-[10px] font-medium mt-0.5" style={{ color: daysLeft <= 3 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {daysLeft}d remaining
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (row) => {
        const expired = new Date(row.endsAt) <= new Date();
        return (
          <div className="flex items-center gap-1">
            {row.approvalStatus === 'pending_approval' && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'approve' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-success)' }} title="Approve"><Check className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'reject' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-danger)' }} title="Reject"><X className="w-4 h-4" /></button>
              </>
            )}
            {row.isActive ? (
              <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'stop' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-warning)' }} title="Stop"><Pause className="w-4 h-4" /></button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); resumeMutation.mutate(row.id); }}
                disabled={expired || row.approvalStatus === 'rejected'}
                className="p-1.5 rounded-lg hover:opacity-80 disabled:opacity-30"
                style={{ color: 'var(--color-success)' }}
                title={expired ? 'Expired — extend end date first' : 'Resume'}
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); openDetail(row); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="View"><Eye className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Edit"><BarChart3 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ id: row.id, action: 'delete' }); }} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--color-danger)' }} title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        );
      },
    },
  ];

  const tabGroup = (tabs: { label: string; value: string }[], current: string, onPick: (v: string) => void) => (
    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
      {tabs.map((tab) => (
        <button key={tab.value} onClick={() => { onPick(tab.value); setPage(1); }} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap" style={{
          background: current === tab.value ? 'var(--surface-0)' : 'transparent',
          color: current === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: current === tab.value ? 'var(--shadow-sm)' : 'none',
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );

  const selectedRows = items.filter((i) => selectedIds.has(i.id));
  const anySelectedRunning = selectedRows.some((r) => r.isActive);
  const anySelectedStopped = selectedRows.some((r) => !r.isActive);
  const anySelectedPending = selectedRows.some((r) => r.approvalStatus === 'pending_approval');

  return (
    <div>
      <PageHeader
        title="Sponsored Listings"
        description="Place, pause and manage promotional placements for any business — complimentary or paid"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Sponsorships' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setKillSwitch({ disableFlag: true, reason: '' })}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border"
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', background: 'transparent' }}
              title="Stop every running sponsorship"
            >
              <PowerOff className="w-4 h-4" /> Stop All
            </button>
            <button onClick={() => { setCreateForm(emptyCreateForm()); setShowCreate(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}>
              <Plus className="w-4 h-4" /> Add Sponsor
            </button>
          </div>
        }
      />

      {/* Platform kill switch */}
      {flags && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 mb-6 rounded-xl border" style={{
          background: sponsorshipsEnabled ? 'var(--color-success-light)' : 'var(--color-warning-light)',
          borderColor: sponsorshipsEnabled ? 'var(--color-success)' : 'var(--color-warning)',
        }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-0)', color: sponsorshipsEnabled ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
              {sponsorshipsEnabled ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: sponsorshipsEnabled ? 'var(--color-success-dark)' : 'var(--color-warning-dark)' }}>
                Sponsorships are {sponsorshipsEnabled ? 'ON' : 'OFF'} platform-wide
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {sponsorshipsEnabled
                  ? `Live placements are being served on home, explore and search. Providers can buy boosts.${stats?.activePaid ? ` ${stats.activePaid} paid boost${stats.activePaid === 1 ? ' is' : 's are'} running.` : ''}`
                  : 'Nothing sponsored is served anywhere, even if listings below are marked Live — and providers cannot buy a boost. Turn on to start serving.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleSponsorshipsFlag}
            disabled={updateFlags.isPending}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 flex-shrink-0"
            style={{ background: sponsorshipsEnabled ? 'var(--color-warning-dark)' : 'var(--color-success-dark)' }}
          >
            {updateFlags.isPending ? 'Saving…' : sponsorshipsEnabled ? 'Turn Off' : 'Turn On'}
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
          <StatCard title="Total" value={stats.total} icon={<Megaphone className="w-5 h-5" />} accent="var(--color-primary)" />
          <StatCard title="Running" value={stats.active} icon={<Activity className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Complimentary" value={stats.complimentary} icon={<Gift className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Admin Granted" value={stats.adminGranted} icon={<ShieldCheck className="w-5 h-5" />} accent="var(--color-info)" />
          <StatCard title="Pending" value={pendingList?.length ?? stats.pendingApproval} icon={<Clock className="w-5 h-5" />} accent="var(--color-warning)" />
          <StatCard title="Expiring ≤7d" value={stats.expiringSoon} icon={<AlertTriangle className="w-5 h-5" />} accent={stats.expiringSoon > 0 ? 'var(--color-danger)' : 'var(--text-muted)'} />
          <StatCard title="Revenue" value={formatCurrency(stats.totalSpent)} icon={<DollarSign className="w-5 h-5" />} accent="var(--color-success)" />
          <StatCard title="Avg CTR" value={`${avgCtr}%`} icon={<TrendingUp className="w-5 h-5" />} accent="var(--color-info)" />
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-shrink-0" style={{ minWidth: '220px' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search provider or city…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className={`${inputCls} pl-9`}
            style={inputStyle}
          />
        </div>
        {tabGroup(TYPE_TABS, type, setType)}
        {tabGroup(STATUS_TABS, isActive, setIsActive)}
        {tabGroup(APPROVAL_TABS, approvalFilter, setApprovalFilter)}
        {tabGroup(SOURCE_TABS, sourceFilter, setSourceFilter)}
      </div>

      <DataTable<SponsoredListing>
        columns={columns}
        data={items}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={(r) => openDetail(r)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyIcon={<Megaphone className="w-8 h-8" />}
        emptyTitle="No sponsorships match"
        emptyDescription="Adjust the filters or add a sponsor for any business."
        bulkActions={
          <div className="flex items-center gap-1.5">
            {anySelectedRunning && (
              <button onClick={() => setBulkConfirm('stop')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}><Pause className="w-3.5 h-3.5" /> Stop</button>
            )}
            {anySelectedStopped && (
              <button onClick={() => setBulkConfirm('resume')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}><Play className="w-3.5 h-3.5" /> Resume</button>
            )}
            {anySelectedPending && (
              <>
                <button onClick={() => setBulkConfirm('approve')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}><Check className="w-3.5 h-3.5" /> Approve</button>
                <button onClick={() => setBulkConfirm('reject')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}><X className="w-3.5 h-3.5" /> Reject</button>
              </>
            )}
            <button onClick={() => setBulkConfirm('delete')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        }
      />

      {/* ═══ ADD SPONSOR PANEL ═══ */}
      <DetailPanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Sponsor"
        subtitle="Place a sponsorship for any business — no checkout needed"
        width="600px"
        actions={
          <>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
            <button onClick={submitCreate} disabled={createMutation.isPending || !createForm.provider} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : createForm.billingMode === 'free' ? <Gift className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
              {createMutation.isPending ? 'Placing…' : createForm.billingMode === 'free' ? 'Place Free Sponsorship' : 'Place Sponsorship'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {!sponsorshipsEnabled && (
            <div className="flex items-start gap-2 p-3 rounded-xl border text-xs" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', color: 'var(--color-warning-dark)' }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Sponsorships are switched off platform-wide. You can still place this one; it will start serving as soon as you turn sponsorships on.</span>
            </div>
          )}

          {/* Provider picker */}
          <FormField label="Provider / Business" required>
            {createForm.provider ? (
              <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--color-primary)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {createForm.provider.profilePhotoUrl ? (
                    <img src={createForm.provider.profilePhotoUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Building2 className="w-4 h-4" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{createForm.provider.brandName}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[createForm.provider.area, createForm.provider.city].filter(Boolean).join(', ')} · <span className="capitalize">{createForm.provider.status}</span></p>
                    {createForm.provider.activeSponsorships.length > 0 && (
                      <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--color-warning-dark)' }}>
                        Already running: {createForm.provider.activeSponsorships.map((s) => `${s.type.replace('_', ' ')}${s.billingMode === 'free' ? ' (free)' : ''}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setCreateForm((p) => ({ ...p, provider: null }))} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }} title="Change provider"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    autoFocus
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="Search by business name or city…"
                    className={`${inputCls} pl-9`}
                    style={inputStyle}
                  />
                </div>
                <div className="mt-2 rounded-xl border overflow-hidden max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
                  {loadingProviders ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-4 h-4 animate-spin" /> Loading providers…</div>
                  ) : (eligibleProviders ?? []).length === 0 ? (
                    <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No providers found</p>
                  ) : (
                    (eligibleProviders ?? []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setCreateForm((prev) => ({ ...prev, provider: p }))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:opacity-90"
                        style={{ borderBottom: '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {p.profilePhotoUrl ? (
                          <img src={p.profilePhotoUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}><Building2 className="w-4 h-4" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.brandName}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{[p.area, p.city].filter(Boolean).join(', ')}</p>
                        </div>
                        {p.activeSponsorships.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>{p.activeSponsorships.length} running</span>
                        )}
                        {p.isFeatured && <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </FormField>

          {/* Placement type */}
          <FormField label="Placement">
            <div className="grid grid-cols-3 gap-2">
              {PLACEMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCreateForm((p) => ({ ...p, type: opt.value }))}
                  className="p-3 rounded-xl border text-left transition-all"
                  style={{
                    background: createForm.type === opt.value ? 'var(--color-primary-light)' : 'var(--surface-0)',
                    borderColor: createForm.type === opt.value ? 'var(--color-primary)' : 'var(--border-default)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.hint}</p>
                </button>
              ))}
            </div>
          </FormField>

          {/* Billing mode */}
          <FormField label="Billing" description={createForm.billingMode === 'free' ? 'Complimentary — never burns budget, never stops on spend. Runs until the end date or until you stop it.' : 'Behaves like a purchased boost: budget is consumed per impression/click and serving stops when exhausted.'}>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCreateForm((p) => ({ ...p, billingMode: 'free', recordPayment: false }))}
                className="flex items-center gap-2 p-3 rounded-xl border text-left transition-all"
                style={{ background: createForm.billingMode === 'free' ? 'var(--color-success-light)' : 'var(--surface-0)', borderColor: createForm.billingMode === 'free' ? 'var(--color-success)' : 'var(--border-default)' }}
              >
                <Gift className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success-dark)' }} />
                <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Free</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No payment</p></div>
              </button>
              <button
                onClick={() => setCreateForm((p) => ({ ...p, billingMode: 'paid' }))}
                className="flex items-center gap-2 p-3 rounded-xl border text-left transition-all"
                style={{ background: createForm.billingMode === 'paid' ? 'var(--color-primary-light)' : 'var(--surface-0)', borderColor: createForm.billingMode === 'paid' ? 'var(--color-primary)' : 'var(--border-default)' }}
              >
                <Wallet className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Paid</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Budget-based</p></div>
              </button>
            </div>
          </FormField>

          {createForm.billingMode === 'paid' && (
            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
              <FormField label="Budget (₹)" required>
                <input type="number" min={1} step={50} value={createForm.budgetAmount} onChange={(e) => setCreateForm((p) => ({ ...p, budgetAmount: e.target.value }))} className={inputCls} style={inputStyle} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cost per click (₹)" description="Blank = platform default">
                  <input type="number" min={0} step="0.5" value={createForm.costPerClick} onChange={(e) => setCreateForm((p) => ({ ...p, costPerClick: e.target.value }))} placeholder="default" className={inputCls} style={inputStyle} />
                </FormField>
                <FormField label="Cost per impression (₹)" description="Blank = platform default">
                  <input type="number" min={0} step="0.01" value={createForm.costPerImpression} onChange={(e) => setCreateForm((p) => ({ ...p, costPerImpression: e.target.value }))} placeholder="default" className={inputCls} style={inputStyle} />
                </FormField>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.recordPayment} onChange={(e) => setCreateForm((p) => ({ ...p, recordPayment: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Record an offline payment (cash / UPI / bank transfer) for this placement</span>
              </label>
              {createForm.recordPayment && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Amount collected (₹)" description="Blank = budget">
                    <input type="number" min={0} step={50} value={createForm.paymentAmount} onChange={(e) => setCreateForm((p) => ({ ...p, paymentAmount: e.target.value }))} placeholder={createForm.budgetAmount} className={inputCls} style={inputStyle} />
                  </FormField>
                  <FormField label="Reference">
                    <input type="text" value={createForm.paymentReference} onChange={(e) => setCreateForm((p) => ({ ...p, paymentReference: e.target.value }))} placeholder="UPI txn id, receipt #…" className={inputCls} style={inputStyle} />
                  </FormField>
                </div>
              )}
            </div>
          )}

          {/* Schedule */}
          <FormField label="Schedule">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Starts</p>
                <input type="date" value={createForm.startsAt} onChange={(e) => setCreateForm((p) => ({ ...p, startsAt: e.target.value }))} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Ends</p>
                <input type="date" value={createForm.endsAt} onChange={(e) => setCreateForm((p) => ({ ...p, endsAt: e.target.value }))} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {DURATION_PRESETS.map((d) => (
                <button key={d} onClick={() => setCreateForm((p) => ({ ...p, endsAt: toDateInput(addDays(new Date(p.startsAt || Date.now()), d).toISOString()) }))} className="px-2.5 py-1 text-xs font-medium rounded-full border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-0)' }}>
                  {d} days
                </button>
              ))}
              <button onClick={() => setCreateForm((p) => ({ ...p, endsAt: toDateInput(addDays(new Date(p.startsAt || Date.now()), 365).toISOString()) }))} className="px-2.5 py-1 text-xs font-medium rounded-full border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-0)' }}>
                1 year
              </button>
            </div>
          </FormField>

          {/* Targeting */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Targeting (optional — blank means everywhere)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <FormField label="Cities (comma-separated)">
                  <input type="text" value={createForm.targetCities} onChange={(e) => setCreateForm((p) => ({ ...p, targetCities: e.target.value }))} placeholder="Mumbai, Pune" className={inputCls} style={inputStyle} />
                </FormField>
              </div>
              <FormField label="Radius (km)">
                <input type="number" min={1} value={createForm.targetRadius} onChange={(e) => setCreateForm((p) => ({ ...p, targetRadius: e.target.value }))} placeholder="any" className={inputCls} style={inputStyle} />
              </FormField>
            </div>
            <FormField label="Categories" description={createForm.type === 'top_result' || createForm.type === 'inline' ? 'Search placements only show for queries matching these categories.' : undefined}>
              <CategoryMultiSelect options={categoryOptions} value={createForm.targetCategoryIds} onChange={(ids) => setCreateForm((p) => ({ ...p, targetCategoryIds: ids }))} />
            </FormField>
          </div>

          {/* Advanced */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priority" description="Higher wins the slot ahead of higher bids">
              <input type="number" min={0} step={1} value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))} className={inputCls} style={inputStyle} />
            </FormField>
            <FormField label="Approval">
              <select value={createForm.approvalStatus} onChange={(e) => setCreateForm((p) => ({ ...p, approvalStatus: e.target.value as ApprovalStatus }))} className={inputCls} style={inputStyle}>
                <option value="approved">Approved (serve now)</option>
                <option value="pending_approval">Pending approval</option>
              </select>
            </FormField>
          </div>
          <FormField label="Internal note" description="Admin-only. Never shown to the provider or to customers.">
            <textarea rows={2} value={createForm.internalNote} onChange={(e) => setCreateForm((p) => ({ ...p, internalNote: e.target.value }))} placeholder="Why this business is getting the placement…" className={`${inputCls} resize-none`} style={inputStyle} />
          </FormField>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start running immediately (uncheck to save as stopped)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={createForm.notifyProvider} onChange={(e) => setCreateForm((p) => ({ ...p, notifyProvider: e.target.checked }))} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Notify the provider that their boost is live</span>
            </label>
          </div>
        </div>
      </DetailPanel>

      {/* ═══ DETAIL PANEL ═══ */}
      <DetailPanel
        open={!!selected && !showCreate}
        onClose={() => setSelected(null)}
        title="Sponsorship Details"
        subtitle={selected?.provider?.brandName || undefined}
        width="600px"
        actions={
          selected && (
            detailTab === 'settings' ? (
              <button onClick={handleUpdate} disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmAction({ id: selected.id, action: 'delete' })} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}><Trash2 className="w-4 h-4" /> Delete</button>
                {selected.isActive ? (
                  <button onClick={() => setConfirmAction({ id: selected.id, action: 'stop' })} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}><Pause className="w-4 h-4" /> Stop</button>
                ) : (
                  <button onClick={() => resumeMutation.mutate(selected.id)} disabled={resumeMutation.isPending || new Date(selected.endsAt) <= new Date() || selected.approvalStatus === 'rejected'} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-40" style={{ background: 'var(--color-success-light)', color: 'var(--color-success-dark)' }}><Play className="w-4 h-4" /> Resume</button>
                )}
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Edit</button>
              </div>
            )
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              {([['overview', 'Overview'], ['performance', 'Performance'], ['settings', 'Settings']] as [DetailTab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { if (key === 'settings') openEdit(selected); else setDetailTab(key); }} className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
                  background: detailTab === key ? 'var(--surface-0)' : 'transparent',
                  color: detailTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: detailTab === key ? 'var(--shadow-sm)' : 'none',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ─── Overview ─── */}
            {detailTab === 'overview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: selected.billingMode === 'free' ? 'var(--color-success-light)' : 'var(--color-primary-light)', color: selected.billingMode === 'free' ? 'var(--color-success-dark)' : 'var(--color-primary)' }}>
                      {selected.billingMode === 'free' ? <Gift className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selected.provider?.brandName || 'Provider'}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
                        {selected.type.replace('_', ' ')} placement · {selected.billingMode === 'free' ? 'complimentary' : 'paid'} · {selected.source === 'admin_granted' ? 'placed by admin' : 'purchased by provider'}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const status = getOperationalStatus(selected);
                    return <span className="px-3 py-1 text-xs font-bold rounded-full" style={{ background: status.bg, color: status.color }}>{status.label}</span>;
                  })()}
                </div>

                {!selected.isActive && selected.stoppedAt && (
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Pause className="w-3.5 h-3.5" style={{ color: 'var(--color-warning-dark)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-warning-dark)' }}>Stopped {formatDate(selected.stoppedAt)}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.stoppedReason || 'No reason recorded'}</p>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Impressions', value: selected.impressions.toLocaleString(), icon: Eye },
                    { label: 'Clicks', value: selected.clicks.toLocaleString(), icon: MousePointerClick },
                    { label: 'CTR', value: getCtr(selected.clicks, selected.impressions), icon: TrendingUp },
                    { label: 'CPC (actual)', value: selected.billingMode === 'free' ? '₹0' : selected.clicks > 0 ? formatCurrency(Number(selected.spentAmount) / selected.clicks) : '—', icon: DollarSign },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    </div>
                  ))}
                </div>

                {selected.billingMode === 'free' ? (
                  <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'var(--color-success-light)' }}>
                    <Gift className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success-dark)' }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-success-dark)' }}>Complimentary placement</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No budget, no spend. Runs until {formatDate(selected.endsAt)} or until stopped.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Budget</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(selected.spentAmount)} / {formatCurrency(selected.budgetAmount)}
                        </span>
                        <button onClick={() => setTopUp(topUp ? null : { amount: '500', extendDays: '', recordPayment: false, reference: '' })} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Wallet className="w-3 h-3" /> Top up</button>
                      </div>
                    </div>
                    {(() => {
                      const pct = Number(selected.budgetAmount) > 0 ? (Number(selected.spentAmount) / Number(selected.budgetAmount)) * 100 : 0;
                      return (
                        <>
                          <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'var(--color-danger)' : pct > 60 ? 'var(--color-warning)' : 'var(--color-primary)' }} />
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}% utilized · ₹{Math.max(0, Number(selected.budgetAmount) - Number(selected.spentAmount)).toLocaleString('en-IN')} remaining</p>
                        </>
                      );
                    })()}
                    {topUp && (
                      <div className="mt-3 pt-3 space-y-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField label="Add budget (₹)">
                            <input type="number" min={1} step={50} value={topUp.amount} onChange={(e) => setTopUp({ ...topUp, amount: e.target.value })} className={inputCls} style={inputStyle} />
                          </FormField>
                          <FormField label="Extend by (days)">
                            <input type="number" min={0} step={1} value={topUp.extendDays} onChange={(e) => setTopUp({ ...topUp, extendDays: e.target.value })} placeholder="0" className={inputCls} style={inputStyle} />
                          </FormField>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={topUp.recordPayment} onChange={(e) => setTopUp({ ...topUp, recordPayment: e.target.checked })} className="rounded" />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Record an offline payment for this top-up</span>
                        </label>
                        {topUp.recordPayment && (
                          <input type="text" value={topUp.reference} onChange={(e) => setTopUp({ ...topUp, reference: e.target.value })} placeholder="Payment reference" className={inputCls} style={inputStyle} />
                        )}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setTopUp(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
                          <button onClick={submitTopUp} disabled={topUpMutation.isPending} className="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>{topUpMutation.isPending ? 'Saving…' : 'Apply top-up'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['CPC Config', selected.billingMode === 'free' ? '—' : formatCurrency(selected.costPerClick)],
                    ['CPI Config', selected.billingMode === 'free' ? '—' : `₹${Number(selected.costPerImpression).toFixed(4)}`],
                    ['Starts', formatDate(selected.startsAt)],
                    ['Ends', formatDate(selected.endsAt)],
                    ['Priority', String(selected.priority ?? 0)],
                    ['Approval', selected.approvalStatus === 'pending_approval' ? 'Pending' : selected.approvalStatus],
                    ['Created', formatDate(selected.createdAt)],
                    ['Payment', selected.paymentId ? 'Recorded' : selected.billingMode === 'free' ? 'None (free)' : 'None'],
                  ].map(([label, value]) => (
                    <div key={label} className="p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-medium capitalize mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {(selected.targetCities?.length || selected.targetCategoryIds?.length || selected.targetRadius) ? (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Targeting</span>
                    </div>
                    {selected.targetCities && selected.targetCities.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Cities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.targetCities.map((city) => (
                            <span key={city} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                              <MapPin className="w-3 h-3" />{city}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.targetCategoryIds && selected.targetCategoryIds.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Categories</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.targetCategoryIds.map((id) => (
                            <span key={id} className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{categoryName(id)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.targetRadius && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Radius: {selected.targetRadius} km</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No targeting — shown everywhere.</p>
                )}

                {selected.internalNote && (
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Internal note (admin only)</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.internalNote}</p>
                  </div>
                )}

                {selected.adminNotes && (
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--surface-1)', borderColor: 'var(--color-warning-light)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-warning-dark)' }}>Rejection notes</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.adminNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Performance ─── */}
            {detailTab === 'performance' && (
              <div className="space-y-4">
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  {['7d', '14d', '30d'].map((p) => (
                    <button key={p} onClick={() => setAnalyticsPeriod(p)} className="flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors" style={{
                      background: analyticsPeriod === p ? 'var(--surface-0)' : 'transparent',
                      color: analyticsPeriod === p ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: analyticsPeriod === p ? 'var(--shadow-sm)' : 'none',
                    }}>
                      {p}
                    </button>
                  ))}
                </div>

                {analyticsData && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{analyticsData.totals.avgDailyImpressions}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Daily Imp.</p>
                    </div>
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{analyticsData.totals.avgDailyClicks}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Daily Clicks</p>
                    </div>
                    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--surface-1)' }}>
                      <p className="text-xs font-bold" style={{ color: analyticsData.projectedDaysLeft && analyticsData.projectedDaysLeft <= 5 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {selected.billingMode === 'free' ? '∞' : analyticsData.projectedDaysLeft ? `${analyticsData.projectedDaysLeft}d` : '—'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Budget lasts</p>
                    </div>
                  </div>
                )}

                {analyticsData && analyticsData.daily.some((d) => d.impressions || d.clicks) ? (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Impressions & Clicks</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={analyticsData.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="impressionsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="impressions" stroke="#6366f1" fill="url(#impressionsFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="clicks" stroke="#10b981" fill="url(#clicksFill)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded-full bg-indigo-500" /><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Impressions</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded-full bg-emerald-500" /><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Clicks</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl text-center" style={{ background: 'var(--surface-1)' }}>
                    <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded in this period</p>
                  </div>
                )}

                {analyticsData && selected.billingMode === 'paid' && analyticsData.daily.some((d) => d.spend > 0) && (
                  <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Daily Spend (₹)</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={analyticsData.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit' })} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toFixed(2)}`, 'Spend']} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ─── Settings ─── */}
            {detailTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Placement">
                    <select value={editForm.type ?? selected.type} onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value as SponsoredType }))} className={inputCls} style={inputStyle}>
                      {PLACEMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Billing">
                    <select value={editForm.billingMode ?? selected.billingMode} onChange={(e) => setEditForm((prev) => ({ ...prev, billingMode: e.target.value as SponsoredBillingMode }))} className={inputCls} style={inputStyle}>
                      <option value="free">Free (complimentary)</option>
                      <option value="paid">Paid (budget-based)</option>
                    </select>
                  </FormField>
                </div>

                {(editForm.billingMode ?? selected.billingMode) === 'paid' && (
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
                    <FormField label="Budget Amount (₹)">
                      <input type="number" min={0} value={editForm.budgetAmount ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, budgetAmount: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Cost Per Click (₹)">
                        <input type="number" min={0} step="0.01" value={editForm.costPerClick ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, costPerClick: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                      </FormField>
                      <FormField label="Cost Per Impression (₹)">
                        <input type="number" min={0} step="0.0001" value={editForm.costPerImpression ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, costPerImpression: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                      </FormField>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editForm.resetSpend ?? false} onChange={(e) => setEditForm((prev) => ({ ...prev, resetSpend: e.target.checked }))} className="rounded" />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reset spent amount to ₹0 (currently {formatCurrency(selected.spentAmount)})</span>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start Date">
                    <input type="date" value={toDateInput(editForm.startsAt)} onChange={(e) => setEditForm((prev) => ({ ...prev, startsAt: new Date(e.target.value).toISOString() }))} className={inputCls} style={inputStyle} />
                  </FormField>
                  <FormField label="End Date">
                    <input type="date" value={toDateInput(editForm.endsAt)} onChange={(e) => setEditForm((prev) => ({ ...prev, endsAt: new Date(`${e.target.value}T23:59:59`).toISOString() }))} className={inputCls} style={inputStyle} />
                  </FormField>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_PRESETS.map((d) => (
                    <button key={d} onClick={() => setEditForm((prev) => ({ ...prev, endsAt: addDays(new Date(), d).toISOString() }))} className="px-2.5 py-1 text-xs font-medium rounded-full border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-0)' }}>
                      +{d}d from today
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <FormField label="Target Cities (comma-separated)">
                      <input
                        type="text"
                        value={editForm.targetCities?.join(', ') ?? ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, targetCities: e.target.value.split(',').map((c) => c.trim()).filter(Boolean) }))}
                        placeholder="Blank = everywhere"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </FormField>
                  </div>
                  <FormField label="Radius (km)">
                    <input type="number" min={1} value={editForm.targetRadius ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, targetRadius: e.target.value === '' ? undefined : Number(e.target.value) }))} placeholder="any" className={inputCls} style={inputStyle} />
                  </FormField>
                </div>
                <FormField label="Target Categories">
                  <CategoryMultiSelect options={categoryOptions} value={editForm.targetCategoryIds ?? []} onChange={(ids) => setEditForm((prev) => ({ ...prev, targetCategoryIds: ids }))} />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Priority" description="Higher wins the slot ahead of higher bids">
                    <input type="number" min={0} step={1} value={editForm.priority ?? 0} onChange={(e) => setEditForm((prev) => ({ ...prev, priority: Number(e.target.value) }))} className={inputCls} style={inputStyle} />
                  </FormField>
                  <FormField label="Approval">
                    <select value={editForm.approvalStatus ?? selected.approvalStatus} onChange={(e) => setEditForm((prev) => ({ ...prev, approvalStatus: e.target.value as ApprovalStatus }))} className={inputCls} style={inputStyle}>
                      <option value="approved">Approved</option>
                      <option value="pending_approval">Pending approval</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </FormField>
                </div>
                <FormField label="Internal note" description="Admin-only.">
                  <textarea rows={2} value={editForm.internalNote ?? ''} onChange={(e) => setEditForm((prev) => ({ ...prev, internalNote: e.target.value }))} className={`${inputCls} resize-none`} style={inputStyle} />
                </FormField>
                <FormField label="Serving">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.isActive ?? true} onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded" />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Running — listing is active and serving</span>
                  </label>
                </FormField>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Single-row confirm */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => { setConfirmAction(null); setActionNotes(''); }}
        onConfirm={runConfirmAction}
        title={
          confirmAction?.action === 'approve' ? 'Approve Sponsorship'
            : confirmAction?.action === 'reject' ? 'Reject Sponsorship'
              : confirmAction?.action === 'stop' ? 'Stop Sponsorship'
                : 'Delete Sponsorship'
        }
        description={
          confirmAction?.action === 'approve' ? 'This sponsorship will become visible to users.'
            : confirmAction?.action === 'reject' ? 'Please provide a reason for rejection.'
              : confirmAction?.action === 'stop' ? 'The placement stops serving immediately. You can resume it later.'
                : 'This permanently removes the sponsorship and its stats. This cannot be undone.'
        }
        confirmLabel={
          confirmAction?.action === 'approve' ? 'Approve'
            : confirmAction?.action === 'reject' ? 'Reject'
              : confirmAction?.action === 'stop' ? 'Stop'
                : 'Delete'
        }
        variant={confirmAction?.action === 'approve' ? 'default' : confirmAction?.action === 'stop' ? 'warning' : 'danger'}
        isLoading={approveMutation.isPending || rejectMutation.isPending || stopMutation.isPending || deleteMutation.isPending}
      >
        {(confirmAction?.action === 'reject' || confirmAction?.action === 'stop') && (
          <textarea
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder={confirmAction.action === 'reject' ? 'Reason for rejection…' : 'Reason (optional, shown to the provider)…'}
            rows={3}
            className={`${inputCls} resize-none`}
            style={inputStyle}
          />
        )}
      </ConfirmDialog>

      {/* Bulk confirm */}
      <ConfirmDialog
        open={!!bulkConfirm}
        onClose={() => { setBulkConfirm(null); setActionNotes(''); }}
        onConfirm={runBulk}
        title={`${bulkConfirm ? bulkConfirm[0].toUpperCase() + bulkConfirm.slice(1) : ''} ${selectedIds.size} sponsorship(s)`}
        description={bulkConfirm === 'delete' ? 'This permanently removes the selected sponsorships. This cannot be undone.' : 'Applies to every selected row. Rows that don\'t qualify are skipped and reported.'}
        confirmLabel={bulkConfirm ? bulkConfirm[0].toUpperCase() + bulkConfirm.slice(1) : 'Confirm'}
        variant={bulkConfirm === 'delete' || bulkConfirm === 'reject' ? 'danger' : bulkConfirm === 'stop' ? 'warning' : 'default'}
        isLoading={bulkMutation.isPending}
      >
        {(bulkConfirm === 'stop' || bulkConfirm === 'reject') && (
          <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} placeholder="Reason (optional)…" rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
        )}
      </ConfirmDialog>

      {/* Master switch OFF confirm */}
      <ConfirmDialog
        open={confirmFlagOff}
        onClose={() => setConfirmFlagOff(false)}
        onConfirm={() => { setSponsorshipsFlag(false); setConfirmFlagOff(false); }}
        title="Switch boosts off platform-wide?"
        description="Sponsored placements stop appearing on home, explore and search, and providers can no longer buy a boost. Listings keep their status and start serving again the moment you switch it back on."
        confirmLabel="Switch off"
        variant="danger"
        isLoading={updateFlags.isPending}
      >
        {!!stats?.activePaid && (
          <p className="text-xs flex items-start gap-1.5 p-2 rounded-lg" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>{stats.activePaid} paid boost{stats.activePaid === 1 ? '' : 's'}</strong> {stats.activePaid === 1 ? 'is' : 'are'} inside {stats.activePaid === 1 ? 'its' : 'their'} paid window right now. Those providers keep losing days while boosts are off — consider extending their end dates afterwards.
            </span>
          </p>
        )}
      </ConfirmDialog>

      {/* Kill switch confirm */}
      <ConfirmDialog
        open={!!killSwitch}
        onClose={() => setKillSwitch(null)}
        onConfirm={async () => {
          if (!killSwitch) return;
          try {
            await stopAllMutation.mutateAsync({ reason: killSwitch.reason || undefined, disableFeatureFlag: killSwitch.disableFlag });
          } catch { /* toast from hook */ }
          setKillSwitch(null);
        }}
        title="Stop all sponsorships"
        description={`Pauses every running placement (${stats?.active ?? 0} right now). Each can be resumed individually later.`}
        confirmLabel="Stop everything"
        variant="danger"
        isLoading={stopAllMutation.isPending}
      >
        {killSwitch && (
          <div className="space-y-2">
            <textarea value={killSwitch.reason} onChange={(e) => setKillSwitch({ ...killSwitch, reason: e.target.value })} placeholder="Reason (recorded in the audit log)…" rows={2} className={`${inputCls} resize-none`} style={inputStyle} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={killSwitch.disableFlag} onChange={(e) => setKillSwitch({ ...killSwitch, disableFlag: e.target.checked })} className="rounded" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Also switch sponsorships OFF platform-wide (blocks anything new from serving until turned back on)</span>
            </label>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

// ─── Category multi-select chip picker ─────────────────────────

function CategoryMultiSelect({ options, value, onChange }: { options: Category[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q ? options.filter((c) => c.name.toLowerCase().includes(q)) : options;
    return pool.filter((c) => !value.includes(c.id)).slice(0, 8);
  }, [options, query, value]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const cat = options.find((c) => c.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                {cat?.name ?? id.slice(0, 8)}
                <button onClick={() => onChange(value.filter((v) => v !== id))} className="hover:opacity-70"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to add a category…" className={inputCls} style={inputStyle} />
      {query.trim() && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => { onChange([...value, c.id]); setQuery(''); }} className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-0)' }}>
              + {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
