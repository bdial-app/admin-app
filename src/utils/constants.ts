// Route paths
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
  USERS: '/users',
  PROVIDERS: '/providers',
  REGISTRATIONS: '/registrations',
  REVIEWS: '/reviews',
  CATEGORIES: '/categories'
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
