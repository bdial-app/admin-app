import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import { Shield, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

const Login = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const resultAction = await dispatch(sendOtp(mobileNumber));
      if (sendOtp.fulfilled.match(resultAction)) {
        toast.success("OTP sent successfully!");
        setStep(2);
      } else {
        toast.error((resultAction.payload as string) || "Failed to send OTP.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }
    setLoading(true);
    try {
      const resultAction = await dispatch(verifyOtp({ mobileNumber, otp }));
      if (verifyOtp.fulfilled.match(resultAction)) {
        toast.success("Welcome back, Admin!");
        navigate(ROUTES.DASHBOARD);
      } else {
        const errorMsg = typeof resultAction.payload === 'string'
          ? resultAction.payload
          : "Failed to verify OTP.";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--surface-1)' }}>
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #4F46E5 100%)',
        }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/90 text-lg font-bold">Bohri Connect</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Trust Engine<br />for your Community
          </h2>
          <p className="text-white/70 text-base leading-relaxed">
            Manage verified business listings, user documents, and community moderation from one powerful admin panel.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Listing Approvals', 'Aadhaar Verification', 'Review Moderation', 'User Management'].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 text-xs font-medium rounded-full text-white/90 bg-white/10 backdrop-blur-sm border border-white/10"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">
          © {new Date().getFullYear()} Bohri Connect. All rights reserved.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand (shown on mobile only) */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Bohri Connect
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {step === 1 ? 'Sign in to Admin' : 'Verify OTP'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {step === 1
                ? 'Enter your registered mobile number to get started'
                : `We sent a verification code to +91 ${mobileNumber}`
              }
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Mobile Number
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    +91
                  </span>
                  <input
                    id="mobile"
                    type="text"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-12 pr-4 py-2.5 text-sm rounded-xl focus-ring transition-colors"
                    style={{
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="Enter 10-digit number"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mobileNumber.length !== 10}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                style={{ boxShadow: '0 1px 3px 0 rgba(79, 70, 229, 0.3)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Change
                  </button>
                </div>
                <input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 text-center text-lg tracking-[0.3em] font-semibold rounded-xl focus-ring transition-colors"
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                style={{ boxShadow: '0 1px 3px 0 rgba(79, 70, 229, 0.3)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
