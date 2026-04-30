import { useState, useMemo } from 'react';
import { Settings as SettingsIcon, Plus, Loader2, Trash2, Edit, X, Check } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSettings, useUpdateSettings, useCreateSetting, useDeleteSetting } from '../hooks/useSettings';
import { ROUTES } from '../utils/constants';
import type { SystemSetting } from '../types/system-setting';

export default function SystemSettings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const createMutation = useCreateSetting();
  const deleteMutation = useDeleteSetting();

  const [showCreate, setShowCreate] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SystemSetting | null>(null);
  const [createForm, setCreateForm] = useState({ key: '', value: '', type: 'string', group: '', description: '' });

  // Group settings by group field — exclude feature_flags & limits (managed in Feature Flags page)
  const grouped = useMemo(() => {
    if (!settings) return {};
    const groups: Record<string, SystemSetting[]> = {};
    for (const s of settings) {
      if (s.group === 'feature_flags' || s.group === 'limits') continue;
      const g = s.group || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    }
    return groups;
  }, [settings]);

  const handleStartEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = (setting: SystemSetting) => {
    updateMutation.mutate(
      [{ key: setting.key, value: editValue }],
      { onSuccess: () => setEditingKey(null) },
    );
  };

  const handleCreate = () => {
    if (!createForm.key || !createForm.value) return;
    createMutation.mutate(
      {
        key: createForm.key,
        value: createForm.value,
        type: createForm.type || 'string',
        group: createForm.group || undefined,
        description: createForm.description || undefined,
      },
      { onSuccess: () => { setShowCreate(false); setCreateForm({ key: '', value: '', type: 'string', group: '', description: '' }); } },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Configure platform behavior and limits"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Settings' }]}
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors">
            <Plus className="w-4 h-4" /> Add Setting
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <SettingsIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No settings configured</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add your first system setting to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--surface-1)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{group}</h3>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {items.map((setting) => (
                  <div key={setting.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-mono" style={{ color: 'var(--text-primary)' }}>{setting.key}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{setting.type}</span>
                      </div>
                      {setting.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{setting.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingKey === setting.key ? (
                        <>
                          <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-48 px-2 py-1 text-sm rounded-md outline-none"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--color-primary)', color: 'var(--text-primary)' }}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(setting); if (e.key === 'Escape') setEditingKey(null); }}
                          />
                          <button onClick={() => handleSave(setting)} disabled={updateMutation.isPending} className="p-1 rounded-md" style={{ color: 'var(--color-success)' }}>
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingKey(null)} className="p-1 rounded-md" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-mono px-2 py-1 rounded-md max-w-[200px] truncate" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)' }}>
                            {setting.value}
                          </span>
                          <button onClick={() => handleStartEdit(setting)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(setting)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--color-danger)' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-danger-light)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Panel */}
      <DetailPanel open={showCreate} onClose={() => setShowCreate(false)} title="Add Setting">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Key *</label>
            <input value={createForm.key} onChange={(e) => setCreateForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. max_products_per_provider" className="w-full px-3 py-2 text-sm font-mono rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Value *</label>
            <input value={createForm.value} onChange={(e) => setCreateForm(f => ({ ...f, value: e.target.value }))} placeholder="Setting value" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
            <select value={createForm.type} onChange={(e) => setCreateForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Group</label>
            <input value={createForm.group} onChange={(e) => setCreateForm(f => ({ ...f, group: e.target.value }))} placeholder="e.g. Limits, Auth, Marketing" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <input value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this setting control?" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={handleCreate} disabled={createMutation.isPending || !createForm.key || !createForm.value} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Setting
          </button>
        </div>
      </DetailPanel>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Setting"
        description={`Delete setting "${deleteTarget?.key}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
