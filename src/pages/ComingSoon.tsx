import { Construction } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

export default function ComingSoon() {
  return (
    <div>
      <PageHeader title="Coming Soon" />
      <div
        className="rounded-xl p-12 flex flex-col items-center gap-4"
        style={{
          background: 'var(--surface-0)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'var(--color-primary-light)' }}
        >
          <Construction className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Under Construction
        </h2>
        <p className="text-sm text-center max-w-md" style={{ color: 'var(--text-muted)' }}>
          This section is being built and will be available soon. Check back later for updates.
        </p>
      </div>
    </div>
  );
}
