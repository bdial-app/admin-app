import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, GripVertical } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type Column } from '../components/ui/DataTable';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '../hooks/useBanners';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { PromoBanner } from '../types';

const LIMIT = 20;
const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const emptyBanner: Partial<PromoBanner> = {
  title: '',
  subtitle: '',
  gradient: '',
  emoji: '',
  cta: '',
  tag: '',
  linkUrl: '',
  isActive: true,
};

export default function Banners() {
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState('');
  const [selected, setSelected] = useState<PromoBanner | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<PromoBanner>>(emptyBanner);
  const [confirmDelete, setConfirmDelete] = useState<PromoBanner | null>(null);

  const { data, isLoading } = useBanners({ page, limit: LIMIT, isActive: isActive || undefined });
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();

  const openCreate = () => {
    setForm(emptyBanner);
    setCreating(true);
    setEditMode(false);
    setSelected(null);
  };

  const openEdit = (banner: PromoBanner) => {
    setForm({ ...banner });
    setEditMode(true);
    setCreating(false);
    setSelected(null);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    try {
      if (editMode && form.id) {
        await updateMutation.mutateAsync({ id: form.id, body: form });
        toast.success('Banner updated');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Banner created');
      }
      setEditMode(false);
      setCreating(false);
    } catch {
      toast.error('Failed to save banner');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete.id);
      toast.success('Banner deleted');
      setConfirmDelete(null);
      setSelected(null);
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const columns: Column<PromoBanner>[] = [
    {
      key: 'banner',
      header: 'Banner',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: row.gradient || 'var(--color-primary-light)' }}
          >
            {row.emoji || '🖼️'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{row.title}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{row.subtitle || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tag',
      header: 'Tag',
      render: (row) => row.tag ? (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          {row.tag}
        </span>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>,
    },
    {
      key: 'order',
      header: 'Order',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{row.displayOrder}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const now = new Date();
        const isScheduled = row.startsAt && new Date(row.startsAt) > now;
        const isExpired = row.endsAt && new Date(row.endsAt) < now;
        const label = !row.isActive ? 'Inactive' : isExpired ? 'Expired' : isScheduled ? 'Scheduled' : 'Active';
        const bg = !row.isActive ? 'var(--surface-2)' : isExpired ? 'var(--color-danger-light)' : isScheduled ? 'var(--color-info-light)' : 'var(--color-success-light)';
        const color = !row.isActive ? 'var(--text-muted)' : isExpired ? 'var(--color-danger-dark)' : isScheduled ? 'var(--color-info-dark)' : 'var(--color-success-dark)';
        return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: bg, color }}>{label}</span>;
      },
    },
    {
      key: 'dates',
      header: 'Schedule',
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {formatDate(row.startsAt)} → {formatDate(row.endsAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelected(row); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}><Pencil className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-danger)' }}><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  const formPanel = creating || editMode;

  return (
    <div>
      <PageHeader
        title="Promo Banners"
        description="Manage promotional banners displayed in the customer app"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Banners' }]}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" /> New Banner
          </button>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setIsActive(tab.value); setPage(1); }}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            style={{
              background: isActive === tab.value ? 'var(--surface-0)' : 'transparent',
              color: isActive === tab.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: isActive === tab.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable<PromoBanner>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        rowKey={(r) => r.id}
        onRowClick={setSelected}
      />

      {/* View Detail */}
      <DetailPanel
        open={!!selected && !formPanel}
        onClose={() => setSelected(null)}
        title="Banner Details"
        subtitle={selected?.title}
        actions={
          <div className="flex gap-2">
            <button onClick={() => selected && openEdit(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Edit</button>
            <button onClick={() => selected && setConfirmDelete(selected)} className="px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ background: 'var(--color-danger)' }}>Delete</button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Preview */}
            <div className="rounded-xl p-6 text-center" style={{ background: selected.gradient || 'var(--color-primary-light)' }}>
              {selected.emoji && <p className="text-3xl mb-2">{selected.emoji}</p>}
              <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selected.title}</p>
              {selected.subtitle && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{selected.subtitle}</p>}
              {selected.cta && (
                <span className="inline-block mt-3 px-4 py-1.5 text-xs font-medium rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }}>{selected.cta}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Status', selected.isActive ? 'Active' : 'Inactive'],
                ['Order', String(selected.displayOrder)],
                ['Tag', selected.tag || '—'],
                ['CTA', selected.cta || '—'],
                ['Starts', formatDate(selected.startsAt)],
                ['Ends', formatDate(selected.endsAt)],
                ['Link URL', selected.linkUrl || '—'],
                ['Created', formatDate(selected.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailPanel>

      {/* Create / Edit Form */}
      <DetailPanel
        open={formPanel}
        onClose={() => { setCreating(false); setEditMode(false); }}
        title={editMode ? 'Edit Banner' : 'New Banner'}
        actions={
          <button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        }
      >
        <div className="space-y-4">
          <FormField label="Title" required>
            <input type="text" value={form.title || ''} onChange={(e) => updateField('title', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <FormField label="Subtitle">
            <input type="text" value={form.subtitle || ''} onChange={(e) => updateField('subtitle', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Emoji">
              <input type="text" value={form.emoji || ''} onChange={(e) => updateField('emoji', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Tag">
              <input type="text" value={form.tag || ''} onChange={(e) => updateField('tag', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
          </div>
          <FormField label="Gradient CSS">
            <input type="text" value={form.gradient || ''} onChange={(e) => updateField('gradient', e.target.value)} placeholder="e.g. linear-gradient(135deg, #667eea 0%, #764ba2 100%)" className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <FormField label="CTA Text">
            <input type="text" value={form.cta || ''} onChange={(e) => updateField('cta', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <FormField label="Link URL">
            <input type="text" value={form.linkUrl || ''} onChange={(e) => updateField('linkUrl', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Starts At">
              <input type="datetime-local" value={form.startsAt ? new Date(form.startsAt).toISOString().slice(0, 16) : ''} onChange={(e) => updateField('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
            <FormField label="Ends At">
              <input type="datetime-local" value={form.endsAt ? new Date(form.endsAt).toISOString().slice(0, 16) : ''} onChange={(e) => updateField('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full px-3 py-2 text-sm rounded-lg border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            </FormField>
          </div>
          <FormField label="Active">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => updateField('isActive', e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Banner is active</span>
            </label>
          </FormField>
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Banner"
        description={`Are you sure you want to permanently delete "${confirmDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
