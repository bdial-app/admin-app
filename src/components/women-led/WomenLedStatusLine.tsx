import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useMinRole } from '../../hooks/usePermissions';
import { womenLedService } from '../../services/women-led.service';
import { apiErrorMessage } from '../whatsapp/wa-utils';

const LABEL: Record<string, { text: string; color: string }> = {
  approved: { text: 'Women-Led', color: '#7e22ce' },
  pending: { text: 'Waiting for review', color: '#b45309' },
  rejected: { text: 'Not approved', color: '#b91c1c' },
  revoked: { text: 'Removed by the team', color: '#b91c1c' },
  off: { text: 'Not Women-Led', color: 'var(--text-muted)' },
};

/**
 * Women-Led on a business's page. It changes only through requests: open
 * the request to review it, or (admins) mark it verified after checking in
 * person or by phone — recorded with your name.
 */
export function WomenLedStatusLine({ providerId, ownerName }: { providerId: string; ownerName?: string | null }) {
  const qc = useQueryClient();
  const isAdmin = useMinRole('admin');
  const [confirming, setConfirming] = useState(false);
  const { data } = useQuery({
    queryKey: ['women-led', 'business', providerId],
    queryFn: () => womenLedService.forProvider(providerId),
  });
  const grant = useMutation({
    mutationFn: () =>
      womenLedService.grant(providerId, {
        womanName: ownerName || undefined,
        role: 'owner',
        note: 'Verified by the team from the business page',
      }),
    onSuccess: () => {
      toast.success('Marked Women-Led (verified by you)');
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ['women-led'] });
      qc.invalidateQueries({ queryKey: ['provider'] });
      qc.invalidateQueries({ queryKey: ['providers'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not mark it')),
  });

  if (!data) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Women-Led: …</span>;
  const l = LABEL[data.state] ?? LABEL.off;
  const canGrant = isAdmin && ['off', 'rejected', 'revoked'].includes(data.state);

  return (
    <span className="inline-flex items-center gap-2 flex-wrap text-xs">
      <span style={{ color: 'var(--text-secondary)' }}>Women-Led:</span>
      <span className="font-semibold" style={{ color: l.color }}>{l.text}</span>
      {data.requestId && (
        <Link to={`/women-led?request=${data.requestId}`} className="inline-flex items-center gap-0.5 font-medium" style={{ color: 'var(--color-primary)' }}>
          {data.state === 'pending' ? 'Review' : 'Details'} <ExternalLink className="w-3 h-3" />
        </Link>
      )}
      {canGrant && !confirming && (
        <button type="button" onClick={() => setConfirming(true)} className="font-medium" style={{ color: 'var(--color-primary)' }}>
          Mark as verified
        </button>
      )}
      {canGrant && confirming && (
        <span className="inline-flex items-center gap-1.5">
          <span style={{ color: 'var(--text-secondary)' }}>You checked she owns or runs it?</span>
          <button type="button" disabled={grant.isPending} onClick={() => grant.mutate()} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-white disabled:opacity-50" style={{ background: '#9333ea' }}>
            {grant.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Yes, mark it
          </button>
          <button type="button" onClick={() => setConfirming(false)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </span>
      )}
    </span>
  );
}
