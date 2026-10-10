/**
 * Sends admin-console errors to the admin Logs (POST /logs/client): crashes,
 * unhandled rejections, and API calls that failed on the server or got no
 * answer — with the page, and the server's request id for failed calls.
 * Batched, deduplicated, never throws, never reports itself.
 */
import { API_BASE_URL } from './constants';

const ENDPOINT = `${API_BASE_URL.replace(/\/+$/, '')}/logs/client`;
const VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || 'admin';

type AdminErrorEvent = {
  kind: 'js_error' | 'unhandled_rejection' | 'api_error';
  message: string;
  stack?: string;
  method?: string;
  apiPath?: string;
  status?: number;
  requestId?: string;
};

const queue: Record<string, unknown>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const recent = new Map<string, number>();
let installed = false;

export const ADMIN_PLATFORM = 'admin';
export const ADMIN_VERSION = VERSION;

async function flush() {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 25);
  try {
    const token = localStorage.getItem('token');
    await fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-Platform': ADMIN_PLATFORM, 'X-App-Version': VERSION, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ events }),
    });
  } catch {
    // lost, harmlessly
  }
  if (queue.length) timer = setTimeout(flush, 2000);
}

export function reportError(e: AdminErrorEvent): void {
  try {
    const key = `${e.kind}|${e.apiPath ?? ''}|${e.message.slice(0, 160)}`;
    const now = Date.now();
    if ((recent.get(key) ?? 0) > now - 60_000) return;
    recent.set(key, now);
    if (recent.size > 200) recent.clear();
    queue.push({
      level: 'error',
      kind: e.kind,
      message: e.message.slice(0, 2000),
      stack: e.stack?.slice(0, 8000),
      screen: window.location.pathname,
      method: e.method,
      apiPath: e.apiPath?.split('?')[0],
      status: e.status,
      requestId: e.requestId,
      platform: ADMIN_PLATFORM,
      appVersion: VERSION,
    });
    if (queue.length >= 10) void flush();
    else if (!timer) timer = setTimeout(flush, 3000);
  } catch {
    // never break the console
  }
}

export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (ev) => {
    if (!ev.message) return;
    reportError({ kind: 'js_error', message: ev.message, stack: (ev.error as Error | undefined)?.stack });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason as { message?: string; stack?: string; isAxiosError?: boolean } | undefined;
    if (reason?.isAxiosError) return;
    reportError({ kind: 'unhandled_rejection', message: reason?.message ?? String(ev.reason), stack: reason?.stack });
  });
  window.addEventListener('pagehide', () => void flush());
}
