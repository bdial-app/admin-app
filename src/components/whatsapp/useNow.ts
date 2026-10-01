import { useEffect, useState } from 'react';

/** Current time as state, refreshed every `intervalMs`, so render stays pure (no `Date.now()` in render). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
