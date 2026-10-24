import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, BadgeCheck, Check, Loader2, Lock, MessageCircle, RotateCw, ShieldCheck } from 'lucide-react';
import { sendOtp, verifyOtp } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store/store';
import { ROUTES } from '../utils/constants';
import { OtpInput } from '../components/auth/OtpInput';
import logo from '../assets/logo.jpeg';

const CODE_LENGTH = 6;
/** The API won't send another code for a minute. */
const RESEND_AFTER_MS = 60_000;
const LAST_MOBILE_KEY = 'tj_admin_last_mobile';

const readLastMobile = () => {
  try { return localStorage.getItem(LAST_MOBILE_KEY) ?? ''; } catch { return ''; }
};
const saveLastMobile = (m: string) => {
  try { localStorage.setItem(LAST_MOBILE_KEY, m); } catch { /* private window */ }
};

/** "+91 98765-43210", "098765 43210" or a paste with spaces → "9876543210". */
const toMobile = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  if (d.length > 10 && (d.startsWith('91') || d.startsWith('0'))) return d.slice(-10);
  return d.slice(0, 10);
};
const prettyMobile = (m: string) => (m.length > 5 ? `${m.slice(0, 5)} ${m.slice(5)}` : m);

/** Only paths inside the admin, never another site. */
const safeNext = (p: unknown) =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith(ROUTES.LOGIN) ? p : ROUTES.DASHBOARD;

/** The API's messages, in words an admin can act on. */
function friendly(raw: unknown): { text: string; expired?: boolean } {
  const msg = (Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : '').toLowerCase();
  if (/user not found|access denied|not_admin/.test(msg))
    return { text: 'This number doesn’t have admin access. Ask a super admin to add it to your account.' };
  if (/recently sent|too many|throttl/.test(msg))
    return { text: 'Too many codes asked for. Wait a minute, then try again.' };
  if (/invalid otp/.test(msg)) return { text: 'That code isn’t right. Check the SMS and try again.' };
  if (/expired|no otp found/.test(msg)) return { text: 'That code has expired. Send a new one.', expired: true };
  if (/failed to (send|verify) otp|network/.test(msg) || !msg)
    return { text: 'Couldn’t reach Tijarah. Check your connection and try again.' };
  return { text: Array.isArray(raw) ? raw.join(' ') : String(raw) };
}

/* ── Brand side ────────────────────────────────────────────────────────── */

/** Eight-point stars, the old geometric pattern — faint, behind everything. */
function StarLattice({ id }: { id: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#fff" strokeWidth="1">
            <rect x="20" y="20" width="24" height="24" />
            <rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)" />
            <path d="M0 32h15M49 32h15M32 0v15M32 49v15" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

const WORK = [
  { icon: BadgeCheck, title: 'Business verified', note: 'ID checked · listing is live', tint: '#34D399' },
  { icon: Award, title: 'Tijarah Pick given', note: 'Shown on the business page for 3 months', tint: '#FFC000' },
  { icon: MessageCircle, title: 'Template approved by Meta', note: 'Ready to send on WhatsApp', tint: '#60A5FA' },
];

function BrandPanel() {
  return (
    <aside
      className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden flex-col justify-between p-12 xl:p-16 text-white"
      style={{ background: 'linear-gradient(160deg, #23246E 0%, #2C2D89 45%, #2D2DB3 100%)' }}
    >
      <div className="absolute inset-0 opacity-[0.07]"><StarLattice id="tj-stars-lg" /></div>
      {/* Warm light from the corner, the logo's amber */}
      <div
        className="absolute -right-40 -bottom-40 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,192,0,0.14) 0%, rgba(255,192,0,0) 60%)' }}
      />
      <div
        className="absolute -left-32 -top-32 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(129,131,255,0.30) 0%, rgba(129,131,255,0) 70%)' }}
      />

      <div className="relative flex items-center gap-3">
        <img src={logo} alt="" className="w-11 h-11 rounded-xl shadow-lg ring-1 ring-white/20" />
        <div className="leading-tight">
          <p className="text-[17px] font-bold tracking-tight">tijarah</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#FFC000' }}>Admin</p>
        </div>
      </div>

      <div className="relative max-w-lg">
        <h2 className="text-[40px] xl:text-[46px] font-bold leading-[1.08] tracking-tight">
          Keep Tijarah <span style={{ color: '#FFC000' }}>trusted</span>,<br />one business at a time.
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-white/70 max-w-md">
          Verify businesses, look after what’s listed, and help the community find each other — all from here.
        </p>

        <ul className="mt-10 space-y-3 max-w-sm" aria-label="What you do here">
          {WORK.map((w, i) => (
            <li
              key={w.title}
              className="tj-float flex items-center gap-3 rounded-2xl px-4 py-3 bg-white/[0.08] backdrop-blur-md ring-1 ring-white/10 shadow-[0_8px_30px_rgba(10,10,60,0.25)]"
              style={{ marginLeft: i * 28, animationDelay: `${i * 0.9}s` }}
            >
              <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${w.tint} 20%, transparent)` }}>
                <w.icon className="w-[18px] h-[18px]" style={{ color: w.tint }} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{w.title}</span>
                <span className="block text-xs text-white/60 truncate">{w.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center justify-between text-xs text-white/45">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> For the Tijarah team only</span>
        <span>© {new Date().getFullYear()} Tijarah</span>
      </div>
    </aside>
  );
}

/* ── Sign-in ───────────────────────────────────────────────────────────── */

type Step = 'phone' | 'code';

const Login = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const next = safeNext((location.state as { from?: string } | null)?.from ?? params.get('next'));

  const [step, setStep] = useState<Step>('phone');
  const [mobile, setMobile] = useState(readLastMobile);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  /** Only in development: the API hands back the code it "sent". */
  const [testCode, setTestCode] = useState<string | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Sign in · Tijarah Admin';
    return () => { document.title = prev; };
  }, []);

  // Tick for the resend countdown, only while it runs.
  const waiting = step === 'code' && cooldownUntil > now;
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [waiting]);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  if (isAuthenticated && !verifying && !success) return <Navigate to={next} replace />;

  const phoneValid = mobile.length === 10;

  const requestCode = async (resend = false) => {
    if (!phoneValid || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await dispatch(sendOtp(mobile));
      if (sendOtp.fulfilled.match(r)) {
        const payload = r.payload as { otp?: string } | undefined;
        setTestCode(payload?.otp ?? null);
        saveLastMobile(mobile);
        setCode('');
        const t = Date.now();
        setNow(t);
        setCooldownUntil(t + RESEND_AFTER_MS);
        setResentAt(resend ? t : null);
        setStep('code');
      } else {
        setError(friendly(r.payload).text);
        if (resend) setErrorKey((k) => k + 1);
      }
    } finally {
      setSending(false);
    }
  };

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const r = await dispatch(verifyOtp({ mobileNumber: mobile, otp: value }));
      if (verifyOtp.fulfilled.match(r)) {
        setSuccess(true);
        window.setTimeout(() => navigate(next, { replace: true }), 550);
      } else {
        const f = friendly(r.payload);
        setError(f.text);
        setErrorKey((k) => k + 1);
        setCode('');
        if (f.expired) setCooldownUntil(0);
      }
    } finally {
      setVerifying(false);
    }
  };

  const onPhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!phoneValid) {
      setError('Enter your 10-digit mobile number.');
      phoneRef.current?.focus();
      return;
    }
    requestCode(false);
  };

  const backToPhone = () => {
    setStep('phone');
    setError(null);
    setCode('');
    setTestCode(null);
    window.setTimeout(() => phoneRef.current?.select(), 0);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-0)' }}>
      <BrandPanel />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Small screens: the brand as a band on top */}
        <div
          className="lg:hidden relative overflow-hidden px-6 pt-7 pb-14 text-white"
          style={{ background: 'linear-gradient(160deg, #23246E 0%, #2C2D89 50%, #2D2DB3 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.08]"><StarLattice id="tj-stars-sm" /></div>
          <div className="relative flex items-center gap-3">
            <img src={logo} alt="" className="w-10 h-10 rounded-xl ring-1 ring-white/20" />
            <div className="leading-tight">
              <p className="text-base font-bold">tijarah</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#FFC000' }}>Admin</p>
            </div>
          </div>
          <p className="relative mt-5 text-[15px] font-semibold leading-snug">
            Keep Tijarah <span style={{ color: '#FFC000' }}>trusted</span>, one business at a time.
          </p>
        </div>

        <div className="relative flex-1 flex items-start lg:items-center justify-center px-4 sm:px-10 -mt-8 lg:mt-0">
          <div
            className="w-full max-w-[400px] rounded-3xl lg:rounded-none p-6 sm:p-8 lg:p-0 shadow-[0_10px_40px_rgba(30,31,92,0.12)] lg:shadow-none"
            style={{ background: 'var(--surface-0)' }}
          >
            <div key={step} className="tj-step-in">
              {step === 'phone' ? (
                <form onSubmit={onPhoneSubmit} noValidate>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--tj-indigo)' }}>Step 1 of 2</p>
                  <h1 className="mt-2 text-[28px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sign in with the mobile number on your admin account. We’ll text you a code.
                  </p>

                  <label htmlFor="mobile" className="block mt-8 mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Mobile number
                  </label>
                  <div
                    className="tj-field flex items-stretch h-14 rounded-2xl overflow-hidden transition-shadow"
                    style={{ border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}`, background: 'var(--surface-0)' }}
                  >
                    <span className="flex items-center gap-1.5 pl-4 pr-3 text-[15px] font-semibold select-none" style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border-default)', background: 'var(--surface-1)' }}>
                      <span aria-hidden="true">🇮🇳</span> +91
                    </span>
                    <input
                      ref={phoneRef}
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      autoFocus
                      value={prettyMobile(mobile)}
                      onChange={(e) => { setMobile(toMobile(e.target.value)); setError(null); }}
                      onFocus={(e) => e.target.select()}
                      placeholder="98765 43210"
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? 'login-error' : 'mobile-hint'}
                      className="flex-1 min-w-0 px-4 bg-transparent outline-none text-lg font-semibold tracking-wide placeholder:font-normal"
                      style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                    />
                    {phoneValid && (
                      <span className="flex items-center pr-4" aria-hidden="true">
                        <Check className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                      </span>
                    )}
                  </div>
                  {error ? (
                    <p id="login-error" role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
                  ) : (
                    <p id="mobile-hint" className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {mobile.length > 0 && !phoneValid ? `${10 - mobile.length} more digit${10 - mobile.length === 1 ? '' : 's'}` : 'Only numbers with admin access can sign in.'}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="tj-cta mt-7 w-full h-13 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-all disabled:cursor-wait"
                  >
                    {sending ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending code…</> : <>Send code <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); verify(code); }} noValidate>
                  <button
                    type="button"
                    onClick={backToPhone}
                    className="inline-flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded-md text-sm font-medium focus-ring"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--tj-indigo)' }}>Step 2 of 2</p>
                  <h1 className="mt-2 text-[28px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Enter the code</h1>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    We texted a 6-digit code to{' '}
                    <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>+91 {prettyMobile(mobile)}</span>.{' '}
                    <button type="button" onClick={backToPhone} className="font-semibold underline-offset-2 hover:underline focus-ring rounded" style={{ color: 'var(--tj-indigo)' }}>
                      Wrong number?
                    </button>
                  </p>

                  <div className="mt-8">
                    <OtpInput
                      value={code}
                      onChange={(v) => {
                        setCode(v);
                        setError(null);
                        if (v.length === CODE_LENGTH) verify(v);
                      }}
                      disabled={verifying || success}
                      error={!!error}
                      errorKey={errorKey}
                      success={success}
                      autoFocus
                      describedBy={error ? 'login-error' : 'code-hint'}
                    />
                  </div>

                  <div className="mt-3 min-h-[20px]" aria-live="polite">
                    {success ? (
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                        <Check className="w-4 h-4" /> Signed in — opening the dashboard
                      </p>
                    ) : verifying ? (
                      <p className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-4 h-4 animate-spin" /> Checking…
                      </p>
                    ) : error ? (
                      <p id="login-error" role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
                    ) : resentAt ? (
                      <p id="code-hint" className="text-sm" style={{ color: 'var(--color-success)' }}>New code sent. The earlier one no longer works.</p>
                    ) : (
                      <p id="code-hint" className="text-xs" style={{ color: 'var(--text-muted)' }}>The code works for 5 minutes. You can paste it.</p>
                    )}
                  </div>

                  {testCode && !success && (
                    <button
                      type="button"
                      onClick={() => { setCode(testCode); verify(testCode); }}
                      className="mt-4 w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm focus-ring"
                      style={{ background: 'color-mix(in srgb, #FFC000 14%, transparent)', color: 'var(--text-secondary)', border: '1px dashed color-mix(in srgb, #FFC000 60%, transparent)' }}
                    >
                      <span>Test mode — code <span className="font-mono font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>{testCode}</span></span>
                      <span className="font-semibold" style={{ color: 'var(--tj-indigo)' }}>Fill in</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={code.length !== CODE_LENGTH || verifying || success}
                    className={`tj-cta mt-6 w-full h-13 flex items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-all ${success ? 'tj-cta-done' : ''}`}
                  >
                    {success ? <><Check className="w-5 h-5" /> Signed in</> : verifying ? <><Loader2 className="w-5 h-5 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="w-5 h-5" /></>}
                  </button>

                  <div className="mt-5 flex items-center justify-center text-sm min-h-[20px]" style={{ color: 'var(--text-muted)' }}>
                    {success ? null : secondsLeft > 0 ? (
                      <span>
                        Didn’t get it? Send again in{' '}
                        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          0:{String(secondsLeft).padStart(2, '0')}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => requestCode(true)}
                        disabled={sending || success}
                        className="inline-flex items-center gap-1.5 font-semibold rounded-md px-1 focus-ring disabled:opacity-60"
                        style={{ color: 'var(--tj-indigo)' }}
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} Send a new code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <Lock className="w-3.5 h-3.5 shrink-0 mt-px" />
              Only the Tijarah team can sign in here. Every sign-in is recorded.
            </p>
          </div>
        </div>

        <p className="lg:hidden text-center text-[11px] py-6" style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Tijarah</p>
      </main>
    </div>
  );
};

export default Login;
