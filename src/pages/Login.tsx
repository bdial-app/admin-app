import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';

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
    } catch (error) {
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
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Admin
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Supervise the Bohri Connect platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <div className="mt-1">
                  <input
                    id="mobile"
                    name="mobile"
                    type="text"
                    required
                    // maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm placeholder-gray-400"
                    placeholder="Enter 10-digit mobile number"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || mobileNumber.length !== 10}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
              

            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    One-Time Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Change Number
                  </button>
                </div>
                <div className="mt-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center tracking-widest text-lg"
                    placeholder="• • • • • •"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-center text-gray-500">
                  OTP sent to +91 {mobileNumber}
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
