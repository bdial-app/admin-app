import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Phone, CheckCircle, AlertCircle, Loader2, MapPin } from 'lucide-react';
import LocationPicker, { type LocationData } from '../components/ui/LocationPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { useAdminCreateUser, useCheckUser, useAdminSendOtp, useAdminVerifyOtp } from '../hooks/useAdminCreate';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Gender } from '../types';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export default function CreateUser() {
  const navigate = useNavigate();
  const createUserMutation = useAdminCreateUser();
  const sendOtpMutation = useAdminSendOtp();
  const verifyOtpMutation = useAdminVerifyOtp();

  // Form fields
  const [mobileNumber, setMobileNumber] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // OTP state
  const [skipOtp, setSkipOtp] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Pre-flight check
  const { data: checkData, isLoading: isChecking } = useCheckUser(mobileNumber);

  const mobileValid = /^\d{10}$/.test(mobileNumber);
  const userExists = checkData?.exists ?? false;

  const handleSendOtp = async () => {
    try {
      const result = await sendOtpMutation.mutateAsync({ mobileNumber, purpose: 'user_verification' });
      setOtpSent(true);
      if (result.data?.otp) setDevOtp(result.data.otp);
      toast.success('OTP sent to ' + mobileNumber);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      await verifyOtpMutation.mutateAsync({ mobileNumber, otp, purpose: 'user_verification' });
      setOtpVerified(true);
      toast.success('OTP verified');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    }
  };

  const handleLocationChange = useCallback((data: LocationData) => {
    setCity(data.city);
    setArea(data.area);
    setPincode(data.pincode);
    setLatitude(data.latitude);
    setLongitude(data.longitude);
  }, []);

  const canSubmit = name.trim() && mobileValid && !userExists && (skipOtp || otpVerified);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await createUserMutation.mutateAsync({
        mobileNumber,
        name: name.trim(),
        gender,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        area: area.trim() || undefined,
        pincode: pincode.trim() || undefined,
        latitude: latitude.trim() || undefined,
        longitude: longitude.trim() || undefined,
        skipOtp,
      });
      toast.success('User created successfully!');
      navigate(ROUTES.USERS);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div>
      <PageHeader
        title="Create User"
        description="Create a new user account with all details"
        breadcrumbs={[
          { label: 'Dashboard', path: ROUTES.DASHBOARD },
          { label: 'Users', path: ROUTES.USERS },
          { label: 'Create User' },
        ]}
        actions={
          <button
            onClick={() => navigate(ROUTES.USERS)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Mobile Number with pre-flight check */}
        <div className="rounded-xl p-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            <Phone className="w-4 h-4 inline mr-2" />
            Mobile Number
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMobileNumber(v);
                    setOtpSent(false);
                    setOtpVerified(false);
                    setOtp('');
                  }}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus-ring"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
                {isChecking && mobileValid && <Loader2 className="w-5 h-5 animate-spin self-center" style={{ color: 'var(--text-muted)' }} />}
              </div>
              {mobileValid && userExists && (
                <p className="mt-1 text-xs flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  User already exists with this number
                  {checkData?.hasProvider && ' (has provider profile)'}
                </p>
              )}
              {mobileValid && checkData && !userExists && (
                <p className="mt-1 text-xs flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Number is available
                </p>
              )}
            </div>

            {/* OTP Section */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={skipOtp}
                  onChange={(e) => setSkipOtp(e.target.checked)}
                  className="rounded"
                />
                Skip OTP verification (admin privilege)
              </label>
            </div>

            {!skipOtp && mobileValid && (
              <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                {!otpVerified ? (
                  <>
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendOtpMutation.isPending}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {sendOtpMutation.isPending ? 'Sending…' : 'Send OTP'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {devOtp && (
                          <p className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
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
                            className="flex-1 px-3 py-2 text-sm rounded-lg focus-ring"
                            style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={otp.length !== 6 || verifyOtpMutation.isPending}
                            className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                            style={{ background: 'var(--color-primary)' }}
                          >
                            {verifyOtpMutation.isPending ? 'Verifying…' : 'Verify'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-xs underline"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Resend OTP
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" /> OTP verified successfully
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="rounded-xl p-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            <UserPlus className="w-4 h-4 inline mr-2" />
            User Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl p-6" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MapPin className="w-4 h-4" />
            Location (Optional)
          </h3>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            city={city}
            area={area}
            pincode={pincode}
            onLocationChange={handleLocationChange}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || createUserMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            {createUserMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Create User</>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.USERS)}
            className="px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--surface-0)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
