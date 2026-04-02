import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { setCredentials } from '../store/slices/authSlice';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';

const Login = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState(''); // Using password or OTP based on BRD. Let's assume password for admin, or OTP via mobile.
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mocking API call for now
      // const response = await api.post(URLS.AUTH.LOGIN, { mobile_number: mobileNumber, password });
      // dispatch(setCredentials({ user: response.data.user, token: response.data.token }));
      
      // Simulating success
      setTimeout(() => {
        dispatch(setCredentials({ 
          user: { id: '1', name: 'Admin User', role: 'admin' }, 
          token: 'mock-jwt-token' 
        }));
        toast.success("Welcome back, Admin!");
        navigate(ROUTES.DASHBOARD);
      }, 800);
    } catch (error) {
      toast.error("Failed to login. Please check your credentials.");
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
          <form className="space-y-6" onSubmit={handleLogin}>
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
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password / OTP
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <Link to={ROUTES.REGISTER} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Don't have an admin account? Register here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
