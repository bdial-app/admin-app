import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
