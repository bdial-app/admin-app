import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Layers, Plus, Pencil, Trash2, Megaphone, Calculator, Loader2, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { DetailPanel } from '../../components/ui/DetailPanel';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useHasPermission } from '../../hooks/usePermissions';
import {
  useWaContacts, useWaAudienceOptions, useWaSegments, useCreateWaSegment, useUpdateWaSegment, useDeleteWaSegment,
  usePreviewWaAudience, useWaThread, useWaSettings,
} from '../../hooks/useWhatsApp';
import { ConsentBadge } from '../../components/whatsapp/ConsentBadge';
import { MessageStatusIcon } from '../../components/whatsapp/MessageStatusIcon';
import { ContactEditor } from '../../components/whatsapp/ContactEditor';
import { AudienceBuilder } from '../../components/whatsapp/AudienceBuilder';
import { WaModal } from '../../components/whatsapp/WaModal';
import { WindowTimer } from '../../components/whatsapp/WindowTimer';
import { Skel } from '../../components/whatsapp/Skeleton';
import { WA_ROUTES, DEFAULT_AUDIENCE, fmtRelative, fmtDateTime, summarizeFilters, apiErrorMessage, INPUT_CLASS, INPUT_STYLE } from '../../components/whatsapp/wa-utils';
import { ROUTES } from '../../utils/constants';
import type { AudienceFilters, WaAudiencePreview, WaConsent, WaContact, WaSegment } from '../../types';

const LIMIT = 20;

export default function Audience() {
  const [tab, setTab] = useState<'contacts' | 'segments'>('contacts');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {([{ v: 'contacts', label: 'Contacts', icon: Users }, { v: 'segments', label: 'Segments', icon: Layers }] as const).map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors" style={{ background: tab === t.v ? 'var(--surface-0)' : 'transparent', color: tab === t.v ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t.v ? 'var(--shadow-sm)' : 'none' }}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      {tab === 'contacts' ? <ContactsTab /> : <SegmentsTab />}
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────
function ContactsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [consent, setConsent] = useState<WaConsent | ''>('');
  const [city, setCity] = useState('');
  const [hasProvider, setHasProvider] = useState<'' | 'yes' | 'no'>('');
  const [selected, setSelected] = useState<WaContact | null>(null);

  const { data: options } = useWaAudienceOptions();
  const { data, isLoading } = useWaContacts({
    page, limit: LIMIT, search: search || undefined, consent: consent || undefined, city: city || undefined,
    hasProvider: hasProvider === '' ? undefined : hasProvider === 'yes',
  });

  const sel = 'px-3 py-2 text-xs font-medium rounded-lg focus-ring';
  const selStyle = { background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' };

  const columns: Column<WaContact>[] = [
    { key: 'phone', header: 'Phone', render: (c) => (
      <div>
        <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.phone}</p>
        {c.displayName && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.displayName}</p>}
      </div>
    ) },
    { key: 'provider', header: 'Business', render: (c) => c.provider ? (
      <Link to={ROUTES.PROVIDER_VIEW.replace(':id', c.provider.id)} onClick={(e) => e.stopPropagation()} className="text-sm font-medium inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--text-primary)' }}>
        {c.provider.brandName} <ExternalLink className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
      </Link>
    ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'city', header: 'City', render: (c) => <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.provider?.city ?? '—'}</span> },
    { key: 'consent', header: 'Consent', render: (c) => <ConsentBadge consent={c.consent} /> },
    { key: 'reachable', header: 'Reachable', render: (c) => (
      <span className="text-xs font-medium" style={{ color: c.reachable ? 'var(--color-success)' : 'var(--color-danger)' }}>{c.reachable ? 'Yes' : 'Not on WhatsApp'}</span>
    ) },
    { key: 'lastOutboundAt', header: 'Last contacted', sortable: true, render: (c) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtRelative(c.lastOutboundAt)}{c.lastCampaignName ? <span className="block truncate max-w-[160px]">{c.lastCampaignName}</span> : null}</span> },
    { key: 'lastInboundAt', header: 'Last replied', sortable: true, render: (c) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtRelative(c.lastInboundAt)}</span> },
    { key: 'unreadCount', header: 'Unread', render: (c) => c.unreadCount ? <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: '#25D366' }}>{c.unreadCount}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0</span> },
    { key: 'tags', header: 'Tags', render: (c) => (
      <div className="flex flex-wrap gap-1 max-w-[180px]">
        {(c.tags ?? []).slice(0, 3).map((t) => <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{t}</span>)}
        {(c.tags?.length ?? 0) > 3 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{c.tags.length - 3}</span>}
      </div>
    ) },
  ];

  return (
    <>
      <DataTable<WaContact>
        columns={columns}
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchValue={search}
        searchPlaceholder="Search phone, name or business…"
        rowKey={(c) => c.id}
        onRowClick={setSelected}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={consent} onChange={(e) => { setConsent(e.target.value as WaConsent | ''); setPage(1); }} className={sel} style={selStyle}>
              <option value="">Any consent</option><option value="opted_in">Opted in</option><option value="unknown">Unknown</option><option value="opted_out">Opted out</option>
            </select>
            <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className={sel} style={selStyle}>
              <option value="">Any city</option>
              {(options?.cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={hasProvider} onChange={(e) => { setHasProvider(e.target.value as '' | 'yes' | 'no'); setPage(1); }} className={sel} style={selStyle}>
              <option value="">With or without business</option><option value="yes">Linked to a business</option><option value="no">No business</option>
            </select>
          </div>
        }
        emptyIcon={<Users className="w-8 h-8" />}
        emptyTitle="No contacts yet"
        emptyDescription="Contacts are created the first time you message a number or someone messages you."
      />

      <DetailPanel open={!!selected} onClose={() => setSelected(null)} title={selected?.provider?.brandName ?? selected?.displayName ?? selected?.phone ?? ''} subtitle={selected?.phone}>
        {selected && <ContactPanel key={selected.id} contact={selected} onSaved={setSelected} />}
      </DetailPanel>
    </>
  );
}

function ContactPanel({ contact, onSaved }: { contact: WaContact; onSaved: (c: WaContact) => void }) {
  const { data: thread, isLoading } = useWaThread(contact.id);
  const last = (thread?.items ?? []).slice(-5).reverse();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <ConsentBadge consent={contact.consent} size="md" />
        <WindowTimer expiresAt={thread?.windowExpiresAt} size="md" />
        {!contact.reachable && <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>Not on WhatsApp</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['Business', contact.provider ? <Link to={ROUTES.PROVIDER_VIEW.replace(':id', contact.provider.id)} className="hover:underline" style={{ color: 'var(--color-primary)' }}>{contact.provider.brandName}</Link> : '—'],
          ['City', contact.provider?.city ?? '—'],
          ['Messages sent', contact.messagesSent],
          ['Last campaign', contact.lastCampaignName ?? '—'],
          ['Last contacted', fmtDateTime(contact.lastOutboundAt)],
          ['Last replied', fmtDateTime(contact.lastInboundAt)],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{k}</p>
            <p className="font-medium mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{v}</p>
          </div>
        ))}
      </div>
      <ContactEditor contact={contact} onSaved={onSaved} />
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Last messages</p>
          <Link to={WA_ROUTES.thread(contact.id)} className="text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--color-primary)' }}><MessageCircle className="w-3 h-3" /> Open thread</Link>
        </div>
        {isLoading ? <div className="space-y-2"><Skel className="h-10" /><Skel className="h-10" /></div> : last.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No messages yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {last.map((m) => (
              <li key={m.id} className="p-2.5 rounded-lg text-xs" style={{ background: 'var(--surface-1)' }}>
                <div className="flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold" style={{ color: m.direction === 'inbound' ? 'var(--color-success)' : 'var(--color-primary)' }}>{m.direction === 'inbound' ? 'Them' : 'You'}</span>
                  <span>· {fmtRelative(m.createdAt)}</span>
                  {m.templateName && <span className="font-mono">· {m.templateName}</span>}
                  {m.direction === 'outbound' && <MessageStatusIcon status={m.status} size={13} />}
                </div>
                <p className="line-clamp-2" style={{ color: 'var(--text-primary)' }}>{m.body || `[${m.kind}]`}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Segments ──────────────────────────────────────────────
function SegmentsTab() {
  const navigate = useNavigate();
  const canManage = useHasPermission('whatsapp.send');
  const { data: segments = [], isLoading } = useWaSegments();
  const remove = useDeleteWaSegment();
  const previewMut = usePreviewWaAudience();
  const [counts, setCounts] = useState<Record<string, WaAudiencePreview | 'loading'>>({});
  const [editing, setEditing] = useState<WaSegment | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WaSegment | null>(null);

  const count = async (s: WaSegment) => {
    setCounts((c) => ({ ...c, [s.id]: 'loading' }));
    try {
      const p = await previewMut.mutateAsync({ filters: s.filters });
      setCounts((c) => ({ ...c, [s.id]: p }));
    } catch (e) {
      setCounts((c) => { const n = { ...c }; delete n[s.id]; return n; });
      toast.error(apiErrorMessage(e, 'Could not count the segment'));
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    try { await remove.mutateAsync(deleting.id); toast.success('Segment deleted'); } catch (e) { toast.error(apiErrorMessage(e, 'Could not delete')); }
    setDeleting(null);
  };

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skel key={i} className="h-40" />)}</div>;

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Saved audience filters. Counts are computed on demand so they always reflect today’s data.</p>
        {canManage && (
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}><Plus className="w-4 h-4" /> New segment</button>
        )}
      </div>

      {segments.length === 0 ? (
        <div className="card"><EmptyState icon={Layers} title="No saved segments" description="Build a filter once and reuse it for every campaign — e.g. “Hyderabad bakeries without products”." action={canManage ? { label: 'Create a segment', onClick: () => setEditing('new') } : undefined} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {segments.map((s) => {
            const c = counts[s.id];
            return (
              <div key={s.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</h3>
                    {s.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.description}</p>}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditing(s)} className="p-1.5 rounded-md hover:opacity-70" style={{ color: 'var(--text-muted)' }} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleting(s)} className="p-1.5 rounded-md hover:opacity-70" style={{ color: 'var(--color-danger)' }} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                <ul className="flex flex-wrap gap-1">
                  {summarizeFilters(s.filters).map((f) => <li key={f} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{f}</li>)}
                </ul>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  {c === 'loading' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Counting…</span>
                  ) : c ? (
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{c.sendable.toLocaleString('en-IN')}</strong> sendable · {c.total.toLocaleString('en-IN')} matched</span>
                  ) : (
                    <button onClick={() => count(s)} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}><Calculator className="w-3.5 h-3.5" /> Count now</button>
                  )}
                  {canManage && (
                    <button onClick={() => navigate(WA_ROUTES.campaignNew, { state: { audience: s.filters, name: `${s.name} · ${new Date().toLocaleDateString('en-IN', { month: 'short' })}` } })} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
                      <Megaphone className="w-3.5 h-3.5" /> Start campaign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <SegmentModal key={editing === 'new' ? 'new' : editing.id} segment={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={onDelete} variant="danger" isLoading={remove.isPending} title={`Delete “${deleting?.name}”?`} description="Campaigns already created from this segment keep their own audience snapshot." confirmLabel="Delete" />
    </>
  );
}

function SegmentModal({ segment, onClose }: { segment: WaSegment | null; onClose: () => void }) {
  const { data: settings } = useWaSettings();
  const create = useCreateWaSegment();
  const update = useUpdateWaSegment();
  const [name, setName] = useState(segment?.name ?? '');
  const [description, setDescription] = useState(segment?.description ?? '');
  const [filters, setFilters] = useState<AudienceFilters>(segment?.filters ?? { ...DEFAULT_AUDIENCE });

  const save = async () => {
    if (!name.trim()) { toast.error('Give the segment a name'); return; }
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, filters };
      if (segment) await update.mutateAsync({ id: segment.id, payload }); else await create.mutateAsync(payload);
      toast.success(segment ? 'Segment updated' : 'Segment created');
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, 'Could not save the segment')); }
  };

  const busy = create.isPending || update.isPending;
  return (
    <WaModal
      open
      onClose={onClose}
      title={segment ? 'Edit segment' : 'New segment'}
      width="1100px"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {segment ? 'Save changes' : 'Create segment'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" className={INPUT_CLASS} style={INPUT_STYLE} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className={INPUT_CLASS} style={INPUT_STYLE} />
        </div>
        <AudienceBuilder value={filters} onChange={setFilters} rates={settings?.rates} allowSegments={false} />
      </div>
    </WaModal>
  );
}
