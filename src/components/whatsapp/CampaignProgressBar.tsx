import type { WaCampaignSummary } from '../../types';

interface Props {
  campaign: Pick<WaCampaignSummary, 'totalRecipients' | 'sentCount' | 'deliveredCount' | 'readCount' | 'failedCount' | 'skippedCount' | 'queuedCount'>;
  height?: number;
  showLegend?: boolean;
}

/**
 * Stacked bar over total recipients: read (dark green) ⊂ delivered (green) ⊂ sent (blue),
 * then failed (red) and skipped (grey); the rest is still queued.
 */
export function CampaignProgressBar({ campaign: c, height = 8, showLegend = false }: Props) {
  const total = Math.max(c.totalRecipients, 1);
  const read = c.readCount;
  const deliveredOnly = Math.max(0, c.deliveredCount - c.readCount);
  const sentOnly = Math.max(0, c.sentCount - c.deliveredCount);
  const pct = (n: number) => `${Math.min(100, (n / total) * 100)}%`;

  const segs = [
    { key: 'read', n: read, color: 'var(--color-success-dark)', label: 'Read' },
    { key: 'delivered', n: deliveredOnly, color: 'var(--color-success)', label: 'Delivered' },
    { key: 'sent', n: sentOnly, color: 'var(--color-info)', label: 'Sent' },
    { key: 'failed', n: c.failedCount, color: 'var(--color-danger)', label: 'Failed' },
    { key: 'skipped', n: c.skippedCount, color: 'var(--border-strong)', label: 'Skipped' },
  ];

  return (
    <div className="w-full">
      <div className="w-full flex overflow-hidden rounded-full" style={{ height, background: 'var(--surface-2)' }} title={`${c.sentCount}/${c.totalRecipients} sent`}>
        {segs.map((s) => s.n > 0 && (
          <div key={s.key} style={{ width: pct(s.n), background: s.color, transition: 'width .4s ease' }} />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {[...segs, { key: 'queued', n: c.queuedCount, color: 'var(--surface-3)', label: 'Queued' }].map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label} <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.n.toLocaleString('en-IN')}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default CampaignProgressBar;
