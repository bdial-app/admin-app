import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, MinusCircle, Search, Store, User, Phone, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useWaAudienceRecipients } from '../../hooks/useWhatsApp';
import { whatsappService } from '../../services/whatsapp.service';
import type { AudienceFilters, WaRecipientRow } from '../../types';
import { ConsentBadge } from './ConsentBadge';
import { INPUT_STYLE, SKIP_REASON_LABEL, apiErrorMessage } from './wa-utils';

const PAGE = 50;

const skipLabel = (r: string) => SKIP_REASON_LABEL[r as keyof typeof SKIP_REASON_LABEL] ?? r;

const KIND_ICON = { business: Store, customer: User, number: Phone } as const;
const KIND_LABEL = { business: 'Business', customer: 'Customer', number: 'Number' } as const;

/**
 * Everyone the audience reaches, one row each: search, see who is skipped and
 * why, drop individuals, or export the list.
 */
export function RecipientsDialog({
  open,
  onClose,
  filters,
  templateCategory,
  onExclude,
}: {
  open: boolean;
  onClose: () => void;
  filters: AudienceFilters;
  templateCategory: 'marketing' | 'utility';
  onExclude: (row: WaRecipientRow) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [show, setShow] = useState<'all' | 'sendable' | 'skipped'>('sendable');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const payload = useMemo(
    () => ({ filters, templateCategory, page, limit: PAGE, search: debounced || undefined, show }),
    [filters, templateCategory, page, debounced, show],
  );
  const { data, isFetching, isError, error } = useWaAudienceRecipients(payload, open);
  const totalPages = data?.meta.totalPages ?? 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await whatsappService.getAudienceRecipients({ filters, templateCategory, page: 1, limit: 10000, show: 'all' });
      const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
      const lines = [
        ['Type', 'Name', 'Owner', 'City', 'Phone', 'Consent', 'Will receive', 'Skip reason'].join(','),
        ...all.items.map((r) =>
          [KIND_LABEL[r.kind], r.name, r.ownerName, r.city, r.phone, r.consent, r.skipReason ? 'No' : 'Yes', r.skipReason ? skipLabel(r.skipReason) : '']
            .map((v) => esc(v ?? ''))
            .join(','),
        ),
      ];
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-recipients-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      if (all.meta.total > all.items.length) toast.info(`Exported the first ${all.items.length.toLocaleString('en-IN')} of ${all.meta.total.toLocaleString('en-IN')}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not export the list'));
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[900] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Recipients</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Remove anyone who shouldn't get this message — they stay excluded in this campaign.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 px-5 py-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, city or phone…" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus-ring" style={INPUT_STYLE} />
          </div>
          <div className="flex gap-1 p-1 rounded-lg shrink-0" style={{ background: 'var(--surface-1)' }}>
            {([['sendable', 'Will receive'], ['skipped', 'Skipped'], ['all', 'All']] as const).map(([v, label]) => (
              <button key={v} type="button" onClick={() => { setShow(v); setPage(1); }} className="px-3 py-1 text-xs font-medium rounded-md"
                style={{ background: show === v ? 'var(--surface-0)' : 'transparent', color: show === v ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: show === v ? 'var(--shadow-sm)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5">
          {isError ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-danger)' }}>{apiErrorMessage(error, 'Could not load recipients')}</p>
          ) : !data ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
          ) : data.items.length === 0 ? (
            <p className="text-sm py-10 text-center" style={{ color: 'var(--text-muted)' }}>No one matches.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
              {data.items.map((r) => {
                const Icon = KIND_ICON[r.kind];
                return (
                  <li key={`${r.kind}-${r.providerId ?? r.userId ?? r.phone}`} className="flex items-center gap-3 py-2.5" style={{ opacity: isFetching ? 0.6 : 1 }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--surface-2)' }} title={KIND_LABEL[r.kind]}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {[KIND_LABEL[r.kind], r.ownerName, r.city, r.phone].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {r.skipReason ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{skipLabel(r.skipReason)}</span>
                    ) : (
                      <ConsentBadge consent={r.consent} />
                    )}
                    <button type="button" onClick={() => onExclude(r)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md shrink-0" style={{ color: 'var(--color-danger)' }} title="Don't send to this one">
                      <MinusCircle className="w-3.5 h-3.5" /> Exclude
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
          <span>{data ? `${data.meta.total.toLocaleString('en-IN')} ${show === 'sendable' ? 'will receive' : show === 'skipped' ? 'skipped' : 'in total'}` : ''}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-md disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Previous</button>
            <span className="tabular-nums">{page} / {Math.max(1, totalPages)}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-md disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Next</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
