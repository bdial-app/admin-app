import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentRole } from '../hooks/usePermissions';
import { ADMIN_ROLE_LABELS } from '../types/roles';
import type { AdminRole } from '../types/roles';

export default function Unauthorized() {
  const role = useCurrentRole();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--color-danger-light)' }}
        >
          <ShieldAlert className="w-8 h-8" style={{ color: 'var(--color-danger)' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Access Denied
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Your role ({ADMIN_ROLE_LABELS[role as AdminRole] || role}) does not have permission to access this page.
          Contact a Super Admin if you need elevated access.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
