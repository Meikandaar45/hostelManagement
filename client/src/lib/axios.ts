import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,  // send HttpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach bearer token if present
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor — save token if returned, and redirect to /login on 401
api.interceptors.response.use(
  (res) => {
    const token = res.data?.data?.token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Only redirect if not already on an auth page
        const publicPaths = ['/login', '/forgot-password', '/reset-password', '/setup'];
        const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
        if (!isPublic) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
