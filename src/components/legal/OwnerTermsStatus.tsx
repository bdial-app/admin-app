import { useUserLegalAcceptances } from '../../hooks/useLegal';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const METHOD: Record<string, string> = {
  signin_prompt: 'in the app',
  business_onboarding: 'when listing',
};

/** Whether a user has accepted the terms that apply to them, for compliance checks. */
export function OwnerTermsStatus({ userId }: { userId: string | null | undefined }) {
  const { data, isLoading, isError } = useUserLegalAcceptances(userId);
  if (!userId) return <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>—</p>;
  if (isLoading) return <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Checking…</p>;
  if (isError || !data) return <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Unavailable</p>;
  const latest = data.acceptances[0];
  if (data.pending.length) {
    return (
      <div className="mt-0.5">
        <p className="text-sm font-medium text-amber-600">Not yet accepted</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Asked on next sign-in: {data.pending.map((p) => p.title).join(', ')}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-0.5">
      <p className="text-sm font-medium text-emerald-600">Accepted</p>
      {latest && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {fmt(latest.acceptedAt)} {METHOD[latest.method] ?? ''}
          {latest.platform ? ` · ${latest.platform}` : ''}
        </p>
      )}
    </div>
  );
}
