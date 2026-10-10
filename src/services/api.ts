import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { ADMIN_PLATFORM, ADMIN_VERSION, reportError } from '../utils/error-reporter';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Who's calling, for the admin Logs.
    if (config.headers) {
      config.headers['X-Platform'] = ADMIN_PLATFORM;
      config.headers['X-App-Version'] = ADMIN_VERSION;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track whether we're already handling a 401 to avoid multiple redirects
let isLoggingOut = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Server failures and unanswered calls go to the admin Logs.
    const status: number | undefined = error.response?.status;
    if ((!status || status >= 500) && !axios.isCancel(error) && !String(error.config?.url ?? '').includes('/logs/client')) {
      reportError({
        kind: 'api_error',
        message: status ? `${status} ${error.response?.data?.message ?? error.message}` : `No response: ${error.message}`,
        method: error.config?.method?.toUpperCase(),
        apiPath: error.config?.url,
        status,
        requestId: error.response?.headers?.['x-request-id'],
      });
    }
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      // Clear all auth state from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect — use replace to prevent back-button returning to a broken state
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
