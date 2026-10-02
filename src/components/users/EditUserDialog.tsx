import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Loader2, ShieldCheck, Smartphone, CheckCircle2, AlertTriangle,
  RotateCw, Pencil, ArrowLeft,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { FormField } from '../ui/FormField';
import { OtpCodeInput } from '../ui/OtpCodeInput';
import { PermissionGate } from '../auth/PermissionGate';
import { useUpdateUser, useUpdateUserMobile } from '../../hooks/useUsers';
import { useAdminSendOtp } from '../../hooks/useAdminCreate';
import { adminCreateService } from '../../services/admin-create.service';
import type { User, Gender, UserRole, UserStatus } from '../../types';

/** The purpose is scoped so a code issued elsewhere cannot be replayed here. */
const OTP_PURPOSE = 'user_mobile_change';

/** The shape our Nest API puts in a 4xx body. */
type ApiError = {
  response?: {
    data?: { message?: string; field?: string; retryAfterSeconds?: number };
  };
};

const errBody = (err: unknown) => (err as ApiError)?.response?.data;

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  /** Fired after any successful write so the parent can refresh its copy. */
  onSaved?: (user: User) => void;
}

type ProfileDraft = {
  name: string;
  email: string;
  gender: Gender;
  city: string;
  area: string;
  pincode: string;
  role: UserRole;
  status: UserStatus;
};

const draftFrom = (u: User): ProfileDraft => ({
  name: u.name ?? '',
  email: u.email ?? '',
  gender: u.gender,
  city: u.city ?? '',
  area: u.area ?? '',
  pincode: u.pincode ?? '',
  role: u.role,
  status: u.status,
});

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

const fieldClass = 'w-full px-3 py-2 text-sm rounded-lg focus-ring';

/** 'male' → 'Male', for option labels built from the enum. */
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function EditUserDialog({ user, open, onClose, onSaved }: EditUserDialogProps) {
  if (!open || !user) return null;
  return <EditUserForm key={user.id} user={user} onClose={onClose} onSaved={onSaved} />;
}

function EditUserForm({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved?: (user: User) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(user));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Phone changing is its own small flow: idle → entering → code sent → done.
  const [phoneStep, setPhoneStep] = useState<'idle' | 'entry' | 'code'>('idle');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpInvalid, setOtpInvalid] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [checked, setChecked] = useState<{ phone: string; holder: string | null } | null>(null);

  const updateUser = useUpdateUser();
  const updateMobile = useUpdateUserMobile();
  const sendOtp = useAdminSendOtp();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(draftFrom(user)),
    [draft, user],
  );

  // Worth knowing the number is taken before spending an SMS on it.
  const lookupReady =
    phoneStep === 'entry' && /^\d{10}$/.test(newPhone) && newPhone !== user.mobileNumber;

  useEffect(() => {
    if (!lookupReady) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await adminCreateService.checkUser(newPhone);
        if (!cancelled) {
          setChecked({ phone: newPhone, holder: res?.exists ? res.user?.name || 'another account' : null });
        }
      } catch {
        // A failed lookup is not a verdict; leave it unresolved and let the
        // server be the one to reject a duplicate.
        if (!cancelled) setChecked(null);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t); };
  }, [lookupReady, newPhone]);

  const availability = useMemo((): { state: 'idle' | 'checking' | 'free' } | { state: 'taken'; holder: string } => {
    if (!lookupReady) return { state: 'idle' };
    if (!checked || checked.phone !== newPhone) return { state: 'checking' };
    return checked.holder ? { state: 'taken', holder: checked.holder } : { state: 'free' };
  }, [lookupReady, checked, newPhone]);

  const close = useCallback(() => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [close]);

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const handleSaveProfile = async () => {
    if (!draft.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    try {
      const saved = await updateUser.mutateAsync({ id: user.id, body: draft as Partial<User> });
      toast.success('User details updated');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const data = errBody(err);
      if (data?.field && data.message) setErrors({ [data.field]: data.message });
      toast.error(data?.message || 'Failed to update user');
    }
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(newPhone)) {
      toast.error('Enter a valid 10-digit number');
      return;
    }
    try {
      const res = await sendOtp.mutateAsync({ mobileNumber: newPhone, purpose: OTP_PURPOSE });
      setPhoneStep('code');
      setOtp('');
      setOtpInvalid(false);
      setCountdown(60);
      if (res.data?.otp) setDevOtp(res.data.otp);
      toast.success(`Code sent to ${newPhone}`);
    } catch (err) {
      const data = errBody(err);
      if (data?.retryAfterSeconds) setCountdown(data.retryAfterSeconds);
      toast.error(data?.message || 'Could not send the code');
    }
  };

  const handleVerifyAndSave = async (code: string) => {
    try {
      const saved = await updateMobile.mutateAsync({ id: user.id, mobileNumber: newPhone, otp: code });
      toast.success('Login number updated');
      setPhoneStep('idle');
      setDevOtp('');
      onSaved?.(saved);
    } catch (err) {
      setOtpInvalid(true);
      setOtp('');
      toast.error(errBody(err)?.message || 'Could not verify the code');
    }
  };

  const currentPhone = user.mobileNumber || '—';
  const busy = updateUser.isPending || updateMobile.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4"
      onClick={close}
    >
      <div
        className="w-[min(580px,100%)] max-h-[88vh] flex flex-col overflow-hidden rounded-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${user.name}`}
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-default)' }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--color-primary)' }}
          >
            {(user.name || '?')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              Edit {user.name}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentPhone}</p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* ── Login number ───────────────────────────────────────────
              Kept apart from the rest of the form because it is identity,
              it saves on its own, and it needs a code to go through. */}
          <section
            className="rounded-xl p-4"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Login number</h3>
              <span
                className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                <ShieldCheck className="w-3 h-3" /> OTP required
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              This is how {user.name.split(' ')[0]} signs in. Changing it takes effect immediately and is saved on its own.
            </p>

            {phoneStep === 'idle' && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {currentPhone}
                </span>
                <PermissionGate
                  permission="users.update"
                  fallback={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>No permission to change</span>}
                >
                  <button
                    type="button"
                    onClick={() => { setPhoneStep('entry'); setNewPhone(''); }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                  >
                    <Pencil className="w-3 h-3" /> Change
                  </button>
                </PermissionGate>
              </div>
            )}

            {phoneStep === 'entry' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span
                    className="px-3 py-2 text-sm rounded-lg shrink-0 font-medium"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                  >
                    +91
                  </span>
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="New 10-digit number"
                    className={`flex-1 ${fieldClass} tabular-nums`}
                    style={inputStyle}
                  />
                </div>

                {availability.state === 'checking' && (
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
                  </p>
                )}
                {availability.state === 'free' && (
                  <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Available
                  </p>
                )}
                {availability.state === 'taken' && (
                  <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Already used by {availability.holder}
                  </p>
                )}
                {newPhone === user.mobileNumber && newPhone.length === 10 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>That is already the current number.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPhoneStep('idle')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                    style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={
                      sendOtp.isPending ||
                      !/^\d{10}$/.test(newPhone) ||
                      newPhone === user.mobileNumber ||
                      availability.state === 'taken' ||
                      countdown > 0
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {sendOtp.isPending
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
                      : countdown > 0 ? `Wait ${countdown}s` : 'Send code'}
                  </button>
                </div>
              </div>
            )}

            {phoneStep === 'code' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <button
                    type="button"
                    onClick={() => setPhoneStep('entry')}
                    className="flex items-center gap-1 hover:opacity-70"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <ArrowLeft className="w-3 h-3" /> Edit
                  </button>
                  <span>Code sent to <strong className="tabular-nums">+91 {newPhone}</strong></span>
                </div>

                {devOtp && (
                  <p
                    className="text-[11px] px-2 py-1 rounded inline-block"
                    style={{ background: 'var(--color-warning-light, #fef3c7)', color: 'var(--color-warning-dark, #92400e)' }}
                  >
                    Dev code: <strong className="tabular-nums">{devOtp}</strong>
                  </p>
                )}

                <OtpCodeInput
                  autoFocus
                  value={otp}
                  invalid={otpInvalid}
                  disabled={updateMobile.isPending}
                  onChange={(v) => { setOtp(v); setOtpInvalid(false); }}
                  onComplete={handleVerifyAndSave}
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleVerifyAndSave(otp)}
                    disabled={otp.length !== 6 || updateMobile.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {updateMobile.isPending
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Verifying…</>
                      : 'Verify & update'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || sendOtp.isPending}
                    className="flex items-center gap-1 text-[11px] disabled:opacity-40"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <RotateCw className="w-3 h-3" />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Profile ─────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Profile
            </h3>
            <FormField label="Name" htmlFor="eu-name" required error={errors.name}>
              <input
                id="eu-name"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                className={fieldClass}
                style={inputStyle}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Email" htmlFor="eu-email" error={errors.email} description="Leave blank to clear">
                <input
                  id="eu-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={fieldClass}
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Gender" htmlFor="eu-gender">
                <select
                  id="eu-gender"
                  value={draft.gender}
                  onChange={(e) => set('gender', e.target.value as Gender)}
                  className={fieldClass}
                  style={inputStyle}
                >
                  {(['male', 'female', 'other'] as Gender[]).map((g) => (
                    <option key={g} value={g}>{titleCase(g)}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>

          {/* ── Location ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="City" htmlFor="eu-city">
                <input id="eu-city" value={draft.city} onChange={(e) => set('city', e.target.value)} className={fieldClass} style={inputStyle} />
              </FormField>
              <FormField label="Area" htmlFor="eu-area">
                <input id="eu-area" value={draft.area} onChange={(e) => set('area', e.target.value)} className={fieldClass} style={inputStyle} />
              </FormField>
              <FormField label="Pincode" htmlFor="eu-pincode" error={errors.pincode}>
                <input
                  id="eu-pincode"
                  inputMode="numeric"
                  value={draft.pincode}
                  onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${fieldClass} tabular-nums`}
                  style={inputStyle}
                />
              </FormField>
            </div>
          </section>

          {/* ── Access ──────────────────────────────────────────────── */}
          <PermissionGate permission="users.update">
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Role" htmlFor="eu-role" error={errors.role}>
                  <select
                    id="eu-role"
                    value={draft.role}
                    onChange={(e) => set('role', e.target.value as UserRole)}
                    className={fieldClass}
                    style={inputStyle}
                  >
                    {(['customer', 'associate', 'moderator', 'admin', 'super_admin'] as UserRole[]).map((r) => (
                      <option key={r} value={r}>{titleCase(r.replace('_', ' '))}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status" htmlFor="eu-status">
                  <select
                    id="eu-status"
                    value={draft.status}
                    onChange={(e) => set('status', e.target.value as UserStatus)}
                    className={fieldClass}
                    style={inputStyle}
                  >
                    {(['active', 'suspended', 'paused', 'deleted'] as UserStatus[]).map((st) => (
                      <option key={st} value={st}>{titleCase(st)}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            </section>
          </PermissionGate>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-5 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
            {dirty ? 'Unsaved changes' : 'No changes yet'}
          </p>
          <button
            onClick={close}
            className="px-4 py-2 text-sm font-medium rounded-lg"
            style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={!dirty || busy}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {updateUser.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
