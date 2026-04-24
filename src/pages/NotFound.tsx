import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl font-bold" style={{ color: 'var(--text-muted)' }}>404</p>
      <p className="text-lg font-medium mt-2" style={{ color: 'var(--text-primary)' }}>Page not found</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>The page you're looking for doesn't exist or has been moved.</p>
      <button
        onClick={() => navigate(ROUTES.DASHBOARD)}
        className="mt-6 px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary hover:bg-primary-dark transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
