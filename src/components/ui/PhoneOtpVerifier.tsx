import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Loader2, RotateCw } from 'lucide-react';
import { useAdminSendOtp } from '../../hooks/useAdminCreate';
import { toast } from 'react-toastify';

interface PhoneOtpVerifierProps {
  phoneNumber: string;
  purpose?: string;
  /** Called with the entered OTP code once user clicks Verify — parent handles actual verification */
  onOtpReady: (otp: string) => void;
  /** If true, show the verified checkmark */
  verified?: boolean;
  disabled?: boolean;
}

export function PhoneOtpVerifier({
  phoneNumber,
  purpose = 'business_verification',
  onOtpReady,
  verified = false,
  disabled = false,
}: PhoneOtpVerifierProps) {
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtpMutation = useAdminSendOtp();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  // Reset on phone change
  useEffect(() => {
    setSent(false);
    setOtp('');
    setDevOtp('');
    setCountdown(0);
  }, [phoneNumber]);

  const handleSend = useCallback(async () => {
    const phone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Enter a valid 10-digit number first');
      return;
    }
    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber: phone, purpose });
      setSent(true);
      setCountdown(60);
      if (result.data?.otp) setDevOtp(result.data.otp);
      toast.success('OTP sent');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to send OTP';
      const retryAfter = err?.response?.data?.retryAfterSeconds;
      if (retryAfter) setCountdown(retryAfter);
      toast.error(msg);
    }
  }, [phoneNumber, purpose, sendOtpMutation]);

  if (disabled) return null;

  if (verified) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
        <CheckCircle className="w-3.5 h-3.5" />
        OTP verified — number updated
      </div>
    );
  }

  if (!sent) {
    return (
      <button
        type="button"
        onClick={handleSend}
        disabled={sendOtpMutation.isPending}
        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
        style={{ background: 'var(--color-primary)' }}
      >
        {sendOtpMutation.isPending ? (
          <><Loader2 className="w-3 h-3 animate-spin" />Sending…</>
        ) : (
          'Send OTP to verify'
        )}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {devOtp && (
        <p className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--color-warning-light, #fef3c7)', color: 'var(--color-warning-dark, #92400e)' }}>
          Dev OTP: <strong>{devOtp}</strong>
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit OTP"
          maxLength={6}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={() => { if (otp.length === 6) onOtpReady(otp); }}
          disabled={otp.length !== 6}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          Verify & Save
        </button>
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={countdown > 0 || sendOtpMutation.isPending}
        className="flex items-center gap-1 text-[11px] disabled:opacity-40"
        style={{ color: 'var(--text-muted)' }}
      >
        <RotateCw className="w-3 h-3" />
        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
      </button>
    </div>
  );
}
