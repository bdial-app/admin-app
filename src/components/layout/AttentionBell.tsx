import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, Inbox, Send } from 'lucide-react';
import { useAttention, useMarkSeen } from '../../hooks/useAttention';
import { useWaUnreadCount } from '../../hooks/useWhatsApp';
import { usePermissionChecker } from '../../hooks/usePermissions';
import type { FreshKey } from '../../services/attention.service';
import { ROUTES } from '../../utils/constants';
import { ATTENTION_ITEMS, attentionCount, queueBreakdown, toneColor, type AttentionItem } from './attention-items';
import { CountBadge } from './CountBadge';

/**
 * The header inbox: everything waiting on admins and everything new since you
 * last looked, in one list — each row opens the page it's about.
 */
export function AttentionBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useAttention();
  const { data: waUnread } = useWaUnreadCount();
  const markSeen = useMarkSeen();
  const { minRole } = usePermissionChecker();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const visible = ATTENTION_ITEMS.filter((i) => !i.minRole || minRole(i.minRole));
  const withCount = (i: AttentionItem) => ({ item: i, count: attentionCount(i, data, waUnread) });
  // The queue already includes verifications, reports, deals… — list it once.
  const waitingRows = visible
    .filter((i) => i.source.kind === 'whatsapp' || (i.source.kind === 'waiting' && ['queue', 'womenLed'].includes(i.source.key)))
    .map(withCount).filter((r) => r.count > 0);
  const freshRows = visible.filter((i) => i.source.kind === 'fresh').map(withCount).filter((r) => r.count > 0);
  const waitingTotal = waitingRows.reduce((n, r) => n + r.count, 0);
  const freshTotal = freshRows.reduce((n, r) => n + r.count, 0);

  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg transition-colors focus-ring"
        style={{ color: open ? 'var(--text-primary)' : 'var(--text-muted)', background: open ? 'var(--surface-2)' : 'transparent' }}
        title={waitingTotal ? `${waitingTotal} waiting on you` : freshTotal ? `${freshTotal} new` : 'All caught up'}
        aria-label="Inbox"
        aria-expanded={open}
      >
        <Bell className="w-[18px] h-[18px]" />
        {waitingTotal > 0 ? (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white tabular-nums ring-2"
            style={{ background: 'var(--color-danger)', ['--tw-ring-color' as string]: 'var(--surface-0)' }}
          >
            {waitingTotal > 99 ? '99+' : waitingTotal}
          </span>
        ) : freshTotal > 0 ? (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2" style={{ background: 'var(--color-primary)', ['--tw-ring-color' as string]: 'var(--surface-0)' }} />
        ) : null}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden animate-fade-in"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: '0 16px 48px rgba(15,23,42,0.18)' }}
          role="dialog"
          aria-label="Inbox"
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Inbox</p>
            {freshTotal > 0 && (
              <button
                onClick={() => markSeen.mutate(freshRows.map((r) => (r.item.source as { key: FreshKey }).key))}
                className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all seen
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,520px)] overflow-y-auto">
            {waitingTotal === 0 && freshTotal === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <Inbox className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>You're all caught up</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Nothing is waiting and nothing new since you last looked.</p>
              </div>
            ) : (
              <>
                {waitingRows.length > 0 && (
                  <Group title="Needs you">
                    {waitingRows.map(({ item, count }) => (
                      <Row
                        key={item.path}
                        item={item}
                        count={count}
                        detail={item.source.kind === 'waiting' && item.source.key === 'queue' && data ? queueBreakdown(data.waiting) : undefined}
                        onClick={() => go(item.path)}
                      />
                    ))}
                  </Group>
                )}
                {freshRows.length > 0 && (
                  <Group title="New since you last looked">
                    {freshRows.map(({ item, count }) => (
                      <Row key={item.path} item={item} count={count} onClick={() => go(item.path)} />
                    ))}
                  </Group>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => go(ROUTES.NOTIFICATIONS)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-1)]"
            style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}
          >
            <Send className="w-3.5 h-3.5" /> Send a push notification to users
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {children}
    </div>
  );
}

function Row({ item, count, detail, onClick }: { item: AttentionItem; count: number; detail?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-1)]">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: toneColor(item.tone) }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.describe(count)}</span>
        <span className="block text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{detail || item.label}</span>
      </span>
      <CountBadge count={count} tone={item.tone} />
      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
