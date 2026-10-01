import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Sparkles, FileText, Loader2, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useHasPermission } from '../../hooks/usePermissions';
import { useWaTemplates, useSyncWaTemplates, useSeedWaTemplates, useWaSettings } from '../../hooks/useWhatsApp';
import { TemplateStatusBadge } from '../../components/whatsapp/TemplateStatusBadge';
import { WA_ROUTES, formatInr, rateFor, fmtRelative, getBody, apiErrorMessage, CATEGORY_LABEL, QUALITY_COLOR } from '../../components/whatsapp/wa-utils';
import type { WaTemplate, WaTemplateCategory, WaTemplateStatus } from '../../types';

const STATUS_CHIPS: { label: string; value: WaTemplateStatus | '' }[] = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'draft' }, { label: 'In review', value: 'pending' },
  { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }, { label: 'Paused', value: 'paused' },
];
const CAT_CHIPS: { label: string; value: WaTemplateCategory | '' }[] = [
  { label: 'Any category', value: '' }, { label: 'Utility', value: 'utility' }, { label: 'Marketing', value: 'marketing' }, { label: 'Authentication', value: 'authentication' },
];

export default function Templates() {
  const navigate = useNavigate();
  const canManage = useHasPermission('whatsapp.templates');
  const { data: settings } = useWaSettings();
  const [status, setStatus] = useState<WaTemplateStatus | ''>('');
  const [category, setCategory] = useState<WaTemplateCategory | ''>('');
  const [search, setSearch] = useState('');

  const { data: templates = [], isLoading } = useWaTemplates({ status, category, search: search.trim() || undefined });
  const { data: all = [] } = useWaTemplates({});
  const sync = useSyncWaTemplates();
  const seed = useSeedWaTemplates();

  const onSync = async () => {
    try {
      const r = await sync.mutateAsync();
      toast.success(`Synced ${r.synced} templates from Meta (${r.created} new, ${r.updated} updated)`);
    } catch (e) { toast.error(apiErrorMessage(e, 'Sync failed')); }
  };
  const onSeed = async () => {
    try {
      const r = await seed.mutateAsync();
      toast.success(r.created ? `Added ${r.created} starter templates as drafts` : 'Starter templates already exist');
    } catch (e) { toast.error(apiErrorMessage(e, 'Could not add starter templates')); }
  };

  const columns: Column<WaTemplate>[] = [
    {
      key: 'name', header: 'Template',
      render: (t) => (
        <div className="min-w-0 max-w-[360px]">
          <p className="text-sm font-semibold font-mono truncate" style={{ color: 'var(--text-primary)' }}>{t.name} <span className="text-[10px] font-sans font-normal uppercase ml-1" style={{ color: 'var(--text-muted)' }}>{t.language}</span>{t.isSeed && <span className="ml-1.5 px-1.5 py-px rounded text-[9px] font-sans font-bold uppercase" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>starter</span>}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description || getBody(t.components)?.text}</p>
        </div>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: (t) => (
        <div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: t.category === 'marketing' ? 'var(--color-warning-light)' : 'var(--color-info-light)', color: t.category === 'marketing' ? 'var(--color-warning-dark)' : 'var(--color-info-dark)' }}>{CATEGORY_LABEL[t.category]}</span>
          <p className="text-[11px] tabular-nums mt-1" style={{ color: 'var(--text-muted)' }}>{formatInr(rateFor(t.category, settings?.rates), 4)} / msg</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (t) => <TemplateStatusBadge status={t.status} reason={t.rejectedReason} /> },
    {
      key: 'qualityScore', header: 'Quality',
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: QUALITY_COLOR(t.qualityScore) }} />{t.qualityScore ?? '—'}
        </span>
      ),
    },
    { key: 'usageCount', header: 'Used in', sortable: true, render: (t) => <span className="text-sm tabular-nums" style={{ color: t.usageCount ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.usageCount} campaign{t.usageCount === 1 ? '' : 's'}</span> },
    { key: 'updatedAt', header: 'Updated', sortable: true, render: (t) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtRelative(t.updatedAt)}</span> },
  ];

  const filters = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-1)' }}>
        {STATUS_CHIPS.map((c) => (
          <button key={c.value} onClick={() => setStatus(c.value)} className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors" style={{ background: status === c.value ? 'var(--surface-0)' : 'transparent', color: status === c.value ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: status === c.value ? 'var(--shadow-sm)' : 'none' }}>{c.label}</button>
        ))}
      </div>
      <select value={category} onChange={(e) => setCategory(e.target.value as WaTemplateCategory | '')} className="px-3 py-2 text-xs font-medium rounded-lg focus-ring" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
        {CAT_CHIPS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
  );

  const isEmpty = !isLoading && all.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Every business-initiated message must be a Meta-approved template. Review usually takes minutes, sometimes up to 24h.
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={onSeed} disabled={seed.isPending} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              {seed.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Add starter templates
            </button>
            <button onClick={onSync} disabled={sync.isPending || settings?.configured === false} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }} title="Pull templates and their statuses from Meta">
              {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync from Meta
            </button>
            <button onClick={() => navigate(WA_ROUTES.templateNew)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
              <Plus className="w-4 h-4" /> New template
            </button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--surface-2)' }}><FileText className="w-7 h-7" style={{ color: 'var(--text-muted)' }} /></div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No templates yet</h3>
            <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>Start with 11 ready-made Tijarah templates (saved as drafts you can edit and submit), sync what already exists in your Meta account, or write your own.</p>
            {canManage && (
              <div className="flex items-center gap-2 mt-5">
                <button onClick={onSeed} disabled={seed.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}><Sparkles className="w-4 h-4" /> Add starter templates</button>
                <button onClick={onSync} disabled={sync.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><RefreshCw className="w-4 h-4" /> Sync from Meta</button>
                <button onClick={() => navigate(WA_ROUTES.templateNew)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><Plus className="w-4 h-4" /> Write one</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DataTable<WaTemplate>
          columns={columns}
          data={templates}
          isLoading={isLoading}
          rowKey={(t) => t.id}
          onRowClick={(t) => navigate(WA_ROUTES.template(t.id))}
          onSearch={setSearch}
          searchValue={search}
          searchPlaceholder="Search name or body…"
          filters={filters}
          emptyIcon={<Search className="w-8 h-8" />}
          emptyTitle="No templates match"
          emptyDescription="Try another status or category."
        />
      )}
    </div>
  );
}
