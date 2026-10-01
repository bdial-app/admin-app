import { useEffect, useState } from 'react';
import { Clock, Lock } from 'lucide-react';

interface Props {
  /** ISO time the 24h customer-service window closes; null when never opened. */
  expiresAt: string | null | undefined;
  size?: 'sm' | 'md';
}

const fmt = (ms: number) => {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0 && m <= 0) return 'under a minute';
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

/** "Free replies for 23h 12m" countdown or "Window closed — send a template". */
export function WindowTimer({ expiresAt, size = 'sm' }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ms = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const open = ms > 0;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{
        background: open ? 'var(--color-success-light)' : 'var(--surface-2)',
        color: open ? 'var(--color-success-dark)' : 'var(--text-muted)',
      }}
      title={open ? `Customer-service window closes at ${new Date(expiresAt!).toLocaleString('en-IN')}` : 'The contact has not messaged in the last 24h'}
    >
      {open ? <Clock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {open ? `Free replies for ${fmt(ms)}` : 'Window closed — send a template'}
    </span>
  );
}

export default WindowTimer;
